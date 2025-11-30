# D-1: GITHUB_TOKEN rerun/dispatch davranışı için probe deneyi (P-1, ayrı depo) — uygulanabilir son plan

Durum: **PLAN. Hiçbir depo oluşturulmadı, hiçbir workflow dosyası yazılmadı, hiçbir deney çalıştırılmadı.** Uygulama için sahibin ayrıca açık onayı gerekir. Bu depoda (üretim) yeni workflow oluşturulmaz; recovery etkinleştirilmez; gerçek release/deployment başlatılmaz. Bağlam: [RECOVERY-ACTIVATION.md](RECOVERY-ACTIVATION.md) bölüm 2 ve 6, [OPEN-ITEMS.md](OPEN-ITEMS.md).

Tarih: 2026-11-07. Kanıt etiketleri: **[B]** belge, **[G]** gözlem, **[K]** kod, **[?]** DOĞRULANAMADI.

## 1. Kesinleştirilecek sorular

| # | Soru | Neden önemli |
| --- | --- | --- |
| Q1 | GITHUB_TOKEN ile `gh run rerun --failed` ile başlatılan 2. denemenin tamamlanması `workflow_run` `completed` üretir mi? Payload `run_attempt` kaç? | Recovery'nin 2. denemeyi sınıflandırıp `Already retried once` verdiği yolu üretimde görüp görmeyeceğimiz (AC-3) |
| Q2 | GITHUB_TOKEN ile `gh workflow run` ile oluşan koşunun tamamlanması `workflow_run` üretir mi? | Dispatch edilen D koşusunun kendi tek rerun'ını alıp almayacağı |
| Q3 | `actions: write` tek başına `gh run rerun --failed` ve `gh workflow run` için yeterli mi? (C5) | İlk gerçek eylemde reddedilme riski |
| Q4 | `workflow_run completed` olayının hemen ardından yapılan `gh run rerun`, koşu "hâlâ çalışıyor" diye reddediliyor mu? (C6) | Kurtarma kaybı riski |
| Q5 | İlk koşunun tetikleyici olayı (`workflow_dispatch` / `push`) sonucu değiştiriyor mu? | Üretim koşuları çoğunlukla `push` ile başlar [K] |
| Q6 | Gerçek `timeout-minutes` aşımında job `cancelled` ve not metni `exceeded the maximum execution time` mı? | Recovery'nin `rerun` kanıtı bu metne bağlı [K] |

## 2. Ayrı depo için yapılandırma

Sahibin yapması gerekenler (ben depo oluşturmayı denemeyeceğim; token'ımın böyle bir yetkisi olup olmadığı doğrulanmadı **[?]** ve yetkileri zorlamam):

- **U1** GitHub hesabında **boş, herkese açık** bir depo oluştur (önerilen ad `actions-token-probe`, varsayılan dal `main`, README/lisans/şablon yok). Herkese açık: üretim deposuyla aynı görünürlük, böylece Actions davranışı farklılaşmaz. Depoda kişisel içerik, secret ve değişken olmayacak.
- **U2** Üretim deposunda Settings → Actions → General → *Workflow permissions* değerini (varsayılan token izni: yalnızca okuma mı, okuma-yazma mı) ve *Allow GitHub Actions to create and approve pull requests* ayarını **oku** ve bana bildir; probe deposunda aynısını ayarla. (Bu ayar proxy yüzünden bu oturumdan okunamıyor **[?]**.) Farklı ayarlar sonucu değiştirebileceği için sonuç raporuna iki depo ayarı yazılır.
- **U3** Onay verdiğinizde ben `add_repo` aracıyla probe deposunu bu oturuma push erişimiyle eklemeyi isteyeceğim; tool onay istemini siz vereceksiniz. Başarısız olursa deneyi başlatmam, yetki eksikliğini bildiririm.
- **U4** Deneyin başlatılması için ayrı açık onay.
- **U5** Deney bitince (bölüm 8) depoyu silme/arşivleme kararı.

Depoda **kullanılacak her şey:** iki workflow dosyası ve gerekirse tek bir boş commit. Üçüncü taraf action yok (yalnızca `run:` adımları), checkout yok, secret yok, artifact yok, Pages/deployment yok, `schedule` yok.

## 3. İki probe workflow'unun teknik tasarımı (taslak, dosya olarak oluşturulmadı)

`probe-a.yml` (izlenen koşu; üretimdeki Portfolio CI/CD'nin rolü):

```yaml
name: Probe A
run-name: "A ${{ github.event_name == 'workflow_dispatch' && inputs.scenario || (contains(github.event.head_commit.message, '[probe:rerun]') && 'rerun' || 'control') }} gen${{ inputs.generation || 1 }}"
on:
  workflow_dispatch:
    inputs:
      scenario:   # control | rerun | timeout-rerun | dispatch | user-rerun | child
        required: true
        default: control
      generation:
        default: "1"
  push:
    branches: [main]
permissions: {}
jobs:
  probe:
    runs-on: ubuntu-24.04
    timeout-minutes: 1
    env:
      SCENARIO: ${{ github.event_name == 'workflow_dispatch' && inputs.scenario || (contains(github.event.head_commit.message, '[probe:rerun]') && 'rerun' || 'control') }}
    steps:
      - name: Record context
        run: echo "scenario=$SCENARIO attempt=${{ github.run_attempt }} event=${{ github.event_name }} actor=${{ github.actor }} triggering=${{ github.triggering_actor }}" | tee -a "$GITHUB_STEP_SUMMARY"
      - name: Fail on the first attempt
        if: github.run_attempt == 1 && (env.SCENARIO == 'rerun' || env.SCENARIO == 'user-rerun')
        run: exit 1
      - name: Exceed the job deadline on the first attempt
        if: github.run_attempt == 1 && env.SCENARIO == 'timeout-rerun'
        run: sleep 150
```

`probe-b.yml` (gözlemci/eylemci; üretimdeki recover-release.yml'in rolü):

```yaml
name: Probe B
on:
  workflow_run:
    workflows: ["Probe A"]
    types: [completed]
permissions:
  actions: write
jobs:
  observe:
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    env:
      GH_TOKEN: ${{ github.token }}
      REPO: ${{ github.repository }}
      RUN_ID: ${{ github.event.workflow_run.id }}
      ATTEMPT: ${{ github.event.workflow_run.run_attempt }}
      CONCLUSION: ${{ github.event.workflow_run.conclusion }}
      TITLE: ${{ github.event.workflow_run.display_title }}
      A_EVENT: ${{ github.event.workflow_run.event }}
      B_EVENT: ${{ github.event_name }}
      B_ACTOR: ${{ github.actor }}
      B_ATTEMPT: ${{ github.run_attempt }}
    steps:
      - name: Record what Probe B saw
        run: |   # değerler env üzerinden, betik içine enterpolasyon yok
          printf 'B saw: run=%s attempt=%s conclusion=%s title=%s a_event=%s b_event=%s b_actor=%s b_attempt=%s\n' \
            "$RUN_ID" "$ATTEMPT" "$CONCLUSION" "$TITLE" "$A_EVENT" "$B_EVENT" "$B_ACTOR" "$B_ATTEMPT" | tee -a "$GITHUB_STEP_SUMMARY"
      - name: Act once (first attempt of generation 1 only)
        if: github.event.workflow_run.run_attempt == 1 && endsWith(github.event.workflow_run.display_title, 'gen1')
        run: |
          case "$TITLE" in
            "A rerun gen1"|"A timeout-rerun gen1") gh run rerun "$RUN_ID" --failed --repo "$REPO" ;;
            "A dispatch gen1") gh workflow run probe-a.yml -f scenario=child -f generation=2 --repo "$REPO" ;;
            *) echo "no action" ;;
          esac
```

Tasarım notları: `timeout-minutes: 1` ile `sleep 150` gerçek bir süre aşımı üretir (Q6). B yalnızca `run_attempt == 1` ve `gen1` iken eylem yapar: üretimdeki `Already retried once` ve "tek dispatch" sınırının probe karşılığı; çoğalma sert olarak sınırlıdır (bölüm 7). `gh run rerun --failed` kullanılır, çünkü recovery de bunu kullanır **[K]**. B, A'nın `completed` olayında hemen eylem yaptığı için Q4 (hemen yeniden çalıştırma) aynı yolda ölçülür.

## 4. Minimum yetki (GITHUB_TOKEN)

| Workflow/job | İzin | Gerekçe |
| --- | --- | --- |
| Probe A | `permissions: {}` | Hiçbir API çağrısı yok; checkout yok |
| Probe B | yalnızca `actions: write` (`metadata: read` otomatik) | `gh run rerun` ve `gh workflow run` için; `contents`, `pull-requests`, `id-token`, `packages` verilmez |

`actions: write`'ın yeterliliği Q3'tür; 403 alınırsa bu **bir sonuçtur** (üretim recovery'sinin `actions: write` varsayımı yanlış çıkar) ve izin artırılarak denenmez; önce kaydedilir. Repo düzeyi varsayılan token izni U2'de kaydedilir.

## 5. Deney matrisi E0-E5 (her biri N=3 kez, aralarında ≥10 dk)

| Deney | Başlatma | A'nın davranışı | B'nin eylemi | Cevapladığı soru |
| --- | --- | --- | --- | --- |
| E0 kontrol | Elle `workflow_dispatch` (kullanıcı token'ı), `scenario=control` | Başarılı | Yok | Harness; temel `completed` davranışı |
| E1 | `scenario=rerun` | 1. denemede `exit 1`, 2. denemede başarılı | GITHUB_TOKEN ile `gh run rerun --failed` | Q1, Q3, Q4 |
| E1t | `scenario=timeout-rerun` | 1. denemede 1 dk sınırını aşar (`cancelled`), 2. denemede başarılı | Aynı | Q1, Q3, Q4, Q6 (+ annotation metni API'den okunur) |
| E2 | `scenario=dispatch` | Başarılı | GITHUB_TOKEN ile `gh workflow run probe-a.yml -f scenario=child -f generation=2` | Q2, Q3 |
| E3 kontrol | `scenario=user-rerun` | 1. denemede `exit 1` | Yok; **kullanıcı** `gh run rerun --failed` çalıştırır | Kullanıcı rerun'ının B'yi `attempt=2` ile tetiklediği doğrudan görülür (şimdiki dolaylı gözlemin [G] karşılığı) |
| E5 | **`push`** ile: commit iletisi `[probe:rerun]` içeren boş commit | E1 gibi | E1 gibi | Q5 (üretimin ana olayı) |

Her deney öncesi **tahmin** bu belgeye yazılır (post-hoc yorumu önlemek için): E0 B=1 koşu; E3 B `attempt=2` ile çalışır; E2 `child` koşusu oluşur [B]; E1/E1t/E2'nin B tetiklemesi bilinmiyor **[?]** (iki sonuç da öngörülür, bölüm 6).

Çoğalma sınırı: E1/E1t/E5'te en çok A:1 koşu×2 deneme + B:≤3 koşu; E2'de A:2 koşu + B:≤3. Toplam 18 küme × ≤6 koşu ≈ ≤108 koşu, koşu başı ≈20-40 sn.

## 6. Sonuçların gözlemlenmesi ve değerlendirilmesi

**Gözlem (salt okunur, API):**

```sh
P=<sahip>/actions-token-probe
gh api "repos/$P/actions/runs?per_page=100" --paginate --jq '.workflow_runs[] | [.id,.name,.event,.run_number,.run_attempt,.status,.conclusion,.created_at,.run_started_at,.updated_at,.display_title,.triggering_actor.login] | @tsv'
gh api "repos/$P/actions/runs/<A-run-id>/attempts/<n>"          # tek deneme meta verisi
gh api "repos/$P/check-runs/<job-id>/annotations"               # E1t: süre aşımı metni
gh run view <B-run-id> --repo $P --log                          # "B saw: ... attempt=..." satırı
```

Kayıt alanları: deney, tekrar no, A koşu/deneme kimlikleri ve zamanları, B koşu sayısı ve her birinin `ATTEMPT`/`TITLE`/`a_event` değerleri, B'nin `gh` çıkış durumu, annotation metni, runner imaj sürümü (günlükten), UTC zaman. Ham API çıktıları saklanır; sonuç tablosu bu belgeden ayrı bir bölüme (RECOVERY-ACTIVATION "D-1 sonuçları") işlenir.

**Karar tablosu:**

| Gözlem | Çıkarım | Sonraki adım |
| --- | --- | --- |
| E1/E1t: A 2. deneme tamamlanınca B `ATTEMPT=2` ile çalıştı | Q1 evet; recovery 2. denemeyi sınıflandırır → `none (Already retried once)` yolu gerçek | AC-3 karşılandı; recovery'ye ek önlem gerekmez |
| E1/E1t: B tekrar çalışmadı (3/3) | Q1 hayır; 2. deneme sınıflandırılmaz | Belgelenir; "ikinci hata fark edilmez" C3 izleme rutinine bağlanır; döngü riski daha da düşük |
| E1/E1t karışık sonuç (ör. 2/3) | Davranış deterministik değil | Kanıtlanmış sayılmaz; N artırılır, gecikme/zamanlama incelenir; D-3 bu belirsizlikle değerlendirilir |
| E2: `child` oluştu, B onun için çalıştı | Q2 evet | Dispatch edilen koşunun da sınıflandırıldığı not edilir |
| E2: `child` oluştu, B çalışmadı | Q2 hayır | D koşusu süre aşımına uğrarsa otomatik 2. rerun yok; elle müdahale (belgelenir) |
| `gh` 403/422 (Q3/Q4) | İzin veya "çalışıyor" reddi | Kayıt; üretimde recovery eylemi başarısız olurdu → D-3 öncesi çözülmeli |
| E5 ≠ E1 sonucu | Tetikleyici olay sonucu değiştiriyor | Üretim yoluna uygun olan (push) esas alınır |
| B beklenenden fazla çalıştı veya `run_attempt` > 2 | Tasarım varsayımı yanlış | Anında dur (bölüm 7), kök neden analizi |

**Tekrarlanabilirlik:** sabit prosedür (yukarıdaki betik), her kümede aynı komutlar, N=3, UTC zaman damgaları ve runner imaj sürümü kaydı. Davranış bir platform özelliği olduğundan sonuç tarih ve imaj sürümüyle geçerlidir; D-3 etkinleştirmesinden önce özet bir kontrol (E1+E3 bir kez) yinelenir. **Kapsam sınırı:** probe, üretimin üç seviyeli `Fetch → CI/CD → Recover` zincirinin derinliğini birebir üretmez (yalnızca iki workflow). Üretimde en derin recovery iki seviye olduğundan ve sınır "üç seviyeden fazla" olduğundan [B] ek bir derinlik probu planlanmadı; bu bir varsayımdır **[?]** ve D-3'te AC ile izlenir.

## 7. Sert sınırlar ve durdurma ölçütleri

- Tetikleyiciler yalnızca elle `workflow_dispatch` ve işaretli `push`; zamanlanmış çalıştırma yok.
- B yalnızca `run_attempt == 1` ve `gen1` iken eylem yapar; A/B `timeout-minutes` 1/2.
- Üst sınır: bir kümede 6, toplamda 108 koşu. Aşılırsa **dur**: `gh workflow disable probe-a.yml probe-b.yml --repo $P`.
- Beklenmeyen çoğalma (aynı olay için ≥2 B koşusu, `run_attempt` > 2, kontrolsüz zincir) → hemen durdur, kayıt al, kök neden bulunana kadar devam etme.
- Probe, üretim deposu, `PORTFOLIO_RECOVERY_ACT`, üretim secret'ları veya deployment ortamlarıyla etkileşmez; ayrı bir depoda olduğundan üretim `main`'ine push ve yayın tetiklemez.

## 8. Temizlik (deney sonrası)

1. Probe deposundaki workflow'ları devre dışı bırak (`gh workflow disable`).
2. Ham veri ve sonuç tablosu üretim deposuna **belge olarak** (PR #38 dışında yeni PR açmadan, sahibin belirleyeceği kanalla) taşınır; probe deposu silinmeden önce kopya alınır.
3. **Sahibin kararıyla** probe deposunu sil (Settings → Danger Zone) veya arşivle ve özel yap. Silmeyi ben tek taraflı yapmam.
4. Oturumdaki yerel klon dizini silinir; probe deposu için oturuma verilen erişim kullanılmaz.
5. Doğrulama: `gh api repos/$P` 404 (silindiyse) veya `archived=true`; üretim deposunda **hiçbir** değişiklik yok (`git status`, workflow listesi aynı, `PORTFOLIO_RECOVERY_ACT` ayarsız).
6. Oluşan kaynak listesi: yalnızca probe deposu, iki workflow dosyası, koşu geçmişi (depo silinince gider). Dal: yalnızca `main`.

## 9. Kabul kriterleri

- AC-D1-1 Q1-Q6 için her sorunun yanıtı (evet/hayır/karışık/ölçülemedi) kanıtla belgelendi; "karışık" ve "ölçülemedi" doğrulanmış sayılmaz.
- AC-D1-2 Her deney ≥3 tekrar; kayıtlar tam.
- AC-D1-3 Sert sınırlar ihlal edilmedi; toplam koşu ≤108.
- AC-D1-4 Temizlik adımları tamamlandı; üretim deposu ve ayarları değişmedi.
- AC-D1-5 Sonuçlar RECOVERY-ACTIVATION ve OPEN-ITEMS'a işlendi; D-3 koşullarına etkisi yazıldı.

## 10. Karar bekleyenler

- **Onay:** P-1 uygulamasının başlatılması (U1-U5 sahibin işlemleri dahil).
- **Bilgi:** üretim deposunun Workflow permissions ayarı (U2).
