# GitHub Pages için ajan hazırlığı

Verilen RAR arşivindeki `8353e8a` sürümü incelenerek yalnızca GitHub Pages üzerinde çalışacak değişiklikler yapıldı. Hosting değişikliği, üretim sunucusu, harici API ve kimlik bilgisi gerekmez. Portföyün İngilizce içeriği ve mevcut tasarımı korundu.

## Yapılan değişiklikler

- H2'den H5'e atlayan açıklama etiketleri başlık olmaktan çıkarıldı; iletişim başlıkları doğru seviyeye getirildi. Telefon ve e-posta JavaScript kapalıyken de kullanılabilir.
- Ana sayfanın içerik odaklı `/index.md` karşılığı üretildi. HTML içindeki `rel="alternate" type="text/markdown"` ve `rel="describedby"` bağlantıları bu dosyayı ve `llms.txt` rehberini gösterir.
- `llms.txt` içindeki “When to use this” bölümü ve `/agent-instructions.md`, uygun görevleri, kanıt okuma/citation yolunu, iletişim biçimini ve statik JSON dosyalarını açıklar. Dosya biçimi H1, özet, giriş ve H2 bağlantı listeleri sırasını korur.
- Person JSON-LD nesnesine mesleki açıklama eklendi.
- `/about/`, `/contact/`, `/privacy/` için 500 karakterden uzun bağımsız HTML sayfaları ve Markdown karşılıkları eklendi. Gizlilik metni kaynakta bulunan Analytics, AdSense, Calendly ve localStorage kullanımını açıklar.
- Gerçek olmayan yollar için kök `404.html` eklendi. Varlığı olmayan derin yollar da bu sayfayı gerçek HTTP 404 ile alır. Göreli asset yolu hatalarını önlemek için kaynaklar kökten başlayan URL'lerle bağlandı. Doğrudan okunabilen `/404.md` de vardır.
- `/#resumes`, `/#res`, bozuk kodlanmış hash ve tanımlı olmayan alt bölüm adresleri site içinde 404 görünümüyle karşılanır. Mevcut yan menü, tema ve mobil düzen korunur. Ana sayfa/özgeçmiş bağlantıları, geri/ileri ve geçerli menü yolları çalışır. Geçersiz hash hiçbir CSS seçicisine eklenmez.
- Hata görünümü ve güven sayfaları sitenin kayıtlı açık/koyu tema tercihini kullanır; tema düğmesi ve mobil düzen desteklenir.
- GitHub/Medium senkronizasyon iş akışları artık veriyle birlikte Markdown çıktılarını da yeniden üretip kaydeder. Yeni CI iş akışı birim/HTTP testlerini ve tarayıcı kontrollerini çalıştırır.

## GitHub Pages nedeniyle açık kalan denetimler

| İstenen davranış | Son durum |
| --- | --- |
| Ana sayfada `Accept: text/markdown` → Markdown + `Content-Type: text/markdown` + `Vary: Accept` | GitHub Pages üzerinde sağlanamaz. Ana sayfa HTML döndürür; ajanlar doğrudan `/index.md` okur. |
| Olmayan URL'de Markdown hata yanıtı | HTTP 404 ve açıklamalı HTML sağlanır. Aynı URL'de Markdown müzakeresi sağlanamaz. `/404.md` ayrı bir belgedir. |
| Canlı Streamable HTTP MCP sunucusu | GitHub Pages uygulama sunucusu çalıştırmaz. Çalışmayan bir hizmeti ilan eden sahte manifest eklenmedi. |

URL'nin `#` sonrası sunucuya gönderilmez: `/#resumes` için HTTP yanıtı ana sayfanın 200 yanıtıdır. JavaScript bu durumda kullanıcıya 404 görünümü gösterir; bu, HTTP durumunu 404 yapmaz. `/olmayan-sayfa` gibi gerçek yollar için GitHub Pages 404 döndürür. JavaScript kapalıyken site içi hash doğrulaması yapılamaz; ana sayfanın mevcut HTML içeriği okunabilir kalır.

Denetimde anılan Smithery `github` kaydının bu kişisel portföye ait olduğu doğrulanmadı. Bu kayıt portföyün MCP sunucusu olarak kullanılmadı. `/.well-known/mcp` zaten MCP tarafından standartlaştırılmış bir keşif yolu değildir; dosyayı eklemek tek başına canlı protokol anlamına gelmez.

## Dosyaları yayımlama

Paket kökündeki site dosyalarını mevcut GitHub Pages deposuna ekleyin; `.nojekyll` dosyasını koruyun. Testleri yayın için zorunlu kılmak amacıyla **Settings → Pages → Source: GitHub Actions** seçilmelidir. Yeni `pages.yml` yalnız başarılı kalite kontrolünden sonra `.pages-site` artifact'ini yayımlar. Node.js ve npm yalnızca içerik üretimi ve test içindir; site ziyaretçileri için bir Node sunucusu gerekmez. Hosting GitHub Pages olarak kalır.

```powershell
npm ci
npx playwright install chromium
npm run build
npm run verify -- --local --artifact --all --output=verification-local.json
```

İsteğe bağlı statik önizleme: `npm run preview`. Bu, sadece bilgisayarınızda çalışan bir geliştirme aracıdır; üretim hosting'i değildir.

## Yayın sonrası doğrulama

```powershell
npm run verify -- https://ferhattufekci.github.io --all --output=verification-production.json
curl.exe -sS -L -i https://ferhattufekci.github.io/olmayan-sayfa
curl.exe -sS -L -i -H 'Accept: text/markdown' https://ferhattufekci.github.io/
curl.exe -sS -L -i -H 'Accept: text/markdown' https://ferhattufekci.github.io/olmayan-sayfa
```

Doğrulayıcı amaçlanan bütün public asset ve veri dosyalarını, güven sayfalarını, HTML başlık sırasını, JSON-LD açıklamasını, rehber bağlantılarını, sitemap'i ve 404 kurtarma bağlantılarını kontrol eder. Markdown içerik müzakeresi ve MCP desteğini ayrı `limitations` alanında raporlar; bunları geçmiş test gibi göstermez. Doğrudan `.md` dosyasının MIME türünü GitHub Pages belirler; bu dosyalar için `text/markdown` yanıtı garanti edilmez.

Tarayıcı kontrolleri açık/koyu tema, 1440/390/320 piksel ekran, bozuk hash'ler, geri/ileri, klavye ve kurtarma bağlantıları, normal gezinme, JavaScript kapalı içerik ve gerçek yol 404 durumunu sınar. Yeni ekranlarda axe erişilebilirlik kontrolleri çalışır. Üçüncü taraf izleme/ağ kaynakları testlerde izole edilir; üretimdeki entegrasyonlar korunur. Risk, test katmanları ve gereksinim eşlemesi için [test stratejisine](TEST-STRATEJISI.md) bakın.

Canlı yayın durumu GitHub Actions'taki son başarılı deploy ve yayın sonrası doğrulama sonucundan kontrol edilir. Yerel rapor ile canlı site raporu ayrı kanıtlardır. Yeni Is Agentic puanı ancak yayın sonrası Ora yeniden taramasıyla bilinebilir.

## Kalan kararlar

- Güncellenen dosyaların GitHub deposuna yayımlanması için depo erişimi gerekir.
- Pages Source ayarı GitHub Actions olarak yapılandırılmıştır. Yayın, kalite işinin başarıyla tamamlanmasına bağlıdır; her yayın için son Actions sonucu kontrol edilmelidir.
- Gizlilik metni gerçek entegrasyonları belgeler; Analytics/AdSense rıza yönetimi ve sağlayıcı ayarları ayrıca sahibinin kararıdır.
- GitHub Pages kısıtları kabul edildiği için Markdown müzakeresi ve MCP bu teslimatın açık kalan maddeleridir; başka hosting önerilmiyor.

## Biçim ve platform kaynakları

- [GitHub Pages: statik hosting ve veri toplama](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [GitHub Pages özel 404](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site)
- [llms.txt biçimi ve Markdown keşfi](https://llmstxt.org/)
- [MCP Streamable HTTP gereksinimleri](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
