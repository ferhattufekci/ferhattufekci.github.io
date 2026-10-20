# Projeye özgü otomasyon stratejisi

## Amaç ve kapsam

Bu kişisel portföy için öncelik, ziyaretçinin doğru bölüme ulaşması ve ajanların kamuya açık bilgiyi doğru okuyabilmesidir. Testler risk temelli seçildi. ISTQB'deki test seviyeleri, eşdeğer sınıflar, sınır değerler, durum geçişleri ve gereksinim izlenebilirliği yaklaşımı kullanıldı; bir sertifikasyon veya tam standart uygunluğu iddiası yoktur.

## Test katmanları ve izlenebilirlik

| Gereksinim / risk | Öncelik | Test seviyesi ve kapsam |
| --- | --- | --- |
| R-NAV-01/02/03: yanlış URL, boş ekran, yanlış bölüm eşleşmesi | Yüksek | Saf rota fonksiyonunda geçerli/geçersiz/bozuk kodlama/önek sınıfları; BDD gerçek menü ve hata kurtarma |
| R-NAV-04/05: geçmiş veya animasyon sırasında bozulma | Yüksek | Tarayıcıda geri/ileri, geçiş sırasında yanlış hash ve kurtarma |
| R-NAV-06: geçiş tanımının geçersiz sınıf kullanması | Orta | 0–67 seçenekleri, -1/68/kesir/NaN sınırları; stil dosyasıyla sözleşme kontrolü |
| R-404-01/02: yanlış HTTP durumu veya kullanışsız hata ekranı | Yüksek | HTTP entegrasyonu, ortak kart bileşeni, odak ve klavye ile kurtarma |
| R-THEME-01/02/03/04: yanlış tema, bozuk/engelli depolama | Orta | Başlangıç ve tema modülü birim testleri; OS/saklanan tercih karar tablosu; gerçek tarayıcıda kalıcılık |
| R-CONTENT-01/02/03: içerik kaybı, bozuk HTML veya JavaScript bağımlılığı | Yüksek | Markdown dönüşümü, escaping, idempotent üretim, ham HTML, JavaScript kapalı tarayıcı |
| R-A11Y-01: yeni ekranlarda erişilebilirlik kusurları | Yüksek | Yeni 404 ve güven sayfalarında axe WCAG A/AA kontrolleri; gerçek klavye/odak senaryosu |
| R-DEPLOY-01: kaynak/test/bağımlılıkların yanlışlıkla yayımlanması | Yüksek | Yalnız public dosyalardan artifact; içerik eşitliği ve özel dizinlerin yokluğu |
| R-CI-01: bütün Git push denemeleri başarısızken yanlış başarılı iş sonucu | Yüksek | Gerçek Bash retry bloğu, izole git/sleep taklitleriyle geçici başarı ve tükenen denemeler için sınanır |
| R-FIRST-01/02: pahalı kontrollerin erken çalışması veya testlerin ortak dosyaları değiştirmesi | Orta | CI adım sırası; izole proje kökünde içerik üretimi; asıl kaynağın değişmemesi |
| R-HTTP-01–05: eski probe önbelleği, soft-404, yanlış MIME, bozuk XML/JSON ve ağ hatasının karışması | Yüksek | Her koşuda UUID kök/iç içe GET matrisi; bilerek bozulmuş yanıtlar; header/gövde kanıtı; strict XML parser; platform sınırları ayrı tutulur |
| R-FILTER-01–14: Blog/Projects filtrelerinin birbirini etkilemesi veya yanlış içerik göstermesi | Yüksek | Aşağıdaki karar tablosu, durum geçişleri, gecikmeli/bozuk veri, responsive etiketler ve sayfalama sınırları; altı tarayıcı projesinde çalışır |
| JSON-LD, llms.txt, sitemap, JSON snapshot ve bağlantılar | Yüksek | Bütün amaçlanan public dosyalarda HTTP ve biçim kontrolleri |
| Mevcut filtre ve Medium davranışları | Regresyon | Önceki kategori ve makale testleri de bütün birim test koşularına dahildir |

## TDD ve BDD uygulaması

Yeni tema regresyonu ve erişilebilirlik kontrast kontrolü önce başarısız çalıştırıldı, ardından düzeltildi. Bütün eski kodun başlangıçtan beri TDD ile yazıldığı iddia edilmez. Yeni ortak modüller saf fonksiyonlar veya küçük DOM bileşenleri olarak doğrudan sınanabilir.

BDD senaryoları Playwright Test içinde `Given / When / Then` adımlarıyla yürütülür; ayrı bir Cucumber çalışma zamanı kullanılmaz. Altı proje, 1440/390/320 piksel ile açık/koyu tema kombinasyonlarını kapsar. Mobil projelerde dokunmatik giriş ve mobil viewport da taklit edilir. Gerçek telefon donanımı veya Safari/Firefox kapsamı iddia edilmez.

## Blog ve Projects regresyon kapsamı

`tests/browser/categories.spec.mjs`, istekleri test başına sabit JSON snapshot'larıyla karşılar. Medium/GitHub hesabında içerik değişmesi test beklentilerini değiştirmez. Her senaryo yeni context ile başlar; senaryoların sırasına ve önceki seçime bağımlılık yoktur.

| Karar / geçiş | Otomatik kontrol |
| --- | --- |
| Blog dört kategori × üç dil | 12 kombinasyonda tam başlık listesi, en yeniden eskiye sıralama, dil/kategori rozetleri ve tek aktif/aria-pressed seçimi |
| Projects dört kategori | Sabitlenmiş + normal, yalnız sabitlenmiş, yalnız normal kartlar; bölüm görünürlüğü ve etiketler |
| Sayfalar arası bağımsızlık | Projects dört kategori × Blog dört kategori × üç dil: 48 durum; diğer sayfanın seçimi değişmez, geri dönüşte kartlar doğrulanır |
| Durum geçişleri | Menü, geri/ileri, tema değişimi, tekrar ziyaret, seri filtre değişiklikleri ve iç içe etiket hedeflerine tıklama |
| Boş sonuç ve kurtarma | Dil/kategori kesişiminde sıfır sonuç, boş proje kategorisi, tüm katalogların boş olması ve All'a dönüş |
| Hatalı veri | Ağ hatası, geçersiz JSON, dizi olmayan yanıt, kısmi kategori eksikliği; bir sayfadaki hata diğer sayfayı bozmaz |
| Geç gelen veri | İstek tamamlanmadan seçim yapılır; yükleme göstergesi korunur ve son seçimle doğru sonuç üretilir |
| Tanınmayan proje kategorisi | Eksik/yeni/prototip isimli metadata kartta ve filtrede aynı Software varsayılanına gider |
| Starred sınır değerleri | 0, 1, 20, 21, 40, 41 kayıt; kalan sayı, 20'lik artış, tekrar olmaması, kategori/gezinme sırasında ilerlemenin korunması |
| Boş owned / dolu starred kataloğu | Sahip olunan depolar boşken starred kartlar ve sayfalama kullanılabilir kalır |
| Uzun bölüm etiketleri | Her kategoride görünür etiketin sınırları kapsayıcısının içinde kalır; dar ekranda metin kesilmez. Dil seçiminde görsel active sınıfı ve aria-pressed aynı düğmeyi gösterir. |

Gecikmeli veride hatalı boş ekran ve tutarsız varsayılan kategori önce üç başarısız tarayıcı testiyle gösterildi, ardından düzeltildi. Bütün olası veri ve kullanıcı davranışlarının tüketildiği iddia edilmez; tanımlı filtre durum uzayı ve yüksek riskli sınırlar açıkça kapsanır.

## Güvenilir ve bakımı yapılabilir testler

FIRST ilkeleri bu proje için şu şekilde uygulanır:

- **Fast:** Birim/bileşen/HTTP katmanı CI'da tarayıcı indirilmeden çalışır; hata pahalı aşamaları ve yayını durdurur.
- **Independent:** Üretim ve paketleme testleri ayrı geçici proje kopyalarında çalışır. Testler kaynak dosyaları veya ortak yayın paketini değiştirmez; tarayıcı senaryoları ayrı context kullanır.
- **Repeatable:** Kilitli bağımlılıklar, yerel HTTP sunucusu ve dış servis izolasyonu kullanılır. İçerik üretiminin idempotent olması ayrıca doğrulanır.
- **Self-validating:** Kontroller açık assertion ve çıkış kodlarıyla sonuçlanır; raporları gözle yorumlamak geçme koşulu değildir.
- **Timely:** Yeni regresyon önce başarısız testle gösterilir, ardından düzeltilir. FIRST'teki Timely ve TDD'nin test-first döngüsü ilişkilidir; CI sırası tek başına TDD kanıtı değildir.

- Her tarayıcı senaryosu yeni context ve depolama ile başlar. Sunucular worker başına geçici yerel port kullanır ve kapanır.
- Sabit `sleep` yoktur; Playwright'ın yeniden deneyen durum doğrulamaları kullanılır. Test koşusu tekrarları `0` olarak ayarlıdır; aralıklı hata otomatik tekrarlarla gizlenmez.
- Harici Analytics/AdSense/Calendly kaynakları izole edilir. Testler dış servisin erişilebilirliğini veya randevu oluşturmayı doğrulamaz ve mesaj göndermez.
- Hata halinde trace, ekran görüntüsü ve video; bütün koşularda HTML, JUnit ve JSON raporları üretilir. CI artifact saklama süresi 14 gündür.
- Birim testlerinin TAP çıktısı da CI artifact'ine kaydedilir. Bash `pipefail` sayesinde raporu `tee` ile kaydetmek başarısız testi başarılıya çevirmez.
- axe denetimi yeni ekranları kapsar. Tüm eski portföy için WCAG sertifikasyonu değildir; otomasyon bütün kullanılabilirlik veya ekran okuyucu sorunlarını yakalayamaz.
- Windows'ta hazırlanmış piksel görüntüleri Linux CI için eşik olarak kullanılmaz. Ekran görüntüleri inceleme kanıtıdır; responsive taşma, semantik, odak ve kontrast otomatik doğrulanır. Önceki sürümle tipografi/geometri karşılaştırması ayrıca teslim kanıtlarında bulunur.

## Çalıştırma ve kalite kapısı

```powershell
npm ci
npx playwright install chromium
npm run build
npm run verify -- --local --artifact --all --output=verification-local.json
```

`npm run build` sırasıyla içerik üretimi, bütün birim/bileşen/HTTP testleri, BDD tarayıcı testleri ve `.pages-site` paketlemesini çalıştırır. Bir aşama başarısızsa sonraki aşamaya geçmez. Hızlı geliştirme döngüsü için `npm run test:unit`; yalnız üretim için `npm run generate`; BDD için `npm run test:bdd` kullanılabilir. `npm test` birim/bileşen/HTTP katmanını çalıştırır; tam kapı `npm run build` komutudur.

## GitHub Actions ve GitHub Pages

`pages.yml`, her ana dal push'unda, pull request'te, elle tetiklemede ve başarılı veri senkronizasyonundan sonra ortak kalite iş akışını çağırır. Pull request yalnız test edilir. Ana dal için deploy işi kalite işine `needs` ile bağlıdır; yalnız test edilen `.pages-site` artifact'i yayımlanır. Yayın sonrası gerçek site tekrar doğrulanır. Veri senkronizasyonunda GITHUB_TOKEN ile atılan commit'lerin yeni push koşusu üretmemesi `workflow_run` tetikleyicisiyle karşılanır.

Bu yayın kapısı GitHub deposunda **Settings → Pages → Build and deployment → Source: GitHub Actions** seçeneğiyle etkinleştirilmiştir. Eski “Deploy from a branch” seçeneğine dönülürse testlerden bağımsız yayın gerçekleşebilir; yalnız test dosyası eklemek bunu engellemez. Branch protection/ruleset içinde kalite kontrolünü zorunlu yapmak ayrıca depo yöneticisinin yapabileceği bir işlemdir.

GitHub üzerindeki koşu, runner ve yayın sonuçları Actions geçmişinden doğrulanır; bu sonuçlar yerel test kanıtlarından ayrıdır. Hosting GitHub Pages olarak kalır. Markdown Accept müzakeresi ve canlı MCP sınırlamaları test raporunda açıkça ayrı tutulur.
