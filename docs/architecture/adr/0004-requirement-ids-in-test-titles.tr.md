# ADR 0004 — Gereksinim kimliklerini test başlıklarında taşı, matrisi otomatik üret

**[🇬🇧 English](0004-requirement-ids-in-test-titles.md) | 🇹🇷 Türkçe**

**Durum:** Kabul edildi · **Tarih:** 2026-11-10 (zaten uygulanan bir pratiğin kaydı)

## Bağlam
Elle tutulan bir izlenebilirlik matrisi birkaç hafta içinde test takımından kopar ve
yazıldığı okuru yanıltmaya başlar. Projede ayrı bir gereksinim veritabanı yoktu, ama zaten
bir kural vardı: her test başlığı `R-ALAN-NN` biçiminde bir kimlikle başlar.

## Karar
Test başlıkları izlenebilirliğin tek kaynağı kabul edilir. `scripts/generate-rtm.mjs`
kimlikleri, davranış metnini, katmanı ve dosyayı
`docs/business-analysis/requirements-traceability-matrix.md` dosyasına çıkarır.
`scripts/tests/rtm.test.js` iki durumda build'i kırar: dosya bayatsa, ya da her test
başlığını farklı ve daha gevşek bir desenle bağımsız olarak tarayan kontrol, üreticinin
listelemediği bir kimlik bulursa.

## Sonuçlar
- **Olumlu:** matristeki her kimliğin bir testi vardır; bir test başlığında olup matriste
  olmayan kimlik build'i kırar. İkinci güvence, bağımsız bir incelemenin ilk üreticinin
  çok kimlikli başlıkları (`R-PROGRESS-01/02/04`) sessizce atladığını, toplam dokuz kimliğin
  kaybolduğunu bulmasından sonra eklendi. Bayatlık kontrolü bunu tek başına yakalayamazdı,
  çünkü üreticiyi kendi çıktısıyla karşılaştırır.
- **Olumlu:** gereksinim eklemek test eklemek demektir; teşvik edilmesi gereken davranış da
  budur.
- **Olumsuz:** matris yalnızca *gereksinim kimliği → doğrulayan test* yönünü kapsar. İş
  hedefini gereksinime, gereksinimi de onu uygulayan kaynak dosyaya bağlamaz. Bu yönler düz
  metin olarak kalır ve üretilen dosya bunu açıkça belirtir.
- **Olumsuz:** başlık kuralı artık yük taşır; hiç kimlik içermeyen bir test izlenebilirlikte
  görünmez kalır.
