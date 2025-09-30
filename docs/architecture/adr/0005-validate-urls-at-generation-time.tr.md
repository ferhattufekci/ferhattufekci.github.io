# ADR 0005 — Üçüncü taraf URL şemalarını veri üretilirken doğrula

**[🇬🇧 English](0005-validate-urls-at-generation-time.md) | 🇹🇷 Türkçe**

**Durum:** Kabul edildi · **Tarih:** 2026-11-10

## Bağlam
Sayfa, üretilen katalogdaki değerleri doğrudan `href` ve `src` niteliklerine atar. Bu
değerler Medium RSS akışından ve GitHub API'sinden gelir. Böyle bir değerdeki `javascript:`
şeması tıklandığında çalışır. Kontrol, görüntüleyicide (`index.html`), üreticide
(`scripts/fetch-*.js`) ya da her ikisinde olabilirdi.

## Karar
Doğrulama, güven sınırı olan üreticide ve tek bir ortak yardımcıda
(`scripts/lib/safe-url.mjs`) yapılır; ortaya çıkan değişmez kural, commit edilen veri
üzerinde `scripts/tests/data-contract.test.js` ile doğrulanır. Ham metni eşleştirmek yerine
`new URL()` ile ayrıştırılır. Çünkü tarayıcılar baştaki kontrol karakterlerini atar ve şema
içindeki sekme/satır sonlarını yok sayar; bu yüzden `" java\tscript:x"` basit bir düzenli
ifadenin kaçırdığı, çalışan bir javascript URL'sidir. Ham girdi değil, serileştirilmiş URL
(`parsed.href`) döndürülür: tarayıcının yeniden ayrıştıracağı şey ham metindir ve kontrol
edilenden farklı olabilir. Sayfadan toplanan göreli kapak görselleri atılmaz, makale
URL'sine göre çözülür.

Doğrulama üretici kaynağını incelemekle değil, gerçek fetch giriş noktalarını tehlikeli
URL'ler sunan yerel sahte bir akışa ve API'ye karşı çalıştırarak yapılır
(`R-DATA-URL-03/04`). Önce kaynak kodda arama yapan bir test denendi; bağımsız bir inceleme,
bu testin korumalar kaldırıldığında da geçtiğini gösterdi.

## Sonuçlar
- **Olumlu:** tek kural, tek yer; ve sözleşmeye tabi artifact deponun kendi verisidir. Bir
  ihlal yalnızca çalışma zamanında değil, diff'te de görünür.
- **Olumlu:** `index.html` içindeki satır içi betiklere dokunulmaz. Bu betikler modüllere
  ayrılmayı beklerken karakterizasyon testleriyle dondurulduğu için bu önemlidir (F-4).
- **Olumsuz:** tek katmanlı bir korumadır. `data/*.json` dosyalarına elle girilen veri
  üreticiyi atlar; bunu yakalayan sözleşme testidir ve yalnızca test anında yakalar.
- **Olumsuz:** güvensiz bir makale bağlantısı bildirilmeden sessizce atılır. Sahibi yazarın
  kendisi olan bir akış için kabul edilebilir; kaynak genişlerse yeniden ele alınmalıdır.
