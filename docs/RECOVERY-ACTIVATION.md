# Release recovery: etkinleştirme değerlendirmesi

Durum: **`PORTFOLIO_RECOVERY_ACT` kapalı (observe-only).** Bu belge yalnızca analiz ve karar çerçevesidir; değişkeni açmaz, workflow'u veya politikayı değiştirmez. Etkinleştirme ancak sahibinin açık onayıyla ve aşağıdaki kapıların tamamı geçildikten sonra yapılır.

Tarih: 2026-11-07. Kod referansı: `scripts/ci/policy.mjs` (`planRecovery`), `scripts/ci/recovery.mjs`, `.github/workflows/recover-release.yml`. Çalışma biçimi ve rollout günlüğü için bkz. [CI-CD.md](CI-CD.md) "Release recovery rollout".

## 1. Mevcut davranış (kod + gözlem)

| Karar | Koşul | Eylem (yalnızca ACT açıkken) |
| --- | --- | --- |
| `rerun` | Her iptal edilen job'da "exceeded the maximum execution time" notu var, başka gerçek hata yok, koşu `main`'in ucunda ve `run_attempt === 1` | `gh run rerun <id> --failed` |
| `dispatch` | Koşu "superseded" reddi aldı veya eski commit'te süre aşımı yaşadı ve `main` ucu için (atlanmamış) hiçbir production koşusu yok | `gh workflow run pages.yml --ref main` |
| `none` | Gerçek test/job hatası, notsuz iptal (elle durdurma), daha önce yeniden denenmiş koşu, ucu başka koşu kapsıyor, bilinmeyen sonuç | yok |

Gözlenen gerçek olaylar (`recover-release.yml`, bu oturumda API'den sayıldı: toplam 21 koşu): 3 elle `workflow_dispatch` sınıflandırması (hepsi `success`), 3 gerçek `workflow_run` kararı (biri `rerun`, önceki oturumda gözlendi; ikisi `none (Genuine failure: Run Quality Checks / Browser Tests (2/2))`, bu oturumda günlüklerden doğrulandı), 15 `skipped` (koşu başarılı olduğu veya `main` dışı olduğu için `if` koşulu çalıştırmadı). Hiçbir koşuda `performed=true` yok; yani eylem hattı (`gh run rerun` / `gh workflow run`) üretimde **hiç çalıştırılmadı**.

## 2. GITHUB_TOKEN ile başlatılan rerun recovery workflow'unu tetikler mi?

| Kanıt | Kaynak | Ne söylüyor |
| --- | --- | --- |
| Belge | [GITHUB_TOKEN kavram sayfası](https://docs.github.com/en/actions/concepts/security/github_token) | "events triggered by the `GITHUB_TOKEN` will not create a new workflow run", istisna: `workflow_dispatch` ve `repository_dispatch` her zaman koşu oluşturur. Sayfa yeniden çalıştırmalardan **söz etmiyor**. |
| Belge | [Re-running workflows](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/re-running-workflows-and-jobs) | En çok 30 gün sonrasına kadar; bir koşu en fazla **50 kez** yeniden çalıştırılabilir (kısmi dahil); aynı `GITHUB_SHA`/`GITHUB_REF`; yetkiler ilk tetikleyen aktöre ait. |
| Topluluk | [github.community #133950](https://github.community/t/event-workflow-run-is-only-triggered-once/133950) | `workflow_run` `completed` yeniden çalıştırmada tetiklenir, `requested` tetiklenmez (2020 tarihli, resmî belge değil). |
| Gözlem (bu repo) | Aşağıdaki zaman eşleşmeleri | Kullanıcı hesabıyla (`gh run rerun --failed`) başlatılan 2. denemelerin bitişinden 2-3 sn sonra bir "Recover Production Release" koşusu oluştu: `42198985841` → `42205096293`, `42291551905` → `42299736835`, `42195218463` → `42205783448`, `42195056397` → `42205904282`. Eşleşme zamana dayanır; atlanan koşuların günlüğü/payload'ı olmadığından `run_attempt=2` değeri doğrudan görülmedi. |

**Sonuç:** Yeniden çalıştırmanın tamamlanmasının `workflow_run` ürettiği kullanıcı token'ı için güçlü dolaylı kanıtla gözlendi. **GITHUB_TOKEN ile başlatılan** rerun/dispatch için bu **DOĞRULANAMADI**: belge bu durumu yazmıyor ve repoda gözlenmedi. Sistem her iki durumda da güvenli olacak şekilde tasarlandı (bölüm 3), dolayısıyla bu belirsizlik güvenlik riski değil, yalnızca "ikinci deneme sınıflandırılır mı" sorusudur.

Belirsizliği etkinleştirmeden kapatmanın yolu: bölüm 6 "Prob deneyi" (karar bekliyor).

## 3. Döngü, mükerrer çalışma ve kaynak analizi

Kısaltma: R = tetikleyen başarısız koşu, M = o an `main` ucu.

**Döngü yok (sınır kanıtı).** Her eylem, bir sonraki kararın `none` vereceği duruma gider:

- `rerun` yalnızca `R.run_attempt === 1` ve `R.head_sha === M` iken. Rerun sonucu aynı koşunun 2. denemesidir; tamamlandığında (tetiklenirse) `attempt=2` ile gelir → süre aşımı nedeniyle de olsa `none (Already retried once)` (R-CI-RECOVER-02). Tetiklenmezse hiçbir şey olmaz. İki durumda da 2. rerun yok. GitHub'ın koşu başına 50 yeniden çalıştırma sınırı mantık hatası olsa bile dış üst sınırdır.
- `dispatch` yalnızca M için atlanmamış hiçbir koşu yokken. Dispatch koşusu D'nin `head_sha`'sı M olur ve `skipped` değildir → sonraki kararlarda "ucu kapsıyor" → `none` (R-CI-RECOVER-06/07/15). D, M'de "superseded" reddi alırsa `Superseded rejection on the newest commit needs investigation` → `none` (R-CI-RECOVER-08). D süre aşımı yaşarsa D'nin kendi tek rerun'ı olur (D attempt 1).
- Zincir derinliği: Fetch → Portfolio CI/CD → Recover Release. GitHub, `workflow_run` zincirleri için sınır uyguluyor (belgede üç seviye olarak anılıyor; metni bu oturumda yeniden getirilemedi). Sınır aşılırsa recovery tetiklenmez: güvenli yön.

**Kaynak üst sınırı (tek olay başına, mantık doğruysa):**

| Başlangıç | En çok ek çalışma |
| --- | --- |
| R, M'de (süre aşımı) | 1 kısmi rerun (`--failed`) |
| R eski commit'te | 1 tam dispatch koşusu D + D için en çok 1 kısmi rerun |

Yani bir olay en çok 3 pipeline çalıştırması üretir (R, D, D'nin 2. denemesi). Yeni commit'ler ayrı olaylardır ve kendi push koşuları zaten pipeline'ı başlatır. Her job `timeout-minutes` ile sınırlı; apt kurulum adımı 5 dakikayla kısıtlı.

**Mükerrer çalışma:**

- Aynı R için iki recovery koşusu (ör. recovery'nin elle yeniden çalıştırılması): concurrency grubu koşu başınadır (`portfolio-recovery-<run id>`, `cancel-in-progress: false`) ve eylemden önce son deneme yeniden okunur; fark varsa `Run was rerun meanwhile` ile eylem yapılmaz (R-CI-RECOVER-19).
- **Açık nokta (kabul edilmiş artık risk):** *farklı* iki başarısız koşu aynı anda "M kapsanmıyor" görürse iki dispatch üretebilir; kapsam kontrolü ile dispatch edilen koşunun listede görünmesi arasında saniyeler vardır. Sonuç: aynı SHA için iki koşu, `portfolio-production` grubu bunları sıraya koyar, ikincisi aynı artifact'ı idempotent yayınlar; maliyet 1 ek pipeline. Bunu test eden bir senaryo yok (gerçek zamanlama yarışı yerel testle üretilemez). Öneri H1: dispatch'ten hemen önce kapsam listesini yeniden oku. Bu kod değişikliği olduğu için onay bekliyor.
- Beklemede koşu başka bir beklemede koşuyla değiştirilirse iptal edilen koşunun job'ı yoktur → notsuz iptal → `none`.

**Güvenlik:** `contents: read` + `actions: write`; yalnızca `main` varsayılan dal kodu çalışır (PR kodu yok); yalnızca aynı depo ve `head_branch == main`; `RUN_ID`/`RUN_ATTEMPT` betik içine enterpolasyonla değil ortam değişkeniyle geçer; elle dispatch asla eylem yapmaz.

## 4. Etkinleştirme koşulları (hepsi sağlanmalı)

1. Sahibin açık onayı (bu belgenin sahibi dışındaki hiçbir adım değişkeni açamaz).
2. Bölüm 6'daki prob deneyi sonuçlandı **veya** sahip belirsizliği bilerek kabul etti (kayda geçirilir).
3. H1 (dispatch öncesi kapsam yeniden okuma) kabul/ret kararı verildi; kabulse uygulanıp test edildi.
4. `main` yeşil, o an uçuşta production koşusu yok, açık recovery koşusu yok.
5. Geri alma hazır: `gh variable set PORTFOLIO_RECOVERY_ACT --body false` (veya değişkeni sil) ve `gh workflow disable recover-release.yml`.
6. İlk gerçek eylem için gözlemci atanmış (aşağıdaki kriterler izlenecek).

## 5. Kabul ve iptal kriterleri

Kabul (ilk gerçek recovery olayında hepsi):

- AC-1 Eylem kararı bir kez uygulandı ve `performed=true` yalnızca `rerun`/`dispatch` kararında görülür.
- AC-2 Takip koşusu başladı (rerun ise aynı koşunun 2. denemesi, dispatch ise yeni `workflow_dispatch` koşusu).
- AC-3 Takip koşusunun tamamlanması ya hiç recovery koşusu üretmedi ya da `recovery=none` verdi; hangisinin olduğu kayda geçti (belirsizliği kapatır).
- AC-4 Hiçbir koşunun `run_attempt` değeri 2'yi aşmadı; aynı M için ikiden fazla dispatch yok.
- AC-5 Gerçek test başarısızlıklarında karar `none` kalmaya devam etti, `performed=false`.

Hemen geri alma (değişkeni kapat) ölçütleri: `performed=true` ama karar tablosu dışında; aynı koşu için 2'den fazla deneme; aynı M için birden fazla dispatch; recovery koşusunun API hatasıyla kırılması; beklenmeyen üretim yayını.

İzleme komutları (salt okunur):

```sh
R=repos/ferhattufekci/ferhattufekci.github.io
gh api "$R/actions/workflows/pages.yml/runs?per_page=100" --jq '.workflow_runs[] | select(.run_attempt>2) | .id'   # beklenen: boş
gh api "$R/actions/workflows/recover-release.yml/runs?per_page=50" --jq '.workflow_runs[] | [.id,.event,.conclusion,.created_at] | @tsv'
gh run view <recover-run-id> --log | grep -E 'recovery=.* mode='
```

## 6. Karar bekleyenler

- **D-1 Prob deneyi (öneri):** Üretimle ilgisiz iki geçici workflow (P1 `workflow_dispatch`, P2 `workflow_run` of P1) ile P2'nin GITHUB_TOKEN'ıyla P1'i yeniden çalıştırıp P2'nin ikinci kez tetiklenip tetiklenmediği ve `run_attempt` değeri ölçülür; P2 `run_attempt == 1` korumasıyla sınırlıdır; deney sonunda dosyalar silinir. `workflow_run` yalnızca varsayılan daldaki dosyayla çalıştığı için dosyaların `main`'e girmesi gerekir; yeni workflow dosyası eklemek olduğundan **onay gerekir**. Üretim davranışı değişmez.
- **D-2 H1 sertleştirmesi:** dispatch öncesi kapsam yeniden okuma (kod + test; recovery kapalıyken davranış değiştirmez).
- **D-3 Etkinleştirme:** yukarıdaki kapılar kapandıktan sonra sahibin kararı.
