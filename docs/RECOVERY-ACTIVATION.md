# Release recovery: etkinleştirme değerlendirmesi

Durum: **`PORTFOLIO_RECOVERY_ACT` kapalı (observe-only).** Bu belge analiz ve karar çerçevesidir; değişkeni açmaz, workflow'u veya politikayı değiştirmez. Etkinleştirme ancak sahibinin açık onayıyla ve bölüm 4'teki kapıların tamamı geçildikten sonra yapılır. D-1 ve D-2 tamamlanmadan D-3'e geçilmez.

Tarih: 2026-11-07. Kod referansı: `scripts/ci/policy.mjs` (`planRecovery`), `scripts/ci/recovery.mjs`, `scripts/ci/commands.mjs`, `.github/workflows/recover-release.yml`. Çalışma biçimi ve rollout günlüğü: [CI-CD.md](CI-CD.md) "Release recovery rollout". Açık işlerin önceliği ve kabul kriterleri: [OPEN-ITEMS.md](OPEN-ITEMS.md).

Kanıt düzeyi etiketleri (her iddia için): **[B]** resmî belge, **[G]** bu repoda gerçek olay gözlemi, **[T]** birim testi (CI'da yeşil olması üretimde doğrulandığı anlamına gelmez), **[K]** kod incelemesi, **[?]** DOĞRULANAMADI.

## 1. Mevcut davranış

| Karar | Koşul | Eylem (yalnızca ACT açıkken) |
| --- | --- | --- |
| `rerun` | Her iptal edilen job'da "exceeded the maximum execution time" notu var, başka gerçek hata yok, koşu `main`'in ucunda ve `run_attempt === 1` | `gh run rerun <id> --failed` |
| `dispatch` | Koşu "superseded" reddi aldı veya eski commit'te süre aşımı yaşadı ve `main` ucu için (atlanmamış) hiçbir production koşusu yok | `gh workflow run pages.yml --ref main` |
| `none` | Gerçek test/job hatası, notsuz iptal (elle durdurma), job'ı olmayan iptal, daha önce yeniden denenmiş koşu, ucu başka koşu kapsıyor, bilinmeyen sonuç | yok |

Gözlenen gerçek olaylar **[G]** (`recover-release.yml`, bu oturumda API'den sayıldı, toplam 21 koşu): 3 elle `workflow_dispatch` sınıflandırması (hepsi `success`), 3 gerçek `workflow_run` kararı (biri `rerun`, önceki oturumda gözlendi; ikisi `none (Genuine failure: Run Quality Checks / Browser Tests (2/2))`, günlüklerden doğrulandı), 15 `skipped` (koşu başarılı veya `main` dışı olduğundan `if` çalıştırmadı). Hiçbir koşuda `performed=true` yok: **eylem hattı (`gh run rerun` / `gh workflow run`) üretimde hiç çalıştırılmadı.**

Job'ı olmayan iptal gerçekten var **[G]**: `main` üzerinde iptal edilen eski koşular `39471231653` ve `39479133700` sıfır job içeriyor (bekleyen koşu concurrency tarafından değiştirilmiş). `planRecovery` bunlara `No infrastructure cause` → `none` verir **[K]**.

## 2. GITHUB_TOKEN, workflow_run, workflow_dispatch, repository_dispatch ilişkisi

| Konu | Bulgu | Düzey |
| --- | --- | --- |
| GITHUB_TOKEN olayları | "events triggered by the `GITHUB_TOKEN` will not create a new workflow run"; istisna: `workflow_dispatch` ve `repository_dispatch` her zaman koşu oluşturur ([kavram sayfası](https://docs.github.com/en/actions/concepts/security/github_token)). Sayfa yeniden çalıştırmalardan söz etmiyor. | [B] |
| `workflow_run` zinciri | "You can't use `workflow_run` to chain together more than three levels of workflows." Çalışan dosya/`GITHUB_SHA` varsayılan dala ait ("Last commit on default branch"); yazma token'ına ve secret'lara erişir ([olaylar referansı](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)). | [B] |
| Yeniden çalıştırma ve `requested` | "The `requested` activity type does not occur when a workflow is re-run." Belge `completed`'in yeniden çalıştırmada oluştuğunu **açıkça yazmıyor**; yalnızca `requested` için istisna belirtiyor. | [B] |
| Yeniden çalıştırma kuralları | En çok 30 gün sonrasına kadar; koşu başına **en çok 50** yeniden çalıştırma (kısmi dahil); aynı `GITHUB_SHA`/`GITHUB_REF`; yetkiler ilk tetikleyen aktöre ait ([belge](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/re-running-workflows-and-jobs)). | [B] |
| Yeniden çalıştırma `completed` üretir mi | Topluluk: `completed` yeniden çalıştırmada tetiklenir, `requested` tetiklenmez ([github.community #133950](https://github.community/t/event-workflow-run-is-only-triggered-once/133950), 2020, resmî değil). Bu repoda, kullanıcı hesabıyla başlatılan 2. denemelerin bitişinden 2-3 sn sonra recovery koşusu oluştu: `42198985841`→`42205096293`, `42291551905`→`42299736835`, `42195218463`→`42205783448`, `42195056397`→`42205904282`. Eşleşme zamana dayanır; atlanan koşuların günlüğü olmadığından payload'taki `run_attempt` görülmedi. | [G] dolaylı |
| **GITHUB_TOKEN ile başlatılan** rerun için `completed` | Belge yazmıyor; repoda gözlenmedi. | **[?]** |
| **GITHUB_TOKEN ile `workflow_dispatch`** için `completed` ve zincir derinliği | Dispatch'in koşu oluşturduğu [B]; o koşunun tamamlanmasının `workflow_run` üretip üretmediği ve "üç seviye" sayacına nasıl girdiği belgede yok. | **[?]** |
| `repository_dispatch` | Recovery kullanmıyor ve `contents: read` ile çağıramaz (bu uç nokta yazma izni ister; belge bu oturumda yeniden getirilmedi). Ek yüzey oluşturmaması için kullanılmayacak. | [K], izin ayrıntısı [?] |

**Sonuç:** Kullanıcı token'ıyla yeniden çalıştırmanın `completed` ürettiğine dair güçlü dolaylı kanıt var. GITHUB_TOKEN ile başlatılan rerun/dispatch için davranış **DOĞRULANAMADI**. Sistem iki olasılıkta da güvenli tasarlandı (bölüm 3); belirsizlik güvenlik riski değil, "ikinci deneme sınıflandırılır mı" sorusudur. Belirsizliği recovery'yi açmadan kapatma planı: bölüm 6 ve [D1-PROBE-PLAN.md](D1-PROBE-PLAN.md).

## 3. Döngü, mükerrer çalışma, yarış ve kaynak analizi

Kısaltma: R = tetikleyen başarısız koşu, M = o an `main` ucu.

**Döngü yok (sınır argümanı)** **[K][T]**: her eylem, bir sonraki kararın `none` vereceği duruma gider.

- `rerun` yalnızca `R.run_attempt === 1` ve `R.head_sha === M` iken. Sonuç aynı koşunun 2. denemesidir; tamamlandığında (tetiklenirse) `attempt=2` ile gelir → `none (Already retried once)` (R-CI-RECOVER-02). Tetiklenmezse hiçbir şey olmaz. İki durumda da 2. rerun yok. GitHub'ın koşu başına 50 yeniden çalıştırma sınırı mantık hatasında bile dış üst sınırdır **[B]**.
- `dispatch` yalnızca M için atlanmamış koşu yokken. Dispatch koşusu D'nin `head_sha`'sı M'dir ve `skipped` değildir → sonraki kararlarda "ucu kapsıyor" → `none` (R-CI-RECOVER-06/07/15). D, M'de "superseded" reddi alırsa → `none` (R-CI-RECOVER-08). D süre aşımı yaşarsa D'nin kendi tek rerun'ı olur.
- Zincir derinliği: Fetch → Portfolio CI/CD → Recover Release zaten iki seviye. Resmî sınır üç seviye **[B]**; sınır aşılırsa recovery tetiklenmez, bu güvenli yöndür.

**Kaynak üst sınırı (mantık doğruysa, tek olay):** R `main` ucundaysa 1 kısmi rerun; R eski commit'teyse 1 tam dispatch koşusu D + D için en çok 1 kısmi rerun. En çok **3 pipeline çalıştırması** (R, D, D'nin 2. denemesi). Yeni commit'ler ayrı olaylardır. Her job `timeout-minutes` ile sınırlı; apt kurulum adımı 5 dakikayla kısıtlı.

**Mükerrer çalışma ve yarış:**

- Aynı R için iki recovery koşusu: concurrency grubu koşu başınadır (`portfolio-recovery-<run id>`, `cancel-in-progress: false`) ve eylemden önce son deneme yeniden okunur; fark varsa eylem yapılmaz (R-CI-RECOVER-19) **[T]**.
- **Açık nokta (D-2 konusu):** *farklı* iki başarısız koşu aynı anda "M kapsanmıyor" görürse iki dispatch üretebilir (kontrol-sonra-eylem yarışı). Ayrıntı: bölüm 7. Gerçek zamanlama yarışı yerel testle birebir üretilemez **[?]**; enjekte edilmiş sahte API ile iki koşunun araya girmesi simüle edilebilir (T-D2-08/09 önerisi, henüz yok).
- Bir koşu `rerun` çağrıldığında hâlâ çalışıyorsa GitHub'ın bunu reddedip reddetmediği doğrulanmadı **[?]**; reddederse recovery koşusu hata verir, döngü oluşmaz, kurtarma kaybolur.

**Güvenlik** **[K]**: `contents: read` + `actions: write`; varsayılan dal kodu çalışır (PR kodu yok); yalnızca aynı depo ve `head_branch == main`; `RUN_ID`/`RUN_ATTEMPT` betiğe enterpolasyonla değil ortam değişkeniyle geçer; elle dispatch asla eylem yapmaz. `actions: write`'ın `gh run rerun`/`gh workflow run` için yeterliliği ilk gerçek eylemde gözlenecek **[?]**. Depo düzeyi "Workflow permissions" ayarı bu oturumda proxy yüzünden okunamadı **[?]**.

## 4. Etkinleştirmeden önce eksik kalan kontroller ve koşullar

Eksikler (DevOps/ISTQB incelemesi):

| # | Eksik | Neden önemli | Kapatma yolu |
| --- | --- | --- | --- |
| C1 | `commands.mjs` içindeki `act()` argümanları (`gh run rerun <id> --failed`, `gh workflow run pages.yml --ref main --repo …`) başlangıçta hiçbir testte doğrulanmıyordu (R-CI-RECOVER-14 enjekte edilmiş `act` kullanır); `recovery-act.test.js` ile kapatıldı | Yanlış argüman ilk gerçek olayda ortaya çıkar | Sahte `gh` ile argv sözleşme testi (üretim kodu değişmez, yalnızca test) |
| C2 | Yeniden çalıştırmanın tamamlandığında `workflow_run` ürettiği GITHUB_TOKEN için bilinmiyor | AC-3 | D-1 |
| C3 | Recovery koşusu hata verirse bildirim yok (sessiz) | Kurtarma kaybı fark edilmez | Haftalık salt okunur kontrol (bölüm 5 komutları) veya sahibin onayıyla bildirim |
| C4 | Dispatch yarışı | Mükerrer pipeline | D-2 |
| C5 | `actions: write` yeterliliği ve depo token ayarı | İlk eylemde reddedilme | İlk eylemde AC ile izle |
| C6 | `rerun`'ın hâlâ çalışan koşuya tepkisi | Kurtarma kaybı | İlk eylemde izle |

Etkinleştirme koşulları (hepsi sağlanmalı):

1. Sahibin açık onayı.
2. D-1 sonuçlandı **veya** sahip belirsizliği bilerek kabul etti (kayda geçer).
3. D-2 kararı verildi; kabulse uygulanıp test edildi.
4. C1 kapatıldı.
5. `main` yeşil, uçuşta production koşusu yok, açık recovery koşusu yok.
6. Geri alma hazır: `gh variable set PORTFOLIO_RECOVERY_ACT --body false` (veya değişkeni sil) ve `gh workflow disable recover-release.yml`.
7. İlk gerçek eylem için gözlemci atanmış.

## 5. Kabul ve iptal kriterleri (ilk gerçek recovery olayı)

Kabul:

- AC-1 `performed=true` yalnızca `rerun`/`dispatch` kararında.
- AC-2 Takip koşusu başladı (rerun: aynı koşunun 2. denemesi; dispatch: yeni `workflow_dispatch` koşusu).
- AC-3 Takip koşusunun tamamlanması ya recovery koşusu üretmedi ya da `recovery=none` verdi; hangisi olduğu kayda geçti.
- AC-4 Hiçbir koşunun `run_attempt` değeri 2'yi aşmadı; aynı M için ikiden fazla dispatch yok.
- AC-5 Gerçek test başarısızlıklarında karar `none`, `performed=false` kalmaya devam etti.

Hemen geri alma ölçütleri: karar tablosu dışında `performed=true`; aynı koşu için 2'den fazla deneme; aynı M için birden fazla dispatch; recovery koşusunun API hatasıyla kırılması; beklenmeyen üretim yayını.

İzleme komutları (salt okunur):

```sh
R=repos/ferhattufekci/ferhattufekci.github.io
gh api "$R/actions/workflows/pages.yml/runs?per_page=100" --jq '.workflow_runs[] | select(.run_attempt>2) | .id'   # beklenen: boş
gh api "$R/actions/workflows/recover-release.yml/runs?per_page=50" --jq '.workflow_runs[] | [.id,.event,.conclusion,.created_at] | @tsv'
gh run view <recover-run-id> --log | grep -E 'recovery=.* mode='
```

## 6. D-1: probe deneyi (PLAN; kullanıcı kararı: P-1 ayrı depo)

Sahibin kararı: testler üretim deposundan bağımsız, geçici ayrı bir depoda yapılacak (P-1). Uygulanabilir son plan, yapılandırma, iki workflow'un tasarımı, E0-E5 matrisi, minimum izinler, gözlem komutları, tekrarlanabilirlik, raporlama ve temizlik: **[D1-PROBE-PLAN.md](D1-PROBE-PLAN.md)**. Uygulama için sahibin ayrıca açık onayı bekleniyor; bu depoda yeni workflow oluşturulmaz.

## 7. D-2: dispatch öncesi kapsam yeniden okuma (H1) — teknik değerlendirme (uygulanmadı)

Sahibin tercihi H1: dispatch'ten hemen önce kapsam listesini yeniden oku ve önceki kontrolle karşılaştır. D-1 doğrulanmadan uygulanmaz.

**Yarışın oluşumu (kod gerçeği [K]):** `recover()` sırasıyla koşu, job'lar, annotation'lar ve **en son** `tipRuns` (M için `pages.yml` koşuları) okur, planı hesaplar, `dispatch` ise `act()` çağırır; `dispatch` yolunda "yeniden oku" korumasının benzeri yoktur (stale guard yalnızca `rerun` içindir).

| t | Recover-1 (R1 için) | Recover-2 (R2 için) | GitHub |
| --- | --- | --- | --- |
| t0 | `tipRuns(M)` = ∅ → `dispatch` | | M için koşu yok |
| t0+δ | | `tipRuns(M)` = ∅ → `dispatch` | |
| t1 | `gh workflow run` → D1 oluşur | | D1 listede **henüz görünmeyebilir** (görünürlük gecikmesi L) |
| t1+ε | | `gh workflow run` → D2 oluşur | M için iki koşu |

Gerçekleşme koşulları: (1) M için hiçbir (atlanmamış) koşu yok; (2) ≥2 recovery koşusu aynı anda `dispatch` kararına varıyor (ör. art arda "superseded" olan eski koşular); (3) ikincinin okuması birincinin D1'inin listede görünmesinden önce. Normalde M'nin kendi push koşusu vardır (kapsanır); bu yüzden nadirdir. Kaynak: `portfolio-production` concurrency'sinde bekleyen koşuların değiştirilmesi bu tür toplu "superseded" başarısızlıklarını mümkün kılar **[G]** (job'ı olmayan iptaller gözlendi, bölüm 1).

**H1 ne zaman riski azaltır:**

| Senaryo | H1 olmadan | H1 ile |
| --- | --- | --- |
| S1 Recovery-2'nin ilk okumasından sonra, dispatch'inden önce M için bir koşu **göründü** (ör. başka biri dispatch etti, geç gelen push koşusu) | İkinci mükerrer dispatch | Yeniden okuma kapsamı görür → `none` |
| S2 İlk okuma ile dispatch arasında uzun süre geçti (yavaş `gh` başlatma, API gecikmesi) | Pencere uzun | Pencere milisaniyelere iner |
| S3 Okumalar arasında `main` ilerledi | Eski M için dispatch (`--ref main` yeni ucu dispatch eder, kapsam eski M'ye göre değerlendirilmişti) | M yeniden okunur; değiştiyse `none` (yeni uç kendi push koşusuna sahiptir) |
| S4 İki recovery tam eşzamanlı (aynı saniye) ve L içinde | Mükerrer | **H1 çözmez**: ikisi de D1'i görmeden dispatch eder |
| S5 Bir koşunun recovery'si eylem yaparken diğerinin okuması, D1'in görünürlük gecikmesi L içinde | Mükerrer | **H1 çözmez** (L penceresi aynen kalır) |

**Eşzamanlı başarısızlık senaryoları:** (a) aynı M için N eski koşu aynı anda başarısız: ilk dispatch'ten sonra görünürlük gecikmesi L boyunca diğerleri de dispatch edebilir (en kötü N dispatch, `portfolio-production` bunları seriler; ikincisi ve sonrası bekleyen koşuyu değiştirir, yani gerçekte en çok bir bekleyen + bir çalışan kalır **[K]**, bu değiştirmenin cancelled/jobsuz olduğu bölüm 1'de gözlendi **[G]**); (b) M'nin push koşusu ile recovery aynı anda: push koşusu listede görünürse H1 yakalar; görünmezse mükerrer olabilir; (c) D1 kendi süre aşımında başarısız olurken yeni bir eski koşu recovery'si: D1 kapsar (atlanmamış) → `none`.

**Artık risk:** görünürlük gecikmesi L (bilinmiyor **[?]**) ve gerçek eşzamanlılık (S4/S5). Sonuç: aynı SHA için ek bir pipeline koşusu. Etkisi bütünlük/güvenlik değil maliyettir: ikinci koşu aynı artifact'ı idempotent yayınlar, `Reject superseded release` yalnızca M ilerlediyse reddeder **[K]**. Kabul edilebilir seviye önerisi: M başına ≤2 dispatch koşusu (AC-4'ü buna göre güncel tut) ve gözlemlenince H2 değerlendirmesi (job düzeyinde ortak concurrency + dispatch sonrası görünürlük bekleme; bekleyen koşu değişimi nedeniyle kurtarma kaybı riski var).

**H1'in yeni açık oluşturmadığının değerlendirmesi:**

1. **Tek yönlü güvenlik (monotonluk):** H1 yalnızca `dispatch` kararını `none`'a çevirebilir; `none`'ı eyleme çeviremez. Yeni döngü/eylem yolu açamaz.
2. **Fail-closed:** yeniden okuma API hatası verirse eylem yapılmaz (istisna fırlar, recovery koşusu kırmızı olur); "okuyamadım, yine de dispatch et" yolu olmamalı.
3. **SHA doğrulaması:** `planRecovery` zaten `assert.match(mainSha, /^[a-f0-9]{40}$/)` ile boş/bozuk SHA'yı reddeder **[K][T]**; yeniden okunan M de aynı doğrulamadan geçmelidir (boş `ls-remote` çıktısı boş SHA → reddedilir).
4. **Tek tanım:** kapsam koşulu (`head_sha === M`, production koşusu, `skipped` değil) iki yerde ayrı yazılmamalı; ortak fonksiyon kullanılmalı (DRY), yoksa iki okuma farklı karar verebilir.
5. **Sayfalama:** her iki okuma da `per_page=100` ile aynı sorguyu kullanır; M için 100'den fazla koşu bu repoda gerçekçi değil ama davranış aynı kalmalı.
6. **Kural dışı etki:** +1 API çağrısı (hız sınırı etkisi ihmal edilebilir); `rerun` yolu değişmez.

**Test senaryoları (enjekte edilmiş sahte API; gerçek GitHub yok; henüz yazılmadı):**

| ID | Senaryo | Beklenen |
| --- | --- | --- |
| T-D2-01 | 1. okuma ∅, 2. okuma M'yi kapsayan koşu içerir | `none`, `act` çağrılmadı |
| T-D2-02 | 1. ve 2. okuma ∅ | `dispatch`, `act` tam 1 kez |
| T-D2-03 | 2. okumada yalnızca `skipped` koşu | `dispatch` (skipped kapsamaz, R-CI-RECOVER-15 ile tutarlı) |
| T-D2-04 | Arada M değişti | `none`, `act` yok |
| T-D2-05 | 2. okuma API hatası | İstisna, `act` yok (fail-closed) |
| T-D2-06 | `observeOnly` | `performed=false`; karar değişmez |
| T-D2-07 | `rerun` yolu | Ek okuma yok; davranış R-CI-RECOVER-19 gibi |
| T-D2-08 | Ortak sahte GitHub durumu, iki recovery ardışık (görünürlük gecikmesi 0) | Toplam 1 dispatch |
| T-D2-09 | Aynısı, görünürlük gecikmesi > pencere | **Bilinen sınır**: 2 dispatch olabilir; "bilinen sınır" olarak adlandırılan karakterizasyon testi, doğru davranış gibi sunulmaz |
| T-D2-10 | Mutasyon: 2. okumayı kaldır | T-D2-01 kırılır (test gerçekten koruyor) |

**Kabul kriterleri:** T-D2-01..10 yeşil ve mutasyon kontrolü kırılıyor; mevcut R-CI-RECOVER-01..22 değişmeden yeşil; fark incelemesinde karar tablosu değişmemiş (yalnızca eklenen koruma); yeni bağımlılık yok; recovery kapalıyken üretim davranışı değişmez; artık risk (S4/S5) belgede açıkça yazılı.

## 8. C1: `act()` test kapsamı — tasarım, uygulama ve doğrulama

**Mevcut durum [K]:** `act` `commands.mjs` içinde `recover` dalının **yerel** kapanışıdır; dışa aktarılmaz, bu yüzden R-CI-RECOVER-14 enjekte edilmiş sahte `act` ile çalışır ve gerçek argümanlar hiç doğrulanmaz. Üretim argümanları: `run rerun <id> --failed --repo ferhattufekci/ferhattufekci.github.io` ve `workflow run pages.yml --ref main --repo ferhattufekci/ferhattufekci.github.io`.

**Yaklaşım (kod değişikliği gerekmez, gerçek GitHub işlemi yok):** `node scripts/ci/commands.mjs recover <runId> <attempt>` komutunu alt süreç olarak çalıştır; `PATH`'in başına geçici dizindeki sahte `gh` ve `git` çalıştırılabilirlerini koy. Sahte `git ls-remote` sabit SHA döner; sahte `gh api …` mevcut fixture'lardan (`deploy-recovery-runs.json`) yanıt verir; sahte `gh run rerun` / `gh workflow run` argümanlarını bir günlük dosyasına yazar ve yapılandırılabilir çıkış koduyla biter. `GITHUB_STEP_SUMMARY` geçici dosyadır. Sahte dizin dışında gerçek `gh` çağrılırsa test başarısız olur (PATH yalnızca sahte dizin + `node`). Böylece üretim kodu değişmeden `act()` ve karar günlüğü sözleşmesi doğrulanır.

| ID | Senaryo (kullanıcı listesi) | Beklenen |
| --- | --- | --- |
| C1-01 | Başarılı `rerun` (`RECOVERY_ACT=true`, `timeout` fixture'ı) | Argv **tam** olarak `run rerun <id> --failed --repo <repo>`; çıkış 0; günlükte `performed=true` |
| C1-02 | Başarılı `dispatch` (`superseded` fixture'ı, M kapsanmıyor) | Argv tam olarak `workflow run pages.yml --ref main --repo <repo>` |
| C1-03 | Geçersiz argüman: boş, `abc`, `-1`, `1;id`, `--repo=x`, `4204 3003`, çok uzun | `assert` ile reddedilir; **hiçbir** `gh run/workflow` çağrısı yok; seçenek enjeksiyonu mümkün değil |
| C1-04 | Eksik parametre: argümansız; yalnızca runId | Aynı |
| C1-05 | Beklenmeyen değer: `attempt` `0`, `01`, `2.5`; ortam değişkeni `RECOVERY_ACT` = `TRUE`, `1`, `yes`, boş | `RECOVERY_ACT` yalnızca birebir `true` ise eyler; diğerleri observe (karakterizasyon) |
| C1-06 | Başarısız eylem: sahte `gh run rerun` çıkış 1 | Süreç sıfırdan farklı çıkar; yeniden deneme yok; döngü yok; F-C1-2 düzeltmesiyle: karar özeti ve `performed=failed` yazılır |
| C1-07 | Tekrarlanan çağrı (rerun): ikinci çalıştırmada sahte `gh api runs/<id>` farklı `run_attempt` döner | `Run was rerun meanwhile`, ikinci `gh run rerun` yok |
| C1-08 | Tekrarlanan çağrı (dispatch): ikinci çalıştırmada sahte `tipRuns` kapsayan koşu içerir | `none`; ikinci `gh workflow run` yok |
| C1-09 | Observe modunda (`RECOVERY_ACT` ayarsız) her karar | `gh run rerun`/`gh workflow run` **hiç** çağrılmaz; günlükte `mode=observe performed=false` |
| C1-10 | Mutasyon: `--failed` bayrağını/`--ref main`'i/`--repo`'yu kaldır veya sırayı değiştir | İlgili test kırılır |

**Uygulama durumu (C1 PR'ı; CI sonucu PR'da izlenir):** `scripts/tests/recovery-act.test.js` bu tasarımı gerçek alt süreçlerle uygular (`node scripts/ci/commands.mjs recover …`, `PATH` yalnızca sahte `gh`/`git` dizini + `node`). Eşleme: C1-01/02 → `R-CI-RECOVER-C1-02/03`; C1-03/04 → `-07`; C1-05/09 → `-01`; C1-06 → `-04`; C1-07/08 → `-09/-03`; C1-10 → `-11` (7 mutasyon: bilinmeyen eylem→dispatch, kayıp karar, yeşil adım, `performed=true` yalanı, observe yok sayma, gevşek `RECOVERY_ACT`, `--failed` düşürme). Ek: `-00` (sahte araçların gerçekten kullanıldığı), `-05/-06` (bilinmeyen eylem), `-08` (bozuk main SHA), `-10` (gerçek hata dokunulmaz). **Sınırlama [?]:** sahte `gh` yalnızca bu deponun kodunun GitHub'dan *ne istediğini* kanıtlar; GitHub'ın `rerun`/`dispatch`'e *nasıl tepki verdiği* D-1'in konusudur.

**Bulgular (kod incelemesi; F-C1-1 ve F-C1-2 bu PR'da düzeltildi, ayrı hata olarak ele alındı):**

- **F-C1-1** `act`, `action === 'rerun' ? … : <dispatch>` biçiminde yazılmıştır: `rerun` dışındaki **her** değer dispatch üretir. `planRecovery` yalnızca üç değer döndürdüğü ve `recover` `none`'da `act` çağırmadığı için bugün erişilemez; ama bir ileri değişiklikte yazım hatası sessizce dispatch'e dönüşür. **Düzeltme:** `actionArgv()` (recovery.mjs) yalnızca `rerun` ve `dispatch` bilir; diğer her değer (`none`, boş, büyük/küçük harf farkı…) `Unknown recovery action` ile reddedilir; run id ondalık değilse reddedilir.
- **F-C1-2** `act()` istisna fırlatırsa karar özeti ve `recovery=… performed=…` satırı yazılmadan süreç düşer: kırmızı koşu görünür ama **neden** eylem denendiği günlükte yok. **Düzeltme:** `recover()` eylem hatasını yakalar ve `{…plan, performed:false, failed:true, error}` döner; komut `performed=failed error="…"` satırını ve özetteki `Error:` satırını yazar, sonra çıkış kodu 1 ile biter (adım kırmızı). Eylem yeniden denenmez.
- **F-C1-3 (üretimde gözlendi, 2026-11-09) [G]:** `recover` ana dal SHA'sını `git ls-remote origin` ile okuyordu; bu iş `persist-credentials: false` ile checkout yaptığından git'in kimlik bilgisi yok. Depo özel (private) olduğunda komut `fatal: could not read Username for 'https://github.com'` ile düştü: iki `Recover Production Release` koşusu kırmızı (`42598657824`, `42599442136`, her ikisi iptal edilen push koşularının ardından). Depo görünürlüğünün ne zaman ve kim tarafından değiştiği bu oturumdan doğrulanamadı [?]; 8 Kasım 07:35'teki son yürütülen recover koşusunda `ls-remote` çalışıyordu. **Düzeltme:** SHA artık `GH_TOKEN` ile `gh api repos/<repo>/git/ref/heads/main` üzerinden okunur ve argümanlar GitHub'a gitmeden önce doğrulanır; testlerdeki sahte `git` gerçek hatayla (kimlik bilgisi yok) düşer, böylece git'e geri dönüş testte yakalanır (2 yeni mutasyon). **Kapsam düzeltmesi (2026-11-10) [G]:** Önceki sürümde burada `resolve`/`current` komutlarının etkilenmediği yazıyordu; bu yanlıştı. `Resolve Source` adımı da `persist-credentials: false` ile çalışır ve `workflow_run` olaylarında `git ls-remote` ile düştü (`main`, koşular `42607611212` ve `42645437976`; Medium/GitHub veri commit'leri bu yüzden yayınlanmadı). `Recover Release` de 10 Kasım 01:17'de (`42734721526`) aynı hatayla düştü. Üç komut artık ortak `readMainSha()` ile `gh api` kullanır; `pages.yml` içindeki `resolve` ve `current` adımlarına `GH_TOKEN` eklendi. Testler: `R-CI-RECOVER-C1-12` (resolve/current git kullanmaz, güvenilmeyen alanlar önce reddedilir) ve `-13` (workflow adımlarında `GH_TOKEN` var); iki mutasyon (git'e dönüş, `GH_TOKEN` silinmesi) test tarafından yakalandı. Gerçek GitHub'da doğrulama: bu PR merge edilip bir `workflow_run` koşusu yeşil olunca yapılabilir **[?]**.

**Hata durumunda recovery davranışı ve "sessiz" başarısızlık değerlendirmesi:** eylem hatası recovery koşusunu kırmızı yapar (görünür), yeniden denemez ve döngü üretmez **[K]**. Bildirim davranışı (kime e-posta gittiği) `workflow_run` ile başlayan koşular için doğrulanmadı **[?]**. Bu yüzden C3 (haftalık salt okunur kontrol) etkinleştirme koşuludur.

**Kabul kriterleri:** C1-01..10 deterministik; her test <5 sn; hiçbir test ağa çıkmaz (sahte PATH kanıtı); testler birbirinden bağımsız (ayrı geçici dizinler); 30 ardışık yerel tekrarda sıfır başarısızlık; mutasyonlar yakalanıyor; testler gerçek kodu doğrular. **Değişen üretim davranışı:** yalnızca tanımsız eylem yolu ve eylem-hatası kaydı; `PORTFOLIO_RECOVERY_ACT` kapalı kalır, gözlem modu ve karar mantığı (`planRecovery`) değişmedi.

## 9. D-3 etkinleştirme koşulları (sahibin kararı) ve karar/araştırma ayrımı

Sahibin belirlediği koşulların **tamamı** sağlanmadan recovery etkinleştirilmez:

| # | Koşul | Durum |
| --- | --- | --- |
| 1 | D-1 deneyleri başarıyla tamamlandı | Planlandı, uygulanmadı |
| 2 | GITHUB_TOKEN davranışı kanıtlandı (Q1-Q6, "karışık" kanıt sayılmaz) | Kanıtlanmadı |
| 3 | D-2 değerlendirildi ve gerekli kontroller tamamlandı | Değerlendirildi (analiz), uygulanmadı |
| 4 | C1: `act()` argüman testleri hazırlandı ve doğrulandı | Yazıldı; PR CI'ı ve 30 tekrar sonucu PR'da (bkz. OPEN-ITEMS C1) |
| 5 | Recovery hatalarının sessiz kalması değerlendirildi | Kısmen: görünür (kırmızı koşu), bildirim doğrulanmadı, C3 rutini yok |
| 6 | Sonsuz döngü ve mükerrer dispatch riskleri kabul edilebilir | Döngü: sınırlı (analiz); mükerrer: artık risk S4/S5 belgeli, kabul sahibin kararı |

Bunlar sağlansa bile etkinleştirme için ayrıca sahibin açık onayı gerekir. Önceki "Etkinleştirme koşulları" (bölüm 4) bu tabloyla birlikte okunmalıdır.

- **Karar/onay gerektiren:** D-1 uygulama onayı (U1-U5), D-2 uygulama onayı (D-1 sonrası), D-3 (C1 tamamlandı, bkz. bölüm 8).
- **Teknik araştırma gerektiren:** görünürlük gecikmesi L, bildirim davranışı, `actions: write` yeterliliği (hepsi D-1/D-3 gözlemiyle).
