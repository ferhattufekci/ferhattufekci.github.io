# T-4: Satır içi script ve CSP geçiş planı (tasarım ve risk değerlendirmesi)

Durum: **yalnızca tasarım.** `index.html` ve diğer sayfalardaki inline scriptlere dokunulmadı, CSP eklenmedi. Uygulama aşamaları ayrı onay ve ayrı PR gerektirir. Öncelik/kabul kriterleri: [OPEN-ITEMS.md](OPEN-ITEMS.md).

Tarih: 2026-11-07. Envanter `main` (`852ae17`) üzerinden sayıldı; bağımlılıklar ayrıştırıcı ile (acorn) çıkarıldı. Kanıt etiketleri: **[B]** belge, **[K]** kod/ayrıştırma, **[T]** mevcut test, **[?]** DOĞRULANAMADI.

## 1. D-5: Envanter ve bağımlılık analizi (`index.html`, 194.936 bayt)

| Satır | Boyut | İş | Sağladığı global | Gerektirdiği | Başlatma zamanı |
| --- | --- | --- | --- | --- | --- |
| 8 | 539 B | Tema başlatma (flash önleme); kaynağı `js/theme-init.js`, build gömer | yok | yok | Ayrıştırma anında, stylesheet'ten önce |
| 256 | 189 B | `window.dataLayer`, `gtag()` tanımı **ve** `gtag("js")`/`gtag("config")` çağrıları | `gtag`, `dataLayer` | `gtag/js` async etiketi (252) bu bloktan önce gelir | Ayrıştırma anında |
| 279 | 3.795 B | `fmtDT`, `relTime`, `renderSyncBadge`; `click`/`keydown` dinleyicileri | `window.fmtDT/relTime/renderSyncBadge` | yok | Ayrıştırma anında |
| 532 | 3.075 B | Calendly konteyneri gösterimi ve kapanış; `load`, `click`, `pagehide` | yok | `calendlyContainer` öğesi; Calendly widget (3855) | `load` olayı |
| 2541 | 16.684 B | Projects: kategori filtresi, starred | `window.showMoreStarred` | `PortfolioContentPanels` (`js/page-content-panels.js`, **sonradan** 3868'de yüklenir), `window.renderSyncBadge` | `readyState==="loading"` ise `DOMContentLoaded`, değilse hemen (`boot`) |
| 3191 | 24.368 B | Blog: kategori/dil, paylaşım | `window.setBlogLang`, `window.reblog` | `PortfolioBlogSharing` (3189-3190, önce), `MediumArticleLanguage` (3187), `MediumArticleExcerpt` (3188), `PortfolioContentPanels` (sonra), `window.renderSyncBadge`, `DOMParser` | Aynı `boot` deseni |
| 3876 | 1.406 B | İletişim bağlantıları | yok | jQuery (`$`, 3861) | `$(document).ready` |
| 3914 | 1.575 B | Resume kişilik ipucu | yok | `.resume-personality-info` öğesi **o anda** DOM'da olmalı (sayfa sonu) | Ayrıştırma anında |
| 125 | 2.645 B | JSON-LD veri bloğu | — | — | Çalıştırılabilir değil, CSP `script-src` dışında |

Toplam çalıştırılabilir: 8 blok, ≈51,7 KB; 5 olay özniteliği (`onclick` x4: `showMoreStarred()` ve `setBlogLang('all'|'tr'|'en')`; `onload="this.media='all'"` satır 237); 20 `style=""` özniteliği; 3 `<style>` bloğu; `eval`/`new Function`/`javascript:` yok. Diğer sayfalar (`about`, `contact`, `privacy`, `404.html`): her birinde yalnızca 533 baytlık tema başlatma inline'ı, 0 olay özniteliği, 0 `style=""`; AdSense ve GTM **yok**. Depoda CSP tanımı yok.

**Çıkarımlar (D-6'yı belirleyen):**

1. 2541 ve 3191, `PortfolioContentPanels`'ı yalnızca olay anında kullanır; onu sağlayan dosya sonradan yüklenir. Bu bilinçli bir erteleme: bu bloklar sayfa sonundaki dosyalardan **önce çalışır** ve `boot`'u `DOMContentLoaded`'a bağlar.
2. `DOMContentLoaded` dinleyicileri kayıt sırasıyla çalışır; inline bloklar jQuery'den önce kayıt olur, yani `boot`'lar jQuery `ready` geri çağrılarından **önce** çalışır. `defer` bu sırayı ve `readyState` dalını değiştirir.
3. `window.setBlogLang` ve `window.showMoreStarred` **test sözleşmesidir**: `tests/browser/categories.spec.mjs` bunları `page.evaluate` ile doğrudan çağırır **[T]**. Globaller korunmalıdır.
4. Satır 279'un global fonksiyonları 2541 ve 3191 tarafından (`window.renderSyncBadge`) kullanılır; önce yüklenmelidir.
5. 3914 ve 8, yürütüldükleri DOM konumuna bağlıdır (öğeler önce gelmeli / render öncesi çalışmalı).

## 2. Mevcut testlerle bağ (regresyon yüzeyi)

- `scripts/tests/category-filters.test.js`: `index.html` metninden `function render() {` … `function initCatFilters()` arasını **girinti işaretçileriyle dilimleyip** `vm`'de çalıştırır **[T]**. Kod taşınırsa bu test kırılır; çözüm assertion'ı gevşetmek değil, aynı beklentilerle aynı kodu yeni dosyadan okumaktır. Dilimleme hilesi bilinçli olarak bir modül sınırına (ör. `render`'ı dışa açan küçük bir sözleşme) dönüştürülmelidir.
- `tests/browser/categories.spec.mjs`, `keyboard-accessibility.spec.mjs`, `button-states.spec.mjs`, `resume-disclosures.spec.mjs`; `scripts/tests/not-found-shell.test.js`: `setBlogLang`, `reblog`, `showMoreStarred`, `calendlyContainer`, `personality-info` davranışlarını çalıştırır **[T]**.
- `adsense.test.js`, `blog-sharing.test.js`, `first-principles.test.js`, `pipeline.test.js` vb. `index.html`'yi okur; hangi satırlara dayandıkları aşama başında tek tek çıkarılır **[?]**.
- Cache-busting: `scripts/build-agent-content.mjs` `script[src]` etiketlerine `?v=<hash>` ekler (`asset-versioning.test.js`); yeni dosyalar bu mekanizmaya girer **[K]**.
- Test ortamı notu: tarayıcı testlerinde üçüncü taraf hizmetler (AdSense, Calendly, GTM) fixture ile taklit edilir **[K]**; bu testler **gerçek** üçüncü taraf davranışını kanıtlamaz.

## 3. D-6: Harici dosyalara taşıma planı

**Davranış koruma kuralları:**

| Konu | Kural | Neden |
| --- | --- | --- |
| Sıra | Her blok aynı konumda **klasik, eşzamanlı** `<script src>` olur (`defer`/`async`/`type=module` yok) | Çalışma sırası ve `DOMContentLoaded` kayıt sırası aynı kalır |
| Global'ler | `window.setBlogLang`, `reblog`, `showMoreStarred`, `fmtDT`, `relTime`, `renderSyncBadge`, `gtag`, `dataLayer` korunur | Test sözleşmesi ve inline `onclick`'ler |
| Olay öznitelikleri | Önce globalin var olduğu test ile sabitlenir, sonra `addEventListener`/delege dinleyici; geçiş süresince global de kalır | `onclick="setBlogLang('tr')"` benzeri çağrılar değişirken davranış farkı olmamalı |
| DOM hazır olma | `boot` deseni (`readyState`/`DOMContentLoaded`) aynen taşınır; 3914 ve 8 konum-bağımlı olduğundan aynı yerde kalır | Öğe yoksa sessiz başarısızlık |
| Dil davranışı | `setBlogLang`/`syncBlogLangButtons`/`aria-pressed` ve "curLang === lf" koruması mantığına dokunulmaz | R-FILTER-* ve klavye testleri |
| Cache | Yeni dosyalar `script[src]` olduğundan `?v=` otomatik; `index.html` ve JS aynı yayında gider | Eski HTML + yeni JS karışımı olmaz |

**Aşamalar (her biri ayrı PR, ayrı onay; sırayla riskten küçüğe):**

1. **A0 Koruma testleri (üretim kodu değişmez):** "çalıştırılabilir inline script allowlist'i" (şu an 8 bloğu bilinçli listeler, sayı yalnızca azalabilir), "inline olay özniteliği allowlist'i" (5), "script konum/sıra sözleşmesi" (yeni dosyaların jQuery sonrası/öncesi konumları), `setBlogLang`/`showMoreStarred` global varlığı testi.
2. **A1** 3914 → `js/resume-info-tip.js` (bağımsız).
3. **A2** 3876 → dosya, jQuery'den sonra aynı konumda.
4. **A3** 256 → dosya; `gtag/js` etiketinden **sonra**, aynı konumda (şu anki sıra korunur).
5. **A4** 279 → dosya; blog/projects bloklarından önce.
6. **A5** 532 → dosya; `load` sırası korunur.
7. **A6** 2541 → dosya; `category-filters.test.js` yeni dosyadan okur; `onclick="showMoreStarred()"` → dinleyici.
8. **A7** 3191 → dosya; 3 `onclick` → delege dinleyici.
9. **A8** `onload` stylesheet hilesi (237) → CSP-uyumlu eşdeğer; ilk boyama ölçülür.
10. **A9** 8 ve 404 tema başlatma: yalnızca CSP kararından sonra.

Her aşamanın kabul kriteri: aynı davranış; ilgili allowlist küçüldü; mevcut tüm testler değişmeden yeşil; canlıda `test:production` duman testi yeşil; reklam yapılandırması (`js/adsense*.js`, reklam etiketleri) bayt düzeyinde aynı. Geri alma: `git revert`.

## 4. D-7: CSP stratejisi

**Kısıtlar:**

1. **GitHub Pages yanıt başlığı ayarlatmaz** → yalnızca `<meta http-equiv="Content-Security-Policy">`. CSP şartnamesi §3.3 **[B]** ([W3C CSP3](https://w3c.github.io/webappsec-csp/)): `report-uri`, `frame-ancestors`, `sandbox` meta içinde desteklenmez; `Content-Security-Policy-Report-Only` meta içinde **desteklenmez**; meta politikası kendinden önceki içeriğe uygulanmaz. Yani üretimde "önce rapor modunda dene" yapılamaz; her politika ilk günden **uygulanır**.
2. **AdSense:** Google yalnızca **nonce tabanlı strict CSP**'yi destekler; alan adı izin listesi politikalarını "AdSense kodunun kullandığı alan adları zamanla değiştiği" için desteklemez; önerilen `script-src 'nonce-…' 'strict-dynamic'` (+ geriye dönük `'unsafe-inline' https: http:`), `object-src 'none'`, `base-uri 'none'`; "More restrictive policies may break without notice"; kılavuza uyulmazsa "disruption of ad serving" olabilir; "publishers are not required to use CSP" ([AdSense yardımı](https://support.google.com/adsense/answer/16283098)) **[B]**. Önerilen politika `report-uri` da içerir; meta içinde desteklenmediğinden (bkz. madde 1) bu bileşen statik sitede uygulanamaz. Sayfa hash'ten hiç söz etmiyor.
3. Statik sitede istek başına nonce üretilemez; sabit nonce güvenlik sağlamaz.

**Seçenek karşılaştırması** (nonce / hash / harici dosya):

| Seçenek | Nasıl | AdSense ile | GitHub Pages ile | Not |
| --- | --- | --- | --- | --- |
| Nonce | Her yanıtta rastgele nonce | Google'ın belgelediği tek yol **[B]** | **Mümkün değil** (statik); edge/CDN gerektirir | Barındırma değişikliği |
| Hash (`'sha256-…'`) | Her inline blok için derleme anında hash; `'strict-dynamic'` hash ile de çalışır ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy)) **[B]** | **DOĞRULANAMADI**: Google makalesi yalnızca nonce'u anlatıyor. Harici `<script src>` etiketleri `strict-dynamic` ile alan adı/`'self'` izniyle çalışmaz; hash'li harici betik `integrity` ister (MDN) ve AdSense betiği değişkendir → AdSense/GTM'yi **hash'li kendi yükleyicimiz** dinamik ekleyecek şekilde değiştirmek gerekir, bu da reklam yükleme düzenini (canlı reklam yapılandırması) değiştirir | Mümkün | Reklam yükleme mantığına dokunur, onaysız yapılamaz |
| Harici dosya + `'self'` | Tüm kendi inline'larını dosyaya taşı; `script-src 'self'` + üçüncü taraf alan adı izin listesi | Alan adı izin listesi Google'ın **desteklemediği** biçim **[B]** | Mümkün | AdSense sayfasında kullanılamaz; reklamsız sayfalarda sorunsuz |
| CSP'siz kal | — | Uyumlu (CSP gereksinimi yok; yalnızca CSP kullanılıyorsa uyum şartı var **[B]**) | Mümkün | Mevcut durum |

**Test ortamı sınırı:** tarayıcı testleri AdSense'i taklit ettiği için hiçbir yerel CSP ölçümü gerçek AdSense uyumunu kanıtlamaz **[K]**. Gerçek uyum yalnızca canlı ortamda, geri alınabilir bir yayınla gözlenebilir. Gerçek reklam isteği üretmeden yerel ölçüm de yapılmaz (geçersiz trafik riski). Bu nedenle ana sayfa için AdSense uyumlu CSP "kanıtlanmış yol yok" durumundadır.

**Öneri (sahibin kararıyla uyumlu: ana sayfa için CSP hedefi şimdilik zorunlu değil; hash tabanlı CSP AdSense uyumu kanıtlanmadan güvenli kabul edilmez):**

- **D-7a (düşük risk, değer sınırlı):** reklamsız dört sayfada (`about`, `contact`, `privacy`, `404`) meta CSP pilotu: tek inline blok (tema başlatma) için tek hash, geri kalan `'self'`. Önce yerel test sunucusunda **başlık olarak** (yeni bağımlılık yok) tüm rota yürüyüşünde `securitypolicyviolation` olayı sayılır; sonra üretimde meta olarak. Bu güvenlik politikası değişikliğidir → onay gerekir.
- **D-7b (ana sayfa):** önce Aşama A (externalization) CSP'den bağımsız kazanımlarla (önbellek, lint, test) uygulanır. Ana sayfa CSP'si yalnızca sahibin kararıyla: (i) CSP'siz kal, (ii) başlık verebilen ön katman (CDN/edge) ile nonce (barındırma değişikliği), (iii) hash + hash'li yükleyici (reklam yükleme düzenini değiştirir, AdSense uyumu doğrulanmamış). Varsayılan öneri (i).

## 5. A0 koruma testleri planı (tasarım; test/kod yazılmadı)

**Amaç ve kural:** hiçbir script taşınmadan **önce** mevcut davranış testlerle güvence altına alınır. A0 tamamlanmadan ve doğrulanmadan A1+ başlamaz. A0 testleri mevcut kodda **yeşil** olmalı (karakterizasyon), mevcut assertion'ları değiştirmez; üretim kodu değişmez. Test sözleşmesi: `window.setBlogLang` ve `window.showMoreStarred` mevcut testlerce doğrudan çağrılır **[T]** ve korunur.

**Mevcut kapsam ve boşluk analizi** (bu oturumda `grep` ile her işaretçi için kanıtlandı):

| Davranış | Mevcut test | Boşluk |
| --- | --- | --- |
| Dil değiştirme (Blog) | `categories.spec.mjs` R-FILTER-01/03/10/12 (`window.setBlogLang('unsupported')` dahil), R-KEYBOARD-03 | Dil düğmesi `aria-pressed`/`active` senkronu ve aynı dili yeniden seçme koruması (`curLang === lf`) ayrı assertion ile açık değil |
| Kategori filtreleme (Blog/Projects) | R-FILTER-01..14, `category-filters.test.js` (vm dilimleme) | Yok (iyi kapsanmış); taşıma sırasında bağlanma biçimi değişir |
| Blog/Projects etkileşimleri | R-FILTER-*, `blog-sharing*.spec.mjs` | `reblog` doğrudan **hiçbir testte yok** |
| `showMoreStarred` | R-FILTER-09/13 | Global kontrat doğrudan (var mı, fonksiyon mu) kontrol edilmiyor |
| Klavye erişilebilirliği | R-KEYBOARD-01..08 | Kapsamlı; R-KEYBOARD-08 açık kök neden izlemesinde |
| Global fonksiyonlar (`fmtDT`, `relTime`, `renderSyncBadge`) | **Hiçbiri** (aramada yalnızca `index.html`'de geçiyor) | Doğrudan ve dolaylı kapsam yok |
| `gtag`/`dataLayer` davranışı | **Hiçbiri** | Yok |
| `PortfolioContentPanels` bağımlılıkları | Birim: `page-content-panels` testleri; inline kullanım yalnızca R-FILTER ile dolaylı | İnline bloğun onu geç yüklenen dosyadan olay anında kullandığı sözleşme açık değil |
| DOM yükleme ve olay sıralaması | `theme.test.js` yalnızca tema; sıra testi **yok** | Yok |
| Script sırası / konumu | `agent-readiness`, `error-card` testleri başka amaçlı | Yok |
| Inline çalıştırılabilir blok ve olay özniteliği sayısı | **Yok** | Yok |
| Calendly kapanış (`calendlyContainer`) | `not-found-shell.test.js` (404 gömme), `external-widget.spec.mjs` | Ana sayfadaki `load` sırası ve `pagehide` davranışı doğrulanmadı **[?]** (aşama başında `external-widget.spec.mjs` incelenir) |
| Resume kişilik ipucu | `resume-disclosures`, `button-states`, `link-details`, klavye testleri | Kapsanmış |

**Önerilen A0 testleri (hepsi karakterizasyon; mevcut kodda yeşil, gevşetme yok):**

| ID | Tür | Doğruladığı | Not |
| --- | --- | --- | --- |
| A0-01 | Birim (statik) | Çalıştırılabilir inline `<script>` sayısı ≤ 8 ve her blok bilinen bir işaretçiyle eşleşir (ör. `window.setBlogLang =`, `window.showMoreStarred =`, `function gtag(`, `calendlyContainer`, tema başlatma, …); **sayı yalnızca azalabilir** (ratchet) | Hash değil işaretçi: meşru düzenlemede kırılmaz, yeni inline eklendiğinde kırılır |
| A0-02 | Birim (statik) | Inline olay özniteliği sayısı ≤ 5 ve bilinen (`onclick` x4, `onload` x1) | Ratchet |
| A0-03 | Tarayıcı | Yükleme sonrası `typeof window.setBlogLang/showMoreStarred/reblog/fmtDT/relTime/renderSyncBadge/gtag === 'function'`, `window.dataLayer` dizi, `PortfolioContentPanels` mevcut | Global kontrat |
| A0-04 | Tarayıcı (GTM fixture ile, ağ yok) | `dataLayer` başında `["js", Date]` ve `["config","G-Z00CDE35NT"]` sırasıyla | Üretim ölçüm kimliği testte sabit; gerçek istek yok |
| A0-05 | Birim (statik) | Script sırası: `gtag/js` etiketi inline `gtag`'dan önce; jQuery 3876 bloğundan önce; `medium-language`, `medium-excerpt`, `blog-sharing-data`, `blog-sharing` Blog bloğundan önce; `page-content-panels.js` Projects/Blog bloklarından **sonra** (bilinçli erteleme); `adsense-config.js` `adsense.js`'ten önce | Sıra sözleşmesi, taşıma sonrası da aynı kalmalı |
| A0-06 | Tarayıcı | `renderSyncBadge` / `relTime` / `fmtDT` doğrudan davranış (sabit saat ve ISO tarihle; çıktı biçimi) | Taşımadan önce yakalanır |
| A0-07 | Tarayıcı | `reblog` yan etkisi (çağrıldığında Blog yeniden çizilir; tekrarlanan çağrı aynı sonucu verir) | Bugün test yok |
| A0-08 | Tarayıcı | Dil düğmesi durum senkronu: seçilen düğmede `active`/`aria-pressed="true"`, diğerlerinde `false`; aynı dili yeniden seçme DOM'u değiştirmez | `categories.spec` yan etkisi olarak değil açık assertion |
| A0-09 | Tarayıcı | **Olay sırası:** Projects/Blog `boot`'ları `DOMContentLoaded`'da jQuery `ready` geri çağrılarından **önce** çalışır (init betiğiyle kayıt sırası günlüğü; gözlem: `boot` yan etkisi (kategori çubuğu/kartlar) jQuery `ready` içine eklenen gözlemciden önce var) | Uygulanabilirliği prototiple doğrulanır **[?]**; olmazsa gözlenebilir sonuç testi (boot sonrası DOM) ile sınırlanır |
| A0-10 | Tarayıcı | Erken tıklama: script yürütülmeden önce `setBlogLang` düğmesine tıklamanın bugünkü davranışı (belgelenir, geçiş sonrası iyileşme "davranış farkı" olarak kaydedilir) | İsteğe bağlı |

**Doğrulama ölçütleri (A0'ın kendisi için):**

1. Her yeni test mevcut `main`'de yeşil (karakterizasyon).
2. **Mutasyon kontrolü:** her testin korunan davranışı bozulur (ör. `window.setBlogLang`'ı sil, `gtag("config")` çağrısını kaldır, inline blok ekle, scriptlerin sırasını değiştir, `boot`'u `DOMContentLoaded`'dan çıkar) ve test kırılmalıdır; mutasyonlar geri alınır ve sonuç belgeye yazılır.
3. Zamanlama duyarlı testler (A0-09, A0-08) ≥30 ardışık yerel koşuda sıfır başarısızlık; R-FILTER-04/R-KEYBOARD-08 ile karıştırılmaz.
4. Üç tarayıcı projesi/viewport'ta aynı sonuç; üçüncü taraf hizmetler fixture ile taklit (gerçek AdSense/GTM isteği yok).
5. Mevcut assertion'lar değişmedi (`git diff` yalnızca eklenen testler).
6. CI yeşili **ön-birleştirme kanıtıdır**; A0'ın değeri taşıma PR'larında regresyonu yakalaması; üretim doğrulaması taşıma yayınından sonra `test:production` ve canlı gözlemle ayrı yapılır.

**A0 tamamlanma koşulu:** A0-01..A0-09 yazılı, mevcut kodda yeşil, mutasyonlar yakalıyor, belgeye işlenmiş ve sahip onaylamış. Ancak bundan sonra A1 başlar.

## 5b. Mevcut test planı (aşama başına)

Her aşamadan önce ve sonra, **mevcut assertion'lar değişmeden**:

- `npm run test:unit`, tüm Chromium proje matrisi, Cross-browser Keyboard Tests (CI, **ön-birleştirme** kanıtı) + A0 testleri.
- Aşamaya özgü: ilgili R-* testleri (filtre, klavye, reklam R-AD-*, resume ipucu).
- **Üretim doğrulaması** (CI'dan ayrı): birleştirme ve yayın sonrası `test:production` duman testi ve canlı sayfada manuel gözlem (Blog/Projects içerik sayısı, dil düğmeleri, Tab sırası).
- A6/A7 (odak/yönlendirme zamanlamasına dokunabilir): ≥30 tekrarlı koşu ve R-FILTER-04/R-KEYBOARD-08 diagnostics'inin izlenmesi; bu iki testin kök nedeni bu işle karıştırılmaz ve tek başına geçmeleri çözülmüş sayılmaz.

## 6. Riskler

| Risk | Olasılık / etki | Önlem |
| --- | --- | --- |
| Sıra/`DOMContentLoaded` farkı | Orta / yüksek (filtre ve dil) | Aynı konum, klasik script, sıra testi |
| `onclick` global'inin kaybı | Orta / yüksek (test sözleşmesi) | Globaller korunur, A0 testi |
| Tema flash | Düşük / orta | 8 ve 404 en son |
| `category-filters.test.js` kırılması | Kesin (kod taşınınca) | Aynı beklentilerle yeni dosyadan okuma |
| AdSense bozulması (CSP) | CSP uygulanırsa belirsiz / yüksek (gelir, hesap) | Ana sayfaya CSP uygulanmaz (varsayılan) |
| Eski HTML + yeni JS | Düşük | `?v=` ve aynı yayın |

## 7. Karar bekleyenler (öncelik ve bağımlılık: [OPEN-ITEMS.md](OPEN-ITEMS.md))

- **D-5/D-6 uygulaması:** A0 (yalnızca koruma testleri) ve sonrasında A1-A7'nin sırayla yürütülmesine onay (her biri ayrı PR).
- **D-7a:** reklamsız sayfalarda meta CSP pilotu.
- **D-7b:** ana sayfa için CSP hedefi (CSP'siz / edge+nonce / hash+yükleyici).
