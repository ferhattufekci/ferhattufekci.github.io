# Tehdit Modeli

**[🇬🇧 English](threat-model.md) | 🇹🇷 Türkçe**

Kapsam: yayınlanan site, üretilen veri ve yayın pipeline'ı. Kanıt düzeyleri
`docs/ENGINEERING-ASSESSMENT.tr.md` ile aynıdır.

## Varlıklar

| Varlık | Neden önemli |
|---|---|
| Yayınlanan site | Yazarın profesyonel kaydıdır; asıl zarar, sitenin tahrip edilmesi veya içeriğe enjeksiyon yapılmasıdır. |
| Yayın pipeline'ı | `main`'e ya da Pages yayınına yazma erişimi, siteyi kontrol etmekle eşdeğerdir. |
| Üretilen katalog (`data/*.json`) | Sayfanın görüntülediği üçüncü taraf içeriktir. |

Kullanıcı verisi, hesap, oturum veya ödeme yolu yoktur [D]: site, Google Analytics ve
AdSense'in kendi betikleriyle topladıkları dışında ziyaretçiler hakkında hiçbir şey saklamaz.

## Güven sınırları

1. **Medium RSS akışı → `data/medium-*.json` → DOM.** Akış `scripts/fetch-medium.js` ile
   çekilir, commit edilir, sonra görüntülenir. Başlıklar ve özetler DOM'a `textContent` ile
   ulaşır [D]. Bağlantılar ise `link.href = art.url` ve `image.src = art.thumbnail` ile
   ulaşır [D]; bu, `javascript:` şemasının çalıştığı bir nitelik hedefidir.
   **Kontrol:** üretim anında `safeUrl()`, commit edilen veri üzerinde de
   `scripts/tests/data-contract.test.js`.
2. **GitHub REST API → `data/github-*.json` → DOM.** Proje kartları HTML metni olarak
   kurulur ve `innerHTML` ile atanır [D]. Metin alanları `escHtml` ile kaçışlanır
   (`& < > "`). Depo bağlantısı `href="${escHtml(r.url)}"` olarak yazılır; kaçışlama
   nitelikten taşmayı önler ama `javascript:` şemasını önlemez. Bu nedenle `html_url` artık
   üretim anında `safeUrl()` ile doğrulanır ve güvensiz URL'ye sahip bir depo yayınlanmaz.
   Üç değer **kaçışlanmadan** yerleştirilir: `l.color`/`r.langColor` değerleri
   `style="background:…"` içine, `percent`/`stars`/`forks` ise metin olarak. Renkler hiçbir
   zaman API'den değil, `fetch-github.js` içindeki yerel `LANG_COLORS` tablosundan gelir [D];
   dolayısıyla saldırganın kontrolünde değildir. Bu örtük bir varsayımdı; artık
   `R-DATA-COLOR-01` ve `R-DATA-NUM-01` bunu commit edilen veri üzerinde doğrular. Böylece
   renkleri API'den almaya başlayan bir değişiklik, sessizce nitelik enjeksiyonuna yol
   açmak yerine test takımını kırar.
3. **Sayfadaki üçüncü taraf betikler** (Google Analytics, AdSense, Calendly). Bunlar
   tasarım gereği tüm sayfa yetkileriyle çalışır. Bu depodaki hiçbir şey onları kısıtlamaz;
   bir CSP kısıtlardı, bu da F-2 bulgusudur.
4. **Pipeline → canlı ortam.** `pages.yml` tek bir kaynak SHA'sı belirler, o artifact'i test
   eder ve yerine yenisi gelmiş bir yayını reddeder. Action'lar SHA ile sabitlenmiştir,
   izinler en az yetki ilkesine göredir, yayın `github-pages` ortamını kullanır [D].
5. **Kurtarma otomasyonu.** `recover-release.yml` koşuları yeniden çalıştırabilir veya yeni
   koşu başlatabilir. `PORTFOLIO_RECOVERY_ACT` değeri `true` olmadıkça yalnızca gözlem
   yapar; bu değer kapalıdır [G]. Checkout'u `persist-credentials: false` ile yapar ve
   yalnızca `contents: read`, `actions: write` izinlerine sahiptir.

## Riskler ve durum

| # | Risk | Durum |
|---|---|---|
| T1 | Akış veya API verisindeki tehlikeli bir URL şeması çalışan bir `href`/`src` olur | **Azaltıldı**: üretim anında `safeUrl()`; sahte akış ve API'ye karşı davranış testleri R-DATA-URL-03/04; veri sözleşmesi R-DATA-URL-01/02 |
| T2 | Proje kartlarında kaçışlanmamış nitelik yerleştirme | **Sınırlandı**: değerler yerel sabitlerdir; değişmez kural artık doğrulanıyor |
| T3 | CSP olmadığı için enjekte edilen her betik kısıtsız çalışır | **Açık** (F-2): satır içi betiklerin ayrılmasını bekliyor |
| T4 | Ele geçirilmiş bir üçüncü taraf action yayını değiştirir | **Azaltıldı**: tüm action'lar SHA ile sabitlendi |
| T5 | Güvenlik açığı olan bir devDependency | **Azaltıldı:** Static Checks'teki bağımlılık denetimi kapısı `package-lock.json`'da high/critical advisory olduğunda başarısız olur (docs/CI-CD.tr.md, "Bağımlılık denetimi kapısı"). Vendored ve uzak tarayıcı betikleri kapsam dışında kalır |
| T6 | Kurtarma otomasyonu eski veya yanlış bir koşuya göre işlem yapar | **Varsayılan olarak azaltıldı**: yalnızca gözlem; etkinleştirme ölçütleri `docs/RECOVERY-ACTIVATION.md` içinde |
| T7 | https sitede `http://` kapak görselinden (`image.src`) karışık içerik | **Açık, düşük**: `safeUrl()` `http:`'ye izin verir; bugün veride `http` küçük görsel yoktur [D]. (Üç deponun ana sayfası `http`'dir, ama `homepage` görüntülenmez ve düz bir bağlantı karışık içerik değil, gezinmedir.) |

## Bilinçli olarak yapılmayanlar

- CSP eklenmedi; zayıf bir CSP'nin neden hiç olmamasından kötü olacağı F-2'de anlatılır.
- AdSense, analytics veya gizlilik yapılandırması değiştirilmedi: bunlar canlı hesap
  ayarlarıdır ve bu deponun tek taraflı değiştirmesi gereken şeyler değildir.
- Kırmızı bir testi yeşile çevirmek için hiçbir doğrulama gevşetilmedi, yeniden deneme
  eklenmedi.
