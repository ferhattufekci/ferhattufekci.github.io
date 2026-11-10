# Bakım rehberi

**[🇬🇧 English](MAINTENANCE.md) | 🇹🇷 Türkçe**

Bakımı yapanlar için uygulama notları. README genel bakış olarak kalsın diye buraya
taşındı. [README'ye dön](../README.md#bakim-rehberi)

## Ajan hazırlığı ve doğrulama

Site `https://ferhattufekci.github.io` adresinde GitHub Pages üzerinde yayınlanır. Pages
`build_type=workflow` kullanır: `pages.yml` → ortak kalite job'u → yalnızca herkese açık
dosyaları içeren `.pages-site` artifact'i → yayın → canlı ortamda GET ile doğrulama.
`.nojekyll` korunur. Node yalnızca içerik üretimi ve test için kullanılır. Kalite job'u
başarısızsa yayın yapılmaz; GITHUB_TOKEN ile yapılan veri commit'leri `workflow_run`
üzerinden test edilir. Akış, concurrency, çalışma zamanı, raporlar ve hata inceleme
komutları [CI/CD rehberindedir](CI-CD.tr.md).

| Kaynak | Üretici / tüketici |
| --- | --- |
| Medium RSS / GitHub API | `scripts/fetch-medium.js`, `scripts/fetch-github.js` → `data/*.json`; tarayıcıdaki Blog/Projects bölümleri ve üreticiler bu anlık kopyaları okur |
| `data/github-repos.json`, `data/medium-all.json` | `build-static-seo.js` → `index.html` içindeki işaretli noscript alanları ve `llms.txt` listeleri |
| `index.html`, `content/trust-pages.json`, `js/theme-init.js`, `js/error-card.js` | `build-agent-content.mjs` → `index.md`, güven sayfalarının HTML/Markdown'ı, `404.html`, `404.md`, `sitemap.xml` |
| `llms.txt`, `agent-instructions.md` | Elle güncellenen kullanım rehberi; `llms.txt` içindeki işaretli listeler otomatik üretilir |

Üretilen bir dosyayı tek başına düzenlemeyin; kaynağını güncelleyip `npm run generate`
çalıştırın. Person açıklaması ve statik iletişim bağlantıları `index.html` içindedir. Güven
sayfalarının içeriği `content/trust-pages.json` dosyasından gelir; gizlilik metni mevcut
Analytics, AdSense, Calendly ve tarayıcı depolaması kullanımını açıklar. Sağlayıcı ve rıza
yönetimi ayarları site sahibinin sorumluluğundadır.

**Platform sınırları:** GitHub Pages, bir URL'nin gövdesini ve Content-Type'ını Accept
başlığına göre değiştiren uygulama kodu çalıştırmaz; ayrıca
[özel MIME yapılandırmasını desteklemez](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site#mime-types-on-github-pages).
`/index.md` faydalı bir alternatif gösterimdir; ana sayfada Markdown içerik müzakeresi
değildir. `/404.html`, olmayan kök ve iç içe yollar için açıklayıcı HTML ve gerçek bir 404
sağlar; Markdown hata yanıtı sağlamaz. Fragment'ler sunucuya gönderilmediği için `/#resumes`,
HTTP 200 dönen bir belge içinde istemci tarafı 404 görünümü gösterir. `.md` dosyalarının MIME
türü canlı yanıtlardan ölçülür.

**Ortak 404 ve kontroller:** `js/error-card.js`, iki hata görünümünün de başlığını, mesajını
ve kurtarma hedeflerini yönetir. Üretici, kenar çubuğunu, mobil üst çubuğu ve gezinmeyi
`scripts/lib/not-found-document.mjs` aracılığıyla `index.html` içinden çıkarır;
`js/site-shell.js`, ortak çekmeceyi ve ölçülen üst çubuk yüksekliğini SPA veya eklenti
bağımlılığı olmadan yönetir. Statik 404 bağlantıları ve asset'leri kökten başlayan mutlak
yollardır. Yönlendirme yoktur: olmayan yollar HTTP 404 ve `noindex` döner, geçersiz
fragment'ler HTTP 200 döner. About/Contact/Privacy sade belge düzenini korur. İki kurtarma
bağlantısı da About Me'deki Resume CTA'sını değiştirmeden kullanır.

Tema ve menü kontrolleri ortak `.icon-btn` sınıfını kullanır: hover efekti yalnızca hover
destekleyen hassas işaretçilerde uygulanır, basılı geri bildirim bırakınca biter ve klavye
odağı `:focus-visible` kullanır. Escape veya klavyeyle kapatma, odağı çekmece düğmesine geri
getirir; fare veya dokunmayla kapatma odağı çalmaz. Azaltılmış hareket tercihi ikon
döndürmeyi ve ölçeklemeyi kapatır. Nötr temel kenar boşluğu, güven sayfalarındaki tema
düğmesini de hizalı tutar.

**Güven sayfalarında gezinme:** About, Contact ve Privacy indekslenebilir kalır, sitemap'te
ve ajan rehberinde bağlantıları bulunur ve footer'dan erişilebilir. Üst kısımlarında yalnızca
"← Back to portfolio" bağlantısı (`/`, About Me'yi açar) ve sağa hizalı tema düğmesi vardır.
Footer, mevcut sayfayı `aria-current="page"` taşıyan tıklanamaz metin olarak gösterir;
bağlantı listesi `scripts/lib/agent-documents.mjs` içindedir. İki üst hedefin yüksekliği de
en az 44px'tir. Gezinme Markdown'a dahil edilmediği için bu düzen güven içeriğini veya
Markdown çıktılarını değiştirmez. Tam kabuklu 404 sayfası mevcut gezinmesini korur.

**Sayfa geçişleri:** Mobil gezinme, mevcut 300ms 2D kaydırmadan önce çekmecenin ve örtünün
kapanmasını bekler; yönü rota sırası belirler. Azaltılmış hareket tercihinde kaydırma ve
çekmece hareketi atlanır. Masaüstünde animasyon seçimi değişmez. İsteğe bağlı motor
regresyonu: `npx playwright install webkit`, ardından `npm run test:motion:webkit`; yaşam
döngüsü ve emülasyon sınırları için [test stratejisine](../TEST-STRATEGY.md#test-strategy-tr)
bakın.

**Erişilebilirlik başlangıç durumu:** mevcut Resume CTA paletinde ve bazı mevcut kenar çubuğu
metin/bağlantı renklerinde açık temada kontrast ve ayırt edilebilirlik bulguları vardır.
İstenen tasarım kısıtı nedeniyle korunmuştur. axe regresyon testi, devralınan bu bulguları
gerçek kaynak kabuğu ve CTA üzerinde tarar ve kaydeder; beklenmeyen bulgular testi yine
başarısız yapar. Hero görseli CTA'nın özgün kontrastını belirsiz kıldığı için CTA başlangıç
ölçümü tema yüzeyi üzerinde yapılır. Bu tam WCAG uygunluğu iddiası değildir; bu renklerin
düzeltilmesi ayrı bir tasarım değişikliği gerektirir.

**MCP:** Portföy bir MCP sunucusu, ürün API'si veya tool servisi sunmaz. MCP sunucusu
POST/JSON-RPC çalışma zamanı gerektirir ve GitHub Pages bunu barındıramaz; bu yüzden yer
tutucu bir manifest (ör. `/.well-known/mcp`) eklenmez. Statik bir dosya servis oluşturmaz.

```powershell
npm ci
npx playwright install chromium
npm run build
npm run verify -- --local --artifact --all --output=verification-local.json
npm run verify -- https://ferhattufekci.github.io --all --output=verification-production.json
```

Her doğrulama koşusu, herkese açık envanterde bulunmayan yeni UUID'li kök ve iç içe yollar
üretir; ardından ana sayfayı ve bu yolları iki Accept değeriyle GET üzerinden ister. Durum
kodunu, son URL'yi, Content-Type'ı, Vary'yi ve gövde kanıtını kaydeder. Ağ, HTTP ve
içerik/biçim hataları birbirinden ayrıdır; 200 durumlu bir HTML yedeği geçerli JSON
sayılmaz. Platformun desteklemediği yetenekler `limitations` içinde kalır, geçmiş yetenek
sayılmaz ve normal CI'ı kalıcı olarak kırmaz. Yerel bir sunucu gerçek Pages header
davranışını kanıtlayamaz; yayın sonrası raporu Actions commit'iyle birlikte inceleyin.

Biçim kaynakları: [llms.txt önerisi](https://llmstxt.org/),
[GitHub Pages özel 404](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site).
Risk kapsamı, kategori karar tablosu, FIRST ve BDD
[Test stratejisinde](../TEST-STRATEGY.md#test-strategy-tr) belgelenmiştir.

## Resume gezinmesi ve açılır içerikler

Resume, ortak kategori kontrolü stillerini kullanan bir bölüm gezinme çubuğuna sahiptir;
yardımcı teknolojiler için adı **Resume section navigation**'dır. On düğmesi; `#resume`
adresini, tarayıcı geçmişini, CV içeriğini veya açılır içeriklerin durumunu değiştirmeden
Resume içerik panelini kaydırır. All, paneli başına döndürür; Summary'nin kendi seçimi ve
odak hedefi vardır, ancak ilk kaydırma konumu aynı olabilir. Seçim, son gezinme tercihini
kaydeder ve Resume her etkinleştiğinde All'a döner. Klavyeyle etkinleştirme odağı hedefe
taşır; azaltılmış hareket tercihi yumuşak kaydırmayı atlar. Son Certifications/PDF grubunun
minimum yüksekliği içerik alanına eşittir; böylece açılır içerik kapalıyken de Certifications
en üste hizalanabilir ve kullanılmayan alan PDF'ten sonra kalır. Grup açılan içerikle büyür
ve yazdırırken bu minimumu bırakır.

Resume, Blog, Projects ve Contact `css/page-content-panels.css` düzenini paylaşır: doğal
yükseklikte bir başlık/kontrol satırı ve tek bir `minmax(0, 1fr)` içerik satırı. Dikey olarak
yalnızca adlandırılmış ve klavyeyle odaklanabilen `.page-content-panel` kayar. Sayfayı mevcut
genel mobil üst çubuk konumlandırır; ek üst boşluk veya kontrol kopyası gerekmez.
`js/page-content-panels.js` kaydırma sahibini, etkinleşme/filtre sıfırlamalarını ve bölgenin
kendisi odaktayken sayfalama tuşlarını sağlar. Fare tekerleği, dokunma ve alt kontrollerin
tuşları tarayıcının yerel davranışında kalır. Değişen kategori/dil seçimleri yalnızca kendi
sonuçlarını sıfırlar; yatay çubuk kaydırması ve aynı seçimin tekrarlanması içerik konumunu
korur. Contact aynı sabit başlık/açıklama satırını ve dört iletişim kartı için Contact
content adlı bir içerik bölgesini kullanır; filtre kontrolü eklemez. Yazdırma ve JavaScript
kapalı düzenler ekran taşma kısıtlarını kaldırır.

Resume açılır içerikleri **Show More (+N)** / **Show Less** kullanır (Summary'de sayı
yoktur). `npm run generate` tarafından çağrılan `scripts/lib/resume-disclosures.mjs`, N'yi
anlamsal HTML listelerinden ve mevcut dekoratif önizlemelerden hesaplar ve erişilebilir
adlara okul/işveren bağlamını ekler. CV listelerini ve önizlemelerini `index.html` içinde
düzenleyip yeniden üretin; sayıları elle tutmayın. Ek kayıt yoksa üretici sıradan içerik
üretir. Açılma durumunu yerel `details/summary` yönetir. Gezinme ve açılır içerik kontrolleri
CV Markdown'ına dahil edilmez; orijinal PDF eylemi korunur.

## Manuel reklam birimleri

Projects ve Blog birimlerinin ikisini de `js/adsense.js`, dış görünümlerini ise
`css/adsense.css` yönetir. Reklamın dolup dolmadığını yalnızca sağlayıcının `data-ad-status`
değeri belirler. Kesinleşmiş dolmama (no-fill) ve SDK yükleme hatalarında boş kabuk kapanır;
bekleyen ve optimize edilmiş yanıtlar korunur. Gizli sayfalar istenmemiş birimleri global SDK
kuyruğuna açmaz. Bir birim, sayfasının yükleme yer tutucusunu `data-ad-await` içinde
belirtebilir (Projects ve Blog belirtir); birim ancak bu yer tutucu gizlendikten sonra
istenir. Böylece tek istek boş yükleme durumuna değil, son içerik düzenine karşı yapılır
(`AC-05/13`). Sağlayıcının reklam içerikleri kırpılmaz ve yeniden renklendirilmez.

Akışkan SDK bir üst öğeye önemli (important) auto yükseklik uygulasa bile uygulamanın içerik
grid'i kendi sayfasıyla sınırlı kalır. Bu, sağlayıcı stillerini veya reklam boyutlarını
yeniden yazmadan Projects/Blog içindeki kaydırma alanını korur. `R-AD-SCROLL-01` bu dış
boyutlandırma yan etkisini yeniden üretir ve sağlayıcının farklı dolum durumlarında fare
tekerleği/dokunma, sabit kontroller ve klavyeyle sayfalamayı kontrol eder.

Starred genişletmesi saf `js/starred-ad-planner.js` dosyasını ve aynı reklam yöneticisini
kullanır. `js/adsense-config.js`, yapılandırılmış In-feed birimini manuel genişletme için
etkinleştirir. Statik Projects birimi, hesabın Multiplex slotuyla (`1912820269`, "multiplex
reklam yatay esnek") `autorelaxed` kullanır: biçim AdSense'teki slotun birim türüyle eşleşmek
zorundadır ve `2029775306` bir In-article birimidir. Statik Blog birimi, hesabın `2029775306`
için verdiği In-article kodunu aynen kullanır (`data-ad-layout="in-article"`, `fluid`; In-feed
niteliği olan layout key yoktur). Bu mevcut statik ayarlar yeni dinamik yerleşimler için
yeniden kullanılmaz. Elle açılan her 40 benzersiz kart bir yerleşim ayırabilir, belge başına
en fazla iki yerleşim olur; başarısız veya dolmayan ayırmalar da sayılır. İlk 20 kart,
filtreler, temalar ve tekrar ziyaretler fırsat oluşturmaz. Değişikliklerden sonra iki reklam
tarayıcı spec'ini ve iki reklam Node test dosyasını çalıştırın. Sentetik sağlayıcı testleri
hesap onayını veya gerçek reklam dolumunu kanıtlamaz.
