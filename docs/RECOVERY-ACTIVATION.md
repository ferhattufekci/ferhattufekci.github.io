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

**Sonuç:** Kullanıcı token'ıyla yeniden çalıştırmanın `completed` ürettiğine dair güçlü dolaylı kanıt var. GITHUB_TOKEN ile başlatılan rerun/dispatch için davranış **DOĞRULANAMADI**. Sistem iki olasılıkta da güvenli tasarlandı (bölüm 3); belirsizlik güvenlik riski değil, "ikinci deneme sınıflandırılır mı" sorusudur. Belirsizliği recovery'yi açmadan kapatma planı: bölüm 6.

## 3. Döngü, mükerrer çalışma, yarış ve kaynak analizi

Kısaltma: R = tetikleyen başarısız koşu, M = o an `main` ucu.

**Döngü yok (sınır argümanı)** **[K][T]**: her eylem, bir sonraki kararın `none` vereceği duruma gider.

- `rerun` yalnızca `R.run_attempt === 1` ve `R.head_sha === M` iken. Sonuç aynı koşunun 2. denemesidir; tamamlandığında (tetiklenirse) `attempt=2` ile gelir → `none (Already retried once)` (R-CI-RECOVER-02). Tetiklenmezse hiçbir şey olmaz. İki durumda da 2. rerun yok. GitHub'ın koşu başına 50 yeniden çalıştırma sınırı mantık hatasında bile dış üst sınırdır **[B]**.
- `dispatch` yalnızca M için atlanmamış koşu yokken. Dispatch koşusu D'nin `head_sha`'sı M'dir ve `skipped` değildir → sonraki kararlarda "ucu kapsıyor" → `none` (R-CI-RECOVER-06/07/15). D, M'de "superseded" reddi alırsa → `none` (R-CI-RECOVER-08). D süre aşımı yaşarsa D'nin kendi tek rerun'ı olur.
- Zincir derinliği: Fetch → Portfolio CI/CD → Recover Release zaten iki seviye. Resmî sınır üç seviye **[B]**; sınır aşılırsa recovery tetiklenmez, bu güvenli yöndür.

**Kaynak üst sınırı (mantık doğruysa, tek olay):** R `main` ucundaysa 1 kısmi rerun; R eski commit'teyse 1 tam dispatch koşusu D + D için en çok 1 kısmi rerun. En çok **3 pipeline çalıştırması** (R, D, D'nin 2. denemesi). Yeni commit'ler ayrı olaylardır. Her job `timeout-minutes` ile sınırlı; apt kurulum adımı 5 dakikayla kısıtlı.

**Mükerrer çalışma ve yarış:**

- Aynı R için iki recovery koşusu: concurrency grubu koşu başınadır (`portfolio-recovery-<run id>`, `cancel-in-progress: false`) ve eylemden önce son deneme yeniden okunur; fark varsa eylem yapılmaz (R-CI-RECOVER-19) **[T]**.
- **Açık nokta (D-2 konusu):** *farklı* iki başarısız koşu aynı anda "M kapsanmıyor" görürse iki dispatch üretebilir (kontrol-sonra-eylem yarışı). Ayrıntı ve seçenekler: bölüm 7. Gerçek zamanlama yarışı yerel testle birebir üretilemez **[?]**; enjekte edilmiş sahte API ile iki koşunun araya girmesi simüle edilebilir (R-CI-RECOVER-23 önerisi, henüz yok).
- Bir koşu `rerun` çağrıldığında hâlâ çalışıyorsa GitHub'ın bunu reddedip reddetmediği doğrulanmadı **[?]**; reddederse recovery koşusu hata verir, döngü oluşmaz, kurtarma kaybolur.

**Güvenlik** **[K]**: `contents: read` + `actions: write`; varsayılan dal kodu çalışır (PR kodu yok); yalnızca aynı depo ve `head_branch == main`; `RUN_ID`/`RUN_ATTEMPT` betiğe enterpolasyonla değil ortam değişkeniyle geçer; elle dispatch asla eylem yapmaz. `actions: write`'ın `gh run rerun`/`gh workflow run` için yeterliliği ilk gerçek eylemde gözlenecek **[?]**. Depo düzeyi "Workflow permissions" ayarı bu oturumda proxy yüzünden okunamadı **[?]**.

## 4. Etkinleştirmeden önce eksik kalan kontroller ve koşullar

Eksikler (DevOps/ISTQB incelemesi):

| # | Eksik | Neden önemli | Kapatma yolu |
| --- | --- | --- | --- |
| C1 | `commands.mjs` içindeki `act()` argümanları (`gh run rerun <id> --failed`, `gh workflow run pages.yml --ref main --repo …`) hiçbir testte doğrulanmıyor; R-CI-RECOVER-14 enjekte edilmiş `act` kullanır | Yanlış argüman ilk gerçek olayda ortaya çıkar | Sahte `gh` ile argv sözleşme testi (üretim kodu değişmez, yalnızca test) |
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

## 6. D-1: GITHUB_TOKEN ile başlatılan rerun/dispatch davranışının probe deneyi (PLAN, uygulanmadı)

**Amaç:** recovery'yi açmadan şu soruları kesinleştirmek: (Q1) GITHUB_TOKEN ile `gh run rerun` ile başlatılan 2. denemenin tamamlanması `workflow_run` üretir mi ve payload'ta `run_attempt` kaç? (Q2) GITHUB_TOKEN ile `gh workflow run` ile başlatılan koşunun tamamlanması `workflow_run` üretir mi ve zincir sayacına nasıl girer?

**Tasarım (iki seçenek):**

- **P-1 (önerilen): geçici ayrı depo.** Bu davranış depoya özgü değil platform özelliğidir; boş bir test deposunda aynı iki workflow ile ölçülür. Portfolio deposunda hiçbir şey değişmez, `main`'e push yok, deploy tetiklenmez. Gereksinim: sahibin boş bir depo oluşturması veya oluşturmamı onaylaması (token'ımın depo oluşturma yetkisi doğrulanmadı **[?]**). Fark riski: depo/organizasyon düzeyindeki Actions ayarları farklı olabilir; sonuç tarihli ve ayar notuyla kaydedilir.
- **P-2: bu depoda iki geçici workflow.** `workflow_run` yalnızca varsayılan daldaki dosyayla çalıştığı için dosyaların `main`'e girmesi gerekir. Maliyet: ekleme ve silme için iki `main` birleştirmesi = iki standart Portfolio CI/CD push koşusu ve iki yayın (site dosyaları aynı, altbilgideki build numarası değişir). Yalnızca P-1 mümkün değilse.

**Dosyalar (hiçbiri bu aşamada oluşturulmadı):**

- `probe-a.yml`, `name: Probe A`: yalnızca `on: workflow_dispatch` (girdi `generation`, varsayılan `1`), `permissions: {}`, tek job (`timeout-minutes: 2`) ve `run-name: Probe A gen ${{ inputs.generation || 1 }}`. Başarılı biter. Checkout, secret, artifact, Pages izni yok.
- `probe-b.yml`, `name: Probe B`: yalnızca `on: workflow_run: workflows: ["Probe A"], types: [completed]`, `permissions: actions: write`, `timeout-minutes: 2`, `concurrency` grubu. Her çalışmada `workflow_run.id`, `.run_attempt`, `.event`, `.conclusion`, `.display_title`, `github.actor`, `github.triggering_actor`, `github.event.action` değerlerini step summary'ye yazar. **Yalnızca** `workflow_run.run_attempt == 1` **ve** `display_title` "gen 1" ise iki eylem yapar: `gh run rerun <id>` (Q1) ve `gh workflow run probe-a.yml -f generation=2` (Q2). Diğer durumlarda yalnızca günlük yazar.

**İzolasyon kanıtı (üretim ve recovery etkilenmez):**

- Probe'lar yalnızca elle `workflow_dispatch` ile başlar; `push`, `pull_request`, `schedule` tetikleyicisi yok, depo etkinliği onları başlatamaz.
- Probe B `workflows: ["Probe A"]` ile süzer; `recover-release.yml` yalnızca `["Portfolio CI/CD"]` ile süzer, `pages.yml`'e dokunulmaz. Yani Probe koşuları recovery'yi veya production pipeline'ı tetikleyemez.
- Repo değişkeni, secret, Pages/deployment izni kullanılmaz; `PORTFOLIO_RECOVERY_ACT` okunmaz ve yazılmaz.
- Sert tavan: B yalnızca `attempt == 1` ve `gen 1` iken eylem yapar → en çok 6 koşu (A gen1, B, A gen1 attempt 2, A gen2, ve varsa ikisi için B koşuları). Zaman aşımı 2 dakika. Acil durdurma: `gh workflow disable`.

**Deney matrisi (her biri N=3 kez, zaman damgalarıyla kaydedilir):**

| Deney | Eylem | Gözlem | Doğrulanan |
| --- | --- | --- | --- |
| E0 kontrol | Elle `gh workflow run probe-a.yml` (kullanıcı token'ı) | B tam 1 kez çalışır | Harness doğru; `completed` temel davranışı |
| E1 | B, GITHUB_TOKEN ile A'yı yeniden çalıştırır | A 2. deneme bitince B tekrar çalışıyor mu; `run_attempt` kaç | Q1 |
| E2 | B, GITHUB_TOKEN ile A gen 2'yi dispatch eder | A gen 2 oluşuyor mu (belge: evet); bitince B çalışıyor mu | Q2 ve zincir sayacı |
| E3 kontrol | Kullanıcı `gh run rerun` ile A'yı yeniden çalıştırır | B `run_attempt=2` ile çalışıyor mu | Kullanıcı rerun kontrolü (mevcut dolaylı gözlemin doğrudan karşılığı) |

**Sonuç değerlendirme:**

| Sonuç | Anlamı | Karar |
| --- | --- | --- |
| E1 evet, `run_attempt=2` | Recovery 2. denemede `none (Already retried once)` yolunu üretimde de görür | AC-3 önceden karşılanır |
| E1 hayır | 2. deneme hiç sınıflandırılmaz; döngü yok, kurtarma bir kez | Belgelenir, D-3'te kabul edilen davranış |
| E2 evet | Dispatch edilen koşu da sınıflandırılır; zincir sayacı not edilir | AC güncellenir |
| E2 hayır | Dispatch edilen koşu süre aşımına uğrarsa otomatik 2. rerun olmaz | Belgelenir, elle müdahale |
| Herhangi bir beklenmeyen çoğalma (B beklenenden fazla, 2'den fazla deneme) | Tasarım varsayımı yanlış | Dosyalar silinir, recovery kapalı kalır, kök neden analizi |

Tekrarlanabilirlik: N=3 gecikme/tek seferlik etkileri eler; davranış bir platform özelliği olduğundan sonuç tarihle kaydedilir ve bir sonraki recovery etkinleştirmeden önce özet olarak yeniden kontrol edilir.

**Gerekli izinler:** P-1'de boş depoda workflow dosyası yazma yetkisi; P-2'de `.github/workflows` yazma ve `main` birleştirme onayı. Probe B'nin `actions: write` izni yalnızca probe deposunda/koşusunda geçerlidir. **Temizlik:** P-1'de depoyu silmek (sahibin kararı); P-2'de iki dosyayı silen PR + `gh workflow list` ile doğrulama; isteğe bağlı `gh run delete` ile probe koşu geçmişi.

**Onay gerekir:** yeni workflow dosyası oluşturulmadı ve oluşturulmayacak.

## 7. D-2: dispatch öncesi kapsam yeniden okuma ve yarış analizi (ANALİZ, uygulanmadı)

**Yarış:** `planRecovery` kapsam listesini t0'da okur, `gh workflow run` t1'de çalışır, yeni koşu API listesinde t2'de görünür (saniyeler). İki recovery koşusu aynı anda M'yi "kapsanmıyor" görürse ikisi dispatch eder. Gerçekleşme koşulu: ≥2 başarısız koşunun saniyeler içinde tamamlanması **ve** M için hiç koşunun olmaması. Normalde M'nin kendi push koşusu vardır (kapsanır), dolayısıyla nadirdir; ancak bekleyen koşuların art arda değiştirilmesi (concurrency) bu pencereyi gerçekçi kılar.

**Etki:** Aynı SHA için iki koşu; `portfolio-production` grubu bunları sıraya koyar (biri bekler); ikincisi aynı artifact'ı yayınlar, "Reject superseded release" adımı yalnızca M ilerlediyse reddeder. Maliyet 1 ek pipeline, güvenlik/bütünlük etkisi yok **[K]**; etkisi gerçek üretimde gözlenmedi **[?]**.

| Seçenek | Ne yapar | Artı | Eksi |
| --- | --- | --- | --- |
| H1: dispatch'ten hemen önce `tipRuns`'ı yeniden oku | Pencereyi t1-t0'dan milisaniyelere çeker | Küçük kod + test, davranış değiştirmez | Kontrol-sonra-eylem; yarışı tamamen kapatmaz |
| H2: dispatch işlemini job düzeyinde ortak bir concurrency grubuna al (`cancel-in-progress: false`) + dispatch sonrası koşunun listede görünmesini bekle | Dispatch kararlarını seri hale getirir | Yarışı pratikte kapatır | Gruptaki bekleyen koşu yenisiyle değiştirilebilir (güvenli ama kurtarmayı kaybeder); `rerun` yolunu da serileştirir; daha karmaşık |
| H3: kabul et (artık risk) | Hiçbir şey yapma | Basit | 1 ek pipeline ihtimali sürer |

**Öneri:** H1 + H3 (artık riski belgeli kabul). H2 yalnızca gerçek mükerrer dispatch gözlenirse. Test planı: enjekte edilmiş sahte API ile (a) yeniden okuma kapsamı görürse dispatch yok, (b) iki eşzamanlı karar kuru koşuda en çok bir dispatch (H1 ile pencere içi araya girme simülasyonu), (c) mevcut R-CI-RECOVER-01..22 değişmeden geçer. **Sıra:** D-1 sonuçlanmadan D-2 uygulanmaz.

## 8. Karar ve araştırma ayrımı

- **Karar/onay bekleyen:** D-1 tasarım seçimi (P-1 / P-2) ve yürütme onayı; D-2 seçeneği; D-3 etkinleştirme (D-1, D-2, C1 sonrası).
- **Teknik araştırma gerektiren (karar gerektirmeyen):** C1 argv sözleşme testi (yalnızca test eklemek), C3 izleme rutini, dispatch yarışı için sahte API simülasyon testi taslağı.
