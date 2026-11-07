# T-4: Satır içi script geçiş planı (tasarım ve risk değerlendirmesi)

Durum: **yalnızca tasarım.** `index.html` ve diğer sayfalardaki inline scriptlere dokunulmadı, CSP eklenmedi. Uygulama aşamaları ayrı onay ve ayrı PR gerektirir.

Tarih: 2026-11-07. Envanter bu tarihteki `main` (`852ae17`) üzerinden sayıldı.

## 1. Envanter (`index.html`, 194.936 bayt)

| Satır | Boyut | İş | Bağımlılık / zamanlama |
| --- | --- | --- | --- |
| 8 | 539 B | Tema başlatma (flash önleme). Kaynağı `js/theme-init.js`; build her sayfaya gömer | Stylesheet'ten önce **eşzamanlı** çalışmalı |
| 256 | 189 B | `window.dataLayer` / `gtag()` taslağı | `gtag/js` async yüklenmeden önce tanımlı olmalı |
| 279 | 3.795 B | `fmtDT`, `relTime`, `renderSyncBadge` (global fonksiyonlar) | Diğer inline bloklar kullanır |
| 532 | 3.075 B | Calendly: `window load` ile konteyner gösterimi ve kapanış mantığı | `load` olayı; Calendly widget scripti (3855) |
| 2541 | 16.681 B | Projects: kategori filtresi, starred, `window.showMoreStarred` | `DOMContentLoaded`/`load`; `onclick="showMoreStarred()"` kullanır |
| 3191 | 24.365 B | Blog: kategori/dil, `window.setBlogLang`, `window.reblog` | `onclick="setBlogLang(...)"` (3 yerde) kullanır |
| 3876 | 1.406 B | İletişim (telefon/e-posta bağlantıları), jQuery `$(document).ready` | jQuery (3861) yüklü olmalı |
| 3914 | 1.575 B | Resume kişilik ipucu aç/kapa, Escape/dışarı tıklama | Bağımsız |
| 125 | 2.645 B | JSON-LD (`application/ld+json`) | **Çalıştırılabilir değil**, veri; CSP `script-src` kapsamına girmez |

Toplam çalıştırılabilir inline: 8 blok, ≈51,7 KB. Ek olarak: 5 inline olay özniteliği (4 `onclick`, 1 `onload="this.media='all'"` stylesheet hilesi, satır 237), 20 `style=""` özniteliği, 3 `<style>` bloğu. `eval`/`new Function`/`javascript:` kullanımı yok. `404.html`'de 533 baytlık bir inline blok daha var (tema başlatma). Depoda şu an hiçbir CSP tanımı yok.

## 2. Hedef ve kısıtlar

**Güvenlik kazanımı:** XSS yüzey alanını azaltmak (inline çalıştırmayı kapatabilen CSP). **Ek kazanımlar (CSP'den bağımsız):** önbelleklenebilir/lint edilebilir/test edilebilir dosyalar, testlerin `index.html`'den metin dilimleme hilesinden kurtulması.

Kısıtlar (kanıtlı):

1. **GitHub Pages yanıt başlığı ayarlatmaz** → yalnızca `<meta http-equiv="Content-Security-Policy">` mümkün. Meta CSP `frame-ancestors`, `report-uri` ve `sandbox` direktiflerini desteklemez ve `Content-Security-Policy-Report-Only` meta ile verilemez (CSP şartnamesi; bu oturumda yeniden getirilmedi). Yani üretimde "önce rapor modunda dene" yapılamaz.
2. **AdSense yalnızca nonce tabanlı strict CSP'yi destekler**; alan adı izin listesine dayalı politikaları "kırılabilir" diye reddeder (Google AdSense yardımı, [Content Security Policy](https://support.google.com/adsense/answer/16283098), bu oturumda getirildi). Önerilen: `object-src 'none'`, `base-uri 'none'`, `script-src 'nonce-…' 'strict-dynamic'` (+ geriye dönük `'unsafe-inline' https: http:`), ve "More restrictive policies may break without notice" uyarısı. Statik siteden **istek başına nonce üretilemez**; sabit bir nonce güvenlik sağlamaz (saldırgan da bilir) ve **önerilmez**. Hash tabanlı strict CSP'nin AdSense ile çalıştığı Google makalesinde yazmıyor: **DOĞRULANAMADI**.
3. Üçüncü taraflar: AdSense (`pagead2.googlesyndication.com`), Google Tag Manager, Calendly. Hepsi dinamik olarak ek script/iframe/istek üretir; hangi direktif gerektiğini yalnızca gerçek tarayıcı ölçümü gösterir.

**Dürüst sonuç:** Mevcut barındırmada AdSense ile uyumlu, gerçekten sıkı bir CSP'yi canlıya almak bugün kanıtlanmış bir yol değil. Bu yüzden plan iki katmana ayrıldı: (A) CSP'den bağımsız, düşük riskli externalization; (B) CSP kararı, sahibin kararına bağlı.

## 3. Mevcut testlerle bağ (regresyon yüzeyi)

- `scripts/tests/category-filters.test.js`: `index.html` metninden `function render() {` … `function initCatFilters()` arasını **girinti işaretçileriyle dilimleyip** `vm`'de çalıştırır. Kod taşınırsa bu test kırılır; çözüm assertion'ı gevşetmek değil, aynı kodu yeni dosyadan okumak (aynı beklentiler).
- Tarayıcı testleri `setBlogLang`, `reblog`, `showMoreStarred`, `calendlyContainer`, `personality-info` davranışlarını çalıştırır: `categories.spec.mjs`, `keyboard-accessibility.spec.mjs`, `button-states.spec.mjs`, `resume-disclosures.spec.mjs`; ayrıca `scripts/tests/not-found-shell.test.js`.
- `adsense.test.js`, `blog-sharing.test.js`, `first-principles.test.js`, `pipeline.test.js` vb. `index.html`'yi okur; hangi satırlarını varsaydıkları her biri için tek tek incelenmedi (aşama başında yapılır).
- Cache-busting: `scripts/build-agent-content.mjs` `script[src]` etiketlerine `?v=<hash>` ekliyor (`asset-versioning.test.js`); yeni dosyalar bu mekanizmaya girmeli.

## 4. Davranış koruma riskleri

| Risk | Neden | Önlem |
| --- | --- | --- |
| Çalışma sırası | Inline blok ayrıştırma anında eşzamanlı çalışır; `defer`/modül farklı sıra verir | Mevcut sırayı koru: aynı konumda **klasik, eşzamanlı** `<script src>`; `defer`/`type=module` yok |
| Global API | `onclick` öznitelikleri `window.setBlogLang`/`showMoreStarred`'a bağlı | Önce testle sabitle, sonra özniteliği `addEventListener` ile değiştir; bir süre global'i de koru |
| Tema flash | Satır 8 render öncesi çalışmalı | Bu blok en son ele alınır; seçenek: build'de hash'lenen inline veya senkron küçük dosya |
| Erken tıklama | Script yüklenmeden tıklama bugün de `ReferenceError` verir | Delege dinleyiciyle iyileşir; davranış farkı olarak kayda geçir |
| Cache | Yeni JS dosyaları eski HTML ile uyumsuz kalabilir | `?v=` mekanizması + deploy sırası mevcut |
| AdSense gecikmesi | Sayfa içeriğini bekleyen `data-ad-await` mantığı inline'lara bağlı olabilir | Reklam yapılandırmasına dokunma; aşama sonrası reklam testleri (R-AD-*) çalışmalı |
| CSP kırılması | Üçüncü taraf dinamik kaynakları | Yalnızca test sunucusunda ölçülür (bölüm 6) |

## 5. Aşamalı geçiş planı (her aşama ayrı PR, ayrı onay)

Aşama A: CSP olmadan externalization, riskten küçüğe doğru.

1. **A0 Koruma testleri (önce):** "inline çalıştırılabilir script allowlist'i" testi (şu anki 8 bloğu bilinçli olarak listeler, sayı yalnızca azalabilir) ve "inline olay özniteliği allowlist'i" testi (5). Davranış değişmez; sonraki aşamalar allowlist'i küçültür.
2. **A1** Satır 3914 (resume ipucu, 1,6 KB, bağımsız) → `js/resume-info-tip.js`.
3. **A2** Satır 3876 (iletişim, jQuery'ye bağlı) → dosya, jQuery'den sonra aynı konumda.
4. **A3** Satır 256 (gtag taslağı) → `js/analytics-stub.js`; sıra: `gtag/js` async etiketinden önce.
5. **A4** Satır 279 (yardımcılar) → dosya; blog/projects bloklarından önce.
6. **A5** Satır 532 (Calendly) → dosya; `load` sırası korunur.
7. **A6** Satır 2541 (Projects, 16,7 KB) → dosya; `category-filters.test.js` yeni dosyayı okur (assertion aynı); `onclick="showMoreStarred()"` → dinleyici.
8. **A7** Satır 3191 (Blog, 24,4 KB) → dosya; 3 `onclick` → delege dinleyici.
9. **A8** `onload` stylesheet hilesi (satır 237) → eşdeğer, CSP-uyumlu yükleme (`<link rel=stylesheet media=print>` yerine ayrı küçük dosya veya doğrudan stylesheet) ve ölçülü ilk boyama kontrolü.
10. **A9** Satır 8/`404.html` tema başlatma: yalnızca CSP kararı sonrası.

Aşama B: CSP (yalnızca sahibin kararından sonra).

- **B0 Ölçüm:** CSP'yi **yerel test sunucusunda başlık olarak** ekleyen bir Playwright kurulumu (yeni bağımlılık yok); tüm rota yürüyüşünde `securitypolicyviolation` olayı sayılır. Üretim değişmez. Çıktı: gerekli direktif listesi (kanıt).
- **B1 Seçenekler:** (i) CSP'siz kal; (ii) meta CSP yalnızca reklamsız sayfalara; (iii) başlık verebilen bir ön katman (ör. CDN) — barındırma değişikliği, ayrı karar; (iv) strict-dynamic + hash, AdSense ile **gerçek ölçümle** kanıtlanırsa. Sahibin kararı olmadan hiçbiri uygulanmaz.

## 6. Test planı

Her aşamadan önce ve sonra, **mevcut assertion'lar değişmeden**:

- `npm run test:unit` ve tüm Chromium proje matrisi; Cross-browser Keyboard Tests; `test:production` canlı duman testi (deploy sonrası).
- Aşamaya özgü: ilgili R-* kimlikleri (Blog/Projects filtre R-FILTER-*, klavye R-KEYBOARD-*, reklam R-AD-*, resume ipucu testleri) ve A0 allowlist testleri.
- Sıra/zamanlama: yeni dosyaların `index.html`'deki göreli konumunu doğrulayan test (jQuery sonrası, `gtag/js` öncesi).
- Akıcılık: R-FILTER-04/R-KEYBOARD-08'in açık kök neden analizi bu işle karıştırılmaz; bu testler tek başına geçse de çözülmüş sayılmaz. Odak/yönlendirme zamanlamasını etkileyebilecek aşamalar (A6, A7) için ek, tekrarlı (≥30) çalıştırma yapılır ve sonuç ayrı raporlanır.
- Kabul: aynı davranış, allowlist küçüldü, tüm kapılar yeşil, canlıda duman testi yeşil, reklam yapılandırması bayt düzeyinde değişmedi.

Geri alma: her aşama tek PR olduğundan `git revert` ile. Üretim davranışını değiştirebilecek tek aşama A8/A9'dur (ilk boyama/tema), onlar en sonda ve ayrı onayla.

## 7. Karar bekleyenler

- **D-5:** Aşama A0'ın (yalnızca koruma testleri, üretim koduna dokunmaz) uygulanmasına onay.
- **D-6:** A1-A7 externalization'ın sırayla yürütülmesine onay (her biri ayrı PR).
- **D-7:** CSP hedefi: B0 ölçümü yapılsın mı, ve B1'de hangi seçenek yönü (barındırma değişikliği içerebilir).
