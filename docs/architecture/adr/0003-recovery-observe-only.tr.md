# ADR 0003 — CI hata kurtarmasını yalnızca gözlem modunda tut

**[🇬🇧 English](0003-recovery-observe-only.md) | 🇹🇷 Türkçe**

**Durum:** Kabul edildi · **Tarih:** 2026-11-10

## Bağlam
Bazı pipeline hataları koddan değil altyapıdan kaynaklanır: süre sınırında iptal edilen bir
job ya da tarayıcı kurulumu sırasında takılan bir apt mirror'ı gibi. `scripts/ci/policy.mjs`
bir hatayı sınıflandırabilir; `recovery.mjs` de buna karşılık bir koşuyu yeniden
çalıştırabilir veya yeni bir koşu başlatabilir. Bu sınıflandırmaya göre otomatik hareket
etmek hem cazip hem de tehlikeli olan kısımdır.

## Karar
Kurtarma workflow'u her hatada bir karar hesaplar ve kaydeder; ancak depo değişkeni
`PORTFOLIO_RECOVERY_ACT` değeri `true` olmadıkça hiçbir işlem yapmaz. Bu değişken
kapalıdır. Etkinleştirmek için önce `docs/RECOVERY-ACTIVATION.md` içindeki ölçütlerin
karşılanması gerekir; buna `GITHUB_TOKEN` ile başlatılan koşuların nasıl davrandığına ve
koşuların görünür olma gecikmesinin ne kadar olduğuna dair kanıt da dahildir.

## Sonuçlar
- **Olumlu:** gerçek hatalar üzerinde bir karar günlüğü birikir; etkinleştirme sezgiye göre
  değil kanıta göre değerlendirilebilir.
- **Olumlu:** otomatik bir yeniden çalıştırma, gerçek bir regresyonu kararsız test
  (flaky) gibi gösterip gizleyemez; test takımına olan güveni en çok zedeleyecek hata türü
  budur.
- **Olumsuz:** altyapı hataları elle yeniden çalıştırılır.
- **Not:** ADR 0002 yayını açık bir `release_sha` gerektirir hâle getirdiğinden, kurtarma
  `dispatch` eylemi artık kendi başına hiçbir şey yayınlayamaz. Asıl amacı daralmıştır; bu
  da onu etkinleştirmek yerine yeniden tanımlamak için bir gerekçedir.
