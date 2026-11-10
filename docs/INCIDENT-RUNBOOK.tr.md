# Olay ve geri alma rehberi

**[🇬🇧 English](INCIDENT-RUNBOOK.md) | 🇹🇷 Türkçe**

Yayındaki site yanlış veya bozuksa ya da hemen kaldırılması gerekiyorsa ne yapılacağını anlatır.
Pipeline'ın gerçekte neye izin verdiğini yazar; pipeline'ın nasıl çalıştığı için
[CI-CD.tr.md](CI-CD.tr.md) dosyasına bakın.

## Bu planın dayandığı gerçekler

| Gerçek | Nerede zorunlu kılınıyor |
|---|---|
| Yalnızca **`main`'in o anki head'i** yayınlanabilir. Eski bir SHA doğrudan yeniden yayınlanamaz. | `scripts/ci/commands.mjs` içindeki `requireCurrentSource` (`pages.yml`'deki `current` adımı) |
| Yayın, **Portfolio CI/CD**'nin `release_sha` = o head ile elle `workflow_dispatch` edilmesini gerektirir. Push, PR ve veri senkronizasyonu asla yayın yapmaz. | `pages.yml`, ADR 0002 |
| `main`'e force-push ve `main`'in silinmesi, depo admini dışında herkes için engellidir. | "Protect main" ruleset'i |
| Hiçbir şey otomatik geri alınmaz. Kurtarma otomasyonu yalnızca gözlem yapar. | ADR 0003, `PORTFOLIO_RECOVERY_ACT` tanımsız |
| Tam bir yayın yaklaşık **30 dakika** sürer: kalite kapısı ≈ 27 dk, deploy ≈ 25 sn, canlı doğrulama ≈ 1 dk (koşu 42872535005). | Ölçüldü |
| Canlı site kendi kaynağını `/build-metadata.json` (`sourceSha`) ve footer'daki build bağlantısında gösterir. | `scripts/package-pages.mjs` |

## 1. Canlıda ne olduğunu belirle

```bash
curl -s https://ferhattufekci.github.io/build-metadata.json
```

`sourceSha` ve `build.runUrl` değerlerini not edin. `sourceSha`'yı Actions geçmişindeki son
sağlıklı yayınla karşılaştırın: Verify Production adımı geçmiş bir **Portfolio CI/CD**
`workflow_dispatch` koşusu.

## 2. Yanıta karar ver

| Durum | Yanıt |
|---|---|
| Yeni bir yayın bir şeyi bozdu | **Revert ile geri al** (bölüm 3) |
| Verify Production başarısız ama site doğru görünüyor | SHA hâlâ `main`'in head'iyken aynı SHA üzerinde başarısız job'ları yeniden çalıştırın; CI-CD.tr.md "Canlı ortam kontrolleri ve hata yönetimi" |
| Veri senkronizasyonu hatalı Medium/GitHub içeriği yayınladı | Veri commit'ini revert edin (bölüm 3) ya da öğeyi veri çekicideki `EXCLUDE` listesine ekleyip yayınlayın |
| Bir üçüncü taraf servis çöktü (AdSense, Calendly, Analytics, Google Fonts) | İşlem gerekmez. Bunlar isteğe bağlıdır ve sayfayı bozmadan devre dışı kalır (R-AD-03, R-EXTERNAL-01) |
| İçerik **hemen** kaldırılmalı (hukuki, güvenlik, kişisel veri) | **Yayından kaldırın** (bölüm 4), sonra düzeltip yayınlayın |

## 3. Revert ile geri al (normal yol)

1. Sorunu getiren commit'i veya merge'ü bulun: `git log --oneline origin/main`.
2. Bir dalda revert edip PR açın. Merge commit için ilk ebeveynine göre revert edin:
   ```bash
   git switch -c revert/<kısa-sha> origin/main
   git revert -m 1 <merge-sha>   # normal bir commit için yalnızca `git revert <sha>`
   git push -u origin revert/<kısa-sha>
   ```
3. PR'ın Portfolio CI/CD koşusunun geçmesini bekleyin, sonra merge edin.
4. Actions'ta **Portfolio CI/CD**'yi `release_sha` = `main`'in yeni head'i (merge commit) ile çalıştırın.
5. Verify Production geçince `/build-metadata.json`'ın yeni `sourceSha`'yı gösterdiğini kontrol edin.

Doğrulanmış bir geri almaya kadar beklenen süre yaklaşık 30 dakika ve buna PR incelemesi
eklenir. `main`'i eski bir commit'e force-push etmeyin: geçmişi yeniden yazar, zamanlanmış veri
commit'leri kaybolur ve yayın kapısı yine yeni bir koşu ister.

## 4. Acil yayından kaldırma

30 dakika bile uzunsa: **Settings → Pages → Unpublish site** (ya da kaynağı "None" yapın). Pages
yeniden etkinleştirilip bir yayın başlatılana kadar site 404 döner. Bu bir depo ayarıdır ve
depo sahibini gerektirir.

## 5. Olaydan sonra

- Ne olduğunu, öncesi ve sonrasındaki canlı SHA'yı ve koşu bağlantılarını `docs/OPEN-ITEMS.md`'ye yazın.
- Düzeltmeden önce başarısız olacak bir regresyon testi ekleyin.
- Bunu bir pipeline adımı yakalamalıydıysa doğrulamayı değil kapıyı değiştirin.

## Hazırlık durumu

| Kontrol | Durum |
|---|---|
| Revert-ve-yayın yolu, zorunlu yayın kurallarıyla uyumlu | Yukarıdaki koddan belgelendi |
| Gerçek bir geri alma provası (revert → CI → dispatch → doğrulama) | **NOT VERIFIED.** Henüz prova yapılmadı. 30 dakikalık süreye güvenmeden önce zararsız bir commit üzerinde bir prova yapın. |
| Yayından kaldırma | **NOT VERIFIED.** GitHub arayüzü işlemi; denenmedi. |
