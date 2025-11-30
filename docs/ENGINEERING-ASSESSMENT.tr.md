# Mühendislik Değerlendirmesi

**[🇬🇧 English](ENGINEERING-ASSESSMENT.md) | 🇹🇷 Türkçe**

**Kapsam:** `18004f4` commit'indeki deponun tamamı (2026-11-10). **Yöntem:** kaynak kodu,
workflow'ları, testleri ve CI geçmişini okumak; burada çalıştırılabilecek her şeyi
çalıştırmak; varsaymak yerine ölçmek. Her iddia kanıt düzeyini taşır: **[D]** burada
doğrulandı, **[G]** bu deponun CI'ında veya verisinde gözlemlendi, **[B]** sağlayıcı
dokümantasyonu, **[?]** doğrulanmadı.

## 1. Bu proje nedir

GitHub Pages üzerinden sunulan tek sayfalık statik bir portföy sitesidir: `index.html`,
`css/`, `js/` ve üretilen bir `data/` kataloğu. **Backend, veritabanı, kendi API'si ve kimlik
doğrulama yoktur** [D]. İki zamanlanmış workflow (`fetch-medium.yml`, `fetch-github.yml`)
yazarın Medium RSS akışını ve GitHub REST API'sini okur, sonucu `data/*.json` dosyalarına
commit eder; sayfa bu dosyaları çalışma zamanında yükler.

Bu, deponun nasıl değerlendirilmesi gerektiğini belirler. Veritabanı tasarımı, migration,
yetkilendirme modeli, container taraması ve servis sağlık kontrolü gibi kontrol listesi
maddelerinin burada bir karşılığı yoktur. Bunları uydurmak hiçbir şeyi anlatmayan belgeler
üretirdi. Bu maddeler, doldurulmak yerine gerekçeleriyle birlikte 5. bölümde *uygulanamaz*
olarak listelenmiştir.

Depo bunun yerine statik bir sitenin gerçekten sahip olduğu yaşam döngüsü kısmını gösterir:
gereksinim izlenebilirliği, geniş bir tarayıcı test takımı, tam SHA kapısı olan bir yayın
pipeline'ı, bilinçli olarak yalnızca gözlem yapan bir hata kurtarma mekanizması ve açık
teknik borcun belgelenmiş kaydı.

## 2. Envanter

| Alan | Durum |
|---|---|
| Uygulama | `index.html` (3.961 satır), 17 CSS dosyası, 29 JS dosyası, jQuery 3.6 + Modernizr, build zamanı framework'ü yok [D] |
| Üretilen veri | 8 JSON dosyası, 205 kayıt; iki zamanlanmış workflow ile yeniden üretilir [D] |
| Build | Pages artifact'ini `scripts/package-pages.mjs` üretir; `npm run build` sırasıyla üretim → birim testleri → paketleme → artifact testi adımlarını çalıştırır [D] |
| Birim / sözleşme testleri | `scripts/tests/` altında 38 dosya, `node:test`, framework yok [D] |
| Tarayıcı testleri | `tests/browser/` altında 24 spec, Playwright, 6 cihaz/tema projesi, Chromium + Firefox + WebKit [D] |
| Gereksinim kimlikleri | 265 başlıklı testte 222 farklı kimlik, 43 alan [D] |
| Workflow'lar | 5 adet: `pages.yml` (4 job), `test-agent-readiness.yml` (yeniden kullanılabilir), 2 veri çekici, `recover-release.yml` [D] |
| Dokümantasyon | README (479 satır, EN+TR), `TEST-STRATEGY.md`, `docs/` altında 9 dosya (bu değişiklikten önceki sayılar) [D] |

## 3. Bulunan güçlü yanlar

Bir inceleyicinin önce bakması gereken noktalar bunlardır; her biri depoda doğrulanabilir.

1. **Gereksinim izlenebilirliği gösteriş değil, gerçektir.** Her test başlığı bir kimlikle
   başlar (`R-RESUME-06 | Given Resume, then ...`). 222 kimlik kullanılmaktadır [D].
   `docs/business-analysis/requirements-traceability-matrix.md` içindeki matris, test
   dosyalarından `scripts/generate-rtm.mjs` ile üretilir. `scripts/tests/rtm.test.js`, dosya
   bayatsa *ve* her test başlığını bağımsız olarak tarayan kontrol üreticinin kaçırdığı bir
   kimlik bulursa başarısız olur. İkinci kontrol, üreticinin ilk sürümünün çok kimlikli
   başlıkları (`R-PROGRESS-01/02/04 | …`) sessizce atlaması ve bunu bağımsız bir incelemenin
   yakalaması nedeniyle vardır.
2. **Pipeline'ın tedarik zinciri sabitlenmiştir.** Üçüncü taraf 7 action'ın tamamı bir etiket
   yerine commit SHA'sına sabitlenmiştir [D]. Workflow izinleri en az yetki ilkesine göredir:
   dosya düzeyinde `contents: read`, yalnızca iki veri çekici job'da `contents: write`, ve
   depodaki en güçlü yetki olan `actions: write` yalnızca gözlem modundaki kurtarma
   job'unda [D].
3. **Yayın bütünlüğü.** `pages.yml` değişmez tek bir kaynak SHA'sı belirler, tam olarak o
   artifact'i test eder ve deploy job'u yerine yenisi gelmiş bir yayını reddeder. Artifact
   baytları canlı doğrulamadan önce yeniden kontrol edilir [D].
4. **Hata kurtarma varsayılan olarak yalnızca gözlem yapar.** `scripts/ci/recovery.mjs` ne
   *yapacağına* karar verir ve bunu kaydeder; yalnızca depo değişkeni
   `PORTFOLIO_RECOVERY_ACT` `true` olduğunda işlem yapar, bu değişken kapalıdır [G]. 14 testi
   gerçek komutu, sadeleştirilmiş bir `PATH` üzerinde sahte bir `gh`/`git` ile çalıştırır ve
   dürüst olmayan bir raporun (eylem başarısızken `performed: true`) yakalandığını gösteren
   mutasyon kontrolleri içerir.
5. **Testler doğru sebeple başarısız olacak şekilde yazılmıştır.** Birçok test takımı açık
   mutasyon kontrolleri taşır; yani testin, yerleştirilmiş bir regresyonu yakaladığı
   varsayılmaz, kanıtlanır.

## 4. Bulgular

Sonuçlarına göre sıralanmıştır. "Burada düzeltildi" bu değişiklikte demektir; geri kalanlar
örtbas edilmeden kayda geçirilmiştir.

### F-1 Üçüncü taraf güven sınırında doğrulanmamış URL şeması — **burada düzeltildi**
`index.html`, akış değerlerini doğrudan DOM'a atar: makaleler için `link.href = art.url` ve
`image.src = art.thumbnail`, depolar için `href="${escHtml(r.url)}"` [D]. Bu değerler Medium
RSS akışından ve GitHub API'sinden şema kontrolü olmadan geliyordu; bu yüzden bir
`javascript:` bağlantısı çalışan bir href olurdu. İki kaynak da yazarın kendi hesapları
olduğundan istismar olasılığı düşüktü, ama sınır korumasızdı.

Üretim anında `scripts/lib/safe-url.mjs` ile düzeltildi. Bu yardımcı `new URL()` ile
ayrıştırır ve ham girdi yerine *serileştirilmiş* URL'yi döndürür; böylece doğrulanan şey
tam olarak yazılan şeydir. Görüntülenen her değere uygulanır: Medium `url` (makale atılır)
ve `thumbnail` (makaleye göre çözülür, böylece protokolden bağımsız `<img src>` kapakları
çalışmaya devam eder; güvensizse atılır), GitHub `html_url` (depo atılır) ve `homepage`
(boşaltılır; şu an görüntülenmez).

Kaynağı okuyarak değil davranışla doğrulandı: `scripts/tests/sync-fetchers.test.js` içindeki
`R-DATA-URL-03/04`, gerçek fetch giriş noktalarını tehlikeli URL'ler sunan yerel sahte bir
Medium/GitHub sunucusuna karşı çalıştırır ve `data/` içine yazılanı doğrular.
`scripts/tests/data-contract.test.js` içindeki `R-DATA-URL-01/02`, commit edilen veriyi ve
yardımcıyı gizlenmiş şemalara (`java\tscript:`, baştaki kontrol karakterleri, `data:`,
`blob:`) karşı kontrol eder. Bu değişikliğin önceki bir sürümünde onun yerine kaynak kodda
arama yapan bir test vardı; bağımsız bir inceleme bu testin korumalar kaldırıldığında da
geçtiğini gösterdi ve test değiştirildi.

### F-2 Content-Security-Policy yok — **bilinçli olarak düzeltilmedi**
Site CSP içermez [D]. CSP, F-1'i derinlemesine istismar edilemez kılacak kontroldür. Burada
eklenmemesinin nedeni, sayfanın hâlâ büyük satır içi `<script>` blokları ve satır içi olay
nitelikleri taşımasıdır. Anlamlı olacak kadar güçlü bir politika ya `'unsafe-inline'`
gerektirir ki bu onu göstermelik yapar, ya da her blok için hash/nonce gerektirir. GitHub
Pages bunları header olarak sunamaz; `<meta>` etiketine konmaları gerekir ve her düzenlemede
bozulurlar. Doğru sıra şudur: önce CSP yaklaşımını (D-7) netleştirmek, sonra satır içi
betikleri ayırmak, ardından `'unsafe-inline'` gerektirmeyen bir CSP eklemek. A0 birleştirildi;
A1, D-7 netleşene kadar ertelendi (sahibin kararı, 2026-11-11): taşıma CSP geçişine
hazırlıktır, tek başına CSP koruması sağlamaz ve ek bir yükleme bağımlılığı getirir
(`docs/T-4-INLINE-SCRIPTS.md`). `docs/OPEN-ITEMS.md` içinde takip edilir.

### F-3 CI'da bağımlılık veya gizli bilgi taraması yok
CI'da `npm audit` adımı ve gizli bilgi taraması yoktur [D]. (Düzeltme, 2026-11-11: `.github/dependabot.yml`
mevcuttur ve npm ile GitHub Actions için haftalık gruplanmış güncelleme PR'ları açar, örn. #45;
`47c36ef` üzerinde `npm audit` 0 açık bildirdi [D].) Burada iki
farklı yüzeyi ayrı tutmak gerekir:
- **Build zamanı:** `package.json` içinde 6 devDependency. Bunlar tarayıcıya hiç ulaşmaz.
  `npm audit`/Dependabot bunları kapsar.
- **Tarayıcıda çalışma zamanı:** depoya eklenmiş kütüphaneler (`js/jquery-3.6.0.min.js`,
  Modernizr, `imagesloaded`, `jquery.shuffle`, `owl.carousel`) ve uzaktan yüklenen
  betikler: Google AdSense, Google Tag Manager ve Calendly (`index.html`) [D]. Bunların
  hiçbiri `package.json` içinde değildir, bu yüzden `npm audit` bunları **görmez**. Uzak
  betiklerin sürümü bu depo tarafından hiç yönetilmez; onları yalnızca bir CSP (F-2) ve,
  sağlayıcı izin veriyorsa, Subresource Integrity kısıtlar.

Çalışma zamanı yüzeyi daha büyüktür. Önerilir ama burada eklenmedi: üst kaynaktaki bir
güvenlik uyarısıyla başarısız olabilen bir tarama kapısı, pipeline politikası kararıdır.

### F-4 `index.html`, modüllere ait davranışları üzerinde topluyor
Dosyanın yaklaşık dörtte biri satır içi betiktir: blog görüntüleme, proje görüntüleme, dil
ve kategori filtreleri, analytics. Asıl yapısal borç budur. Zaten karakterizasyon testleri
altındadır (`tests/browser/inline-script-contract.spec.mjs`, 21 test, A0); böylece ayırma
işleminin davranışı koruduğu kanıtlanabilir. Plan: `docs/T-4-INLINE-SCRIPTS.md`.

### F-5 Tip kontrolü yok
TypeScript yok, `checkJs` yok. `scripts/` ve `js/` üzerinde bir `tsc --checkJs` kapısı, gerçek
bir hata sınıfını ucuza yakalardı. Burada eklenmedi: yeni bir devDependency gerektirir ve bu
depo için geçerli kural, anlaşma olmadan yeni bağımlılık eklememektir.

### F-6 Asıl CI hata türü tarayıcı job'larının süre sınırlarıydı
`42796215632` numaralı koşu bir test başarısız olduğu için değil, tarayıcı shard'ı 767/801.
testte 40 dakikalık job süre sınırına, klavye job'u da 621/658. testte 50 dakikaya ulaştığı
için kırmızıydı [G]. Aynı spec'ler için test başına süre 2026-11-08'e göre yaklaşık iki
katına çıkmıştı [G]. Süre sınırları 60/75 dakikaya çıkarıldı (PR #46, birleştirildi).
Yavaşlamanın nedeni **[?]**; aynı sayfalar yerelde Chromium'da aynı süreyi verdi, bu yüzden
hosted runner farklılığı bir sonuç değil, çalışma hipotezidir. Shard'lar süreye göre değil
dosya sayısına göre bölünür; gerçek yeniden dengeleme hâlâ açıktır.

### F-7 Açıklanamayan iki test hatası
`R-FILTER-04` (iki kez, small-mobile, shard 2/2) ve `R-KEYBOARD-01` (WebKit/Firefox, birkaç
koşu, her seferinde farklı bir öğe) [G]. İkisinin de kök nedeni kanıtlanmadı; bu ortamın ağ
izin listesi içinde trace'ler alınamadı. `docs/OPEN-ITEMS.md` içinde kayıtlıdır (RF, RK-01).
Bunları gizlemek için hiçbir doğrulama gevşetilmedi ve yeniden deneme eklenmedi.

### F-8 Depo düzeni
`README.md` lisans koşullarını belirtir ama `LICENSE` dosyası yoktur; `SECURITY.md` de yoktur
[D]. Dokümantasyonun geri kalanı `docs/` altındayken `TEST-STRATEGY.md` depo kökündedir.
Düşük önemde, bütünlük için listelenmiştir.

## 5. Uygulanamayan kontrol listesi maddeleri ve nedenleri

| Madde | Neden uygulanmaz |
|---|---|
| Veritabanı tasarımı, migration'lar | Veritabanı yok. İçerik, iki herkese açık kaynaktan üretilen JSON'dur. |
| API tasarımı, API testleri | Site bir API sunmaz. `scripts/verify-agent-endpoints.mjs`, *yayınlanan statik uç noktaları* (`llms.txt`, `sitemap.xml`, ajan içeriği) kontrol eder; gerçek dünyadaki en yakın karşılık budur ve zaten vardır. |
| Kimlik doğrulama / yetkilendirme | Hesap, oturum ve sunucu yok. |
| Docker / Docker Compose / container taraması | Yayınlanan artifact, GitHub Pages için statik bir pakettir. Container, tüketicisi olmayan bir build yüzeyi eklerdi. |
| Gizli bilgi yönetimi | Pipeline yalnızca geçici `GITHUB_TOKEN` kullanır; yapılandırılmış ve gereken bir gizli bilgi yoktur [D]. |
| Staging ortamı | GitHub Pages tek bir site sunar. PR koşuları artifact'i yayınlamadan üretir ve test eder; mevcut olan karşılık budur. |
| CSRF | Durum değiştiren istek yoktur. |

## 6. Öncelikler

1. F-7'yi çözmek (trace erişimi gerekir): test takımının güvenilirliği diğer her şeyin
   önündeki kapıdır.
2. Tarayıcı shard'larını ölçülen süreye göre yeniden dengelemek (F-6).
3. Satır içi betiklerin ayrılmasına devam etmek (F-4), ardından `'unsafe-inline'` gerektirmeyen
   bir CSP eklemek (F-2).
4. Bağımlılık taraması (F-3) ve tip kontrolü kapısı (F-5) eklemek; her biri ayrı bir karar
   olarak.
5. Düzen: `LICENSE`, `SECURITY.md`, `TEST-STRATEGY.md` dosyasını `docs/testing/` altına
   taşımak (F-8).

## 7. Bu değerlendirme nasıl kontrol edildi

Bu belgeyi ekleyen değişikliğin bağımsız incelemesi, içinde dördü engelleyici olmak üzere 19
kusur buldu: korumalar kaldırıldığında da geçen bir test, 9 gereksinim kimliğini atlayan bir
üretici, bu nedenle yanlış olan bir izlenebilirlik iddiası ve tarayıcıya hangi üçüncü taraf
kodunun ulaştığına dair yanlış bir ifade. Hepsi birleştirmeden önce düzeltildi; düzeltmeler
PR geçmişinde görülebilir. İnceleme burada, yukarıdaki iddiaların hafızadan yazılmak yerine
koda karşı test edildiğinin kanıtı olduğu için anılmıştır.
