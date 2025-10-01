# Test mühendisliği denetimi

Tarih: **2026-10-24**. Başlangıç: `c2e55b79bcbad70c4074ee5a404974d7ca8ee20b`; dal `test/quality-audit-and-gkp`. Başlangıç çalışma ağacı temizdi. Test/CI/dokümantasyon incelemesine ek olarak testlerle kanıtlanan isteğe bağlı Calendly hata yolları dar kapsamda düzeltildi. Kullanıcının ek talebiyle TÜBİTAK araç başlığının ortak tipografiyi kullanması sağlandı; diğer içerik ve düzen korundu. Bu tarihsel denetimde push, merge veya geçmiş yeniden yazımı yapılmadı. Güncel pipeline ve komutlar için [CI/CD rehberine](../CI-CD.md) bakın; aşağıdaki ölçümler kendi tarihindeki sürüme aittir.

## Mimari ve inceleme kapsamı

Vanilla HTML/CSS/JavaScript, jQuery ve Bootstrap dönemi stiller; bundler/backend yok. Node `--test`, linkedom DOM bileşenleri, yerel HTTP entegrasyonu; Playwright 1.64.1, Chromium, axe 4.11.0. Kilitli bağımlılıklar korunur. `npm test` hızlı katman; `npm run build` generate → unit → public artifact → browser zinciridir. Ayrı bir lint sistemi yoktur; değişen JS `node --check`, workflow'lar mevcut actionlint aracıyla kontrol edilir.

Başlangıçta **16 Node test dosyasında 112 test**, **7 browser spec dosyasında 55 senaryo × 6 proje = 330 yürütme** vardı. Masaüstü 1440px, mobil 390px, küçük mobil 320px × açık/koyu; sıfır retry, iki worker, test başına context. 768/1280px gibi ek ölçümler ilgili vakaların içindedir. El ile yürütme/RTM belgesi ve kayıtlı kod coverage raporu bulunmadı.

### Her mevcut suite için değerlendirme

| Dosya / suite | Sorumluluk / inceleme sonucu |
| --- | --- |
| [route-policy.test.js](../../scripts/tests/route-policy.test.js) | Geçerli/bozuk kodlama/önek/prototype rota sınıfları ve mevcut detail izin listesi; saf fonksiyon ve negatif kapsam anlamlı, korundu. Detail politikası birim kapsamıdır; sitede yayımlanmayan detail sayfası için E2E uydurulmadı. |
| [page-animations.test.js](../../scripts/tests/page-animations.test.js) | 0–67 seçenekleri ve -1/68/kesir/NaN sınırı; CSS sınıf sözleşmesi uygulanabilir, korundu. Bu statik kontrol görsel animasyon doğruluğunu tek başına kanıtlamaz. |
| [theme.test.js](../../scripts/tests/theme.test.js) | Eski 8 başlangıç kombinasyonu/engelli storage korundu; boş querySelectorAll taklidi gerçek kontrol etiketlerini sınamıyordu. Küçük DOM fixture ile olaylar/iki kontrol/OS değişimi/engelli yazma/DOMContentLoaded eklendi. |
| [category-filters.test.js](../../scripts/tests/category-filters.test.js) | Scroll-hint yaşam döngüsü, resize/font/rAF birleştirme, bfcache, transition politikası. Mevcut unit kapsamı korundu. Inline render kesitini string ile ayıran son test biçimsel refactor'a hassastır; bunu kaldırıp hızlı regresyon kapısını kaybetmek yerine kalan bakım riski olarak kaydedildi. |
| [medium-excerpt.test.js](../../scripts/tests/medium-excerpt.test.js) | Tam/kesik açıklama, entity, üyelik mesajı, kaynak fallback ve geçici ağ hatası; yükleyici enjekte ediliyor, gerçek ağa bağlı değil. Pozitif/negatif ayrımı ve tam metin oracle'ı korunur. |
| [agent-documents.test.js](../../scripts/tests/agent-documents.test.js) | Markdown/escaping ve bozuk tema marker'ı; ham HTML güvenliği ve hata davranışı, korundu. |
| [agent-readiness.test.js](../../scripts/tests/agent-readiness.test.js) | Gerçek intended public dosyalar, statik içerik, trust, sertifika, kaynak/üretici tutarlılığı; bağımsız geçici fixture'da idempotence, korundu. |
| [http-verification.test.js](../../scripts/tests/http-verification.test.js) | Taze UUID GET matrisi; 200 HTML fallback, yanlış MIME, bozuk JSON/XML, DNS ve kırık PDF linki negatifleri. Hosting kısıtı ile ürün/ağ hatası ayrımı güçlü, korundu. |
| [error-card.test.js](../../scripts/tests/error-card.test.js) | Escaping, etiketli linkler, idempotent view ve focus/event; DOM seviyesi uygun, E2E ile farklı riskleri koruyor. |
| [not-found-shell.test.js](../../scripts/tests/not-found-shell.test.js) | Kaynak shell mutasyonu, absolute assets, noindex/no-redirect ve aynı copy; üretici entegrasyonu anlamlı, korundu. |
| [pages-package.test.js](../../scripts/tests/pages-package.test.js) | Public byte eşitliği korundu; artık özel dosyalar gerçekten fixture'a eklenir ve artifact'in tam dosya listesi karşılaştırılır. Docs/README/.env gibi fazlalıklar sessizce geçemez. |
| [sync-workflows.test.js](../../scripts/tests/sync-workflows.test.js) | Gerçek Bash retry bloğu eventual success/exhaustion; git/sleep doubles yan etkisiz. Windows Git Bash yolu mevcut ortamda doğrulandı; alternatif kurulumlarda yapılandırma ihtiyacı kalan ortam riski. |
| [first-principles.test.js](../../scripts/tests/first-principles.test.js) | Unit-before-browser ve kaynak izolasyonu korundu; tested SHA → canlı verifier checkout sözleşmesi eklendi. Regex kontrolleri gerçek GitHub çalışması yerine geçmez. |
| [trust-navigation.test.js](../../scripts/tests/trust-navigation.test.js) | Template, current-page footer, canonical ve Markdown'ın gezinmeden etkilenmemesi; farklı görünüm projeksiyonları korundu. |
| [documentation-navigation.test.js](../../scripts/tests/documentation-navigation.test.js) | EN/TR link/anchor ve risk/komut eşitliği; kullanıcı dil beklentisine doğrudan bağlı, korundu. |
| [resume-disclosures.test.js](../../scripts/tests/resume-disclosures.test.js) | Bağımsız frozen facts/URL/PDF hash, 64 düz ders, 5 iş, 14 sertifika ve tam Markdown; güçlü veri bütünlüğü oracle'ı, korundu. |
| [portfolio.spec.mjs](../../tests/browser/portfolio.spec.mjs) | Rota/geçmiş/animasyon/no-JS/tema/axe; dinamik erişilebilirlik referansının yeni hataları kabullenmesi giderildi. Yeni ok sınırı testi; ortak helper tüm rota kontrollerinde aktif menüyü de doğruluyor. |
| [categories.spec.mjs](../../tests/browser/categories.spec.mjs) | 12 Blog, 4 proje, 48 çapraz state, hata/gecikme/starred; birleşik test yalnız count kontrol ediyordu. Tam içerik/sıra ve karşı sayfanın kartları kontrol edilir; 19/39 sınırları eklendi. |
| [button-states.spec.mjs](../../tests/browser/button-states.spec.mjs) | Pointer/klavye/touch/hover/pressed/reduced motion, CTA computed parity; görünmez desktop hamburger için explicit beklenti var, sessiz coverage çıkarımı değil. Korundu. |
| [link-details.spec.mjs](../../tests/browser/link-details.spec.mjs) | Altı font özelliği, SVG/ikon tıklaması, Privacy ve güvenli popup hedefi; lokal fulfilled dış hedefler, korundu. |
| [not-found-shell.spec.mjs](../../tests/browser/not-found-shell.spec.mjs) | Hash/root/nested shell/HTTP semantiği ve no-JS geri dönüş; üretilen çıktının gerçek tarayıcı katmanı, korundu. |
| [trust-navigation.spec.mjs](../../tests/browser/trust-navigation.spec.mjs) | Header/footer davranışı, 44px hedefler ve hizalama; çeşitli giriş cihazlarında aynı genişlik ölçümleri kısmen örtüşüyor, ancak ölçülmüş gereksiz maliyet kanıtı olmadan azaltılmadı. |
| [resume-disclosures.spec.mjs](../../tests/browser/resume-disclosures.spec.mjs) | Native details, okuma sırası, preview, bağımsız açılım, history/reload, responsive ve scoped axe; gerçek PDF tıklaması/yeni bağlam navigasyonu eklendi. |

## Öncelikli bulgular ve kararlar

**Critical:** kanıtlanmış kritik test/ürün kusuru bulunmadı. Bu, kritik kusur olmadığı garantisi değildir.

| Kimlik | Öncelik | Belirti → neden / etki | Uygulanan çözüm / doğrulama |
| --- | --- | --- | --- |
| AQ-01 | High | Axe referansı her koşuda güncel shell'den oluşturuluyor; ortak stile eklenen yeni kusur da knownTargets'a girebiliyor. | Ölçülmüş rule/target/impact/check-data içeren [sabit borç](../../tests/fixtures/accessibility-debt.json) ile referansın kendisi denetlenir. Yeni selector, yeni kural, kötüleşen kontrast/severity reddedilir. Bilinen borcun kaldırılması kabul edilir. |
| AQ-02 | High | 48 çapraz filtre durumunda yalnız makale adedi karşılaştırılıyor; aynı adette yanlış içerik kaçabilir. | Bağımsız başlık/sıra oracle'ı tek yerde paylaşılır; her hücrede Blog ve saklanan Projects listeleri exact karşılaştırılır. |
| AQ-03 | High | verify-live deploy sonrasında hareketli main'i checkout ediyor; oracle test edilmiş artifact sürümünden kayabilir. | Quality gerçek checked-out SHA'yı output verir; verify-live hem quality/deploy'a bağlıdır ve o SHA'yı kullanır; kanıt artifact'inde verification-source.txt bulunur. Yerel sözleşme testi/actionlint; yeni uzak CI koşusu yapılmadı. |
| AQ-04 | Medium | Tema testlerinde kontrol listesi boş; startup geçse de label/icon, storage write ve OS change bozulabilir. | İki gerçek DOM kontrolü; 8 mevcut kombinasyon korunur; 4 OS geçişi, iki kullanıcı override'ı, engelli okuma/yazma ve DOM hazır olma yolu doğrulanır. |
| AQ-05 | Medium | Rota helper'ı yalnız current section'ı kontrol ediyor; yanlış menü aktifi ve ok sarma sınırları eksik. | Tek atomik section/menu state beklentisi; contact→home, home→contact ve invalid→home geçişleri için R-NAV-08. |
| AQ-06 | Medium | PDF erişimi request.get ile sınanıyor; gerçek link tıklaması bozulsa testler geçebilir. | R-RESUME-13 gerçek navigasyon isteği, ayrı page bağlamı, 200/application/pdf ve ana Resume sekmesinin korunmasını doğrular. Byte/hash alt seviyede korunur. |
| AQ-07 | Medium | 20/40 parti sınırlarının alt komşusu 19/39 yok. | 0/1 ve 19/20/21, 39/40/41 veri kümeleri; keyfi test artışı yerine açık BVA gerekçesi. |
| AQ-08 | Medium | Resmi manuel prosedür, precondition/data/RTM/yürütme ayrımı yok. | [GKP](GKP.md), mevcut fikstürleri kullanan [manuel tarayıcı](../../tests/manual/preview.mjs), kimlik/adım/bağlantı/RTM kalite kontrolleri. Kabul/onay TBD; bütün adımlar Not Run. |
| AQ-09 | High, ürün borcu | Mevcut subtitle/copyright/Privacy/CTA kontrastı; SPA okları div olduğundan klavye semantiği yok. | Tasarım ve ürün davranışı bu görevde değiştirilmedi; GKP AÇ-1/2 altında açık risk. Sabit borç kaydı bu kusurları WCAG Pass yapmaz. |
| AQ-10 | Low, kapsam | Chromium dışı motor, gerçek telefon ve ekran okuyucu kapsamı yok; fetch-github.js canlı senkronizasyon/pagination dönüştürücülerinin izole unit kapsamı sınırlı. | Sahte backend/API kapsamı üretilmedi; destek matrisi ve ileride yan etkisiz fetcher ayrıştırması ürün/ayrı iş kararı olarak açık. |
| AQ-11 | Medium | Artifact testi özel dosya yokluğunu, bu girdiler çoğunlukla fixture'da hiç yokken kontrol ediyor; tam artifact listesi de okunmuyordu. | Gerçek sentetik özel girdiler, bağımsız recursive artifact envanteri ve exact liste eşitliği; yeni bakım belgelerinin/README'nin/.env'nin dışarıda kalması doğrulandı. |
| AQ-12 | Medium, ürün | Ortak fixture badge'i kayıtlı kapalı tuttuğundan ilk ziyaretin eksik Calendly API'si ve Storage SecurityError yolları gizleniyordu. | İlk ziyaret ayrı fixture seçeneği; iki negatif senaryo önce başarısız oldu. Kaynakta güvenli storage okuma/yazma ve API varlık kontrolü; harici servis olmadan gezinme, mevcut API ile kapatma ve tema doğrulanır. |
| AQ-13 | Low, kullanıcı stil talebi | TÜBİTAK kısa araç listesi eski 10px/700/uppercase/muted kuralını; diğer başlıklar 12px/600/normal/primary kuralını kullanıyordu. | R-RESUME-14 computed karşılaştırması önce başarısız oldu. H5 ortak resume-disclosure-title sınıfına bağlandı; eski tipografi/boş ikon kuralı kaldırıldı. Dokuz araç ve sürekli açık liste korunur. |

### Kusur yakalama deneyleri

Geçici proje kopyalarında gerçek uygulama cevabı değiştirildi; asıl HTML/CSS dosyaları değiştirilmedi. Bu iki seçilmiş mutation deneyi bütün suite için mutation score değildir.

| Kontrollü kusur | Önce | Sonra | Kanıt / anlam |
| --- | --- | --- | --- |
| Sidebar subtitle rengi beyaz zeminde #9e9e9e yerine #eeeeee | Eski R-A11Y-01 geçti; kusuru kaçırdı | Sabit referans denetimi testi başarısız yaptı | Ölçüm verisi değişen eski selector artık otomatik kabul edilmez |
| Projects Systems seçiliyken Blog başlıkları WRONG CROSS-PAGE CONTENT; kart adedi aynı | Eski R-FILTER-10 geçti | Tam başlık/sıra oracle'ı testi başarısız yaptı | Adet eşitliği yerine gerçek içerik doğrulanır |

Deney logları teslim çalışma alanındaki `outputs/a11y-mutant-before/after.*` ve `outputs/filter-mutant-before/after.*` dosyalarındadır; bu geçici kanıtlar siteye yayımlanmaz. Normal suite'e kasıtlı ürün kusuru veya beklenen-fail testi eklenmedi.

Yeni PDF testinin ilk sürümünde `response.body()` Chromium PDF viewer yönlendirmesi nedeniyle `Network.getResponseBody: No resource with given identifier` hatası verdi. Bu ürün kusuru veya flaky retry gerekçesi değildi. Tarayıcı testi gerçek tıklama/navigasyon/header/sayfa bütünlüğünü, HTTP/unit katmanı ise PDF byte/imza/hash'ini sınar. Geçerli eski byte/hash assertion'ları kaldırılmadı.

İlk tam regresyonda yeni PDF testinin `request.frame()` varsayımı da bir kez hatalı çıktı: yeni sekmenin navigasyonu frame oluşmadan gelebilir. Popup dinleyicisi tıklamadan önce kuruldu; frame sorgusu kaldırıldı. Altı proje × beş tekrar = **30/30** sıfır retry ile geçti. Önceki başarısız koşu kanıtı saklandı; timeout artırılmadı. Sonraki tam 354 koşu da geçti; son eklenen hata yolları ve stil senaryosu ayrıca tam kapıya dahil edilir.

Calendly test double'ının ilk hali `parentElement` altında badge oluşturduğu için mobilde yanlış biçimde gizliydi. Yayınlanan [Calendly scripti](https://assets.calendly.com/assets/external/widget.js) incelendi: badge doğrudan body'ye eklenir, parentElement inline-widget seçeneğidir. Double body mount ve izole edilen vendor CSS'nin sağladığı fixed konumlandırma sözleşmesine düzeltildi; ürünün mobil gizleme stilleri değiştirilmedi. Bu, ürün kusuru değil test kurulum hatasıydı. Gerçek hizmete bağlı test veya gerçek randevu eklenmedi.

## Değişiklik envanteri

| Dosyalar | Gerekçe |
| --- | --- |
| `index.html`, `css/main.css` | Calendly varlık/storage koruması; TÜBİTAK başlığında ortak tipografi. Metinler, araç sırası, PDF ve diğer sayfa düzenleri yeniden yazılmadı. Üretici çalıştırıldı; üretilen dosyalar değişmedi. |
| `tests/browser/categories.spec.mjs`, `fixtures.mjs`, `portfolio.spec.mjs`, `resume-disclosures.spec.mjs`; yeni `external-widget.spec.mjs` | İçerik oracle'ı, sınırlar, aktif menü, gerçek PDF eylemi, computed başlık eşitliği ve iki dış servis hata bölümü. |
| `scripts/tests/theme.test.js`, `pages-package.test.js`, `first-principles.test.js`; yeni `accessibility-debt.test.js`, `manual-documentation.test.js`, `manual-preview.test.js` | Gerçek DOM/durumlar, gerçek olumsuz artifact girdileri, SHA sözleşmesi ve test araçlarının negatif kontrolleri. |
| Yeni `tests/helpers/accessibility-debt.mjs`, `tests/fixtures/accessibility-debt.json` | Test içinde yeniden üretilmeyen, ölçülmüş erişilebilirlik borcu ve küçük karşılaştırıcı. |
| Yeni `tests/manual/preview.mjs` | Kaynak/veri değiştirmeyen, mevcut BDD fixture'ını kullanan tekrarlanabilir manuel ortam. |
| `.github/workflows/pages.yml`, `.github/workflows/test-agent-readiness.yml`, `package.json` | Test edilen kaynak SHA'sını verifier'a taşımak; bağımlılık eklemeden isteğe bağlı dar coverage komutu. |
| `README.md`, `TEST-STRATEGY.md`; yeni `docs/testing/GKP.md`, `docs/testing/TEST-AUDIT.md` | EN/TR giriş bağlantıları, risk/kapsam eşitliği, kabul prosedürü ve gerçek denetim kanıtı. Ayrı mükerrer RTM/veri/rapor belgeleri oluşturulmadı. |

Dosya silinmedi; kullanılmayan eski başlık ikon/typografi kuralları kaldırıldı. Önceki sertifika, Privacy ve dış bağlantı ikon değişiklikleri korunur.

## Test tasarımı, izolasyon ve bakım

GWT/AAA adımları okunabilir; ortak helper'lar küçük ve davranış odaklıdır. Geometri/computed-style sözleşmelerinde CSS selector kullanımı gerekçelidir; metin/rol bulunan akışlarda semantic locator vardır. Sabit bekleme veya test retry eklenmedi. Route release promise'leri, koşul bazlı beklemeler ve ayrı browser context'ler korunur. Bir test hatası başka testin seçimini/depolamasını devralmaz.

Yeni [manuel fixture aracı](../../tests/manual/preview.mjs) mevcut catalog/mock/isolation/server yardımcılarını kullanır; JSON'a veya prod kaynağa yazmaz. `--hold` insanın JSON yanıtını Enter ile bırakmasına izin verir. Kaynak/derleme/fixture ayrımı korunur. [Manuel araç testleri](../../scripts/tests/manual-preview.test.js) geçersiz yapılandırmayı ve senaryolar arası snapshot izolasyonunu sınar. [GKP testleri](../../scripts/tests/manual-documentation.test.js) çift yönlü RTM, 11 sütun, sıralı adım, boş beklenti/girdi/ön koşul ve uydurma Pass'i kontrol eder; negatif doküman mutantları doğrulayıcının gerçekten reddettiğini gösterir.

**Kaldırılan değerli test yok.** Filtredeki count-only beklenti exact metin listesiyle güçlendirildi; eski kombinasyonlar korunur. Tema fixture'ı tekrarlanan yetersiz sandbox kurulumunu değiştirdi; eski sekiz karar hücresi kaybolmadı. Yalnız aynı test verisi oracle'ının iki kopyası birleştirildi. Üretimden hesaplanan beklenti veya her build'de yenilenen snapshot kullanılmaz.

## Coverage ve süre ölçümleri

Başlangıç `npm run build`: **112 unit + 330 BDD geçti**, exit 0; toplam **511.936 ms (8 dk 31,936 sn)**, browser raporu yaklaşık **8,4 dk**. Aynı Windows makinesi, Node 20.16.0, iki worker, mevcut kurulu Chromium; CI Ubuntu/Node 22'dir. Geliştirme sırasında alınan süreler laboratuvar benchmark'ı değildir.

`npm run test:coverage` Node'un yerleşik deneysel V8 ölçümüdür; rota, tema ve filtre politikası/hint unit dosyalarıyla sınırlıdır. Uygulamanın tamamına veya browser inline scriptlerine ait coverage yüzdesi değildir; test dosyalarını içeren all-files toplamı ürün metriği olarak kullanılmaz. Önceki dar ölçüm:

| Üretim modülü | Satır | Dal | Fonksiyon |
| --- | --- | --- | --- |
| category-filter-hints.js | %92,59 | %94,59 | %93,33 |
| page-transition-policy.js | %91,67 | %83,33 | %100 |
| route-policy.js | %96,55 | %88,89 | %100 |

Eksikler ağırlıkla browser/CommonJS wrapper yolları ve bazı fallback'lerdir; suni yüzde hedefi için test eklenmedi. Tema yollarındaki gelişme karar/durum assertion'larıyla kanıtlanır; VM kaynak ataması değiştiği için tema satır coverage'ı için öncesi/sonrası karşılaştırılabilirlik iddia edilmez.

Sınırlı son ölçümde ilk üç modülün oranları aynı kaldı; theme-init.js satır/dal/fonksiyon %100, theme.js satır/fonksiyon %100 ve dal %96,97 olarak ölçüldü. VM isimlendirmesi nedeniyle bunlar tema için karşılaştırmalı artış metriği değildir. Son tam koşunun sayıları ve süresi aşağıdadır. Yeni yüksek değerli durumlar eklendiğinden eşit test sayısıyla bir hız karşılaştırması yoktur; **performans iyileşmesi iddia edilmez**.

## Doğrulama sonuçları

Son tam kalite kapısı **exit 0**: **127 unit + 372 BDD (62 senaryo × 6 proje)** ve public paketleme geçti. BDD: **0 unexpected, 0 flaky, 0 skipped, retry 0**. `npm test` ayrıca 127/127 geçti. `npm run verify -- --local --artifact --all` yayın paketinde **108/108** GET/format/bağlantı kontrolünü geçti; Markdown negotiation, Markdown 404 ve canlı MCP üç ayrı karşılanmayan platform/kapsam beklentisi olarak raporda kalır. Bunlar protokol başarısı sayılmadı.

Son `npm run build` **582.962 ms (9 dk 42,962 sn)**; browser raporu **572.366,895 ms (yaklaşık 9,5 dk)**. Başlangıç 511.936 ms, 330 browser koşusuydu; son koşuda 42 browser yürütmesi ve 15 unit testi daha var. Geliştirme kontrolleriyle kaynak paylaşımı da olduğundan bu tek ölçümden hızlanma/yavaşlama nedeni çıkarılmaz. Yeni bağımlılık, worker/retry/timeout artışı yok. En uzun örnekler aşağıdadır; riskli altı proje kapsamını azaltacak ölçülmüş kazanç bulunmadığından senaryo silinmedi.

`npm run test:coverage`, değişen/yeni JS için `node --check`, iki değişen workflow için `actionlint -shellcheck= -pyflakes=`, `git diff --check` geçti. ShellCheck/Python lint'in kendisi bu actionlint çağrısında çalıştırılmadı; ayrı bir proje lint altyapısı yoktur. Üretici idempotence ve tam kaynak/Markdown/PDF hash regresyonları unit kapısında geçti. Yalnız sonuç metrikleri bu tam koşudan sonra rapora işlendi; belge/bağlantı kontrolleri sonrasında yeniden çalıştırıldı.



| Uzun browser yürütmesi | Proje | Süre |
| --- | --- | --- |
| R-FILTER-10 | desktop-light | 19.684 sn |
| R-FILTER-10 | small-mobile-dark | 18.731 sn |
| R-FILTER-10 | mobile-light | 16.869 sn |

GKP tasarımı: **40/40 yerel risk kaydı en az bir manuel vakaya bağlı; 29 vaka, 104 adım, manuel yürütme 0**. Vaka türleri örtüşür: 22 pozitif, 11 negatif, 4 karar tablosu ve 13 durum geçişi etiketi. Bu katalog kapsamı ürünün bütün gereksinimlerinin %100 kapsandığı anlamına gelmez; resmi SRS/onay yoktur. Tüm manuel sonuçlar Not Run. Kimlik/sıra/11 sütun/çift yönlü RTM/bağlantı kontrolleri ve beş olumsuz belge mutasyonu geçti. Manuel fixture aracı standart, boş, bozuk JSON, Blog/Projects bekletme ve engelli storage olmak üzere altı CLI smoke kontrolünde açıldı/kapandı; bunlar manuel vaka yürütmesi değildir.

TÜBİTAK düzeltmesi önce başarısız computed-style testiyle gösterildi; altı genişlik/tema projesinde geçti. Ayrıca 1280/320px × açık/koyu dört görsel ve computed kayıt incelendi: dokuz araç, eşit sekiz tipografi özelliği ve yatay taşma yok. Diğer başlıklar aynı ortak stile sahip; kısa liste etkileşimli panele çevrilmedi.

Yerel ve CI ayrı tutulur. Bu dal push edilmediğinden değişen workflow'un GitHub runner'da çalıştığı iddia edilmez. Daha önceki canlı yayın başka sürümün kanıtıdır. Bu görevde publish yapılmadı; production yeniden doğrulaması yeni yayını onaylayan işlemde gerekir. `git diff --check`, syntax, unit, BDD, build, local artifact GET ve dokumentasyon kontrolleri son gate'te kaydedilir.

## Kalan riskler ve kararlar

- GKP resmi onaylı gereksinim kataloğu değildir; implementation-derived risklerin kabulü ve insan tarafından tüm manuel yürütmeler bekliyor. Ekran görüntüsünün iç kurum verileri kullanılmadı.
- Ankara **37**, Gazi **11**, lise **16** korunur; eski 30/57 sayılarına dönülmez. Başlıklarda adet rozeti ve coursework kategorisi eklenmedi.
- Ayrı Resume Scroll Spy/sticky bölüm menüsü/otomatik tam açılım uygulanmış değil. Beklenti varsa yeni ürün gereksinimi ve test tasarımı gerekir; mevcut özellik diye Pass verilmez.
- Gerçek tarayıcı motorları, telefonlar, zoom ve ekran okuyucu davranışı GKP ile planlandı; otomatik Chromium başarısı bunların kanıtı değildir.
- Kaynak-shell/CTA mevcut erişilebilirlik borcunu çözmek tasarım kararı gerektirir. Dar test fixture borcu, yeni regresyonları yakalamak içindir; genel `disableRules` veya sessiz filtre yoktur.
- Inline script unit'inin kaynağı kesit olarak ayırması ve sabit Windows Git Bash yolu bakım riskidir. Şimdilik ürün/refactor kapsamını büyütmeden korundu.
- Yerel sunucu Pages'in gerçek Content-Type/Vary davranışını kanıtlamaz. Accept Markdown, Markdown 404 ve canlı MCP kısıtları verifier raporunda ayrı kalır.

Yaklaşım kaynakları: [Playwright best practices](https://playwright.dev/docs/best-practices), [context izolasyonu](https://playwright.dev/docs/browser-contexts), [fixtures](https://playwright.dev/docs/test-fixtures), [Node coverage](https://nodejs.org/api/test.html#collecting-code-coverage), [GitHub reusable workflow outputs](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows#using-outputs-from-a-reusable-workflow), [ISTQB CTFL 4.0.1](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf). Bunlar tasarım ilkeleridir; resmi sertifikasyon veya bütün ürüne uygunluk beyanı yapılmaz.
