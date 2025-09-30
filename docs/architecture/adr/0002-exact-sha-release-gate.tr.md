# ADR 0002 — Yalnızca test edilen SHA'yı yayınla

**[🇬🇧 English](0002-exact-sha-release-gate.md) | 🇹🇷 Türkçe**

**Durum:** Kabul edildi · **Tarih:** 2026-11-10 (zaten uygulanan bir kararın kaydı)

## Bağlam
`main`, kişilerin yanı sıra iki zamanlanmış veri çekicisinden de commit alır. Basit bir
pipeline'da A commit'inde başlayan bir koşu, B commit'i geldikten sonra bitip yayın
yapabilir; böylece canlıya çıkan şey test edilen şey olmaz. Canlı ortamdaki bir hata
(`Reject superseded release`, 2026-11-05 koşusu) bunu somut hâle getirdi.

## Karar
`pages.yml` ilk job'da değişmez tek bir kaynak SHA'sı belirler; sonraki her job tam olarak
bu SHA'yı checkout eder. Artifact, canlı doğrulamadan önce bayt bayt kontrol edilir ve
`main` ilerlemişse deploy job'u yayını reddeder. Yayın artık açık bir `release_sha`
gerektirir; yani her yayın, adı belli bir commit üzerinde bilinçli bir işlemdir.

## Sonuçlar
- **Olumlu:** doğrulanan ile sunulan şeyin aynı baytlar olduğu kanıtlanabilir.
- **Olumlu:** eşzamanlı iki push birbirine karışıp yarı yeni bir site oluşturamaz.
- **Olumsuz:** yerine yenisi gelen bir koşu sessizce yeniden çalışmak yerine başarısız olur;
  aslında kapı çalışıyordur ama pipeline kırmızı görünür.
- **Olumsuz:** yayın artık elle yapılan bir adımdır; biri yayın başlatana kadar site
  `main`'in gerisinde kalabilir. Bu kabul edilmiştir: yanlış bir yayın, geç bir yayından
  daha pahalıdır.

## İlgili
`docs/CI-CD.tr.md`; kurtarma davranışı için ADR 0003.
