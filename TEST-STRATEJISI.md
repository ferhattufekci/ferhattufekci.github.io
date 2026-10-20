# Test strategy / Test stratejisi

**[🇬🇧 English](#test-strategy-en) | [🇹🇷 Türkçe](#test-strategy-tr)**

---

## English

<a id="test-strategy-en"></a>

[Back to README — English](README.md#english) · [Maintenance guide](README.md#maintenance-guide)

### Purpose and scope

For this personal portfolio, the priorities are helping visitors reach the correct section and allowing agents to read public information accurately. Tests were selected by risk. The approach uses ISTQB concepts of test levels, equivalence partitions, boundary values, state transitions and requirements traceability; it does not claim certification or full standards compliance.

### Test layers and traceability

| Requirement / risk | Priority | Test level and coverage |
| --- | --- | --- |
| R-NAV-01/02/03: incorrect URL, blank screen, wrong section match | High | Pure routing function: valid/invalid/malformed encoding/prefix partitions; BDD with real menus and error recovery |
| R-NAV-04/05: failures during history navigation or animation | High | Browser back/forward, invalid hash during a transition and recovery |
| R-NAV-06: transition definition uses an invalid class | Medium | Options 0–67 and boundaries -1/68/fraction/NaN; stylesheet contract check |
| R-404-01/02: incorrect HTTP status or unusable error screen | High | HTTP integration, shared card component, focus and keyboard recovery |
| R-THEME-01/02/03/04: incorrect theme or corrupted/blocked storage | Medium | Initialization and theme-module unit tests; OS/stored-preference decision table; persistence in a real browser |
| R-CONTENT-01/02/03: content loss, malformed HTML or JavaScript dependency | High | Markdown conversion, escaping, idempotent generation, raw HTML, browser with JavaScript disabled |
| R-A11Y-01: accessibility defects on new screens | High | axe WCAG A/AA checks on new 404 and trust pages; real keyboard/focus scenario |
| R-DEPLOY-01: accidental publication of sources/tests/dependencies | High | Artifact containing only public files; content equality and absence of private directories |
| R-CI-01: false success when all Git push attempts fail | High | The real Bash retry block is tested with isolated git/sleep doubles for eventual success and exhausted attempts |
| R-FIRST-01/02: expensive checks run too early or tests mutate shared files | Medium | CI step order; generation in an isolated project root; original source remains unchanged |
| R-HTTP-01–07: cached probes, soft-404, incorrect MIME, malformed XML/JSON, network errors and broken CV links | High | UUID root/nested GET matrix; deliberately corrupted responses; exact MIME and body evidence; strict XML; actual CV link + PDF header/signature; platform limits reported separately |
| R-FILTER-01–14: Blog/Projects filters affect each other or show incorrect content | High | Decision table below, state transitions, delayed/malformed data, responsive labels and pagination boundaries; run in six browser projects |
| JSON-LD, llms.txt, sitemap, JSON snapshots and links | High | HTTP and format checks for all intended public files |
| Existing filter and Medium behavior | Regression | Earlier category and article tests remain in every unit test run |

### TDD and BDD practice

The new theme regression and accessibility contrast check were run failing first, then fixed. This does not imply that all legacy code was originally written with TDD. New shared modules are pure functions or small DOM components that can be tested directly.

BDD scenarios run in Playwright Test using `Given / When / Then` steps; no separate Cucumber runtime is used. Six projects cover 1440/390/320 pixels combined with light/dark themes. Mobile projects also emulate touch input and a mobile viewport. Real phone hardware and Safari/Firefox coverage are not claimed.

### Blog and Projects regression coverage

`tests/browser/categories.spec.mjs` serves fixed JSON snapshots for each test. Content changes on Medium/GitHub do not change test expectations. Each scenario starts with a fresh context, independently of scenario order or previous selections.

| Decision / transition | Automated check |
| --- | --- |
| Blog: four categories × three languages | Exact title lists in 12 combinations, newest-first order, language/category badges and a single active/aria-pressed selection |
| Projects: four categories | Pinned + regular, pinned-only and regular-only cards; section visibility and labels |
| Independence between pages | Projects four categories × Blog four categories × three languages: 48 states; the other page's selection stays unchanged and cards are checked on return |
| State transitions | Menus, back/forward, theme changes, revisits, rapid filter changes and clicks on nested label targets |
| Empty results and recovery | No results at a language/category intersection, an empty project category, all catalogs empty and return to All |
| Invalid data | Network errors, invalid JSON, non-array responses and partially missing categories; a failure on one page does not break the other |
| Delayed data | Selection before the request completes; loading remains visible and results follow the last selection |
| Unknown project category | Missing/new/prototype-named metadata uses the same Software fallback in cards and filters |
| Starred boundaries | 0, 1, 20, 21, 40, 41 entries; remaining count, batches of 20, no duplicates and progress preserved across category/navigation changes |
| Empty owned / populated starred catalog | Starred cards and pagination remain usable when owned repositories are empty |
| Long section labels | Visible label bounds stay within the container in every category; narrow screens do not clip text. The visual active class and aria-pressed identify the same language button. |

The incorrect empty state during delayed loading and inconsistent fallback category were demonstrated with three failing browser tests before being fixed. This does not exhaust every possible input and user behavior; the defined filter state space and high-risk boundaries are explicitly covered.

### Reliable and maintainable tests

FIRST principles are applied as follows:

- **Fast:** The unit/component/HTTP layer runs before browser download in CI; failures stop expensive stages and deployment.
- **Independent:** Generation and packaging tests run in separate temporary project copies. Tests do not mutate source files or a shared deployment package; browser scenarios use separate contexts.
- **Repeatable:** Locked dependencies, a local HTTP server and external-service isolation are used. Content generation is also checked for idempotence.
- **Self-validating:** Explicit assertions and exit codes determine results; visual interpretation of reports is not a pass criterion.
- **Timely:** A new regression is demonstrated with a failing test before the fix. FIRST's Timely principle and TDD's test-first cycle are related; CI ordering alone does not prove TDD.

- Each browser scenario starts with a fresh context and storage. Servers use temporary local ports per worker and are closed afterward.
- There are no fixed sleeps; Playwright's retrying state assertions are used. Test-run retries are set to `0`, so intermittent failures are not hidden by automatic reruns.
- External Analytics/AdSense/Calendly resources are isolated. Tests do not verify those services' availability, create appointments or send messages.
- Failures produce traces, screenshots and video; every run produces HTML, JUnit and JSON reports. CI artifacts are retained for 14 days.
- Unit-test TAP output is also saved in the CI artifact. Bash `pipefail` ensures piping output through `tee` cannot turn a failing test into success.
- axe checks cover new screens, not WCAG certification of the entire legacy portfolio. Automation cannot detect every usability or screen-reader issue.
- Pixel images produced on Windows are not used as thresholds for Linux CI. Screenshots provide review evidence; responsive overflow, semantics, focus and contrast are checked automatically. Typography/geometry comparisons against the earlier version are also included in delivery evidence.

### Running tests and the quality gate

```powershell
npm ci
npx playwright install chromium
npm run build
npm run verify -- --local --artifact --all --output=verification-local.json
```

`npm run build` runs content generation, all unit/component/HTTP tests, BDD browser tests and `.pages-site` packaging, in that order. A failed stage prevents the next stage from running. Use `npm run test:unit` for the fast development loop, `npm run generate` for generation only, and `npm run test:bdd` for BDD. `npm test` runs the unit/component/HTTP layer; `npm run build` is the complete gate.

### GitHub Actions and GitHub Pages

`pages.yml` calls the shared quality workflow on every main-branch push, pull request, manual trigger and successful data synchronization. Pull requests are tested only. On the main branch, deployment depends on the quality job through `needs`; only the tested `.pages-site` artifact is published. The real site is verified again after deployment. The `workflow_run` trigger handles data commits made with GITHUB_TOKEN, which do not start another push workflow.

This deployment gate is enabled in the GitHub repository through **Settings → Pages → Build and deployment → Source: GitHub Actions**. Reverting to “Deploy from a branch” can allow publication independently of tests; adding test files alone does not prevent that. A repository administrator can separately make the quality check mandatory in branch protection/rulesets.

GitHub run, runner and deployment results are verified in Actions history, separately from local test evidence. Hosting remains on GitHub Pages. Markdown Accept negotiation and live MCP limitations are explicitly reported separately.

---

## Türkçe

<a id="test-strategy-tr"></a>

[README'ye dön — Türkçe](README.md#türkçe) · [Bakım rehberi](README.md#bakim-rehberi)

### Amaç ve kapsam

Bu kişisel portföy için öncelik, ziyaretçinin doğru bölüme ulaşması ve ajanların kamuya açık bilgiyi doğru okuyabilmesidir. Testler risk temelli seçildi. ISTQB'deki test seviyeleri, eşdeğer sınıflar, sınır değerler, durum geçişleri ve gereksinim izlenebilirliği yaklaşımı kullanıldı; bir sertifikasyon veya tam standart uygunluğu iddiası yoktur.

### Test katmanları ve izlenebilirlik

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
| R-HTTP-01–07: eski probe önbelleği, soft-404, yanlış MIME, bozuk XML/JSON, ağ hatası ve bozuk CV bağlantısı | Yüksek | UUID kök/iç içe GET matrisi; bilerek bozulmuş yanıtlar; tam MIME ve gövde kanıtı; strict XML; gerçek CV linki + PDF header/imzası; platform sınırları ayrı tutulur |
| R-FILTER-01–14: Blog/Projects filtrelerinin birbirini etkilemesi veya yanlış içerik göstermesi | Yüksek | Aşağıdaki karar tablosu, durum geçişleri, gecikmeli/bozuk veri, responsive etiketler ve sayfalama sınırları; altı tarayıcı projesinde çalışır |
| JSON-LD, llms.txt, sitemap, JSON snapshot ve bağlantılar | Yüksek | Bütün amaçlanan public dosyalarda HTTP ve biçim kontrolleri |
| Mevcut filtre ve Medium davranışları | Regresyon | Önceki kategori ve makale testleri de bütün birim test koşularına dahildir |

### TDD ve BDD uygulaması

Yeni tema regresyonu ve erişilebilirlik kontrast kontrolü önce başarısız çalıştırıldı, ardından düzeltildi. Bütün eski kodun başlangıçtan beri TDD ile yazıldığı iddia edilmez. Yeni ortak modüller saf fonksiyonlar veya küçük DOM bileşenleri olarak doğrudan sınanabilir.

BDD senaryoları Playwright Test içinde `Given / When / Then` adımlarıyla yürütülür; ayrı bir Cucumber çalışma zamanı kullanılmaz. Altı proje, 1440/390/320 piksel ile açık/koyu tema kombinasyonlarını kapsar. Mobil projelerde dokunmatik giriş ve mobil viewport da taklit edilir. Gerçek telefon donanımı veya Safari/Firefox kapsamı iddia edilmez.

### Blog ve Projects regresyon kapsamı

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

### Güvenilir ve bakımı yapılabilir testler

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

### Çalıştırma ve kalite kapısı

```powershell
npm ci
npx playwright install chromium
npm run build
npm run verify -- --local --artifact --all --output=verification-local.json
```

`npm run build` sırasıyla içerik üretimi, bütün birim/bileşen/HTTP testleri, BDD tarayıcı testleri ve `.pages-site` paketlemesini çalıştırır. Bir aşama başarısızsa sonraki aşamaya geçmez. Hızlı geliştirme döngüsü için `npm run test:unit`; yalnız üretim için `npm run generate`; BDD için `npm run test:bdd` kullanılabilir. `npm test` birim/bileşen/HTTP katmanını çalıştırır; tam kapı `npm run build` komutudur.

### GitHub Actions ve GitHub Pages

`pages.yml`, her ana dal push'unda, pull request'te, elle tetiklemede ve başarılı veri senkronizasyonundan sonra ortak kalite iş akışını çağırır. Pull request yalnız test edilir. Ana dal için deploy işi kalite işine `needs` ile bağlıdır; yalnız test edilen `.pages-site` artifact'i yayımlanır. Yayın sonrası gerçek site tekrar doğrulanır. Veri senkronizasyonunda GITHUB_TOKEN ile atılan commit'lerin yeni push koşusu üretmemesi `workflow_run` tetikleyicisiyle karşılanır.

Bu yayın kapısı GitHub deposunda **Settings → Pages → Build and deployment → Source: GitHub Actions** seçeneğiyle etkinleştirilmiştir. Eski “Deploy from a branch” seçeneğine dönülürse testlerden bağımsız yayın gerçekleşebilir; yalnız test dosyası eklemek bunu engellemez. Branch protection/ruleset içinde kalite kontrolünü zorunlu yapmak ayrıca depo yöneticisinin yapabileceği bir işlemdir.

GitHub üzerindeki koşu, runner ve yayın sonuçları Actions geçmişinden doğrulanır; bu sonuçlar yerel test kanıtlarından ayrıdır. Hosting GitHub Pages olarak kalır. Markdown Accept müzakeresi ve canlı MCP sınırlamaları test raporunda açıkça ayrı tutulur.
