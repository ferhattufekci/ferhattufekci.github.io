# Kullanım kılavuzu

**[🇬🇧 English](USER-GUIDE.md) | 🇹🇷 Türkçe**

[ferhattufekci.github.io](https://ferhattufekci.github.io) sitesinin nasıl kullanılacağını
anlatır. Site tek sayfada beş bölümden ve footer'dan ulaşılan About, Contact ve Privacy
sayfalarından oluşur. Sitenin arayüzü İngilizcedir; düğme adları sitede göründüğü gibi yazılmıştır.

## Gezinme

| Amaç | Nasıl |
|---|---|
| Bir bölümü açmak | Soldaki menüyü kullanın (telefonda sağ üstteki ☰ düğmesi). |
| Sonraki veya önceki bölüm | Sağ alttaki ok düğmeleri. Contact'tan sonra About Me'ye döner. |
| Bir bölümün bağlantısını paylaşmak | Adres çubuğunu kopyalayın: her bölümün kendi adresi vardır, ör. `/#resume` veya `/#blog`. |
| Geri dönmek | Tarayıcının geri ve ileri düğmeleri önceki bölüme döndürür. |
| Telefon menüsünü kapatmak | Menünün dışına dokunun, bir bölüm seçin veya Escape'e basın. |
| Yanlış veya eski adres | "Sayfa bulunamadı" görünümü About Me ve Resume'a dönüş bağlantıları sunar. |

## Bölümler

- **About Me:** tanıtım ve profil özeti.
- **Resume:** özgeçmişin tamamı. Üstteki çubuk (All, Summary, Top Skills, …, Certifications)
  hiçbir şeyi gizlemeden ilgili kısma götürür. **Show More (+N)** bir listenin kalan N kaydını
  açar; **Download Full Resume (PDF)** PDF'i yeni sekmede açar.
- **Blog:** Medium makaleleri; her 6 saatte bir otomatik güncellenir. Dile (All / TR / EN) ve
  kategoriye göre filtrelenebilir. Bir karttaki **Share**; platform bağlantıları, **Copy link**
  ve destekleyen telefonlarda cihazın kendi paylaşım penceresini sunar.
- **Projects:** herkese açık GitHub depoları; haftalık güncellenir. Kategoriye göre
  filtrelenir; sabitlenmiş depolar önce gelir. **Starred**, Ferhat'ın önerdiği depoları 20'şerli
  gösterir.
- **Contact:** telefon, e-posta, profil bağlantıları ve mülakat planlayıcı.

Blog ve Projects filtrelerinin yanındaki rozet, verinin en son ne zaman güncellendiğini gösterir.

## Görünüm

- **Açık veya koyu tema:** güneş/ay düğmesi. Seçim bu tarayıcıda hatırlanır; kayıtlı seçim
  yoksa site cihazınızın ayarını izler.
- **Azaltılmış hareket:** cihazınız azaltılmış hareket istiyorsa bölümler kaymadan değişir.
- **Yakınlaştırma:** site %200 tarayıcı yakınlaştırmasında da kullanılabilir.
- **Yazdırma:** her bölüm tüm içeriğiyle yazdırılır.

## Klavye

| Tuş | Etki |
|---|---|
| Tab / Shift+Tab | Bağlantılar ve kontroller arasında gezinir; odaktaki öğe çerçevelenir. |
| Tab (ilk basış) | **Skip to content** görünür; Enter menüyü atlar. |
| Enter / Space | Odaktaki düğmeyi veya bağlantıyı etkinleştirir. |
| Home / End / Page Up / Page Down | İçerik alanının kendisi odaktayken bölümün içeriğini kaydırır. |
| Escape | Telefon menüsünü veya açık bir Share menüsünü kapatır. |

## JavaScript olmadan ve programlar için

- JavaScript kapalıyken profil, özgeçmiş, makale ve proje bağlantıları düz içerik olarak
  okunur; filtreler, tema değiştirme ve paylaşım JavaScript gerektirir.
- Araçlar ve yapay zekâ asistanları için her sayfanın Markdown kopyası yayınlanır:
  `/index.md`, `/about/index.md`, `/contact/index.md`, `/privacy/index.md`. `/llms.txt` bunları
  listeler, `/agent-instructions.md` nasıl kullanılacaklarını anlatır.

## Gizlilik

Site Google Analytics, Google AdSense ve Calendly kullanır. Tarayıcınızda yalnızca iki değer
saklar: tema seçimi (`ft-theme`) ve Calendly rozetini kapatıp kapatmadığınız
(`calendlyPermanentlyClosed`). Ayrıntılar [Privacy sayfasındadır](https://ferhattufekci.github.io/privacy/).

## Bir şey çalışmazsa

Sayfayı yenileyin. Bir bölüm boş kalırsa veri kaynağı geçici olarak erişilemiyor olabilir;
sitenin geri kalanı çalışmaya devam eder. Sorunlar [Contact sayfasından](https://ferhattufekci.github.io/contact/)
bildirilebilir.
