# Portföy — Geçici Kabul Prosedürü (GKP)

## Belge bilgileri

| Alan | Değer |
| --- | --- |
| Proje / uygulama | Ferhat Tüfekçi kişisel portföyü / GitHub Pages, vanilla HTML-CSS-JS |
| Belge kimliği | FT-PORTFOLIO-GKP-001 — bu depo için yerel belge kimliği; kurumsal/onaylı gereksinim numarası değildir |
| Sürüm / tarih | 0.1 / 2026-10-24 |
| Hazırlayan sorumluluk | Test analizi ve otomasyon mühendisliği; kişi: TBD |
| Gözden geçiren / tarih | TBD / TBD |
| Onaylayan / tarih | TBD / TBD |
| Durum | Teknik inceleme taslağı; resmi kabul/onay verilmedi |
| İncelenen başlangıç | `c2e55b79bcbad70c4074ee5a404974d7ca8ee20b`; yürütmede gerçek commit ve ortam ayrıca kaydedilir |
| Biçim kaynağı | Kullanıcının GKP ekran görüntüsündeki GEREKSİNİMLER bölümü ve 11 sütun. İç gereksinimler, kayıtlar, renk kodları ve GK/KUD anlamları aktarılmadı. |

| Revizyon | Tarih | Değişiklik | Onay |
| --- | --- | --- | --- |
| 0.1 | 2026-10-24 | Uygulamadan türetilmiş RTM, tekrarlanabilir veri, adım bazlı manuel kabul tasarımı | TBD |

## Kapsam, amaç ve kabul koşulları

Amaç; ziyaretçinin beş ana bölüme ulaşması, Resume kanıtlarının kaybolmaması, filtrelerin bağımsızlığı, hata kurtarma, temalar, erişilebilir etkileşimler ve statik yayın çıktılarının izlenebilir biçimde sınanmasıdır. Backend, kullanıcı hesabı, rol/yetki yönetimi, ödeme, kayıt CRUD işlemleri ve gerçek randevu oluşturma uygulamada yoktur; bunlar için yapay test üretilmedi. Harici servis kullanılabilirliği bu prosedürün kabul ölçütü değildir.

Giriş: incelenecek commit kaydedilmiş; `npm ci` ve `npx playwright install chromium` tamamlanmış; yerel test ortamı çalışıyor; yürütücü/tarayıcı/OS sürümleri kaydedilmiş; ilgili veri seti hazır. Önceki koşunun sekmeleri ve depolaması temizlenmiş olmalıdır. CI ve manuel kabul sonuçları ayrı kaydedilir.

Çıkış önerisi: kapsam içindeki yüksek riskli vakalar Pass; Fail ve Blocked kayıtları gerekçeli; kalan kusurlar ürün sahibince değerlendirilmiş; kanıtlar ve RTM güncel; bağımsız inceleyen prosedürü tekrarlayabiliyor. Bu bir onay yerine geçmez. Kritik/yüksek açık kusur veya belirsiz kabul ölçütü varsa koşulsuz kabul verilemez. Mevcut kontrast/ok erişilebilirliği borcu için ürün sahibi kararı TBD'dir.

Sonuç sözlüğü: **Not Run**, **Pass**, **Fail**, **Blocked**, **Not Applicable**. GK/KUD eşlemesi tanımlı değildir. Her adım başlangıçta Not Run'dır. Doküman doğrulaması veya otomatik test başarısı manuel adımları Pass yapmaz. Bir vaka, tüm uygulanabilir adımları Pass olduğunda Pass olur; uygulanamazlık ve blokaj gerekçesi yazılır. Bu revizyonda **manuel yürütme yapılmadı**.

### Ortam ve ortak ön koşullar

- **ÖK-1:** Teste özel temiz tarayıcı profili; masaüstü 1440×900, mobil 390×844 ve 320×700; ayrıca 768/1280px ve 991/992/993px menü sınırı. DevTools Device Toolbar'da boyutu ve dokunma emülasyonunu ayrı seçin; pencereyi daraltmak tek başına touch testi değildir. Açık/koyu tema ayrı yürütülür. CSS'deki 992px uygulama sınırıdır; cihaz modeli sınırlaması değildir.
- **ÖK-2:** Yerel kaynak önizlemesi: `npm run preview`; terminalde yazan URL esas alınır. Port 3000 doluysa PowerShell'de `$env:PORT=3100; npm run preview`. Üçüncü taraf reklam/analitik/randevu davranışı bu ortamda kabul kanıtı sayılmaz; randevu/mesaj gönderilmez.
- **ÖK-3:** Sentetik filtre tarayıcısı: `node tests/manual/preview.mjs`. Mevcut Playwright Chromium'u görünür açar; JSON snapshot'larını ağda taklit eder, kaynak dosyaları değiştirmez; harici servisleri engeller. Terminalde URL ve seçenekler görünür. Tarayıcıyı kapatınca veya terminalde `q` ve Enter girince oturum/sunucu kapanır. Her vaka için yeni oturum açılır. `--headless` yalnız araç smoke kontrolü içindir; görsel manuel kabul kanıtı değildir.
- **ÖK-4:** DevTools Network'te Preserve log açık, cache kapalı. HTTP testlerinde GET, final URL, Content-Type, Vary ve gövde birlikte kaydedilir. Yerel HTTP, GitHub Pages header davranışına kanıt değildir.
- **ÖK-5:** Depolama testleri yalnız yerel test origin'inde yapılır. DevTools ile `ft-theme` silinir/bozulur veya Storage erişimi engellenir. Diğer sitelerin verisi temizlenmez.

Gerçek telefon, Firefox/WebKit/Safari, ekran okuyucu ve üretim ortamındaki yürütmeler ayrı konfigürasyon kaydı ister. Mevcut otomasyon Chromium ile sınırlıdır; diğer tarayıcılar için onaylanmış destek matrisi TBD.

### Test verileri ve sıfırlama

| Veri | Tanım / kurulum | Geçerli, geçersiz ve sınır girdileri | Sıfırlama |
| --- | --- | --- | --- |
| TD-1 | [Resume doğrulanmış snapshot](../../tests/fixtures/resume-content.json), [kaynak HTML](../../index.html) | Ankara 37, Gazi 11, lise 16 = 64; 5 iş, 2 Engineering Contributions, 14 sertifika. Ankara 30/57 toplamı görevde eski kalmıştı; kullanıcı 37'nin korunmasını açıkça onayladı. | Sayfayı yeniden yükle; native details başlangıçta kapalı |
| TD-2 | [Sentetik katalog](../../tests/browser/data/catalog.mjs), standart manuel tarayıcı | 6 makale: Systems EN/TR, Testing EN/TR, Software EN/TR. Projeler: systems-pinned, testing-pinned, systems-rest, software-rest. Gerçek müşteri/veri/kimlik bilgisi yok. | Tarayıcıyı kapat; yeni oturum |
| TD-3 | `node tests/manual/preview.mjs --starred=19` (sayıyı her koşuda değiştir) | 0, 1, 19, 20, 21, 39, 40, 41 yıldızlı kayıt; adlar star-1…star-N. 19/20/21 ve 39/40/41 üç noktalı sınır kümeleri. | Yeni oturum ve ilgili sayı |
| TD-4 | `node tests/manual/preview.mjs --scenario=empty` veya `--scenario=invalid-json` | Empty: tüm diziler boş. Invalid-json: Test makaleleri, owned/starred repo istekleri bozuk JSON; Systems ve Software sağlam kalır. Ağ hatası için DevTools Request Blocking ile yalnız ilgili `/data/…json` engellenir. | Engeli kaldır; yeni standart oturum |
| TD-5 | `node tests/manual/preview.mjs --hold=blog` veya `--hold=projects` | İlgili JSON yanıtları terminalde Enter'a kadar bekler; bekleme sırasında filtre değiştirilebilir. Sabit uykuya veya gerçek ağ hızına bağlı değildir. | Enter ile serbest bırak; oturumu kapat |
| TD-6 | Tema girdileri | `ft-theme`: yok, `invalid`, `light`, `dark`; OS açık/koyu. Engelli erişim için `node tests/manual/preview.mjs --storage=blocked`; getter sentetik SecurityError üretir. Gerçek tarayıcı politikasının tüm etkilerini taklit ettiği iddia edilmez. | Sadece test origin'inde anahtarı temizle; temiz oturum |
| TD-7 | Rotalar | geçerli beş hash; `#res`, `#resumes`, `#Resume`, `#resume/nope`, `#%E0%A4%A`, `#constructor`; her yürütmede yeni UUID ile olmayan kök ve iç içe yol | Başlangıç URL'sine dön; yeni UUID |

Standart makale beklenen sırası All/All için: **Systems EN, Testing TR, Software EN, Software TR, Testing EN, Systems TR**. Dil EN: Systems EN, Software EN, Testing EN; TR: Testing TR, Software TR, Systems TR. Tek kategoride EN/TR o kategorinin ilgili kaydıdır. Beklenti uygulamanın filtre fonksiyonundan hesaplanmaz.

### Kaynaklar

- **S-1:** [index.html](../../index.html), [Resume snapshot](../../tests/fixtures/resume-content.json), 24 Ekim 2026 kullanıcı ders sayısı onayı.
- **S-2:** [rota politikası](../../js/route-policy.js), [sayfa geçişleri](../../js/pages-switcher.js), [ortak menü](../../js/site-shell.js).
- **S-3:** [tema](../../js/theme.js), [erken tema başlatma](../../js/theme-init.js), [tema tokenları](../../css/dark-theme.css).
- **S-4:** [filtre BDD](../../tests/browser/categories.spec.mjs), [sentetik veri](../../tests/browser/data/catalog.mjs).
- **S-5:** [güven içeriği](../../content/trust-pages.json), [üretici](../../scripts/lib/agent-documents.mjs), [404 kaynağı](../../js/error-card.js).
- **S-6:** [HTTP doğrulayıcı](../../scripts/verify-agent-endpoints.mjs), [yayın envanteri](../../scripts/lib/public-files.mjs), [yayın akışı](../../.github/workflows/pages.yml).
- **S-7:** [test stratejisi](../../TEST-STRATEGY.md#test-strategy-tr), [otomasyon denetimi](TEST-AUDIT.md).
- **S-8:** [reklam yaşam döngüsü](../../js/adsense.js), [reklam ayarları](../../js/adsense-config.js), [reklam BDD](../../tests/browser/adsense.spec.mjs), [durum sözleşmesi](../../scripts/tests/adsense.test.js).

## GEREKSİNİMLER ve izlenebilirlik matrisi

> **Kapsam:** otomasyonun taşıdığı her gereksinim kimliği aşağıda en az bir vakaya bağlıdır (GKP-031–GKP-046 satırları test başlıklarından türetilmiştir, "Derived / Pending Validation"). Adım sonuçlarının özeti ve her build'in otomasyon sonucu, bu belgenin adım tablolarından otomatik üretilen [TRACEABILITY.md](TRACEABILITY.md) raporundadır. GKP-046, kullanıcının doğrudan gözleyemediği sözleşmeler için build kanıtının statik incelemesidir; elle yeniden yürütme değildir.

Depoda onaylı SRS/baseline gereksinim kataloğu yoktur. Aşağıdaki `R-*` kimlikleri mevcut otomasyon/risk kimlikleridir; **resmi kurumsal gereksinim numarası değildir**. Tanımlar uygulama ve önceki kullanıcı taleplerinden türetilmiştir: **Derived / Pending Validation**. `R-RESUME-02` içindeki 37 ders kararı kullanıcı tarafından doğrulanmıştır; tüm belgenin resmi kabulü yine TBD'dir. Yeni `R-NAV-08`, `R-RESUME-13`, `R-CI-02` de yerel risk/test kimlikleridir.

Kapsam sütunundaki **Designed** yalnızca manuel tasarım bağlantısı olduğunu söyler; yürütme başarısı değildir. Listedeki risklerin tamamı aşağıda en az bir vakaya bağlıdır. Bu, ürünün bütün olası gereksinimlerinin yüzde yüz kapsandığı iddiası değildir.

| Gereksinim No | Doğrulanan davranış | Kaynak | Test Case ID | Otomasyon / test türü | Risk | Kapsam | Not / açık |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-NAV-01 | Beş ana bölüm ve aktif menü seçimi aynı hedefi gösterir | S-2 | GKP-001 | portfolio.spec.mjs; pozitif/durum | Yüksek | Designed | Derived / Pending Validation |
| R-NAV-08 | Oklar ilk/son bölümde sarar; hata görünümünden kurtarır | S-2 | GKP-001 | portfolio.spec.mjs; sınır/durum | Orta | Designed | Okların klavye semantiği eksik; AÇ-2 |
| R-NAV-02 | Geçersiz/bozuk hash boş ekran yerine 404 görünümü açar | S-2 | GKP-002 | route-policy.test.js, portfolio.spec.mjs; negatif | Yüksek | Designed | Hash HTTP 200'dür |
| R-NAV-04 | Geri/ileri doğru bölüm ve seçimi geri getirir | S-2 | GKP-002, GKP-014, GKP-028 | portfolio.spec.mjs; durum | Yüksek | Designed | Derived / Pending Validation |
| R-NAV-05 | Animasyon sırasında hatalı hash kurtarmayı bozmaz | S-2 | GKP-027 | portfolio.spec.mjs; negatif/geçiş | Yüksek | Designed | Manuel zamanlama sınırlı; otomasyon daha kesin |
| R-404-01 | Olmayan gerçek yollar HTTP 404 döndürür | S-5, S-6 | GKP-003 | HTTP + portfolio.spec.mjs; negatif | Yüksek | Designed | HTML 404, Markdown değil |
| R-404-02 | İstemci hatası başlık odağı ve klavyeyle kurtarma sağlar | S-2 | GKP-002 | error-card.test.js, portfolio.spec.mjs; erişilebilirlik | Yüksek | Designed | Derived / Pending Validation |
| R-SHELL-04 | İki hata görünümü aynı kabuk/mesaj/kurtarma anlamını taşır | S-5 | GKP-003 | not-found-shell.spec.mjs; regresyon | Orta | Designed | Path 404 ve hash 200 ayrımı korunur |
| R-THEME-02 | Geçerli kayıt OS'den öncelikli; aksi halde OS izlenir | S-3 | GKP-004 | theme.test.js; karar tablosu | Orta | Designed | Derived / Pending Validation |
| R-THEME-03 | Storage engeli tema etkileşimini durdurmaz | S-3 | GKP-006 | theme.test.js; negatif | Orta | Designed | Kalıcılık engelde beklenmez |
| R-THEME-04 | Kontroller eşleşir; seçim yenilemede kalır | S-3 | GKP-005 | theme.test.js, portfolio.spec.mjs; durum | Orta | Designed | Derived / Pending Validation |
| R-ICON-01 | Pointer bırakınca basılı görünüm biter; klavye odağı görünür | S-3 | GKP-007 | button-states.spec.mjs; girdi/erişilebilirlik | Yüksek | Designed | Hover yalnız gerçek hover cihazında |
| R-ICON-02 | Menü kapatma yöntemi odağı doğru yerde bırakır | S-2 | GKP-007 | button-states.spec.mjs; durum | Yüksek | Designed | Escape odağı geri getirir |
| R-RESUME-01 | Resume içeriği ve görsel okuma sırası korunur | S-1 | GKP-008, GKP-010 | resume-disclosures.test.js/spec.mjs; içerik | Yüksek | Designed | 8 başlık ve PDF eylemi = 9 parça |
| R-RESUME-02 | Üç okulun 37/11/16 derslik tek düz listesi vardır | S-1 | GKP-009 | resume-disclosures.test.js; veri bütünlüğü | Yüksek | Designed | 37 kullanıcı onaylı; kategorileştirme yok |
| R-RESUME-03 | Beş işte ilk üç katkı görünür; uzun katkı/araçlar bağımsız açılır | S-1 | GKP-010 | resume-disclosures.test.js/spec.mjs; durum | Yüksek | Designed | Engineering Contributions ayrıca görünür |
| R-RESUME-04 | 14 sertifika korunur; başlangıçta 6 görünür | S-1 | GKP-011 | resume-disclosures.test.js/spec.mjs; içerik | Yüksek | Designed | Derived / Pending Validation |
| R-RESUME-05 | Markdown kapalı içeriklerin tamamını tekrarsız taşır | S-1, S-6 | GKP-024 | resume-disclosures.test.js; entegrasyon | Yüksek | Designed | Dekoratif preview dışarıda |
| R-RESUME-07 | Ders panelleri dokunma/klavyeyle bağımsız açılıp kapanır | S-1 | GKP-009 | resume-disclosures.spec.mjs; durum | Yüksek | Designed | Derived / Pending Validation |
| R-RESUME-09 | Summary/sertifika açılımı rota dönüşünde kalır, reload'da sıfırlanır | S-1 | GKP-008, GKP-014 | resume-disclosures.spec.mjs; durum | Yüksek | Designed | Tam sayfa kalıcılığı beklenmez |
| R-RESUME-10 | Dar/geniş ekran ve temalarda taşma olmadan okunur | S-1 | GKP-013, GKP-028 | resume-disclosures.spec.mjs; responsive | Yüksek | Designed | Fiziksel cihaz ve diğer motorlar Not Run |
| R-RESUME-11 | Akademik paragraf bir kez ve Since 2011 önünde yer alır | S-1 | GKP-008 | resume-disclosures.test.js/spec.mjs; içerik | Yüksek | Designed | Ankara için bölüm birinciliği ima edilmez |
| R-RESUME-13 | PDF eylemi ayrı bağlamda mevcut PDF'yi açar | S-1 | GKP-012, GKP-028 | resume-disclosures.spec.mjs + HTTP; navigasyon | Yüksek | Designed | Zorunlu indirme değildir; AÇ-3 |
| R-RESUME-14 | TÜBİTAK araç başlığı diğer araç başlıklarının tipografisini kullanır | S-1 | GKP-010 | resume-disclosures.spec.mjs; computed stil | Orta | Designed | Kullanıcı talebi; kısa liste açık kalır |
| R-LINK-01 | Privacy telifle aynı tipografiyi ve mevcut link ikonunu taşır | S-1 | GKP-022 | link-details.spec.mjs; stil/erişilebilirlik | Orta | Designed | Kaynak tasarım korunur |
| R-LINK-02 | İletişim ikonları fontları ve yeni sekme hedeflerini bozmaz | S-1 | GKP-022 | link-details.spec.mjs; navigasyon | Orta | Designed | Harici servis sonucu kabul edilmez |
| R-LINK-03 | Illinois sertifikası STG'nin hemen arkasındadır | S-1 | GKP-011 | link-details.spec.mjs; içerik/navigasyon | Orta | Designed | Coursera doğrulama hedefi korunur |
| R-TRUST-04 | Trust başlığı tek dönüş eylemi, footer geçerli sayfa bağlamı sunar | S-5 | GKP-023 | trust-navigation.spec.mjs; navigasyon | Orta | Designed | Sayfalar yayımlanmaya devam eder |
| R-CONTENT-03 | JavaScript kapalıyken anlamlı içerik ve trust sayfaları okunur | S-1, S-5 | GKP-015 | portfolio.spec.mjs; negatif | Yüksek | Designed | Dinamik filtre/tema çalışma şartı değildir |
| R-FILTER-01 | Blog 4 kategori × 3 dilde doğru sıralı kayıtları gösterir | S-4 | GKP-016 | categories.spec.mjs; karar tablosu | Yüksek | Designed | Tam başlık/sıra oracle'ı |
| R-FILTER-02 | Projects dört kategoride pinned/normal grupları doğru gösterir | S-4 | GKP-017 | categories.spec.mjs; karar tablosu | Yüksek | Designed | Starred kategori dışıdır |
| R-FILTER-10 | Blog ve Projects 48 birleşimde birbirini etkilemez | S-4 | GKP-018 | categories.spec.mjs; birleşik durum | Yüksek | Designed | Tek başına adet eşitliği yeterli değil |
| R-FILTER-07 | Hatalı/boş katalog diğer sağlam kategoriyi bozmaz | S-4 | GKP-019 | categories.spec.mjs; negatif/EP | Yüksek | Designed | Ağ, bozuk JSON, yanlış şekil ayrı otomasyon sınıfları |
| R-FILTER-08 | Bekleyen veride loading doğru, son seçim belirleyicidir | S-4 | GKP-020 | categories.spec.mjs; zaman/geçiş | Yüksek | Designed | Kontrollü release, sabit uyku yok |
| R-FILTER-09 | Starred 20'lik partilerde eksiksiz ve tekrarsız açılır | S-4 | GKP-021 | categories.spec.mjs; BVA | Yüksek | Designed | 0/1/19/20/21/39/40/41 |
| R-A11Y-01 | Ekranlar beklenmeyen erişilebilirlik kusuru eklemez | S-7 | GKP-025, GKP-028 | portfolio.spec.mjs + manuel inceleme | Yüksek | Designed | Mevcut borç giderilmedi; AÇ-1/2/4 |
| R-DEPLOY-01 | Yalnız test edilmiş public dosyalar yayımlanır | S-6 | GKP-026 | pages-package.test.js; entegrasyon | Yüksek | Designed | Uzak yeni akış yürütmesi bu görevde yok |
| R-HTTP-01 | GET matrisi ve makine dosyaları gerçek durum/gövdeyle kontrol edilir | S-6 | GKP-003, GKP-024 | http-verification.test.js; HTTP/biçim | Yüksek | Designed | Üç hosting/kapsam kısıtı ayrı raporlanır |
| R-CI-02 | Canlı doğrulama test edilmiş artifact'in kaynak SHA'sını kullanır | S-6 | GKP-026 | first-principles.test.js + actionlint; CI sözleşmesi | Yüksek | Designed | GitHub yürütmesi yayın yetkisi sonrası |
| R-EXTERNAL-01 | İsteğe bağlı randevu scripti veya storage hatası uncaught hata üretmez | S-1 | GKP-029 | external-widget.spec.mjs; negatif/hata toleransı | Orta | Designed | Harici servisin kendisi test kapsamı dışındadır |
| R-AD-01 | Her reklam birimi sayfanın kendi içeriği ve genişliği yerleştikten sonra yalnız bir kez istenir | S-8 | GKP-030 | adsense.spec.mjs AC-05/06, AC-05/13; yaşam döngüsü/zaman | Yüksek | Designed | Gerçek reklam sunucusu yanıtı test edilmez |
| R-AD-02 | Blog (yazı içi) ve Projects (Multiplex) kodları hesaptaki birim türüyle eşleşir | S-8 | GKP-030 | adsense.test.js AC-13/15; sözleşme | Yüksek | Designed | Türün hesapla eşleşmesi hesap panelinden doğrulanır; depoda kanıtı yok |
| R-AD-03 | Doldurulmayan veya engellenen reklam boş kabuk bırakmaz; içerik ve gezinme çalışır | S-8 | GKP-030 | adsense.spec.mjs AC-01/02/03, AC-08/14; negatif | Yüksek | Designed | Doldurma oranı ve gösterim kabul ölçütü değildir |
| R-A0-01 | Hepsi `ok`. | Otomasyon | GKP-046 | inline-script-contract.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-A0-02 | Hepsi `ok`. | Otomasyon | GKP-046 | inline-script-contract.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-A0-05 | Hepsi `ok`. | Otomasyon | GKP-046 | inline-script-contract.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-A0-05b | Hepsi `ok`. | Otomasyon | GKP-046 | inline-script-contract.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-A11Y-02 | Hepsi `ok`. | Otomasyon | GKP-046 | accessibility-debt.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-AD-EMPTY-01 | Görünür boş mesaj veya dolu görünen boş kutu oluşmaz. | Otomasyon | GKP-043 | adsense.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-AD-SCROLL-01 | Panel kayar; kontrol şeridi sabit kalır; reklam doğal yüksekliğindedir. | Otomasyon | GKP-043 | adsense.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-ARROW-01 | Dokunuş bitince iki ok da normal renge döner. | Otomasyon | GKP-035 | arrow-controls.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-ARROW-02 | Hover çıkınca biter; klavye odağı görünür kalır; Enter/Space sayfayı değiştirir. | Otomasyon | GKP-035 | arrow-controls.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-ARROW-03 | Basılı görünüm geçicidir; sayfa değişmez. | Otomasyon | GKP-035 | arrow-controls.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-ARROW-04 | Aktif görünüm temizlenir; fare hover'ı yeniden çalışır. | Otomasyon | GKP-035 | arrow-hybrid.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-ASSET-01 | Hepsi `ok`; atlanmış veya başarısız yok. Koşu bağlantısını ve SHA'yı kaydet. | Otomasyon | GKP-046 | asset-versioning.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-BLOG-SHARE-01 | Odak görünür; menü her tuşla açılıp kapanır; `aria-expanded` durumu eşleşir. | Otomasyon | GKP-031 | blog-sharing-keyboard.spec.mjs, blog-sharing.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-BLOG-SHARE-02 | Her seçenek kartın orijinal makale URL'sini yalnız kendi platform yoluna taşır. | Otomasyon | GKP-032 | blog-sharing.spec.mjs, blog-sharing.test.js; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-BLOG-SHARE-03 | B için kuyruğa alınmış kopyalama olmaz; B için yeni bir etkinleştirme gerekir; A'nın sonucu B'ye yazılmaz. | Otomasyon | GKP-032 | blog-sharing-keyboard.spec.mjs, blog-sharing.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-BLOG-SHARE-04 | El ile kopyalanacak URL görünür ve Tab ile ulaşılır; odak ve seçim kendiliğinden yer değiştirmez. | Otomasyon | GKP-032 | blog-sharing-keyboard.spec.mjs, blog-sharing.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-BLOG-SHARE-05 | Yeni işlem kuyruğa alınmaz; kilit sürer; pano yan etkisi oluşmaz. | Otomasyon | GKP-033 | blog-sharing-keyboard.spec.mjs, blog-sharing.spec.mjs, blog-sharing.test.js; manuel | Orta | Designed | Derived / Pending Validation |
| R-BLOG-SHARE-06 | Yeni işlem kuyruğa alınmaz; kilit sürer; pano yan etkisi oluşmaz. | Otomasyon | GKP-033 | blog-sharing-keyboard.spec.mjs, blog-sharing.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-BLOG-SHARE-07 | B için kuyruğa alınmış kopyalama olmaz; B için yeni bir etkinleştirme gerekir; A'nın sonucu B'ye yazılmaz. | Otomasyon | GKP-032 | blog-sharing-keyboard.spec.mjs, blog-sharing.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-BLOG-SHARE-08 | Odak görünür; menü her tuşla açılıp kapanır; `aria-expanded` durumu eşleşir. | Otomasyon | GKP-031 | blog-sharing-keyboard.spec.mjs, blog-sharing.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-BLOG-SHARE-09 | Aynı yazı tipi/boyut; hover yalnız metni etkiler; hedef alanları kaymaz. | Otomasyon | GKP-034 | blog-sharing-appearance.spec.mjs, blog-sharing-cache.spec.mjs, blog-sharing-feedback.spec.mjs, blog-sharing-layout.spec.mjs, blog-sharing.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-BLOG-SHARE-10 | Panel konumu, hash ve tarayıcı geçmişi değişmez. | Otomasyon | GKP-034 | blog-sharing.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-BLOG-SHARE-11 | Pano makale URL'sini içerir; geri bildirim kartın dilindeki onaylı metni gösterir (TR kartta Türkçe). | Otomasyon | GKP-032 | blog-sharing.spec.mjs, blog-sharing.test.js; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-BLOG-SHARE-12 | B için kuyruğa alınmış kopyalama olmaz; B için yeni bir etkinleştirme gerekir; A'nın sonucu B'ye yazılmaz. | Otomasyon | GKP-032 | blog-sharing-keyboard.spec.mjs, blog-sharing.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-BLOG-SHARE-13 | Statik makale bağlantıları çalışır; işlevsiz bir Share eylemi görünmez. | Otomasyon | GKP-034 | blog-sharing.spec.mjs, blog-sharing.test.js; manuel | Orta | Designed | Derived / Pending Validation |
| R-BLOG-SHARE-14 | Kartlar güncel stillerle görünür; yerel paylaşım göstergesi sabit kalır. | Otomasyon | GKP-034 | blog-sharing-cache.spec.mjs, blog-sharing.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-BUTTON-01 | Hover bırakılınca biter; klavye odağı görünür; basılı renk tema renklerini kullanır; About Me Resume CTA ile aynı görünür. | Otomasyon | GKP-036 | button-states.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-BUTTON-02 | Portföy ifadeleri kullanılır; bağlantılar geçerli bölümlere götürür. | Otomasyon | GKP-036 | button-states.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-BUTTON-03 | Fare tıklamasından sonra odak çerçevesi kalmaz; klavye odağı görünür. | Otomasyon | GKP-036 | button-states.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-BUTTON-04 | Hover bırakılınca biter; klavye odağı görünür; basılı renk tema renklerini kullanır; About Me Resume CTA ile aynı görünür. | Otomasyon | GKP-036 | button-states.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-CI-01 | Hepsi `ok`; atlanmış veya başarısız yok. Koşu bağlantısını ve SHA'yı kaydet. | Otomasyon | GKP-046 | sync-workflows.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-APT-01 | Hepsi `ok`. | Otomasyon | GKP-046 | apt-network-bounds.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-APT-02 | Hepsi `ok`. | Otomasyon | GKP-046 | apt-network-bounds.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-01 | Hepsi `ok`. | Otomasyon | GKP-046 | deploy-recovery.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-02 | Hepsi `ok`. | Otomasyon | GKP-046 | deploy-recovery.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-03 | Hepsi `ok`. | Otomasyon | GKP-046 | deploy-recovery.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-04 | Hepsi `ok`. | Otomasyon | GKP-046 | deploy-recovery.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-05 | Hepsi `ok`. | Otomasyon | GKP-046 | deploy-recovery.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-06 | Hepsi `ok`. | Otomasyon | GKP-046 | deploy-recovery.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-07 | Hepsi `ok`. | Otomasyon | GKP-046 | deploy-recovery.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-08 | Hepsi `ok`. | Otomasyon | GKP-046 | deploy-recovery.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-09 | Hepsi `ok`. | Otomasyon | GKP-046 | deploy-recovery.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-10 | Hepsi `ok`. | Otomasyon | GKP-046 | deploy-recovery.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-11 | Hepsi `ok`. | Otomasyon | GKP-046 | deploy-recovery.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-12 | Hepsi `ok`. | Otomasyon | GKP-046 | deploy-recovery.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-13 | Hepsi `ok`. | Otomasyon | GKP-046 | deploy-recovery.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-14 | Hepsi `ok`. | Otomasyon | GKP-046 | deploy-recovery.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-15 | Hepsi `ok`. | Otomasyon | GKP-046 | deploy-recovery.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-16 | Hepsi `ok`. | Otomasyon | GKP-046 | deploy-recovery.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-17 | Hepsi `ok`. | Otomasyon | GKP-046 | deploy-recovery.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-18 | Hepsi `ok`. | Otomasyon | GKP-046 | deploy-recovery.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-19 | Hepsi `ok`. | Otomasyon | GKP-046 | deploy-recovery.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-20 | Hepsi `ok`. | Otomasyon | GKP-046 | deploy-recovery.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-21 | Hepsi `ok`. | Otomasyon | GKP-046 | deploy-recovery.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-22 | Hepsi `ok`. | Otomasyon | GKP-046 | deploy-recovery.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-C1-00 | Hepsi `ok`. | Otomasyon | GKP-046 | recovery-act.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-C1-01 | Hepsi `ok`. | Otomasyon | GKP-046 | recovery-act.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-C1-02 | Hepsi `ok`. | Otomasyon | GKP-046 | recovery-act.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-C1-03 | Hepsi `ok`. | Otomasyon | GKP-046 | recovery-act.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-C1-04 | Hepsi `ok`. | Otomasyon | GKP-046 | recovery-act.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-C1-05 | Hepsi `ok`. | Otomasyon | GKP-046 | recovery-act.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-C1-06 | Hepsi `ok`. | Otomasyon | GKP-046 | recovery-act.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-C1-07 | Hepsi `ok`. | Otomasyon | GKP-046 | recovery-act.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-C1-08 | Hepsi `ok`. | Otomasyon | GKP-046 | recovery-act.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-C1-09 | Hepsi `ok`. | Otomasyon | GKP-046 | recovery-act.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-C1-10 | Hepsi `ok`. | Otomasyon | GKP-046 | recovery-act.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-C1-11 | Hepsi `ok`. | Otomasyon | GKP-046 | recovery-act.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-C1-12 | Hepsi `ok`. | Otomasyon | GKP-046 | recovery-act.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CI-RECOVER-C1-13 | Hepsi `ok`. | Otomasyon | GKP-046 | recovery-act.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-CONTENT-01 | Bağlantılar tam adresli; olgular HTML ile aynı; betik veya iskelet kod yok; gezinme metni Markdown'a girmez. | Otomasyon | GKP-045 | agent-documents.test.js; manuel | Orta | Designed | Derived / Pending Validation |
| R-CONTENT-02 | Hepsi `ok`. | Otomasyon | GKP-046 | agent-documents.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-DATA-COLOR-01 | Hepsi `ok`. | Otomasyon | GKP-046 | data-contract.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-DATA-NUM-01 | Hepsi `ok`. | Otomasyon | GKP-046 | data-contract.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-DATA-SYNC-01 | Hepsi `ok`. | Otomasyon | GKP-046 | sync-fetchers.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-DATA-SYNC-02 | Hepsi `ok`. | Otomasyon | GKP-046 | data-snapshot.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-DATA-SYNC-03 | Hepsi `ok`. | Otomasyon | GKP-046 | data-snapshot.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-DATA-SYNC-04 | Hepsi `ok`. | Otomasyon | GKP-046 | data-snapshot.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-DATA-SYNC-05 | Hepsi `ok`. | Otomasyon | GKP-046 | data-snapshot.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-DATA-URL-01 | Hepsi `ok`. | Otomasyon | GKP-046 | data-contract.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-DATA-URL-02 | Hepsi `ok`. | Otomasyon | GKP-046 | data-contract.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-DATA-URL-03 | Hepsi `ok`. | Otomasyon | GKP-046 | sync-fetchers.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-DATA-URL-04 | Hepsi `ok`. | Otomasyon | GKP-046 | sync-fetchers.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-DISCLOSURE-01 | Hepsi `ok`. | Otomasyon | GKP-046 | resume-disclosure-labels.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-DISCLOSURE-02 | Hepsi `ok`. | Otomasyon | GKP-046 | resume-disclosure-labels.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-DISCLOSURE-03 | Her düğmenin sayısı doğru, adı benzersiz ve bağlamlıdır; klavye durumu yereldir. | Otomasyon | GKP-041 | resume-disclosures.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-DOC-01 | Hepsi `ok`; raporda bilinmeyen kimlik yok. | Otomasyon | GKP-046 | documentation-navigation.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-DOC-02 | Hepsi `ok`; raporda bilinmeyen kimlik yok. | Otomasyon | GKP-046 | documentation-navigation.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-DOC-03 | Hepsi `ok`; raporda bilinmeyen kimlik yok. | Otomasyon | GKP-046 | documentation-navigation.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-DOC-RTM-01 | Hepsi `ok`; raporda bilinmeyen kimlik yok. | Otomasyon | GKP-046 | rtm.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-DOC-RTM-02 | Hepsi `ok`; raporda bilinmeyen kimlik yok. | Otomasyon | GKP-046 | rtm.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-DOC-RTM-03 | Hepsi `ok`; raporda bilinmeyen kimlik yok. | Otomasyon | GKP-046 | rtm.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-DOC-TRACE-01 | Hepsi `ok`; raporda bilinmeyen kimlik yok. | Otomasyon | GKP-046 | traceability.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-DOC-TRACE-02 | Hepsi `ok`; raporda bilinmeyen kimlik yok. | Otomasyon | GKP-046 | traceability.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-DOC-TRACE-03 | Hepsi `ok`; raporda bilinmeyen kimlik yok. | Otomasyon | GKP-046 | traceability.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-DOC-TRACE-04 | Hepsi `ok`; raporda bilinmeyen kimlik yok. | Otomasyon | GKP-046 | traceability.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-DOC-TRACE-05 | Hepsi `ok`; raporda bilinmeyen kimlik yok. | Otomasyon | GKP-046 | traceability.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-FILTER-03 | Her sayfanın seçimi ve Starred ilerlemesi ayrı korunur. | Otomasyon | GKP-037 | categories.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-FILTER-04 | Eski kartlar kaybolur, boş durum görünür; All ile makale döner; Projects seçimi değişmez. | Otomasyon | GKP-037 | categories.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-FILTER-05 | Sabitlenmiş ve normal kartlar tekrarsız geri gelir. | Otomasyon | GKP-037 | categories.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-FILTER-06 | Kart beyan edilen yedek kategoride görünür. | Otomasyon | GKP-037 | categories.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-FILTER-11 | Her kategoride kullanılabilir, yerleşmiş bir boş durum görünür; sayfa kilitlenmez. | Otomasyon | GKP-037 | categories.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-FILTER-12 | Her sayfada tek ve doğru seçim kalır. | Otomasyon | GKP-037 | categories.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-FILTER-13 | Starred sayfalaması kullanılabilir kalır. | Otomasyon | GKP-037 | categories.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-FILTER-14 | Bölüm etiketleri kapsayıcısının içinde kalır. | Otomasyon | GKP-037 | categories.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-FIRST-01 | Hepsi `ok`; atlanmış veya başarısız yok. Koşu bağlantısını ve SHA'yı kaydet. | Otomasyon | GKP-046 | first-principles.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-FIRST-02 | Hepsi `ok`; atlanmış veya başarısız yok. Koşu bağlantısını ve SHA'yı kaydet. | Otomasyon | GKP-046 | first-principles.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-GKP-01 | Hepsi `ok`. | Otomasyon | GKP-046 | manual-preview.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-GKP-02 | Hepsi `ok`. | Otomasyon | GKP-046 | manual-documentation.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-GKP-03 | Hepsi `ok`. | Otomasyon | GKP-046 | manual-documentation.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-HOVER-04 | Makale bağlantısı ve Share iki ayrı Tab durağıdır; odak çerçevesi yalnız etiket metnini çevreler. | Otomasyon | GKP-031 | blog-sharing-keyboard.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-HTTP-02 | Hepsi `ok`. | Otomasyon | GKP-046 | http-verification.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-HTTP-03 | Hepsi `ok`. | Otomasyon | GKP-046 | http-verification.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-HTTP-04 | Hepsi `ok`. | Otomasyon | GKP-046 | http-verification.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-HTTP-05 | Hepsi `ok`. | Otomasyon | GKP-046 | http-verification.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-HTTP-06 | Hepsi `ok`. | Otomasyon | GKP-046 | http-verification.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-HTTP-07 | Bağlantı çalışır ve PDF açılır; kırık bağlantı mevcut PDF ile gizlenmez. | Otomasyon | GKP-045 | http-verification.test.js; manuel | Orta | Designed | Derived / Pending Validation |
| R-ICON-03 | Hover hareketi yalnız fareli cihazda ve hareket tercihine uygun; güven sayfalarında düğme hizalı ve klavyeyle kullanılır. | Otomasyon | GKP-036 | button-states.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-ICON-04 | Hover hareketi yalnız fareli cihazda ve hareket tercihine uygun; güven sayfalarında düğme hizalı ve klavyeyle kullanılır. | Otomasyon | GKP-036 | button-states.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-KEYBOARD-01 | Odak görünür ve sıralıdır; skip link içeriğe atlar; gizli sayfalarda Tab durağı yoktur. | Otomasyon | GKP-038 | keyboard-accessibility.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-KEYBOARD-02 | Odak her işlemden sonra beklenen yerdedir. | Otomasyon | GKP-038 | keyboard-accessibility.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-KEYBOARD-03 | Filtre odağı korunur; açılırlar yerel davranır; bilgi kapatılınca odak tetikleyiciye döner. | Otomasyon | GKP-038 | keyboard-accessibility.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-KEYBOARD-04 | Show More kaybolduğunda odak kaybolmaz, anlamlı bir öğeye taşınır. | Otomasyon | GKP-038 | keyboard-accessibility.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-KEYBOARD-05 | Odak görünür ve sıralıdır; skip link içeriğe atlar; gizli sayfalarda Tab durağı yoktur. | Otomasyon | GKP-038 | keyboard-accessibility.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-KEYBOARD-06 | Her bağlantıda tüm kelimeleri ve dış bağlantı simgesini kapsayan tek bir odak kutusu vardır. | Otomasyon | GKP-038 | keyboard-accessibility.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-KEYBOARD-07 | Hepsine ulaşılır; odak örtülmez. | Otomasyon | GKP-038 | keyboard-accessibility.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-KEYBOARD-08 | Odak sayfanın kontrol şeridinden başlar; içerik önceki/sonraki oklarla biter. | Otomasyon | GKP-038 | keyboard-accessibility.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-MOTION-01 | Kayma çekmece kapandıktan sonra, rota sırasına uygun yönde başlar ve temiz biter. | Otomasyon | GKP-039 | page-transitions.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-MOTION-02 | Kayma olmadan anında geçer; gezinme kilitlenmez. | Otomasyon | GKP-039 | page-transitions.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-MOTION-03 | Son istenen bölüm açılır; geçmiş tutarlıdır. | Otomasyon | GKP-039 | page-transitions.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-MOTION-04 | Ekranda iki sayfa kalmaz; gezinme çalışmaya devam eder. | Otomasyon | GKP-039 | page-transitions.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-MOTION-05 | Kayma çekmece kapandıktan sonra, rota sırasına uygun yönde başlar ve temiz biter. | Otomasyon | GKP-039 | page-transitions.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-MOTION-06 | Gezinme bozulmaz; çekmece yeniden açılabilir. | Otomasyon | GKP-039 | motion-completion.test.js, page-transitions.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-MOTION-07 | Ekranda iki sayfa kalmaz; gezinme çalışmaya devam eder. | Otomasyon | GKP-039 | page-transitions.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-NATIVE-RESULT-01 | Tamamlanınca bekleme göstergesi kalkar ve "gönderildi" iddia edilmez; iptalde yalnız açık bir yeniden deneme yeni işlem başlatır. | Otomasyon | GKP-033 | blog-sharing-feedback.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-NATIVE-RESULT-02 | Tamamlanınca bekleme göstergesi kalkar ve "gönderildi" iddia edilmez; iptalde yalnız açık bir yeniden deneme yeni işlem başlatır. | Otomasyon | GKP-033 | blog-sharing-feedback.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-NATIVE-RESULT-03 | Tamamlanınca bekleme göstergesi kalkar ve "gönderildi" iddia edilmez; iptalde yalnız açık bir yeniden deneme yeni işlem başlatır. | Otomasyon | GKP-033 | blog-sharing-feedback.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-NAV-03 | Hepsi `ok`. | Otomasyon | GKP-046 | route-policy.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-NAV-06 | Hepsi `ok`. | Otomasyon | GKP-046 | page-animations.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-NAV-07 | Her gezinmede tek bir bölüm ve en fazla bir kurtarma görünümü olur. | Otomasyon | GKP-039 | portfolio.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-PANEL-01 | Kontrol şeridi yerinde kalır; son içerik görünür hale gelir. | Otomasyon | GKP-040 | fixed-page-controls.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-PANEL-02 | Yalnız içerik başa döner; odak ve yatay kaydırma korunur. | Otomasyon | GKP-040 | fixed-page-controls.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-PANEL-03 | İçerik doğal kayar; kontroller, odak ve geçmiş kullanılabilir kalır. | Otomasyon | GKP-040 | fixed-page-controls.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-PANEL-04 | Kontroller genel başlığın altında kalır; içerik alanı kullanılabilir kalır. | Otomasyon | GKP-040 | fixed-page-controls.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-PANEL-05 | Durumlar kendi panelinde kalır; son filtre geçerli olur. | Otomasyon | GKP-040 | fixed-page-controls.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-PANEL-06 | Ekran yüksekliği/taşma kısıtı kalkar; açılım durumu değişmez. | Otomasyon | GKP-040 | fixed-page-controls.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-PANEL-07 | Başlık sabit, bölge adlandırılmış; bağlantılar korunur; dönüşte başa döner; yazdırma çalışır. | Otomasyon | GKP-040 | fixed-page-controls.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-PIPE-01 | Hepsi `ok`; atlanmış veya başarısız yok. Koşu bağlantısını ve SHA'yı kaydet. | Otomasyon | GKP-046 | pipeline.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-PIPE-02 | Hepsi `ok`; atlanmış veya başarısız yok. Koşu bağlantısını ve SHA'yı kaydet. | Otomasyon | GKP-046 | pipeline.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-PIPE-03 | Hepsi `ok`; atlanmış veya başarısız yok. Koşu bağlantısını ve SHA'yı kaydet. | Otomasyon | GKP-046 | pipeline.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-PIPE-04 | Hepsi `ok`; atlanmış veya başarısız yok. Koşu bağlantısını ve SHA'yı kaydet. | Otomasyon | GKP-046 | pipeline.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-PIPE-05 | Hepsi `ok`; atlanmış veya başarısız yok. Koşu bağlantısını ve SHA'yı kaydet. | Otomasyon | GKP-046 | pipeline.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-PIPE-06 | Hepsi `ok`; atlanmış veya başarısız yok. Koşu bağlantısını ve SHA'yı kaydet. | Otomasyon | GKP-046 | pipeline.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-PIPE-07 | Hepsi `ok`; atlanmış veya başarısız yok. Koşu bağlantısını ve SHA'yı kaydet. | Otomasyon | GKP-046 | ci-reporter.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-PIPE-08 | Hepsi `ok`; atlanmış veya başarısız yok. Koşu bağlantısını ve SHA'yı kaydet. | Otomasyon | GKP-046 | ci-reports.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-PIPE-09 | Hepsi `ok`; atlanmış veya başarısız yok. Koşu bağlantısını ve SHA'yı kaydet. | Otomasyon | GKP-046 | ci-reports.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-PIPE-10 | Hepsi `ok`; atlanmış veya başarısız yok. Koşu bağlantısını ve SHA'yı kaydet. | Otomasyon | GKP-046 | ci-reports.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-PIPE-11 | Hepsi `ok`; atlanmış veya başarısız yok. Koşu bağlantısını ve SHA'yı kaydet. | Otomasyon | GKP-046 | ci-reports.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-PIPE-12 | Hepsi `ok`; atlanmış veya başarısız yok. Koşu bağlantısını ve SHA'yı kaydet. | Otomasyon | GKP-046 | ci-reports.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-PIPE-13 | Hepsi `ok`; atlanmış veya başarısız yok. Koşu bağlantısını ve SHA'yı kaydet. | Otomasyon | GKP-046 | ci-report-flow.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-PROGRESS-01 | Etiketin sonundaki simge ilerleme göstergesine döner; etiket, hedef, odak ve canlı bölge metni değişmez; kart yükseklikleri değişmez. | Otomasyon | GKP-033 | blog-sharing-feedback.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-PROGRESS-02 | Etiketin sonundaki simge ilerleme göstergesine döner; etiket, hedef, odak ve canlı bölge metni değişmez; kart yükseklikleri değişmez. | Otomasyon | GKP-033 | blog-sharing-feedback.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-PROGRESS-03 | Etiketin sonundaki simge ilerleme göstergesine döner; etiket, hedef, odak ve canlı bölge metni değişmez; kart yükseklikleri değişmez. | Otomasyon | GKP-033 | blog-sharing-feedback.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-PROGRESS-04 | Etiketin sonundaki simge ilerleme göstergesine döner; etiket, hedef, odak ve canlı bölge metni değişmez; kart yükseklikleri değişmez. | Otomasyon | GKP-033 | blog-sharing-feedback.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-PROGRESS-05 | Etiketin sonundaki simge ilerleme göstergesine döner; etiket, hedef, odak ve canlı bölge metni değişmez; kart yükseklikleri değişmez. | Otomasyon | GKP-033 | blog-sharing-feedback.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-PROGRESS-06 | Etiketin sonundaki simge ilerleme göstergesine döner; etiket, hedef, odak ve canlı bölge metni değişmez; kart yükseklikleri değişmez. | Otomasyon | GKP-033 | blog-sharing-feedback.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-RELEASE-01 | Hepsi `ok`; atlanmış veya başarısız yok. Koşu bağlantısını ve SHA'yı kaydet. | Otomasyon | GKP-046 | release-selection.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-RELEASE-02 | Hepsi `ok`; atlanmış veya başarısız yok. Koşu bağlantısını ve SHA'yı kaydet. | Otomasyon | GKP-046 | release-selection.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-RELEASE-03 | Hepsi `ok`; atlanmış veya başarısız yok. Koşu bağlantısını ve SHA'yı kaydet. | Otomasyon | GKP-046 | release-selection.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-RELEASE-04 | Hepsi `ok`; atlanmış veya başarısız yok. Koşu bağlantısını ve SHA'yı kaydet. | Otomasyon | GKP-046 | release-selection.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-RESUME-06 | Dokuz parça okuma sırasını korur; yalnız uzun kanıtlar kapalıdır. | Otomasyon | GKP-041 | resume-disclosures.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-RESUME-08 | Tüm içerik sırasıyla görünür; diğer rollerin durumu değişmez. | Otomasyon | GKP-041 | resume-disclosures.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-RESUME-12 | Akademik geçmiş "Since 2011" paragrafından önce ve aynı tipografide gelir. | Otomasyon | GKP-041 | resume-disclosures.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-RESUME-15 | Masaüstünde ders bilgisiyle hizalı; küçük ekranlarda akış korunur. | Otomasyon | GKP-041 | resume-disclosures.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-RESUME-NAV-01 | Yalnız All seçilidir; tüm içerik eksiksizdir; görünür yardımcı etiket yoktur. | Otomasyon | GKP-042 | resume-navigation.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-RESUME-NAV-02 | Doğru bölüme kayar; URL ve geçmiş değişmez; hiçbir bölüm veya açılım gizlenmez. | Otomasyon | GKP-042 | resume-navigation.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-RESUME-NAV-03 | Odaktaki öğe yatayda görünür olur, sayfa dikeyde kaymaz; Enter/Space hedefe odak taşır. | Otomasyon | GKP-042 | resume-navigation.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-RESUME-NAV-04 | Yalnız Resume seçimi sıfırlanır; Blog/Projects seçimleri korunur. | Otomasyon | GKP-042 | resume-navigation.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-RESUME-NAV-05 | Son istek geçerli olur ve korunur. | Otomasyon | GKP-042 | resume-navigation.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-RESUME-NAV-06 | Blog stilini paylaşır; sayfa taşmaz; son öğeye ulaşılır. | Otomasyon | GKP-042 | resume-navigation.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-RESUME-NAV-07 | Başlık panelin en üstünden başlar. | Otomasyon | GKP-042 | resume-navigation.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-SCROLLBAR-01 | Tüm sayfalarda aynı ince bar ve renkler. | Otomasyon | GKP-043 | scrollbar-parity.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-SCROLLBAR-02 | Masaüstüyle aynı tasarımda tek bir bar görünür ve konumu kaydırmayı izler. | Otomasyon | GKP-043 | touch-scrollbar.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-SCROLLBAR-03 | Masaüstüyle aynı tasarımda tek bir bar görünür ve konumu kaydırmayı izler. | Otomasyon | GKP-043 | touch-scrollbar.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-SHELL-01 | Portföy kabuğu görünür; bağlantılar kökten çalışır. | Otomasyon | GKP-044 | not-found-shell.test.js; manuel | Orta | Designed | Derived / Pending Validation |
| R-SHELL-02 | Hepsi `ok`. | Otomasyon | GKP-046 | not-found-shell.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-SHELL-03 | Hepsi `ok`. | Otomasyon | GKP-046 | not-found-shell.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-SHELL-05 | Sayfa okunur ve kurtarma bağlantıları çalışır. | Otomasyon | GKP-044 | not-found-shell.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-THEME-01 | Hepsi `ok`. | Otomasyon | GKP-046 | agent-documents.test.js, theme.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-TRUST-01 | Tek bir dönüş eylemi vardır; footer'da yalnız mevcut sayfa tıklanamaz işaretlidir; diğer hedefler çalışır. | Otomasyon | GKP-044 | trust-navigation.test.js; manuel | Orta | Designed | Derived / Pending Validation |
| R-TRUST-02 | Tek bir dönüş eylemi vardır; footer'da yalnız mevcut sayfa tıklanamaz işaretlidir; diğer hedefler çalışır. | Otomasyon | GKP-044 | trust-navigation.test.js; manuel | Orta | Designed | Derived / Pending Validation |
| R-TRUST-03 | Bağlantılar tam adresli; olgular HTML ile aynı; betik veya iskelet kod yok; gezinme metni Markdown'a girmez. | Otomasyon | GKP-045 | trust-navigation.test.js; manuel | Orta | Designed | Derived / Pending Validation |
| R-TRUST-05 | İkisi hizalı, dokunmaya yeterli büyüklükte ve ekran içindedir. | Otomasyon | GKP-044 | trust-navigation.spec.mjs; manuel | Orta | Designed | Derived / Pending Validation |
| R-COV-01 | Unit coverage raporu (lcov) dosya bazında, normalize yollarla okunur | Otomasyon | GKP-046 | coverage-gate.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-COV-02 | Test dosyaları sayılmaz; unit testin yüklemediği uygulama dosyası %0 sayılır | Otomasyon | GKP-046 | coverage-gate.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-COV-03 | Coverage, commit edilmiş tabanın altına düşünce build kırılır | Otomasyon | GKP-046 | coverage-gate.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-COV-04 | Uygulama dosyaları birinci taraf betiklerdir; vendored kütüphaneler ve testler hariçtir | Otomasyon | GKP-046 | coverage-gate.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-COV-05 | Commit edilmiş coverage tabanı kapının uygulayabileceği bir yüzdedir | Otomasyon | GKP-046 | coverage-gate.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-FOCUS-09 | Menüyle geçişte yeni sayfada yapılan klavye seçimi geçiş bitince korunur | Otomasyon | GKP-039 | navigation-focus.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-FOCUS-10 | Dokunulmayan menü geçişinde odak bölüm başlığına ve ilk Tab durağına gider | Otomasyon | GKP-039 | navigation-focus.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-FOCUS-11 | Okla geçişte yeni sayfada yapılan klavye seçimi geçiş bitince korunur | Otomasyon | GKP-039 | navigation-focus.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-AD-WIDTH-01 | Blog reklamı görünüm daralınca kendi alanının içinde kalır; kaydırma ve Projects değişmez | Otomasyon | GKP-043 | adsense.spec.mjs; manuel | Yüksek | Designed | Derived / Pending Validation |
| R-UNIT-NOTFOUND-01 | `js/not-found-view.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | page-helpers.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-NOTFOUND-02 | `js/not-found-view.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | page-helpers.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-PANELS-01 | `js/page-content-panels.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | content-panels.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-PANELS-02 | `js/page-content-panels.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | content-panels.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-PANELS-03 | `js/page-content-panels.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | content-panels.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-PANELS-04 | `js/page-content-panels.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | content-panels.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-PANELS-05 | `js/page-content-panels.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | content-panels.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-PANELS-06 | `js/page-content-panels.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | content-panels.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-PRELOADER-01 | `js/preloader.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | page-helpers.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-PRELOADER-02 | `js/preloader.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | page-helpers.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-PRELOADER-03 | `js/preloader.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | page-helpers.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-RESNAV-01 | `js/resume-navigation.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | resume-navigation-unit.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-RESNAV-02 | `js/resume-navigation.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | resume-navigation-unit.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-RESNAV-03 | `js/resume-navigation.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | resume-navigation-unit.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-RESNAV-04 | `js/resume-navigation.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | resume-navigation-unit.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-RESNAV-05 | `js/resume-navigation.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | resume-navigation-unit.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-RESNAV-06 | `js/resume-navigation.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | resume-navigation-unit.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-RESNAV-07 | `js/resume-navigation.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | resume-navigation-unit.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-RESNAV-08 | `js/resume-navigation.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | resume-navigation-unit.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-SHELL-01 | `js/site-shell.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | site-shell.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-SHELL-02 | `js/site-shell.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | site-shell.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-SHELL-03 | `js/site-shell.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | site-shell.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-SHELL-04 | `js/site-shell.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | site-shell.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-SHELL-05 | `js/site-shell.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | site-shell.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-SHELL-06 | `js/site-shell.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | site-shell.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-SHELL-07 | `js/site-shell.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | site-shell.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-SHELL-08 | `js/site-shell.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | site-shell.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-STARRED-01 | `js/starred-ads.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | page-helpers.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-STARRED-02 | `js/starred-ads.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | page-helpers.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-STARRED-03 | `js/starred-ads.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | page-helpers.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-TITLE-01 | `js/tab-title.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | page-helpers.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-TITLE-02 | `js/tab-title.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | page-helpers.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-TITLE-03 | `js/tab-title.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | page-helpers.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-TOUCHBAR-01 | `js/touch-scrollbar.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | touch-scrollbar-unit.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-TOUCHBAR-02 | `js/touch-scrollbar.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | touch-scrollbar-unit.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-TOUCHBAR-03 | `js/touch-scrollbar.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | touch-scrollbar-unit.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-TOUCHBAR-04 | `js/touch-scrollbar.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | touch-scrollbar-unit.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-TOUCHBAR-05 | `js/touch-scrollbar.js` birim davranışı (tarayıcı testinin birim düzeyindeki karşılığı) | Otomasyon | GKP-046 | touch-scrollbar-unit.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-TIP-00 | `index.html`'de tek satır içi kişilik ipucu bloğu vardır; ipucu için ayrı betik dosyası yoktur (T-4 A1 ertelendi) | Otomasyon | GKP-046 | resume-info-tip.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-TIP-01 | `index.html` satır içi kişilik ipucu bloğunun birim davranışı (üretim bloğu `index.html`'den okunup çalıştırılır) | Otomasyon | GKP-046 | resume-info-tip.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-TIP-02 | `index.html` satır içi kişilik ipucu bloğunun birim davranışı (üretim bloğu `index.html`'den okunup çalıştırılır) | Otomasyon | GKP-046 | resume-info-tip.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-TIP-03 | `index.html` satır içi kişilik ipucu bloğunun birim davranışı (üretim bloğu `index.html`'den okunup çalıştırılır) | Otomasyon | GKP-046 | resume-info-tip.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-TIP-04 | `index.html` satır içi kişilik ipucu bloğunun birim davranışı (üretim bloğu `index.html`'den okunup çalıştırılır) | Otomasyon | GKP-046 | resume-info-tip.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-UNIT-TIP-05 | `index.html` satır içi kişilik ipucu bloğunun birim davranışı (üretim bloğu `index.html`'den okunup çalıştırılır) | Otomasyon | GKP-046 | resume-info-tip.test.js; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-TIP-01 | Resume sayfası kişilik ipucu için ayrı betik dosyasına başvurmaz ve istemez (kontrollü hata enjeksiyonu) | Otomasyon | GKP-046 | resume-info-tip.spec.mjs; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-TIP-02 | İpucu dosya URL'si engelliyken düğme iki kez etkinleştirilince ipucu açılır (`aria-expanded` true) ve kapanır (kontrollü hata enjeksiyonu) | Otomasyon | GKP-046 | resume-info-tip.spec.mjs; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-TIP-03 | İpucu dosya URL'si engelliyken içeri tıklama açık tutar; dışarı tıklama ve Escape kapatır (kontrollü hata enjeksiyonu) | Otomasyon | GKP-046 | resume-info-tip.spec.mjs; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-TIP-04 | İpucu dosya URL'si engelliyken tıklamayla kapanınca hover bastırılır; imleç çıkınca veya odak kaybolunca kalkar (kontrollü hata enjeksiyonu) | Otomasyon | GKP-046 | resume-info-tip.spec.mjs; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |
| R-TIP-05 | İpucu dosya URL'si engelliyken Resume'dan çıkıp dönünce tek etkinleştirme ipucunu bir kez açar (kontrollü hata enjeksiyonu) | Otomasyon | GKP-046 | resume-info-tip.spec.mjs; kanıt incelemesi | Orta | Designed | Derived / Pending Validation |

## TEST DURUMLARI

Her vakanın adı, amacı, tekniği, önceliği ve otomasyon ilişkisi başlıktadır. Ön koşul/girdi/kısıt her satırda açık kaynak koduyla verilir. ÖK/TD tanımları yukarıdadır. Yürütme kaydında gerçek sonuç ve kanıt ayrı tutulur.

### GKP-001 — Ana gezinme ve ok sınırları

**Amaç:** bölüm ile aktif menü uyumu. **Tür:** Pozitif, sınır, durum geçişi. **Öncelik:** Yüksek. **Otomasyon:** R-NAV-01, R-NAV-08 yeterli Chromium kapsamı; manuel kabul görsel hizayı da değerlendirir.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ana gezinme | Rota ve menü | 1 | `/` aç; mobilde menüyü aç. | About Me görünür; yalnız About Me menü öğesi aktiftir. | URL ve ekran kaydı | Not Run | R-NAV-01 | ÖK-1, ÖK-2 | TD-7 | JS açık |
| Ana gezinme | Beş hedef | 2 | Sırayla Resume, Blog, Projects, Contact, About Me'yi tıkla. | Her seçimde hash ve görünür bölüm eşleşir; tek menü aktiftir; mobil menü kapanır. | Her hedef için kanıt | Not Run | R-NAV-01 | ÖK-1, ÖK-2 | TD-7 | Veri içeriği ayrı vakada |
| Oklar | İleri sınır | 3 | Contact'ta sağ oka bas; sonra dört kez daha bas. | Sıra About Me, Resume, Blog, Projects, Contact; aktif seçim de aynı sıradadır. | İlk/son sınırı | Not Run | R-NAV-08 | ÖK-1, ÖK-2 | TD-7 | Oklar mevcut üründe div; klavye açığı AÇ-2 |
| Oklar | Geri sınır | 4 | About Me'yi aç; sol oka bas. | Contact açılır ve yalnız Contact aktiftir. | Ters sarma | Not Run | R-NAV-08 | ÖK-1, ÖK-2 | TD-7 | Animasyonun bitmesini gözle |

### GKP-002 — Yanlış hash, geçmiş ve odakla kurtarma

**Amaç:** boş ekranı ve yanlış aktif seçimi önlemek. **Tür:** Negatif, EP, durum. **Öncelik:** Yüksek. **Otomasyon:** R-NAV-02/04, R-404-02 yeterli; ekran okuyucu incelemesi manuel.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Yanlış hash | Negatif sınıflar | 1 | `/#resume` aç; TD-7'deki hatalı hash'leri sırayla gir. | Her biri 404 — Page Not Found görünümünü açar; menüde aktif öğe kalmaz; başlık odaklanır. | Her sınıfı kaydet | Not Run | R-NAV-02, R-404-02 | ÖK-1, ÖK-2 | TD-7 | HTTP 200 beklenir |
| Kurtarma | Klavye | 2 | Son hatada Tab, Enter uygula. | Back to Home odaklanır; Enter About Me'ye götürür. | Odağı DevTools ile de gözle | Not Run | R-404-02 | ÖK-1, ÖK-2 | TD-7 | Başlangıç odağı hata başlığı |
| Geçmiş | Geri/ileri | 3 | Resume'yi aç; `#resumes` gir; Back, Forward uygula. | Back Resume, Forward istemci 404 getirir; bölüm/aktif menü uyumludur. | URL zinciri | Not Run | R-NAV-04 | ÖK-1, ÖK-2 | TD-7 | Aynı sekme |
| Kurtarma | Resume bağlantısı | 4 | View Resume'yi tıkla. | `#resume` açılır; tek Resume menüsü aktif olur. | Negatiften geçerliye | Not Run | R-NAV-02 | ÖK-1, ÖK-2 | TD-7 | Soft-404 düzeltmesi değildir |

### GKP-003 — Gerçek 404 ve ortak görünüm

**Amaç:** SEO durum kodu ile ortak hata UX'ini ayrı doğrulamak. **Tür:** Negatif, HTTP, regresyon. **Öncelik:** Yüksek. **Otomasyon:** R-404-01, R-SHELL-04, R-HTTP-01; canlı GET ayrıca gerekir.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Gerçek 404 | Kök ve derin yol | 1 | Yeni UUID üret; `/<uuid>` ve `/<uuid>/a/b/c` için GET gönder. | İkisi de 404; final URL yanlış yol olarak kalır; HTML gövdesi açıklama ve çalışan root-absolute linkler içerir. | Status/final URL/headers/body | Not Run | R-404-01, R-HTTP-01 | ÖK-2, ÖK-4 | TD-7 | Canlı ile yereli ayır |
| Ortak görünüm | Hash/path karşılaştırma | 2 | Aynı tema/genişlikte `/#resumes` ve derin yolu aç. | Aynı başlık, mesaj, fotoğraf/menü/kart/kurtarma eylemleri; path'te noindex; asset hatası yok. | İki ekran görüntüsü | Not Run | R-SHELL-04 | ÖK-1, ÖK-2 | TD-7 | Hash 200, path 404 |
| Markdown talebi | Platform sınırı | 3 | Aynı yolları `Accept: text/markdown` ile GET et. | GitHub Pages'te 404 korunur, Content-Type HTML'dir; Markdown gereksinimi karşılandı sayılmaz. | Kısıt olarak kaydet | Not Run | R-HTTP-01 | ÖK-4 | TD-7 | Hosting sınırı; Pass yalnız ölçümün doğruluğudur |
| Kurtarma | İç içe bağlantı | 4 | Derin hata sayfasından View Resume'yi tıkla. | `/#resume` açılır; kırık göreli asset/yanlış alt yol oluşmaz. | Final URL | Not Run | R-SHELL-04 | ÖK-1, ÖK-2 | TD-7 | Yönlendirme ile 200 üretilmez |

### GKP-004 — OS ve saklanan tercih karar tablosu

**Amaç:** tema önceliğini sınamak. **Tür:** Pozitif, negatif, karar tablosu. **Öncelik:** Orta. **Otomasyon:** R-THEME-02 yeterli; manuel cihaz ayarı ile kabul.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tema kararları | İlk yükleme | 1 | Her iki OS teması için sırasıyla kayıt yok, invalid, light, dark girdilerini ayarla ve reload yap. | Yok/invalid OS temasını; light/dark kendi kayıt değerini uygular. 8 hücrenin her biri kaydedilir. | Karar tablosu 4×2 | Not Run | R-THEME-02 | ÖK-1, ÖK-2, ÖK-5 | TD-6 | DevTools rendering emülasyonu kullanılabilir |
| OS izleme | Kayıt yok | 2 | Anahtarı sil; OS açık→koyu→açık değiştir, reload yapma. | Sayfa ve iki kontrol etiketi/ikonu OS ile birlikte değişir. | Durum geçişi | Not Run | R-THEME-02 | ÖK-5 | TD-6 | Her geçişte görünümü kaydet |
| OS izleme | Geçerli kayıt | 3 | Kayıt light ve ardından dark için OS'yi tersine değiştir. | Geçerli kullanıcı tercihi korunur; OS üzerine yazmaz. | İki kayıt | Not Run | R-THEME-02 | ÖK-5 | TD-6 | Reload olmadan |

### GKP-005 — Tema kontrollerinin eşleşmesi ve kalıcılığı

**Amaç:** kullanıcı seçimi ve semantik durum. **Tür:** Pozitif, durum. **Öncelik:** Orta. **Otomasyon:** R-THEME-04, R-ICON-01.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tema seçimi | Sidebar | 1 | Masaüstünde tema düğmesini tıkla. | data-theme tersine döner; iki kontrolün ikon, title ve aria-label'ı yeni eylemi açıklar; ft-theme kaydedilir. | Storage ve DOM | Not Run | R-THEME-04 | ÖK-1, ÖK-2, ÖK-5 | TD-6 | Görünmeyen kontrol DOM'dan incelenebilir |
| Tema seçimi | Mobil ve reload | 2 | Mobil genişliğe geç; tema düğmesini tıkla, reload yap. | Seçim tersine döner ve reload sonrası korunur; tema parlaması ayrıca görsel kaydedilir. | Manuel flaş incelemesi | Not Run | R-THEME-04 | ÖK-1, ÖK-2 | TD-6 | Hızlı ekran kaydı tercih edilir |
| Tema seçimi | Trust geçişi | 3 | Privacy'ye git, tema değiştir ve portföye dön. | Aynı origin tercihi iki sayfa düzeninde de korunur. | Kaynak ve hedef | Not Run | R-THEME-04 | ÖK-1, ÖK-2 | TD-6 | Üçüncü taraf tema kontrol edilmez |

### GKP-006 — Engelli depolama

**Amaç:** Storage hatasının kontrolü bozmadığını doğrulamak. **Tür:** Negatif, durum. **Öncelik:** Orta. **Otomasyon:** R-THEME-03; tarayıcı engel politikaları manuel değişebilir.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Storage engeli | Başlangıç | 1 | `node tests/manual/preview.mjs --storage=blocked` ile yeni oturum aç; Resume'ye git. | OS teması uygulanır; uncaught storage hatası/boş ekran oluşmaz. | Sentetik getter engeli ve console kanıtı | Not Run | R-THEME-03 | ÖK-3, ÖK-5 | TD-6 | Gerçek browser politikası ayrıca incelenir |
| Storage engeli | Etkileşim | 2 | Tema düğmesini iki kez kullan. | Tema ve etiketler iki yönde değişir; kalıcı kaydın başarısı beklenmez. | Geçici durum | Not Run | R-THEME-03 | ÖK-2, ÖK-5 | TD-6 | Reload kalıcılığı aranmaz |
| Storage engeli | Temizlik | 3 | Engeli kaldır; temiz oturum aç. | Sonraki vakada normal Storage kullanılabilir. | İzolasyon | Not Run | R-THEME-03 | ÖK-5 | TD-6 | Başka origin temizlenmez |

### GKP-007 — Pointer, klavye ve mobil menü odağı

**Amaç:** takılı hover/pressed ve odak kaybını önlemek. **Tür:** Pozitif, durum, erişilebilirlik. **Öncelik:** Yüksek. **Otomasyon:** R-ICON-01/02; gerçek dokunmatik inceleme ek değer sağlar.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Kontrol durumu | Fare | 1 | Tema düğmesine tıkla; fareyi boş alana taşı. | Normal tema yüzey rengi geri gelir; döndürme/ölçekleme ve pointer odak halkası kalmaz. | Computed style | Not Run | R-ICON-01 | ÖK-1, ÖK-2 | TD-6 | Gerçek hover cihazı |
| Kontrol durumu | Dokunma | 2 | Mobilde tema ve hamburgeri tap ile kullan. | Tap bitince basılı rengi/transform kalmaz; hamburger aria-expanded doğru değişir. | Touch emülasyonu/hardware | Not Run | R-ICON-01 | ÖK-1, ÖK-2 | TD-6 | Açık menü, takılı hover değildir |
| Klavye | Odak | 3 | Tab/Shift+Tab ile kontrolleri dolaş; Enter ve Escape uygula. | Odak halkası görünür; Escape menüyü kapatır ve hamburger odağını geri getirir. | Her iki tema | Not Run | R-ICON-01, R-ICON-02 | ÖK-1, ÖK-2 | TD-6 | Genel blur/outline gizleme yok |
| Mobil menü | Pointer kapatma | 4 | Menüyü aç; tema düğmesine tap ile dışarıdan kapat. | Menü kapanır; odak hamburger tarafından çalınmaz, tema kontrolünde kalır. | Kapatma yöntemi | Not Run | R-ICON-02 | ÖK-1, ÖK-2 | TD-6 | Mobil genişlik |
| Azaltılmış hareket | Tercih | 5 | OS/DevTools reduced-motion aç; hover uygula. | Tema ikonunda rotate/scale görülmez; görünür klavye odağı korunur. | Tercihi kaydet | Not Run | R-ICON-01 | ÖK-1, ÖK-2 | TD-6 | Hover olmayan cihazda hover beklenmez |

### GKP-008 — Resume Summary ve okuma sırası

**Amaç:** içerik, akademik doğruluk ve disclosure. **Tür:** Pozitif, içerik, durum. **Öncelik:** Yüksek. **Otomasyon:** R-RESUME-01/09/11; anlam ve dil manuel gözden geçirilir.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Resume sırası | Başlangıç | 1 | `/#resume` aç; başlıkları sırayla oku. | Summary, Top Skills, Languages, Personality Assessment, Education, Experience, Engineering Contributions, Certifications, PDF eylemi sıralıdır; ilk iki Summary paragrafı açıktır. | TD-1 ile karşılaştır | Not Run | R-RESUME-01 | ÖK-1, ÖK-2 | TD-1 | Yan yana meta alanlarının görsel sırası da incelenir |
| Summary | Açılım | 2 | Read full summary'yi aç. | Tam metin TD-1 ile aynı sıra ve içeriktedir; komşu bölümler yer değiştirmez. | Native details | Not Run | R-RESUME-09 | ÖK-1, ÖK-2 | TD-1 | Başlangıçta kapalı |
| Akademik metin | Konum ve anlam | 3 | Akademik paragrafı ve hemen sonraki paragrafı oku. | Bir kez yer alır; Since 2011 hemen arkasındadır. Birincilik lise ve Gazi içindir; Ankara İngilizce programı ve 3.0/4.0 üzeri GPA doğru belirtilir. | Dil incelemesi | Not Run | R-RESUME-11 | ÖK-1, ÖK-2 | TD-1 | Ankara birinciliği eklenmez |
| Summary | Kapatma | 4 | Show less ile kapat. | İlk iki paragraf görünür; tam içerik silinmez; başlıklar yanındaki topics/tools adetleri görünmez. | Görsel/DOM | Not Run | R-RESUME-09 | ÖK-1, ÖK-2 | TD-1 | Dekoratif +N more preview farklıdır |

### GKP-009 — Üç okulun bağımsız düz ders listeleri

**Amaç:** 64 dersin tamlığı ve bağımsız açılım. **Tür:** Pozitif, veri bütünlüğü, durum. **Öncelik:** Yüksek. **Otomasyon:** R-RESUME-02/07 yeterli; uzun etiket okunabilirliği manuel.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dersler | Başlık/ilk durum | 1 | Education'a kaydır. | Üç Relevant Coursework & Tools kontrolü kapalıdır; İngilizce hazırlık kaydında ders paneli yoktur; kategori alt başlığı yoktur. | Her okul için tek başlık | Not Run | R-RESUME-02 | ÖK-1, ÖK-2 | TD-1 | Ankara hazırlık ayrı eğitim kaydıdır |
| Ankara | Tam liste | 2 | Ankara lisans panelini aç; TD-1 ile satır satır karşılaştır. | Tam 37 ders ve aynı sıra; C, C++, Core Java ardışıktır; tek düz liste vardır. | 37 kullanıcı onaylı | Not Run | R-RESUME-02, R-RESUME-07 | ÖK-1, ÖK-2 | TD-1 | Preview etiketlerini ikinci kez sayma |
| Gazi/lise | Tam listeler | 3 | Gazi ve lise panellerini aç, TD-1 ile karşılaştır. | 11 ve 16 ders; Doors Gazi'de son sırada; güncel CMS/Adobe/Microsoft Office isimleri ve Html/Css/JavaScript/Bootstrap grubu C# önündedir. | Toplam 64 | Not Run | R-RESUME-02 | ÖK-1, ÖK-2 | TD-1 | İçerik kategorileştirilmez |
| Bağımsızlık | Kapat/aç | 4 | Yalnız Ankara'yı kapat; Gazi/lise durumunu gözle. | Diğer iki panel açık kalır; Ankara preview geri gelir; veri kaybolmaz. | Accordion tek-açık davranışı beklenmez | Not Run | R-RESUME-07 | ÖK-1, ÖK-2 | TD-1 | Native details bağımsız |
| Klavye | Space/Enter | 5 | Tab ile Ankara summary'ye ulaş; Space, Enter uygula. | Görünür odakla iki yönde açılır/kapanır; metin taşmaz. | İki tema/mobil | Not Run | R-RESUME-07 | ÖK-1, ÖK-2 | TD-1 | Pointer yerine gerçek klavye |

### GKP-010 — Experience, araçlar ve Engineering Contributions

**Amaç:** uzun kanıtların kaybolmadan bağımsız açılması. **Tür:** Pozitif, durum, içerik. **Öncelik:** Yüksek. **Otomasyon:** R-RESUME-01/03; içerik anlamı ayrıca manuel.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Experience | İlk durum | 1 | Beş iş kaydını TD-1 ile karşılaştır. | Tarih, kurum, görev, bağlam ve ilk üç katkı görünür; sıra korunur. | Beş kayıt | Not Run | R-RESUME-03 | ÖK-1, ÖK-2 | TD-1 | Üçten az katkı varsa mevcut kadarı |
| Katkılar | Tam açılım | 2 | Ek katkısı olan işlerin kontrollerini aç. | Her işte tüm katkılar TD-1 ile aynı sıra/metindedir; tools paneli kendiliğinden açılmaz. | İşler arası bağımsızlık | Not Run | R-RESUME-03 | ÖK-1, ÖK-2 | TD-1 | Ek katkısı olmayan işte kontrol beklenmez |
| Araçlar | Tam açılım | 3 | Tools kontrollerini aç; listeleri TD-1 ile karşılaştır. | Beş işteki araçlar eksiksiz/tekrarsız tek listedir; başlıklarda tools sayısı yoktur. | Uzun liste 8'li preview kullanır | Not Run | R-RESUME-03 | ÖK-1, ÖK-2 | TD-1 | Küçük liste zaten tam görünür |
| Bağımsızlık | Tek kontrolü kapat | 4 | İlk işin katkısını kapat. | Aynı işin tools'u ve diğer işlerin açık panelleri korunur. | Durum geçişi | Not Run | R-RESUME-03 | ÖK-1, ÖK-2 | TD-1 | Kategori/accordion eklenmez |
| Mühendislik katkıları | Ayrı bölüm | 5 | Engineering Contributions'a kaydır. | İki kayıt ve metinleri TD-1 ile eşleşir; ayrıca gizleyen panel yoktur. | Otomasyon yapısal, anlam manuel | Not Run | R-RESUME-01 | ÖK-1, ÖK-2 | TD-1 | Bölüm yeri değişmez |
| Araç başlığı | TÜBİTAK tipografisi | 6 | TÜBİTAK 4006 başlığını diğer dört Technologies & Tools başlığıyla DevTools computed panelinde karşılaştır. | Font ailesi, boyut, kalınlık, stil, satır yüksekliği, harf aralığı, renk ve text-transform aynıdır; dokuz araç açık kalır; yeni açılım kontrolü yoktur. | Açık/koyu ve dar/geniş ekran | Not Run | R-RESUME-14 | ÖK-1, ÖK-2 | TD-1 | Diğer başlıkların mevcut görünümü referanstır |

### GKP-011 — Sertifikalar ve Illinois bağlantısı

**Amaç:** 14 kaydın sırası, güvenli hedef ve düzen. **Tür:** Pozitif, içerik, navigasyon. **Öncelik:** Yüksek. **Otomasyon:** R-RESUME-04, R-LINK-03; harici sertifika hizmeti kapsam dışı.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sertifikalar | İlk/tam durum | 1 | Certifications'ı aç; ilk durumu kaydet; tüm sertifikaları göster. | Başlangıçta 6, açınca 14 kayıt görünür; kurum/başlık/URL sırası TD-1 ile eşleşir. | Preview tekrar sayılmaz | Not Run | R-RESUME-04 | ÖK-1, ÖK-2 | TD-1 | Gerçek yeterlilik teyidi bu test değildir |
| Illinois | Konum/biçim | 2 | STG ve sonraki kaydı karşılaştır. | University of Illinois Urbana-Champaign / Object-Oriented Data Structures in C++ hemen arkasındadır; font, hiza ve hover önceki kayıtla aynıdır. | İki tema/mobil | Not Run | R-LINK-03 | ÖK-1, ÖK-2 | TD-1 | Metnin tamamı bağlantıdır |
| Illinois | URL ve açılma | 3 | Link href/target/rel değerlerini incele; güvenli test ortamında tıkla. | Hedef `https://www.coursera.org/account/accomplishments/verify/F2T8N49M4JQ7`; yeni sekme, noopener noreferrer. | Hedefi kaydet | Not Run | R-LINK-03 | ÖK-1, ÖK-2 | TD-1 | Harici sayfa engeli/site arızası portföy hatası sayılmaz |

### GKP-012 — PDF eylemi

**Amaç:** gerçek tıklama ve değişmeyen PDF. **Tür:** Pozitif, navigasyon, veri. **Öncelik:** Yüksek. **Otomasyon:** R-RESUME-13 navigasyon; unit/HTTP byte imzası ve kimlik. Tarayıcı viewer/Save As manuel.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PDF | Erişim | 1 | Resume sonunda Download Full Resume (PDF)'yi bul. | Hiçbir panel açmadan görünür ve odaklanabilir. | Yerleşim | Not Run | R-RESUME-13 | ÖK-1, ÖK-2 | TD-1 | Kaydırma gerekebilir |
| PDF | Tıklama | 2 | Eylemi tıkla; Network ve yeni sekmeyi incele. | Mevcut `/FerhatTufekci_CV.pdf` GET 200 ve application/pdf; ayrı bağlam açılır; Resume sekmesi yerinde kalır. | URL/header/ekran | Not Run | R-RESUME-13 | ÖK-1, ÖK-2, ÖK-4 | TD-1 | Viewer veya tarayıcı indirme tercihi değişebilir |
| PDF | Dosya kimliği | 3 | Dosyayı kaydet; SHA-256'yı kaynakla karşılaştır. | Kaynak ile birebir aynı PDF; `%PDF-` imzası vardır; eski/broken hedef kullanılmaz. | Hash ve boyut | Not Run | R-RESUME-13 | ÖK-2 | TD-1 | Zorunlu download attribute yok; AÇ-3 |

### GKP-013 — Responsive düzen ve tema

**Amaç:** metin/kontrol taşmalarını ve menü sınırını incelemek. **Tür:** Pozitif, BVA, kullanılabilirlik. **Öncelik:** Yüksek. **Otomasyon:** R-RESUME-10; gerçek dokunma/zoom manuel.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Düzen | Genişlikler | 1 | 320/390/768/1280/1440px'te tüm Resume panellerini aç. | Etiketler konteyner dışına taşmaz; yatay sayfa taşması/örtüşme yok; chevron etiketle hizalıdır. | Her tema ayrı | Not Run | R-RESUME-10 | ÖK-1, ÖK-2 | TD-1 | Ekran ölçüsü kaydedilir |
| Menü sınırı | 992px | 2 | 991→992→993px genişliklerinde kontrol et. | 991'de mobil kontrol; 992/993'te desktop menü; eski overlay açık kalmaz. | Üç noktalı sınır | Not Run | R-RESUME-10 | ÖK-1, ÖK-2 | TD-1 | Tasarım kırılımı 992px |
| Kullanılabilirlik | Zoom/uzun metin | 3 | %200 zoom uygula; en uzun okul/araç etiketlerini ve PDF eylemini incele. | İçerik okunabilir; kritik eylemler kapatılmaz; gördüğün gerçek taşmayı kanıtla kaydet. | Manuel değerlendirme | Not Run | R-RESUME-10 | ÖK-1, ÖK-2 | TD-1 | Zoom otomasyonda tam kapsanmıyor |

### GKP-014 — Açılım durumunun yaşam döngüsü

**Amaç:** rota dönüşü ile reload farkını doğrulamak. **Tür:** Pozitif, durum geçişi. **Öncelik:** Yüksek. **Otomasyon:** R-RESUME-09 yeterli.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Açılım durumu | Ayrıl/dön | 1 | Summary ve sertifikaları aç; Contact'a git; Back uygula. | Resume döner; iki panel açık kalır; aktif menü Resume'dir. | Aynı belge | Not Run | R-RESUME-09, R-NAV-04 | ÖK-1, ÖK-2 | TD-1 | Ayrı sekme değil |
| Açılım durumu | Manuel kapatma | 2 | Summary'yi kapat. | Sertifikalar açık kalır; yalnız Summary kapanır. | Bağımsızlık | Not Run | R-RESUME-09 | ÖK-1, ÖK-2 | TD-1 | Sayfa yeniden yüklenmez |
| Açılım durumu | Reload | 3 | Resume'de reload yap. | Başlangıçtaki tüm details kapalıdır; ana metin/PDF erişilebilir kalır. | Kalıcılık sınırı | Not Run | R-RESUME-09 | ÖK-1, ÖK-2 | TD-1 | Storage ile saklama beklenmez |

### GKP-015 — JavaScript olmadan içerik

**Amaç:** ham HTML ve native disclosure geri dönüşü. **Tür:** Negatif, erişilebilirlik. **Öncelik:** Yüksek. **Otomasyon:** R-CONTENT-03, R-SHELL-05; kaynak okuması manuel.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| JS kapalı | İçerik | 1 | Temiz oturumda JS kapat; ana sayfayı aç. | Anlamlı profil, Resume ve iletişim HTML'i okunur; preloader içeriği süresiz örtmez. | JS ayarını kaydet | Not Run | R-CONTENT-03 | ÖK-1, ÖK-2 | TD-1 | SPA animasyon/filtre/tema beklentisi yok |
| JS kapalı | Native ders | 2 | Ankara details kontrolünü aç. | 37 ders script olmadan okunur. | Tarayıcı native davranışı | Not Run | R-CONTENT-03 | ÖK-1, ÖK-2 | TD-1 | Temayı scriptle değiştirme beklenmez |
| JS kapalı | Statik belgeler | 3 | About, Contact, Privacy ve mevcut olmayan derin yol aç. | Trust sayfaları 200 ve anlamlı başlık/metin; eksik yol 404 ve ana sayfa bağlantısı sunar. | GET ve ekran | Not Run | R-CONTENT-03 | ÖK-2, ÖK-4 | TD-7 | Envanterde bulunmayan yeni UUID'li yol üret |

### GKP-016 — Blog kategori/dil karar tablosu

**Amaç:** doğru kayıt, sıra ve tek seçili kontrol. **Tür:** Pozitif, karar tablosu. **Öncelik:** Yüksek. **Otomasyon:** R-FILTER-01 yeterli; manuel görsel rozet/okunabilirlik.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blog | Standart veri | 1 | ÖK-3 standart oturumu aç; Blog'a git. | TD-2'nin 6 makalesi tanımlanan All/All sırasında görünür. | Gerçek Medium verisi kullanılmaz | Not Run | R-FILTER-01 | ÖK-1, ÖK-3 | TD-2 | Harici RSS engelli |
| Blog | 12 birleşim | 2 | All/Systems/Test/Software × All/TR/EN kombinasyonlarını seç. | Her hücrede yukarıdaki oracle'a göre tam başlıklar/sıra; tek kategori ve tek dil aria-pressed=true; görsel aktif sınıf eşleşir. | 12 hücreyi ayrı kaydet | Not Run | R-FILTER-01 | ÖK-1, ÖK-3 | TD-2 | Yalnız adet karşılaştırılmaz |
| Blog | Rozetler | 3 | All ve tek kategori/dil durumlarını karşılaştır. | All dilde dil rozetleri, All kategoride kategori rozetleri görünür; tek seçimde ilgili gereksiz rozet gizlenir. | UI anlamı | Not Run | R-FILTER-01 | ÖK-1, ÖK-3 | TD-2 | Sıralama newest-first |

### GKP-017 — Projects kategori karar tablosu

**Amaç:** pinned ve diğer grupların doğru ayrılması. **Tür:** Pozitif, karar tablosu. **Öncelik:** Yüksek. **Otomasyon:** R-FILTER-02 yeterli.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Projects | All | 1 | Standart oturumda Projects All seç. | Pinned: systems-pinned, testing-pinned; diğerleri: systems-rest, software-rest. | Tam sıra | Not Run | R-FILTER-02 | ÖK-1, ÖK-3 | TD-2 | Starred ayrı gruptur |
| Projects | Systems/Test | 2 | Systems sonra Test seç. | Systems: pinned systems-pinned + normal systems-rest. Test: yalnız testing-pinned; normal grup gizli. | İki hücre | Not Run | R-FILTER-02 | ÖK-1, ÖK-3 | TD-2 | Boş grup stale kart bırakmaz |
| Projects | Software/All | 3 | Software sonra All seç. | Software: yalnız software-rest, pinned gizli. All tüm dört kaydı ilk sırasıyla geri getirir; başlık seçili kategoriye uyar. | Kurtarma | Not Run | R-FILTER-02 | ÖK-1, ÖK-3 | TD-2 | Tek aktif/aria-pressed |

### GKP-018 — Blog/Projects 48 birleşik durum bağımsızlığı

**Amaç:** eski yüksek riskli ortak-state regresyonunu yakalamak. **Tür:** Pozitif, karar tablosu, durum. **Öncelik:** Yüksek. **Otomasyon:** R-FILTER-10 tam 48 hücre; manuel kabul örneklemesi tam kapsam sayılmaz.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Bağımsız filtreler | Proje seçimi | 1 | Standart oturumda bir Projects kategorisi seç; Blog'a geç. | Projects'in seçimi korunur; Blog'un kendi seçimleri başlangıç/önceki durumundadır. | 4 dış döngü | Not Run | R-FILTER-10 | ÖK-1, ÖK-3 | TD-2 | Vaka içinde durum kasıtlı korunur |
| Bağımsız filtreler | Blog matrisi | 2 | O proje kategorisi için Blog'un 12 kategori/dil hücresini sırayla uygula. | Her hücrede tam Blog başlık/sıra oracle'ı doğru; saklanan Projects seçimi ve kart verileri değişmez. | 4×12 = 48 hücre; kayıtta hücreleri listele | Not Run | R-FILTER-10 | ÖK-1, ÖK-3 | TD-2 | 48 yerine yalnız sayıları kontrol etme |
| Bağımsız filtreler | Dönüş ve tekrar | 3 | Projects'e dön, kartları GKP-017 oracle'ıyla karşılaştır; sonraki proje kategorisi için 1–2'yi tekrarla. | Her kategoride doğru proje listesi geri gelir; Blog'un son seçimi korunur; filtreler çapraz sıfırlanmaz. | Diğer vakaya bağımlı değildir | Not Run | R-FILTER-10 | ÖK-1, ÖK-3 | TD-2 | Her dış döngü ayrı kanıt |
| Bağımsız filtreler | Tema/geçmiş | 4 | Bir filtre seçimini koruyarak tema değiştir; Back/Forward uygula. | Her sayfa kendi kategori/dilini ve starred ilerlemesini korur. | Ek durum geçişi | Not Run | R-FILTER-10 | ÖK-1, ÖK-3 | TD-2, TD-3 | Tam reload ayrı başlangıçtır |

### GKP-019 — Boş, bozuk ve erişilemeyen katalog

**Amaç:** hata sınıflarının sağlam sayfayı bozmaması. **Tür:** Negatif, EP. **Öncelik:** Yüksek. **Otomasyon:** R-FILTER-07; yanlış nesne şekli ayrıca otomasyonda; manuelte bozuk JSON/ağ/boş ayrı yürütülür.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Katalog hatası | Empty | 1 | Empty oturum aç; tüm kategori/dilleri gez. | Loading tamamlanır; boş durum görünür; önceki/stale kart yoktur; kontroller kullanılabilir. | Gerçek boşluk | Not Run | R-FILTER-07 | ÖK-1, ÖK-3 | TD-4 | Ağ hatasından ayrı kayıt |
| Katalog hatası | Bozuk JSON | 2 | Invalid-json oturum aç; Projects ve Blog Test seç. | Bozuk alanlar settled empty gösterir; kontrolsüz exception/sonsuz loading yoktur. | Parse hatası | Not Run | R-FILTER-07 | ÖK-1, ÖK-3 | TD-4 | Yanlış content shape otomasyonda ayrı |
| Katalog hatası | Sağlam kategori | 3 | Aynı oturumda Blog Systems seç. | Systems EN, Systems TR doğru sırada gelir; Projects seçimi değişmez. | Kurtarma | Not Run | R-FILTER-07 | ÖK-1, ÖK-3 | TD-4 | Bir alan hatası diğerini boşaltmaz |
| Katalog hatası | Ağ engeli | 4 | Yeni standart oturumda yalnız github-repos.json isteğini DevTools ile engelle ve reload yap. | Projects hata/boş akışına yerleşir; Blog'un sağlam makaleleri ve filtreleri çalışır. | Bloklanan URL ve console | Not Run | R-FILTER-07 | ÖK-3, ÖK-4 | TD-4 | Başka kaynağı engelleme |
| Katalog hatası | Temizlik | 5 | Engeli kaldır, yeni standart oturum aç. | Standart dört repo ve altı makale geri gelir. | Sonraki vakadan bağımsızlık | Not Run | R-FILTER-07 | ÖK-3, ÖK-4 | TD-2 | Kaynak JSON'a yazılmaz |

### GKP-020 — Bekleyen veride son seçim

**Amaç:** zaman yarışını kontrollü veriyle gözlemek. **Tür:** Pozitif, negatif, durum. **Öncelik:** Yüksek. **Otomasyon:** R-FILTER-08 yeterli; manuel release aynı fikstürü kullanır.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Gecikmiş veri | Seçim | 1 | Hold Blog oturumunu aç; veri beklerken Systems ve EN seç. | Loading görünür; yanlış boş durum gösterilmez; son seçim kontrollerde belirgindir. | Enter'a henüz basma | Not Run | R-FILTER-08 | ÖK-1, ÖK-3 | TD-5 | Timer değil kontrollü blokaj |
| Gecikmiş veri | Serbest bırakma | 2 | Terminalde Enter'a bas. | Loading biter; yalnız Systems EN gelir; eski All seçimine dönmez. | Önce/sonra kanıt | Not Run | R-FILTER-08 | ÖK-1, ÖK-3 | TD-5 | Son seçim kazanır |
| Gecikmiş veri | Projects eşdeğeri | 3 | Yeni hold Projects oturumunda Systems seç, sonra Enter'a bas. | Pinned systems-pinned ve normal systems-rest gelir; diğer sayfanın state'i bozulmaz. | Ayrı temiz oturum | Not Run | R-FILTER-08 | ÖK-1, ÖK-3 | TD-5 | Zaman aralığı insan kontrolünde |

### GKP-021 — Starred sayfalama sınırları

**Amaç:** partilerde eksik/tekrar ve ilerleme sıfırlanmasını yakalamak. **Tür:** Pozitif, BVA, durum. **Öncelik:** Yüksek. **Otomasyon:** R-FILTER-09 sekiz veri kümesi; manuel kayıt her N için ayrı.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sayfalama | İlk parti | 1 | Her TD-3 sayısı için yeni oturum aç. | N=0'da grup gizli; N≤20'de tam N kayıt, daha büyük N'de ilk 20 kayıt görünür. | 8 sınır girdisi | Not Run | R-FILTER-09 | ÖK-1, ÖK-3 | TD-3 | Adet kadar doğru sıra da kontrol edilir |
| Sayfalama | Daha fazla | 2 | Buton varsa her tıklamada kalan sayıyı ve listeyi kaydet. | Her parti en fazla 20 ekler; star-1…star-N sıralı/tekrarsız; bitince buton gizlenir. | 21/40/41 özellikle | Not Run | R-FILTER-09 | ÖK-1, ÖK-3 | TD-3 | Açık ilerlemeyi kayıt altına al |
| Sayfalama | Kategori/geçmiş | 3 | Bir parti açtıktan sonra kategori değiştir, Blog'a git ve geri dön. | Açılmış yıldızlı ilerleme ve kayıt sırası korunur; owned filtresi Starred'i daraltmaz. | N=41 için 40 kayıt ara durumu | Not Run | R-FILTER-09 | ÖK-1, ÖK-3 | TD-3 | Sonraki vaka yeni oturum |

### GKP-022 — Privacy ve iletişim bağlantıları

**Amaç:** mevcut tipografi, ikon ve link semantiği. **Tür:** Pozitif, görsel, erişilebilirlik. **Öncelik:** Orta. **Otomasyon:** R-LINK-01/02 computed-style ve SVG karşılaştırması; insan okunabilirliği manuel.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Privacy | Tipografi | 1 | Sidebar altındaki Privacy ve ©2010 All Rights Reserved. için computed font özelliklerini karşılaştır. | Aile, boyut, kalınlık, stil, letter-spacing, line-height aynı; link rengi View Full Test Report tema rengine uyar. | Altı özellik kaydı | Not Run | R-LINK-01 | ÖK-1, ÖK-2 | TD-1 | Referansın fontu Privacy'ye taşınmaz |
| İkonlar | Görünüm | 2 | Privacy, Set Up A Job Interview ve All My Links sonundaki SVG'leri incele. | Referanstaki dış bağlantı ikonu aynıdır; hizalı, currentColor; dekoratif aria-hidden, ayrı focus yok. | SVG/ekran | Not Run | R-LINK-01, R-LINK-02 | ÖK-1, ÖK-2 | TD-1 | Üçüncü taraf kütüphane eklenmez |
| Link davranışı | Privacy | 3 | Tab/Enter ve ikon tıklamasıyla Privacy'yi aç. | Aynı sekmede `/privacy/`; görünür odak; link ve ikon birlikte tıklanabilir. | İki giriş yöntemi | Not Run | R-LINK-01 | ÖK-1, ÖK-2 | TD-1 | Mobilde drawer açılır |
| Link davranışı | Contact | 4 | İki Contact linkinin href/target/rel ve computed fontunu incele. | Calendly `/ferhattufekci/60min`, Linktree `/ferhattufekci`; `_blank`, noopener noreferrer. Metin Poppins/14px/600/normal/24px/normal kalır. | Hedef ve altı özellik | Not Run | R-LINK-02 | ÖK-1, ÖK-2 | TD-1 | Gerçek randevu/mesaj oluşturma yok |

### GKP-023 — Trust sayfası gezinmesi

**Amaç:** sade başlık ve bağlantılı güven sayfaları. **Tür:** Pozitif, navigasyon. **Öncelik:** Orta. **Otomasyon:** R-TRUST-04/05; copy onayı ayrıca gerekir.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Trust gezinmesi | Üç sayfa | 1 | `/about/`, `/contact/`, `/privacy/` aç. | Her biri 200; başlıkta yalnız Back to portfolio ve sağda tema kontrolü vardır. | Her sayfa | Not Run | R-TRUST-04 | ÖK-1, ÖK-2 | TD-7 | İçerik yayımdan kalkmaz |
| Trust gezinmesi | Footer | 2 | Footer'ı ve aria-current'ı incele. | About, Contact, Privacy, Agent Guide, Sitemap sırası; yalnız mevcut sayfa tıklanamaz aria-current=page metnidir. | 4 link + 1 mevcut sayfa | Not Run | R-TRUST-04 | ÖK-1, ÖK-2 | TD-7 | Sahte self-link yok |
| Trust gezinmesi | Dönüş | 3 | Back to portfolio'yu klavye ile etkinleştir. | `/` üzerinden About Me açılır; güven sayfasının hash'i taşınmaz. | URL ve aktif menü | Not Run | R-TRUST-04 | ÖK-1, ÖK-2 | TD-7 | Tema tercihi korunur |
| Trust gezinmesi | Dar ekran | 4 | 320/375/1280px'te başlığı ölç. | İki hedef en az 44px yükseklik; düğme sağa hizalı; örtüşme/taşma yok; focus-visible görünür. | Ölçümler | Not Run | R-TRUST-04 | ÖK-1, ÖK-2 | TD-7 | Renkler mevcut tokenlardan |

### GKP-024 — Makine dosyaları ve tam Markdown

**Amaç:** statik içeriğin gerçek gövde ve biçim doğruluğu. **Tür:** Pozitif, negatif, HTTP/biçim. **Öncelik:** Yüksek. **Otomasyon:** R-HTTP-01, R-RESUME-05; canlı header ayrı ölçülür.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Makine içeriği | Endpoint'ler | 1 | llms.txt, robots.txt, sitemap.xml, index.md ve data JSON'larını GET et. | 200; beklenen gövde; JSON/XML parse edilir; HTML fallback başarı kabul edilmez; sitemap/llms üç trust sayfasını içerir. | Headers/body kanıtı | Not Run | R-HTTP-01 | ÖK-2, ÖK-4 | TD-7 | Dosya uzantısından MIME tahmini yapılmaz |
| Markdown | Tam Resume | 2 | index.md Resume içeriğini TD-1 ile karşılaştır. | Kapalı Summary/ders/katkı/tools/sertifikalar tam ve bir kez; dekoratif preview/Show less benzeri kontrol metni yoktur. | Flat listeler | Not Run | R-RESUME-05 | ÖK-2, ÖK-4 | TD-1 | Aynı ders farklı işte geçiyorsa meşrudur |
| Kısıtlar | Accept/MCP | 3 | `/` için HTML ve Markdown Accept GET; MCP sonucunu raporda incele. | Pages HTML döndürür; aynı URL Markdown negotiation geçti sayılmaz; canlı MCP yokluğu ayrı limitation'dır. | Yeni skor üretilmez | Not Run | R-HTTP-01 | ÖK-4 | TD-7 | Statik manifest handshake değildir |

### GKP-025 — Manuel erişilebilirlik incelemesi

**Amaç:** otomasyonun bulamadığı odak/okuma/kullanılabilirlik sorunları. **Tür:** Pozitif, negatif, keşif. **Öncelik:** Yüksek. **Otomasyon:** Kısmi; R-A11Y-01/02 ve disclosure axe testleri manuel kabulün yerine geçmez.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Erişilebilirlik | Klavye akışı | 1 | Fare kullanmadan menü, Summary, dersler, tools, sertifikalar ve PDF'yi dolaş. | Kontroller anlaşılır sırayla erişilir; odak görünür; Space/Enter doğru eylemi yapar; görünmeyen alan odağı kaybetmez. | Gerçek tuş sırası | Not Run | R-A11Y-01 | ÖK-1, ÖK-2 | TD-1 | Ok div'lerinin bilinen klavye açığı ayrı Fail/debt kaydı |
| Erişilebilirlik | Ekran okuyucu | 2 | NVDA/VoiceOver ile başlık/landmark/disclosure adını, expanded durumunu ve dekoratif ikonları dinle. | Anlamlı isim/durum duyulur; dekoratif ikon tekrar okunmaz; gizli preview kopyası erişilebilir adı kirletmez. | Araç/sürüm/konuşma kanıtı | Not Run | R-A11Y-01 | ÖK-1, ÖK-2 | TD-1 | Araç yoksa Blocked; otomasyon Pass aktarılmaz |
| Erişilebilirlik | Borç ve yeni kusur | 3 | [Sabit borç kaydı](../../tests/fixtures/accessibility-debt.json) ile mevcut contrast bulgularını karşılaştır. | Yeni veya kötüleşen kusur ayrı Fail; bilinen borç da kayıt altındadır, WCAG geçti denmez. | Ürün kabul kararı TBD | Not Run | R-A11Y-01 | ÖK-1, ÖK-2 | TD-1 | Mevcut borç otomatik güncellenmez |

### GKP-026 — Yayın paketi ve kaynak izlenebilirliği

**Amaç:** test edilen sürüm ile yayın/kanıt bağını korumak. **Tür:** Pozitif, entegrasyon, statik inceleme. **Öncelik:** Yüksek. **Otomasyon:** R-DEPLOY-01, R-CI-02; gerçek CI koşusu ayrıca gerekir.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Yayın paketi | Yerel kalite kapısı | 1 | `npm run build` çalıştır. | Generate→unit→BDD→package sırası; hata varsa sonraki aşama/yayın yapılmaz. | Komut/exit/log | Not Run | R-DEPLOY-01 | ÖK-2 | TD-1 | Build manuel UI başarısı değildir |
| Yayın paketi | Envanter | 2 | `.pages-site` içeriğini public-files envanteriyle karşılaştır. | Yalnız public dosyalar ve .nojekyll; .git, node_modules, tests, docs, scripts veya gizli veri yoktur. | Liste/hash | Not Run | R-DEPLOY-01 | ÖK-2 | TD-1 | Kaynak üretilen dosyadan ayrı |
| CI kaynak bağı | İzinli yayın sonrası | 3 | İzin verilmiş CI çalışmasında quality çıktısı, deploy artifact'i ve verification-source.txt'yi incele. | Canlı verifier checkout SHA'sı test edilmiş artifact kaynak SHA'sıdır; ilerleyen main sonradan alınmaz. | Run URL/SHA/artifact | Not Run | R-CI-02 | ÖK-4 | TD-7 | Bu belge push/merge yetkisi vermez; erişim/yayın yoksa Blocked |
| CI sonuçları | Hata ayrımı | 4 | Quality/deploy/verify-live sonuçlarını ve üç platform limitation'ını kaydet. | Her işin gerçek sonucu görünür; limitation capability Pass değildir; yerel sonuç production sonucu diye yazılmaz. | Ortam ayrımı | Not Run | R-CI-02 | ÖK-4 | TD-7 | Uzak akış bu görevde henüz yürütülmedi |

### GKP-027 — Animasyon sırasında rota kesilmesi

**Amaç:** geçiş yarışı sonrası kurtarma. **Tür:** Negatif, durum geçişi. **Öncelik:** Yüksek. **Otomasyon:** R-NAV-05 kontrollü/senkron tetikleme; manuel kesin zamanlama garanti değildir.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Geçiş yarışı | Hazırlık | 1 | Reduced motion kapat; About Me'den Resume'ye geçiş başlat. | Geçiş görünür; sayfa loading durumunda kalmaz. | Ekran kaydı | Not Run | R-NAV-05 | ÖK-1, ÖK-2 | TD-7 | İnsan zamanlaması yetersizse otomasyon kanıtı ayrıca |
| Geçiş yarışı | Kesme | 2 | Geçiş sürerken `#resumes` hash'ini uygula. | Tek 404 görünümü ve odaklı başlık gelir; iki kalıcı current bölüm/boş ekran yoktur. | Gerçek zamanlamayı belirt | Not Run | R-NAV-05 | ÖK-1, ÖK-2 | TD-7 | Zamanı kaçırmak başarılı yarış testi değildir |
| Geçiş yarışı | Kurtarma | 3 | View Resume'ye bas. | Resume ve tek aktif menü geri gelir; sonraki menüler kullanılabilir. | Başlangıca dönüş | Not Run | R-NAV-05 | ÖK-1, ÖK-2 | TD-7 | Yeni doküman reload'uyla gizlenmez |

### GKP-028 — Gerçek cihaz ve tarayıcı keşif kabulü

**Amaç:** Chromium emülasyonunun sınırını tamamlamak. **Tür:** Pozitif, keşif, kullanılabilirlik. **Öncelik:** Yüksek. **Otomasyon:** Kısmi; gerçek Safari/Firefox/telefon yürütülmedi.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Uyumluluk | Ortam kaydı | 1 | Ürün sahibinin desteklemeyi onayladığı tarayıcı/cihaz sürümünü ve URL/SHA'yı kaydet. | Ortam ve destek kararı izlenebilir; onay matrisi yoksa vaka Blocked olur. | TBD kararı gizlenmez | Not Run | R-RESUME-10 | ÖK-1 | TD-1 | Yeni destek garantisi verilmez |
| Uyumluluk | Native kontroller | 2 | O ortamda Summary/ders/tools/sertifika panellerini dokunma ve klavyeyle kullan. | İçerik tam; açılım bağımsız; focus/hover takılmaz; yatay taşma oluşmaz. | Cihaz ekran kaydı | Not Run | R-RESUME-10, R-A11Y-01 | ÖK-1, ÖK-2 | TD-1 | Playwright ekran görüntüsü gerçek cihaz kanıtı değildir |
| Uyumluluk | PDF ve geçmiş | 3 | PDF eylemini, Back/Forward ve temayı dene. | PDF hedefi ayrı bağlamda erişilir; ana sekme/bölüm kaybolmaz; tema tercihi desteklenen storage'da korunur. | Viewer davranışı ayrı not | Not Run | R-RESUME-13, R-NAV-04 | ÖK-1, ÖK-2 | TD-1, TD-6 | Tarayıcı ayarına bağlı indirme ayrı değerlendirilir |

### GKP-029 — İsteğe bağlı randevu scripti hatası

**Amaç:** üçüncü taraf arızasının portföyde uncaught hataya dönüşmesini önlemek. **Tür:** Negatif, hata tahmini. **Öncelik:** Orta. **Otomasyon:** R-EXTERNAL-01 script yokluğu ve engelli storage ile badge kapatmayı kapsar; gerçek hizmette randevu oluşturulmaz.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Randevu scripti | İlk ziyaret / engelli kaynak | 1 | `npm run preview` ile temiz profilde `/` aç. DevTools Request Blocking ile `https://assets.calendly.com/assets/external/widget.js` engelle; Application panelinde yalnız bu origin'in calendlyPermanentlyClosed anahtarını sil; cache kapalı reload yap. | Badge API yüklenmez; uncaught Calendly is not defined hatası görülmez; About Me ve menü kullanılabilir kalır. | Network blocked ve console kaydı | Not Run | R-EXTERNAL-01 | ÖK-2, ÖK-4, ÖK-5 | Geçersiz girdi: engelli script; kayıt yok | Manuel fixture yerine normal preview kullan; gerçek randevu yok |
| Randevu scripti | Kurtarma | 2 | Contact, Resume ve tema kontrollerini kullan. | İki bölüm doğru açılır; tema iki yönde değişir; doğrudan Set Up A Job Interview bağlantısının href'i https://calendly.com/ferhattufekci/60min olarak korunur. | Navigasyon ve DOM hedefi | Not Run | R-EXTERNAL-01 | ÖK-1, ÖK-2 | Aynı engelli script oturumu | Hizmetin çevrimiçi başarısı kabul ölçütü değildir |
| Randevu scripti | Temizlik | 3 | Request Blocking engelini kaldır; test profilini kapat. | Sonraki oturumda kural ve geçici storage paylaşılmaz; kaynak dosyası değiştirilmemiştir. | İzolasyon | Not Run | R-EXTERNAL-01 | ÖK-2, ÖK-5 | Teste özel profil | Script erişimi gerçek ağ durumuna bağlıdır |

### GKP-030 — Reklam birimi sözleşmesi ve üretim gözlemi

**Amaç:** reklam isteğinin zamanlamasını, birim türü eşleşmesini ve doldurulmama davranışını kabul etmek; gerçek doldurmayı yalnız gözlemlemek. **Tür:** Pozitif, negatif, gözlem. **Öncelik:** Yüksek. **Otomasyon:** R-AD-01/02/03 Chromium'da sentetik sağlayıcıyla kapsanır; üretim doldurma gözlemi (adım 4) otomasyonsuzdur ve RTM gereksinimi değildir (AÇ-8). Reklama tıklanmaz, yenileme veya sahte trafik üretilmez.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Reklam sözleşmesi | Birim türü ve kaynak | 1 | index.html'de Blog ve Projects reklam `<ins>` öğelerini incele; hesaptaki birim listesiyle (yalnız görüntüleme) karşılaştır. | Blog `data-ad-slot` 2029775306 ve `data-ad-layout="in-article"` + `fluid`; Projects 1912820269 ve `data-ad-format="autorelaxed"`; her ikisi hesapta aynı türde görünür. | Kaynak ve hesap paneli | Not Run | R-AD-02 | ÖK-1 | Blog ve Projects öğeleri | Hesap paneli kanıtı depoda yoktur |
| Reklam isteği | Zamanlama | 2 | `npm run preview` ile Blog ve Projects'e git; DevTools Network'te adsbygoogle isteklerini say. Kartlar yüklenirken ve sonrasında kaydet. | Her birim için kartlar görünür olana kadar istek yok; sonra tek istek ve kartların altında yer alır. | İstek sayısı ve sırası | Not Run | R-AD-01 | ÖK-2, ÖK-4 | Yerel önizleme | Yerel önizleme gerçek reklam sunucusu kanıtı değildir |
| Engellenen reklam | Boş kabuk | 3 | DevTools Request Blocking ile `pagead2.googlesyndication.com` engelle; cache kapalı reload yap; Blog ve Projects'te filtre ve gezinmeyi kullan. | Boş reklam kutusu veya ayrılmış boşluk kalmaz; katalog, filtreler ve gezinme çalışır. | Görsel ve DOM | Not Run | R-AD-03 | ÖK-1, ÖK-2 | Engellenmiş sağlayıcı | Gerçek doldurmama yanıtı ayrıca gözlenir |
| Üretim gözlemi | Doldurma durumu | 4 | Canlı sitede Blog ve Projects'i aç (reklama tıklama, sayfayı reklam için yenileme); birimlerin `data-ad-status` değerini yalnız oku ve kaydet. | `filled` veya `unfilled` olarak kaydedilir; `unfilled` ise boş kabuk yoktur. Dolmama hata sayılmaz. | Salt okunur gözlem | Not Run | R-AD-03 | ÖK-1 | Canlı site | Yeni birimlerin dolması zaman alabilir; hesap onay iletisi ve gizlilik ayarları hesap panelinden ayrıca denetlenir |

### GKP-031 — Blog paylaş: klavye ve açılır menü semantiği

**Amaç:** Share açılır menüsünün klavyeyle yerel disclosure davranışını koruması. **Tür:** Pozitif, erişilebilirlik. **Öncelik:** Yüksek. **Otomasyon:** blog-sharing-keyboard.spec.mjs (K01, K05).

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Share klavye | Açma/kapama | 1 | Blog'da bir kartın Share düğmesine Tab ile gel; Enter, sonra Space ile aç/kapat. | Odak görünür; menü her tuşla açılıp kapanır; `aria-expanded` durumu eşleşir. | Ekran kaydı | Not Run | R-BLOG-SHARE-01, R-BLOG-SHARE-08 | ÖK-1, ÖK-3 | TD-2 | JS açık |
| Share klavye | Escape ve Tab çıkışı | 2 | Menü açıkken Escape'e bas; tekrar aç ve Tab ile menünün sonundan çık. | Escape menüyü kapatır ve odak Share'e döner; Tab menüden sırayla çıkar, odak kaybolmaz. | — | Not Run | R-BLOG-SHARE-01, R-BLOG-SHARE-08 | ÖK-1, ÖK-3 | TD-2 | — |
| Ayrı sekme durakları | Makale ve Share | 3 | Bir kartta Tab ile makale bağlantısından Share'e geç. | Makale bağlantısı ve Share iki ayrı Tab durağıdır; odak çerçevesi yalnız etiket metnini çevreler. | — | Not Run | R-HOVER-04 | ÖK-1, ÖK-3 | TD-2 | — |

### GKP-032 — Blog paylaş: kopyalama, el ile URL ve tekil işlem

**Amaç:** kopyalama ve el ile URL yedeğinin doğru adresi, doğru dilde ve tek seferde vermesi. **Tür:** Pozitif, negatif, eşzamanlılık. **Öncelik:** Yüksek. **Otomasyon:** blog-sharing.spec.mjs, blog-sharing-keyboard.spec.mjs (K02).

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Platform yolu | Doğru URL | 1 | Bir kartta Share menüsündeki her platform seçeneğinin bağlantı adresini incele; tıklama. | Her seçenek kartın orijinal makale URL'sini yalnız kendi platform yoluna taşır. | Bağlantı adresini kopyala, açma | Not Run | R-BLOG-SHARE-02 | ÖK-1, ÖK-3 | TD-2 | Üçüncü taraf siteye gidilmez |
| Kopyalama | Başarı geri bildirimi | 2 | Copy link'e bas; panoyu bir metin alanına yapıştır. | Pano makale URL'sini içerir; geri bildirim kartın dilindeki onaylı metni gösterir (TR kartta Türkçe). | — | Not Run | R-BLOG-SHARE-11 | ÖK-1, ÖK-3 | TD-2 | Tarayıcı pano izni verilmiş |
| Kopyalama | Pano reddi | 3 | Pano iznini reddet (site ayarı) ve Copy link'e bas; Tab ile ilerle. | El ile kopyalanacak URL görünür ve Tab ile ulaşılır; odak ve seçim kendiliğinden yer değiştirmez. | — | Not Run | R-BLOG-SHARE-04, R-BLOG-SHARE-11 | ÖK-1, ÖK-3, ÖK-5 | TD-2 | — |
| Tekil işlem | İki kart | 4 | A kartında Copy link'e bas, hemen B kartında Copy link'e bas. | B için kuyruğa alınmış kopyalama olmaz; B için yeni bir etkinleştirme gerekir; A'nın sonucu B'ye yazılmaz. | — | Not Run | R-BLOG-SHARE-03, R-BLOG-SHARE-07, R-BLOG-SHARE-12 | ÖK-1, ÖK-3 | TD-2 | Zamanlama elle sınırlıdır; otomasyon daha kesin |

### GKP-033 — Blog paylaş: cihazın yerel paylaşım penceresi

**Amaç:** yerel paylaşım (Web Share) sırasında ilerleme göstergesi, kilit ve sonuç davranışı. **Tür:** Pozitif, negatif, durum. **Öncelik:** Orta. **Otomasyon:** blog-sharing-feedback.spec.mjs, blog-sharing-keyboard.spec.mjs (K03).

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Yerel paylaşım | İlerleme | 1 | Web Share destekleyen tarayıcıda (ör. mobil Chrome/Safari) Share'e bas ve pencere açıkken kartlara bak. | Etiketin sonundaki simge ilerleme göstergesine döner; etiket, hedef, odak ve canlı bölge metni değişmez; kart yükseklikleri değişmez. | Ekran görüntüsü | Not Run | R-PROGRESS-01, R-PROGRESS-02, R-PROGRESS-03, R-PROGRESS-04, R-PROGRESS-05, R-PROGRESS-06 | ÖK-1 | TD-2 | Fiziksel cihaz gerekir |
| Yerel paylaşım | Tekrar basma | 2 | Pencere açıkken Share'e tekrar bas (Enter/Space). | Yeni işlem kuyruğa alınmaz; kilit sürer; pano yan etkisi oluşmaz. | — | Not Run | R-BLOG-SHARE-05, R-BLOG-SHARE-06, R-PROGRESS-03, R-PROGRESS-06 | ÖK-1 | TD-2 | Fiziksel cihaz gerekir |
| Yerel paylaşım | Tamamla ve iptal | 3 | Paylaşımı bir kez tamamla, bir kez iptal et. | Tamamlanınca bekleme göstergesi kalkar ve "gönderildi" iddia edilmez; iptalde yalnız açık bir yeniden deneme yeni işlem başlatır. | — | Not Run | R-NATIVE-RESULT-01, R-NATIVE-RESULT-02, R-NATIVE-RESULT-03, R-BLOG-SHARE-05 | ÖK-1 | TD-2 | Fiziksel cihaz gerekir |

### GKP-034 — Blog paylaş: görünüm, kaydırma, JavaScript kapalı ve önbellek

**Amaç:** Share eyleminin görsel tutarlılığı ve geri dönüş davranışları. **Tür:** Görsel, negatif, regresyon. **Öncelik:** Orta. **Otomasyon:** blog-sharing-appearance/layout/cache.spec.mjs.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Görünüm | Read ve Share | 1 | Masaüstü ve mobilde iki temada bir kartın Read ve Share eylemlerini karşılaştır; fareyle üzerine gel. | Aynı yazı tipi/boyut; hover yalnız metni etkiler; hedef alanları kaymaz. | Ekran görüntüsü | Not Run | R-BLOG-SHARE-09 | ÖK-1, ÖK-3 | TD-2 | — |
| Kaydırma | Uzun liste | 2 | Blog panelini aşağı kaydır, bir kartta Share'i aç ve kapat. | Panel konumu, hash ve tarayıcı geçmişi değişmez. | — | Not Run | R-BLOG-SHARE-10 | ÖK-1, ÖK-3 | TD-2 | — |
| JS kapalı | Statik bağlantılar | 3 | JavaScript'i kapat, Blog içeriğine bak. | Statik makale bağlantıları çalışır; işlevsiz bir Share eylemi görünmez. | — | Not Run | R-BLOG-SHARE-13 | ÖK-1, ÖK-2 | — | — |
| Önbellek | Eski CSS | 4 | Siteyi bir kez aç; yeni sürüm yayınlandıktan sonra önbelleği temizlemeden tekrar aç. | Kartlar güncel stillerle görünür; yerel paylaşım göstergesi sabit kalır. | Sürüm geçişinde yapılır | Not Run | R-BLOG-SHARE-14 | ÖK-1 | — | Yayın sonrası yürütülür |

### GKP-035 — Sayfa okları: dokunma, fare ve klavye geri bildirimi

**Amaç:** önceki/sonraki oklarının basılı görünümünün takılı kalmaması. **Tür:** Girdi cihazı, durum. **Öncelik:** Orta. **Otomasyon:** arrow-controls.spec.mjs, arrow-hybrid.spec.mjs.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dokunma | Takılı renk | 1 | Dokunmatik cihazda iki oka birkaç kez dokun; tema değiştir; azaltılmış hareketi aç/kapat. | Dokunuş bitince iki ok da normal renge döner. | — | Not Run | R-ARROW-01 | ÖK-1 | — | Fiziksel dokunmatik cihaz tercih edilir |
| Fare ve klavye | Hover ve etkinleştirme | 2 | Fareyle oka gel ve çık; sonra Tab ile oka gel, Enter ve Space ile etkinleştir. | Hover çıkınca biter; klavye odağı görünür kalır; Enter/Space sayfayı değiştirir. | — | Not Run | R-ARROW-02 | ÖK-1 | — | — |
| İptal edilen basış | Gezinmeme | 3 | Ok üzerinde fareye bas, basılıyken imleci dışarı çıkar ve bırak. | Basılı görünüm geçicidir; sayfa değişmez. | — | Not Run | R-ARROW-03 | ÖK-1 | — | — |
| Karma girdi | Dokunma sonra fare | 4 | Dokunmatik ve fareli cihazda oka dokunup iptal et, sonra fareyle üzerine gel. | Aktif görünüm temizlenir; fare hover'ı yeniden çalışır. | — | Not Run | R-ARROW-04 | ÖK-1 | — | Karma cihaz gerekir |

### GKP-036 — Hata görünümü düğmeleri, menü ve tema kontrolleri

**Amaç:** 404/hata eylemlerinin ve ikon düğmelerinin etkileşim durumları. **Tür:** Görsel, erişilebilirlik. **Öncelik:** Orta. **Otomasyon:** button-states.spec.mjs.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Hata eylemleri | Durumlar | 1 | `/#resumes` aç; iki kurtarma eylemine fareyle gel, bas, Tab ile odaklan; iki temada tekrarla. | Hover bırakılınca biter; klavye odağı görünür; basılı renk tema renklerini kullanır; About Me Resume CTA ile aynı görünür. | — | Not Run | R-BUTTON-01, R-BUTTON-04 | ÖK-1, ÖK-2 | TD-7 | — |
| Hata metni | Kurtarma | 2 | Hata başlığını ve bağlantılarını oku; bağlantılarla kurtar. | Portföy ifadeleri kullanılır; bağlantılar geçerli bölümlere götürür. | — | Not Run | R-BUTTON-02 | ÖK-1, ÖK-2 | TD-7 | — |
| Hamburger | Odak | 3 | Mobilde menü düğmesine fareyle tıkla; sonra Tab ile odaklan. | Fare tıklamasından sonra odak çerçevesi kalmaz; klavye odağı görünür. | — | Not Run | R-BUTTON-03 | ÖK-1 | — | — |
| İkon hareketi | Cihaz ve tercih | 4 | Tema düğmesinin üzerine fareyle gel; azaltılmış hareketi açıp tekrarla; About/Contact/Privacy'de tema düğmesini Tab ile kullan. | Hover hareketi yalnız fareli cihazda ve hareket tercihine uygun; güven sayfalarında düğme hizalı ve klavyeyle kullanılır. | — | Not Run | R-ICON-03, R-ICON-04 | ÖK-1, ÖK-2 | — | — |

### GKP-037 — Filtre sınır ve hata durumları

**Amaç:** Blog/Projects filtrelerinin boş, hatalı ve hızlı değişen verilerde doğru kalması. **Tür:** Negatif, sınır, eşzamanlılık. **Öncelik:** Yüksek. **Otomasyon:** categories.spec.mjs.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Bağımsız seçim | Gezinme ve geçmiş | 1 | Blog'da kategori+dil, Projects'te kategori seç ve Starred'da Show More kullan; sayfalar arasında gez, geri/ileri kullan. | Her sayfanın seçimi ve Starred ilerlemesi ayrı korunur. | — | Not Run | R-FILTER-03 | ÖK-1, ÖK-3 | TD-2, TD-3 | — |
| Boş kesişim | Kurtarma | 2 | Blog'da yalnız TR makalesi olan bir kategoride EN seç; Projects'e gidip dön; All dilini seç. | Eski kartlar kaybolur, boş durum görünür; All ile makale döner; Projects seçimi değişmez. | — | Not Run | R-FILTER-04 | ÖK-1, ÖK-3 | TD-2 | — |
| Boş kategori | Projects | 3 | Projects'te deposu olmayan bir kategori seç, sonra All'a dön. | Sabitlenmiş ve normal kartlar tekrarsız geri gelir. | — | Not Run | R-FILTER-05 | ÖK-1, ÖK-3 | TD-2 | — |
| Bilinmeyen kategori | Yedek | 4 | Kategorisi belirsiz bir depo verisiyle Software'i seç. | Kart beyan edilen yedek kategoride görünür. | — | Not Run | R-FILTER-06 | ÖK-1, ÖK-3 | TD-2 | — |
| Veri yok | Tüm kaynaklar | 5 | Tüm kataloglar ve RSS erişilemezken her kategoriyi seç. | Her kategoride kullanılabilir, yerleşmiş bir boş durum görünür; sayfa kilitlenmez. | — | Not Run | R-FILTER-11 | ÖK-1, ÖK-3 | TD-4 | — |
| Hızlı seçim | Son seçim | 6 | Filtre düğmelerine hızla art arda ve düğme içindeki metin/simgeye tıkla. | Her sayfada tek ve doğru seçim kalır. | — | Not Run | R-FILTER-12 | ÖK-1, ÖK-3 | TD-2 | — |
| Yalnız Starred | Sayfalama | 7 | Sahip olunan depo yokken geçerli Starred verisiyle kategorileri değiştir. | Starred sayfalaması kullanılabilir kalır. | — | Not Run | R-FILTER-13 | ÖK-1, ÖK-3 | TD-3 | — |
| Uzun etiket | Taşma | 8 | Her Projects filtresini seç; bölüm başlığını dar ekranda incele. | Bölüm etiketleri kapsayıcısının içinde kalır. | — | Not Run | R-FILTER-14 | ÖK-1, ÖK-3 | TD-2 | — |

### GKP-038 — Klavye erişilebilirliği

**Amaç:** tüm sayfaların yalnız klavyeyle kullanılabilmesi. **Tür:** Erişilebilirlik. **Öncelik:** Yüksek. **Otomasyon:** keyboard-accessibility.spec.mjs (Chromium, Firefox, WebKit).

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Odak sırası | Her sayfa | 1 | Her bölümde ve güven sayfalarında baştan Tab'la; ilk Tab'da skip link'i kullan. | Odak görünür ve sıralıdır; skip link içeriğe atlar; gizli sayfalarda Tab durağı yoktur. | — | Not Run | R-KEYBOARD-01, R-KEYBOARD-05 | ÖK-1, ÖK-2 | TD-7 | — |
| Menü ve geçmiş | Öngörülebilir odak | 2 | Menüyü, tema düğmesini ve geri/ileri gezinmeyi klavyeyle kullan; azaltılmış hareketle ve %200 metin boyutuyla tekrarla. | Odak her işlemden sonra beklenen yerdedir. | — | Not Run | R-KEYBOARD-02 | ÖK-1 | — | — |
| Filtre ve açılım | Odak korunur | 3 | Filtreleri, açılır içerikleri ve bilgi açıklamalarını klavyeyle aç/kapat. | Filtre odağı korunur; açılırlar yerel davranır; bilgi kapatılınca odak tetikleyiciye döner. | — | Not Run | R-KEYBOARD-03 | ÖK-1, ÖK-3 | TD-2 | — |
| Starred son sayfa | Odak taşınır | 4 | Starred'da Show More'u klavyeyle son sayfaya kadar kullan. | Show More kaybolduğunda odak kaybolmaz, anlamlı bir öğeye taşınır. | — | Not Run | R-KEYBOARD-04 | ÖK-1, ÖK-3 | TD-3 | — |
| Contact | Odak kutusu | 5 | Contact bağlantılarına Tab ile gel. | Her bağlantıda tüm kelimeleri ve dış bağlantı simgesini kapsayan tek bir odak kutusu vardır. | — | Not Run | R-KEYBOARD-06 | ÖK-1 | — | — |
| %200 zoom | Erişim | 6 | Tarayıcıyı %200 yakınlaştır; menü, filtreler ve Contact bağlantılarını klavyeyle kullan. | Hepsine ulaşılır; odak örtülmez. | — | Not Run | R-KEYBOARD-07 | ÖK-1 | — | — |
| Sayfa sınırları | Başlangıç ve son | 7 | Her sayfaya doğrudan ve menüyle gir; Tab ile içeriğin sonuna kadar ilerle. | Odak sayfanın kontrol şeridinden başlar; içerik önceki/sonraki oklarla biter. | — | Not Run | R-KEYBOARD-08 | ÖK-1 | TD-7 | — |

### GKP-039 — Sayfa geçişleri ve hareket tercihleri

**Amaç:** sayfa geçişlerinin yönü, kilitlenmemesi ve azaltılmış hareket desteği. **Tür:** Durum geçişi, negatif. **Öncelik:** Yüksek. **Otomasyon:** page-transitions.spec.mjs, portfolio.spec.mjs.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mobil geçiş | Çekmece sonrası | 1 | Mobilde menüden ileri ve geri bir bölüm seç. | Kayma çekmece kapandıktan sonra, rota sırasına uygun yönde başlar ve temiz biter. | Ekran kaydı | Not Run | R-MOTION-01, R-MOTION-05 | ÖK-1 | TD-7 | — |
| Azaltılmış hareket | Kilit yok | 2 | İşletim sisteminde azaltılmış hareketi aç; bölümler arasında gez. | Kayma olmadan anında geçer; gezinme kilitlenmez. | — | Not Run | R-MOTION-02 | ÖK-1 | TD-7 | — |
| Hızlı oklar | Son rota | 3 | Oklara hızla art arda bas; sonra geri/ileri kullan. | Son istenen bölüm açılır; geçmiş tutarlıdır. | — | Not Run | R-MOTION-03 | ÖK-1 | TD-7 | — |
| Geçiş kesintisi | İki sayfa kalmaz | 4 | Geçiş sırasında sekmeyi arka plana al, sonra dön. | Ekranda iki sayfa kalmaz; gezinme çalışmaya devam eder. | — | Not Run | R-MOTION-04, R-MOTION-07 | ÖK-1 | TD-7 | Kesinti elle zamanlanır |
| Aktif rota | Yeniden seçim | 5 | Mobilde açık olan bölümü menüden tekrar seç; menüyü yeniden aç. | Gezinme bozulmaz; çekmece yeniden açılabilir. | — | Not Run | R-MOTION-06 | ÖK-1 | — | — |
| Tekrarlı başlatma | Tek denetleyici | 6 | Sayfayı birkaç kez yenile ve bölümler arasında gez. | Her gezinmede tek bir bölüm ve en fazla bir kurtarma görünümü olur. | — | Not Run | R-NAV-07 | ÖK-1 | TD-7 | — |
| Geçiş sırasında klavye | Seçim korunur | 7 | Menü veya okla başka bölüme geç; kayma bitmeden yeni sayfadaki bir düğmeye Tab ile gel ve Space'i basılı tut, kayma bitince bırak. Sonra hiçbir şeye dokunmadan menüyle başka bölüme geç. | Basılı tutulan düğme etkinleşir ve odak onda kalır; dokunulmayan geçişte odak bölüm başlığına gider. | — | Not Run | R-FOCUS-09, R-FOCUS-10, R-FOCUS-11 | ÖK-1 | TD-7 | Zamanlama elle sınırlıdır; otomasyon tamamlanma anını kontrol eder |

### GKP-040 — Sabit kontrol paneli ve içerik kaydırma

**Amaç:** Resume, Blog, Projects ve Contact'ta kontrol şeridinin sabit, içeriğin tek panelde kayması. **Tür:** Düzen, girdi cihazı. **Öncelik:** Yüksek. **Otomasyon:** fixed-page-controls.spec.mjs.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Kaydırma | Tekerlek ve dokunma | 1 | Her sayfada içeriği fare tekerleği ve dokunmayla sonuna kadar kaydır. | Kontrol şeridi yerinde kalır; son içerik görünür hale gelir. | — | Not Run | R-PANEL-01 | ÖK-1, ÖK-3 | TD-2 | — |
| Filtre değişimi | Yalnız içerik sıfırlanır | 2 | Blog'u kaydır, filtre çubuğunu yatay kaydır, sonra gerçekten farklı bir kategori seç. | Yalnız içerik başa döner; odak ve yatay kaydırma korunur. | — | Not Run | R-PANEL-02 | ÖK-1, ÖK-3 | TD-2 | — |
| Sayfalama tuşları | Odaklı bölge | 3 | İçerik bölgesine odaklan; PageDown, PageUp, Home, End kullan. | İçerik doğal kayar; kontroller, odak ve geçmiş kullanılabilir kalır. | — | Not Run | R-PANEL-03 | ÖK-1 | — | — |
| Yeniden boyutlandırma | Kısa yatay ekran | 4 | Pencereyi boyutlandır, telefonu yatay çevir, masaüstünde %200 yakınlaştır. | Kontroller genel başlığın altında kalır; içerik alanı kullanılabilir kalır. | — | Not Run | R-PANEL-04 | ÖK-1 | — | — |
| Boş ve gecikmeli | Panel içinde | 5 | Gecikmeli veriyle hızlı filtre seçimleri yap. | Durumlar kendi panelinde kalır; son filtre geçerli olur. | — | Not Run | R-PANEL-05 | ÖK-1, ÖK-3 | TD-5 | — |
| Yazdırma | Kısıt kalkar | 6 | Her sayfada yazdırma önizlemesini aç. | Ekran yüksekliği/taşma kısıtı kalkar; açılım durumu değişmez. | — | Not Run | R-PANEL-06 | ÖK-1 | — | — |
| Contact | Aynı düzen | 7 | Contact'ta kaydır, sayfalama tuşlarını kullan, başka sayfaya gidip dön, yazdır. | Başlık sabit, bölge adlandırılmış; bağlantılar korunur; dönüşte başa döner; yazdırma çalışır. | — | Not Run | R-PANEL-07 | ÖK-1 | — | — |

### GKP-041 — Resume içerik düzeni ve açılımlar

**Amaç:** Resume bölümlerinin okuma sırası ve açılır içeriklerin bağımsızlığı. **Tür:** İçerik, durum, erişilebilirlik. **Öncelik:** Yüksek. **Otomasyon:** resume-disclosures.spec.mjs, resume-disclosure-labels.test.js.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Okuma sırası | Dokuz parça | 1 | Resume'u baştan sona oku. | Dokuz parça okuma sırasını korur; yalnız uzun kanıtlar kapalıdır. | — | Not Run | R-RESUME-06 | ÖK-1, ÖK-2 | TD-1 | — |
| Beş rol | Bağımsız açılım | 2 | Experience'ta bir rolün kanıtlarını ve araçlarını ayrı ayrı aç. | Tüm içerik sırasıyla görünür; diğer rollerin durumu değişmez. | — | Not Run | R-RESUME-08 | ÖK-1, ÖK-2 | TD-1 | — |
| Summary | Tam metin | 3 | Summary'yi aç. | Akademik geçmiş "Since 2011" paragrafından önce ve aynı tipografide gelir. | — | Not Run | R-RESUME-12 | ÖK-1, ÖK-2 | TD-1 | — |
| Kişilik değerlendirmesi | Hizalama | 4 | Masaüstünde ve dar ekranda Personality Assessment bölümünü incele. | Masaüstünde ders bilgisiyle hizalı; küçük ekranlarda akış korunur. | — | Not Run | R-RESUME-15 | ÖK-1, ÖK-2 | TD-1 | — |
| Açılım düğmeleri | Erişilebilir ad | 5 | Ekran okuyucu veya erişilebilirlik ağacıyla her Show More düğmesini incele. | Her düğmenin sayısı doğru, adı benzersiz ve bağlamlıdır; klavye durumu yereldir. | — | Not Run | R-DISCLOSURE-03 | ÖK-1, ÖK-2 | TD-1 | Ekran okuyucu ayrı konfigürasyon ister |

### GKP-042 — Resume bölüm gezinmesi

**Amaç:** Resume gezinme çubuğunun içeriği filtrelemeden doğru hedefe götürmesi. **Tür:** Gezinme, durum, erişilebilirlik. **Öncelik:** Yüksek. **Otomasyon:** resume-navigation.spec.mjs.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| İlk durum | Doğrudan giriş | 1 | `/#resume` aç ve sayfayı yenile. | Yalnız All seçilidir; tüm içerik eksiksizdir; görünür yardımcı etiket yoktur. | — | Not Run | R-RESUME-NAV-01 | ÖK-1, ÖK-2 | TD-1 | — |
| Hedefler | On düğme | 2 | On düğmenin her birine bas. | Doğru bölüme kayar; URL ve geçmiş değişmez; hiçbir bölüm veya açılım gizlenmez. | — | Not Run | R-RESUME-NAV-02 | ÖK-1, ÖK-2 | TD-1 | — |
| Klavye | Yatay görünürlük | 3 | Düğmeler arasında klavyeyle gez; Enter ve Space kullan. | Odaktaki öğe yatayda görünür olur, sayfa dikeyde kaymaz; Enter/Space hedefe odak taşır. | — | Not Run | R-RESUME-NAV-03 | ÖK-1, ÖK-2 | TD-1 | — |
| Yeniden etkinleşme | Yalnız Resume sıfırlanır | 4 | Blog/Projects'te filtre seç; Resume'a dön, geri/ileri kullan. | Yalnız Resume seçimi sıfırlanır; Blog/Projects seçimleri korunur. | — | Not Run | R-RESUME-NAV-04 | ÖK-1, ÖK-3 | TD-2 | — |
| Hızlı istek | Son istek | 5 | İki hareket tercihinde düğmelere hızla art arda bas. | Son istek geçerli olur ve korunur. | — | Not Run | R-RESUME-NAV-05 | ÖK-1, ÖK-2 | TD-1 | — |
| Görünüm | Tema ve taşma | 6 | İki temada ve dar ekranda çubuğu incele. | Blog stilini paylaşır; sayfa taşmaz; son öğeye ulaşılır. | — | Not Run | R-RESUME-NAV-06 | ÖK-1, ÖK-2 | TD-1 | — |
| Certifications | Panel üstü | 7 | Certifications'ı açılımlar kapalıyken ve açıkken farklı pencere yüksekliklerinde seç. | Başlık panelin en üstünden başlar. | — | Not Run | R-RESUME-NAV-07 | ÖK-1, ÖK-2 | TD-1 | — |

### GKP-043 — Scrollbar ve reklam alanının kaydırmaya etkisi

**Amaç:** tüm sayfalarda tek scrollbar standardı ve reklamların kaydırmayı bozmaması. **Tür:** Görsel, regresyon. **Öncelik:** Orta. **Otomasyon:** scrollbar-parity.spec.mjs, touch-scrollbar.spec.mjs, adsense.spec.mjs.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Scrollbar | Masaüstü | 1 | Masaüstünde ve dar pencerede iki temada dört sayfanın scrollbar'ını karşılaştır. | Tüm sayfalarda aynı ince bar ve renkler. | — | Not Run | R-SCROLLBAR-01 | ÖK-1, ÖK-2 | — | — |
| Scrollbar | Telefon | 2 | Fiziksel iPhone ve Android telefonda iki temada dört sayfayı kaydır. | Masaüstüyle aynı tasarımda tek bir bar görünür ve konumu kaydırmayı izler. | Ekran görüntüsü | Not Run | R-SCROLLBAR-02, R-SCROLLBAR-03 | ÖK-1 | — | Fiziksel cihaz gerekir |
| Reklam | Kaydırma | 3 | Canlı sitede Blog ve Projects'te reklam görünürken içeriği tekerlek ve dokunmayla kaydır. | Panel kayar; kontrol şeridi sabit kalır; reklam doğal yüksekliğindedir. | Reklama tıklama | Not Run | R-AD-SCROLL-01 | ÖK-1 | — | Gerçek dolum hesaba bağlıdır |
| Reklam | Boş iframe | 4 | Reklam dolmadığında (veya engellendiğinde) reklam alanına bak. | Görünür boş mesaj veya dolu görünen boş kutu oluşmaz. | — | Not Run | R-AD-EMPTY-01 | ÖK-1, ÖK-4 | — | — |
| Reklam | Daralma sonrası genişlik | 5 | Blog'u telefonda yatay açıp reklamı yükle, sonra dikeye çevir (veya masaüstünde pencereyi daralt). | Reklam Blog alanının içinde kalır; sağa kaymaz ve kırpılmaz; Projects reklamı değişmez. | Reklama tıklama | Not Run | R-AD-WIDTH-01 | ÖK-1 | — | Gerçek dolum hesaba bağlıdır |

### GKP-044 — Statik 404 ve güven sayfası gezinmesi

**Amaç:** gerçek 404'ün ve About/Contact/Privacy gezinmesinin JS olmadan da kullanılabilmesi. **Tür:** Negatif, gezinme. **Öncelik:** Orta. **Otomasyon:** not-found-shell.test.js/spec.mjs, trust-navigation.test.js/spec.mjs.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Statik 404 | İç içe yol | 1 | Olmayan iç içe bir yolu aç (yeni UUID); kenar çubuğu bağlantılarını kullan. | Portföy kabuğu görünür; bağlantılar kökten çalışır. | — | Not Run | R-SHELL-01 | ÖK-1, ÖK-2 | TD-7 | — |
| Statik 404 | JS kapalı | 2 | JavaScript kapalıyken aynı yolu aç. | Sayfa okunur ve kurtarma bağlantıları çalışır. | — | Not Run | R-SHELL-05 | ÖK-1, ÖK-2 | TD-7 | — |
| Güven sayfaları | Dönüş ve footer | 3 | About, Contact, Privacy'yi aç; footer'a ve üstteki dönüş eylemine bak. | Tek bir dönüş eylemi vardır; footer'da yalnız mevcut sayfa tıklanamaz işaretlidir; diğer hedefler çalışır. | — | Not Run | R-TRUST-01, R-TRUST-02 | ÖK-1, ÖK-2 | — | — |
| Güven sayfaları | Dokunma hedefi | 4 | Telefonda dönüş eylemini ve tema düğmesini kullan. | İkisi hizalı, dokunmaya yeterli büyüklükte ve ekran içindedir. | — | Not Run | R-TRUST-05 | ÖK-1 | — | — |

### GKP-045 — Makine okunur içerik ve CV bağlantısı

**Amaç:** Markdown sürümlerinin doğruluğu ve CV indirme bağlantısının çalışması. **Tür:** İçerik, HTTP. **Öncelik:** Orta. **Otomasyon:** agent-documents.test.js, http-verification.test.js, trust-navigation.test.js.

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Markdown | İçerik | 1 | `/index.md`, `/about/index.md`, `/contact/index.md`, `/privacy/index.md` aç. | Bağlantılar tam adresli; olgular HTML ile aynı; betik veya iskelet kod yok; gezinme metni Markdown'a girmez. | — | Not Run | R-CONTENT-01, R-TRUST-03 | ÖK-2, ÖK-4 | — | — |
| CV | İndirme bağlantısı | 2 | Resume'daki ve Markdown'daki CV bağlantısını aç. | Bağlantı çalışır ve PDF açılır; kırık bağlantı mevcut PDF ile gizlenmez. | — | Not Run | R-HTTP-07 | ÖK-2, ÖK-4 | — | — |

### GKP-046 — Otomasyon sözleşmelerinin kanıt incelemesi

**Amaç:** kullanıcının doğrudan gözleyemediği sözleşmeleri (CI, kurtarma, veri, belge üretimi) elle yeniden yürütmek yerine kabul edilen build'in kanıtını statik olarak incelemek. **Tür:** Statik inceleme. **Öncelik:** Orta. **Otomasyon:** ilgili birim/sözleşme testleri; kanıt, build'in `unit-report` TAP çıktısı ve [izlenebilirlik raporu](TRACEABILITY.md).

| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul | Test Girdileri | Varsayımlar ve Kısıtlamalar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Yayın kapısı | Kanıt | 1 | Kabul edilen build'in Portfolio CI/CD koşusunda `unit-report` TAP çıktısını aç; bu adımdaki kimlikleri ara. | Hepsi `ok`; atlanmış veya başarısız yok. Koşu bağlantısını ve SHA'yı kaydet. | Build SHA'sını yaz | Not Run | R-PIPE-01, R-PIPE-02, R-PIPE-03, R-PIPE-04, R-PIPE-05, R-PIPE-06, R-PIPE-07, R-PIPE-08, R-PIPE-09, R-PIPE-10, R-PIPE-11, R-PIPE-12, R-PIPE-13, R-RELEASE-01, R-RELEASE-02, R-RELEASE-03, R-RELEASE-04, R-FIRST-01, R-FIRST-02, R-CI-01, R-ASSET-01, R-COV-01, R-COV-02, R-COV-03, R-COV-04, R-COV-05 | — | Kabul edilen build | Elle yeniden yürütme gerekmez |
| Kurtarma | Kanıt | 2 | Aynı TAP çıktısında bu adımdaki kurtarma kimliklerini ara. | Hepsi `ok`. | — | Not Run | R-CI-RECOVER-01, R-CI-RECOVER-02, R-CI-RECOVER-03, R-CI-RECOVER-04, R-CI-RECOVER-05, R-CI-RECOVER-06, R-CI-RECOVER-07, R-CI-RECOVER-08, R-CI-RECOVER-09, R-CI-RECOVER-10, R-CI-RECOVER-11, R-CI-RECOVER-12, R-CI-RECOVER-13, R-CI-RECOVER-14, R-CI-RECOVER-15, R-CI-RECOVER-16, R-CI-RECOVER-17, R-CI-RECOVER-18, R-CI-RECOVER-19, R-CI-RECOVER-20, R-CI-RECOVER-21, R-CI-RECOVER-22, R-CI-RECOVER-C1-00, R-CI-RECOVER-C1-01, R-CI-RECOVER-C1-02, R-CI-RECOVER-C1-03, R-CI-RECOVER-C1-04, R-CI-RECOVER-C1-05, R-CI-RECOVER-C1-06, R-CI-RECOVER-C1-07, R-CI-RECOVER-C1-08, R-CI-RECOVER-C1-09, R-CI-RECOVER-C1-10, R-CI-RECOVER-C1-11, R-CI-RECOVER-C1-12, R-CI-RECOVER-C1-13, R-CI-APT-01, R-CI-APT-02 | — | Kabul edilen build | — |
| Veri sözleşmesi | Kanıt | 3 | Aynı TAP çıktısında veri ve URL güvenliği kimliklerini ara. | Hepsi `ok`. | — | Not Run | R-DATA-SYNC-01, R-DATA-SYNC-02, R-DATA-SYNC-03, R-DATA-SYNC-04, R-DATA-SYNC-05, R-DATA-URL-01, R-DATA-URL-02, R-DATA-URL-03, R-DATA-URL-04, R-DATA-COLOR-01, R-DATA-NUM-01, R-HTTP-02, R-HTTP-03, R-HTTP-04, R-HTTP-05, R-HTTP-06 | — | Kabul edilen build | — |
| Üretilen içerik | Kanıt | 4 | Aynı TAP çıktısında üretici ve belge kimliklerini ara. | Hepsi `ok`. | — | Not Run | R-A0-01, R-A0-02, R-A0-05, R-A0-05b, R-SHELL-02, R-SHELL-03, R-THEME-01, R-NAV-03, R-NAV-06, R-CONTENT-02, R-DISCLOSURE-01, R-DISCLOSURE-02, R-A11Y-02, R-GKP-01, R-GKP-02, R-GKP-03 | — | Kabul edilen build | — |
| Belge izlenebilirliği | Kanıt | 5 | Aynı TAP çıktısında belge kimliklerini ara; izlenebilirlik raporunun Consistency bölümünü oku. | Hepsi `ok`; raporda bilinmeyen kimlik yok. | — | Not Run | R-DOC-01, R-DOC-02, R-DOC-03, R-DOC-RTM-01, R-DOC-RTM-02, R-DOC-RTM-03, R-DOC-TRACE-01, R-DOC-TRACE-02, R-DOC-TRACE-03, R-DOC-TRACE-04, R-DOC-TRACE-05 | — | Kabul edilen build | — |
| Tarayıcı modülleri | Kanıt | 6 | Aynı TAP çıktısında tarayıcı modülü birim testlerinin kimliklerini ara. | Hepsi `ok`. | — | Not Run | R-UNIT-NOTFOUND-01, R-UNIT-NOTFOUND-02, R-UNIT-PANELS-01, R-UNIT-PANELS-02, R-UNIT-PANELS-03, R-UNIT-PANELS-04, R-UNIT-PANELS-05, R-UNIT-PANELS-06, R-UNIT-PRELOADER-01, R-UNIT-PRELOADER-02, R-UNIT-PRELOADER-03, R-UNIT-RESNAV-01, R-UNIT-RESNAV-02, R-UNIT-RESNAV-03, R-UNIT-RESNAV-04, R-UNIT-RESNAV-05, R-UNIT-RESNAV-06, R-UNIT-RESNAV-07, R-UNIT-RESNAV-08, R-UNIT-SHELL-01, R-UNIT-SHELL-02, R-UNIT-SHELL-03, R-UNIT-SHELL-04, R-UNIT-SHELL-05, R-UNIT-SHELL-06, R-UNIT-SHELL-07, R-UNIT-SHELL-08, R-UNIT-STARRED-01, R-UNIT-STARRED-02, R-UNIT-STARRED-03, R-UNIT-TITLE-01, R-UNIT-TITLE-02, R-UNIT-TITLE-03, R-UNIT-TOUCHBAR-01, R-UNIT-TOUCHBAR-02, R-UNIT-TOUCHBAR-03, R-UNIT-TOUCHBAR-04, R-UNIT-TOUCHBAR-05, R-UNIT-TIP-00, R-UNIT-TIP-01, R-UNIT-TIP-02, R-UNIT-TIP-03, R-UNIT-TIP-04, R-UNIT-TIP-05 | — | Kabul edilen build | — |
| Tarayıcı bağımlılığı | Kanıt | 7 | Kabul edilen build'in `merged-browser-report` sonuçlarında bu adımdaki kimlikleri ara. | Altı projenin hepsinde geçti; atlanmış yok. | Dosya engellemesi kontrollü hata enjeksiyonudur; üretim hatası değildir. | Not Run | R-TIP-01, R-TIP-02, R-TIP-03, R-TIP-04, R-TIP-05 | — | Kabul edilen build | — |

## Yürütme kaydı ve açıklıklar

Her vaka ve her matris hücresi için şu kayıt çoğaltılır; kaynak prosedürdeki Not Run değerlerini topluca Pass'e çevirmeyin. Gerçek sonuç bir gözlem, beklenen sonuç ise yukarıdaki kabul ölçütüdür.

| Koşu / commit / ortam | Vaka / adım / matris girdisi | Gerçek sonuç | Durum | Tarih / testçi | Defect ID | Kanıt referansı | Not |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TBD | TBD | Yürütülmedi | Not Run | TBD / TBD | TBD | TBD | Onay/başarı uydurulmaz |

### Açık kararlar ve kapsam boşlukları

- **AÇ-1:** Açık temada subtitle/copyright/Privacy/CTA kontrastı ve bazı link ayırt edilebilirliği mevcut borçtur. [Sabit ölçüm](../../tests/fixtures/accessibility-debt.json) yeni kusuru gizlememek içindir; ürün sahibi risk kabulü veya tasarım düzeltmesi TBD.
- **AÇ-2:** SPA önceki/sonraki okları `div` olarak uygulanmış; semantik buton/klavye eylemi yok. Bu denetim üretim UI'sını değiştirmedi. GKP-025 bunu açık kusur olarak kaydeder; CSS locator'ı kullanılması erişilebilirlik başarısı değildir.
- **AÇ-3:** Download Full Resume etiketi mevcut `_blank` PDF görüntüleme davranışını adlandırıyor; zorunlu indirme yok. Doğrudan indirme istenirse ayrı ürün kararı gerekir; tarayıcı viewer davranışı hata diye varsayılmaz.
- **AÇ-4:** Onaylı tarayıcı, ekran okuyucu ve fiziksel cihaz destek matrisi yok; GKP-028 ve ekran okuyucu yürütmesi açık. Chromium emülasyonu bütün tarayıcı desteğini kanıtlamaz.
- **AÇ-5:** Resume içi ayrı bölüm navigasyonu, Scroll Spy, sticky bölüm menüsü ve bölüm linkine basınca tüm içeriği otomatik açma mevcut değildir. Bu özellikler için gereksinim **Pending Requirement Clarification**, test kapsamı **Not Covered / Requires Test Design**; mevcut yan menü ile karıştırılmaz ve RTM'nin doğrulanmış davranış paydasına eklenmez.
- **AÇ-6:** Resmi SRS, kurumsal gereksinim kimlikleri, gözden geçiren/onaylayan ve kabul toleransları yok; hepsi TBD. Buradaki risk öncelikleri test mühendisliği önerisidir.
- **AÇ-7:** Markdown content negotiation, Markdown hata gövdesi ve çalışan MCP bu statik hosting/kapsam altında karşılanmıyor. Bunlar başarıya çevrilmez; yeni skor/uygunluk garantisi verilmez.

- **AÇ-8:** Gerçek reklam doldurma, gösterim ve gelir kabul ölçütü değildir ve otomasyonla doğrulanamaz; yalnız GKP-030 adım 4'te salt okunur gözlenir. Hesap tarafı (gizlilik ve mesajlar, onay iletisi, yeni birimlerin dolma süresi) depoda kanıtlanamaz ve ürün sahibi tarafından kontrol edilmelidir. Reklama tıklanmaz ve geçersiz trafik üretilmez.

### Bakım ve doğrulama

Vakalar test verisini değiştirmek yerine yeni oturumla başlar; GKP-018 gibi vaka içi durum dizileri kasıtlıdır. Otomasyon zaten iyi kapsadığı için bu alanlarda yeni manuel adımlar görsel/anlamsal kabul ve gerçek ortam incelemesine odaklanır. Ağ yarışları ve 48 hücreli matris otomasyonda tutulur; manuel kabul örneklenirse kapsam eksikliği açık kaydedilir.

`node --test scripts/tests/manual-documentation.test.js` kimlik, 11 sütun, adım sırası, girdi/ön koşul, gereksinim/vaka bağları ve yerel bağlantıları doğrular. Bu komut belge tutarlılığı kontrolüdür; manuel yürütme değildir. Her değişiklikte RTM/vakalar birlikte güncellenir. Test stratejisi ve otomatik raporlar S-7 altındadır.

Tasarım yaklaşımı [ISTQB CTFL 4.0.1](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf) içindeki risk temelli analiz, eşdeğer bölümler, sınır değerler, karar tabloları ve durum geçişleriyle uyumludur; sertifikasyon veya resmi kurum uygunluğu iddia edilmez.
