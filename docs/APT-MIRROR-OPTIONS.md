# Chromium/OS bağımlılığı kurulumu: kalıcı çözüm seçenekleri

Durum (güncelleme 2026-11-11): **S5, sahibin kararıyla `browser-tests` ve `keyboard-tests` job'larına uygulandı** (imaj `v1.65.0-noble`, digest ile sabit; `R-CI-PWC-01/02`). Gerekçe bölüm 5'teki ölçüm değil, 2026-11-11 DNS kesintisidir (OPEN-ITEMS D-4). `verify-production` 2026-11-12'de aynı imaja taşındı (ilk gerçek koşusu, dispatch `43149622361`, geçti). Aşağıdaki metin 2026-11-07 değerlendirmesidir. Önceki durum: **değerlendirme; hiçbir pipeline, container veya workflow değişikliği yapılmadı.** Mevcut önlem korunur: apt boşta-kalma sınırı (betikte 20 sn/3 deneme yazılı, gözlenen etkin değer 15 sn/1 deneme; bölüm 1), kurulum adımında 5 dakikalık `timeout-minutes` ve recovery sınıflandırması (observe-only). Bkz. [CI-CD.md](CI-CD.md) "Browser installation stalls". Öncelik, bağımlılık ve kabul kriterleri: [OPEN-ITEMS.md](OPEN-ITEMS.md).

Tarih: 2026-11-07. Kanıt etiketleri: **[B]** resmî belge, **[G]** bu repoda gözlem, **[K]** kod incelemesi, **[?]** DOĞRULANAMADI.

## 1. Sorun, gerçek veri ve 5 dakikalık sınırın yeri

`npx playwright install --with-deps` her çalışmada Ubuntu paket aynasından indirir. Üç kurulum noktası var **[K]**: `pages.yml` (Verify Production, Chromium), `test-agent-readiness.yml` (Chromium job'ları ve Firefox+WebKit job'u).

**Gerçek CI verisi (bu oturumda API'den salt okunur toplandı, 2026-11-07):** son 169 `pages.yml` koşusunun 275 kurulum adımı **[G]**:

| Ölçü | Değer |
| --- | --- |
| Medyan / p90 / p95 | 14 sn / 24 sn / 30 sn |
| p99 / maksimum | 541 sn / 645 sn |
| Yavaş (≥ 258 sn) adım | 9 / 275 (%3,3) |
| Sonuç | 271 başarılı, 2 `failure`, 2 `cancelled` |

Yavaş vakalar **zamanda kümeli**: 23 Ekim, 27 Ekim (iki ayrı saat), 5 Kasım ve 6 Kasım (05:36 ve 10:19-10:52 UTC arasında üç koşu); yani bağımsız örnekler değil, kısa "kötü pencereler". Bu, ölçüm tasarımını belirler (bölüm 5).

**Gecikme noktası [G]:** yavaş ve sağlıklı günlüklerin karşılaştırması (yavaş: koşu `42206021615`, 6 Kasım; sağlıklı: koşu `42385395476`, 7 Kasım):

- Tek paket kaynağı `http://azure.archive.ubuntu.com` (31 ve 29 istek); `packages.microsoft.com` yalnızca dizin güncellemesi için (3 istek); kaynak listesi `file:/etc/apt/apt-mirrors.txt` üzerinden.
- Yavaşlık **paket indirme aşamasındadır**, dizin güncellemesinde değil: yavaş koşuda `apt-get update` 12,9 MB'ı 1 sn'de aldı, sonraki indirme **18,5 MB'ı 10 dk 31 sn'de (29,2 kB/s)** aldı; sağlıklı koşuda 21,1 MB 1 sn'de (18,7 MB/s). Yaklaşık 650 kat fark; veri akmaya devam ettiği için boşta-kalma zaman aşımı tetiklenmez ("aktarım hızı çöküşü" biçimi).
- Runner: `ubuntu-24.04` imajı `20261101.360.1`, bölge `westus3`, bulut Azure **[G]**. Aynanın da Azure'da olması, MCR (Playwright imajı) ile ortak bir ağ yolu paylaşıp paylaşmadığı sorusunu açık bırakır **[?]**.

**Belgelenen sınırın gerçek değeri farklı (düzeltme):** `bound-apt-network.sh` `Timeout 20 / Retries 3` yazar **[K]**, ama incelediğim 4 koşunun 8 jobunun hepsinde (`42344279527`, `42363342892`, `42373406895`, `42385395476`) aynı adımın `apt-config dump` çıktısı **`Timeout "15"` ve `Retries "1"`** gösteriyor **[G]**. Yani yazdığımız değerler etkin değil. **Kaynak bulundu (PR #40 tanı çıktısı, koşu 42489390320) [G]:** runner'daki `/etc/apt/apt.conf.d/zz-retries` dosyası `Acquire::Retries "1"`, `Acquire::http::Timeout "15"` ve `Acquire::https::Timeout "15"` yazıyor; apt dosyaları artan alfasayısal sırada okur ve sonraki kazanır **[B]** (apt.conf(5)), `zz-` ise `99-ci-network`'ten sonra gelir. Aynı çıktıda `80-retries` (Retries 1, Timeout 600) de var. `zz-retries` deponun hiçbir yerinde yok [K]; runner imajından mı, runner hazırlığından mı geldiği doğrulanmadı **[?]**.

**Sonuç:** betiğin 20 sn/3 değeri `99-ci-network` adı yüzünden etkin değil (ölü yapılandırma); gerçek sınır 15 sn boşta + 1 yeniden deneme. `R-CI-APT-01/02` yalnızca betiğin içeriğini doğruluyor, etkin değeri değil. Bu sınır "boşta kalma" tipidir ve yalnızca **şekil 1**'i (mirror durur) kapsar; **şekil 2** (veri yavaş ama akıyor) için CI-CD.md'deki önceki koşu günlükleri mirror'ın "hiç boşta kalmadığını" kaydeder (koşu `42169381575`: 7,5 MB paket ~3 dk) **[G, bu oturumda yeniden doğrulanmadı]**; 6 Kasım yavaş vakası (`42206021615`, 29 kB/s) bu şekle uyar ama betikten önceye ait olduğundan günlüğünde `apt-config dump` yoktur, o koşuda etkin sınır bilinmiyor **[?]**. Dolayısıyla sınırı 20/3'e çekmek şekil 2'yi **çözmez**; şekil 2'yi gerçekte `timeout-minutes: 5` + recovery (CI-CD.md) bağlıyor. 15 s/1 deneme ile 20 s/3 deneme arasında şekil 1 üzerindeki fark ölçülmedi **[?]**.

**Karar (ayrı, davranış değiştiren iş):** betik ya gerçekten etkin olmalı (ör. `zz-ci-network` adı) ya da yorum/belge ölü yapılandırmayı söylemeli. Hangisinin seçileceği D-4 eşli ölçümünün sonucuna bağlıdır; bu PR yalnızca tanı çıktısı ekler ve belgeyi gerçeğe uydurur.

**5 dakikalık sınır kök nedeni çözmez.** Kök neden, job'ın çalışma anında dış bir paket aynasına bağımlı olmasıdır. Sınır yalnızca (a) zararı 50 dakikadan 5 dakikaya indirir, (b) başarısızlığı net bir not ve `failure` ile görünür kılar, (c) recovery'nin altyapı nedenini tanımasını sağlar. Ayna yavaşken yeniden deneme aynı aynaya gider; kök nedeni ancak "çalışma anında apt kullanmamak" veya "ağı güvenilir bir kaynağa taşımak" azaltır.

## 2. Seçenekler (kullanıcının beş seçeneği)

- **S1 Mevcut apt kullanımının iyileştirilmesi:** daha kısa/sıkı apt sınırları, `--no-install-recommends`, ayna sırası/ikinci ayna (`/etc/apt/apt-mirrors.txt` düzenleme), kurulumu tek adımda toplama.
- **S2 Apt önbelleği:** `/var/cache/apt/archives` veya indirilen `.deb` kümesini `actions/cache` ile saklama.
- **S3 Bağımlılıkların önceden hazırlanması:** `.deb` kümesini bir sürümlü artifact/release olarak önceden üretip job'da `dpkg -i` ile kurma.
- **S4 Özel container image:** kendi imajımızı (ör. GHCR) üretip job container'ı olarak kullanma.
- **S5 Playwright bağımlılıklarını container içine alma:** resmî `mcr.microsoft.com/playwright:v<sürüm>-noble` imajını job container'ı olarak kullanma.

Resmî belge bulguları **[B]** ([Docker](https://playwright.dev/docs/docker), [CI](https://playwright.dev/docs/ci)): imaj etiketi `mcr.microsoft.com/playwright:v1.64.1-noble` biçimindedir; imaj tarayıcıları içerir, Playwright paketini içermez; imaj ve proje Playwright sürümü uyuşmazsa tarayıcı çalıştırılabilir dosyası bulunamaz (sürümü sabitlemek önerilir); `--init` ve Chromium için `--ipc=host` önerilir; GitHub Actions örneği `container: image: …` ve `options: --user 1001` kullanır; imajın içindeki Node sürümü belgede yazmıyor; **tarayıcı ikili dosyalarını önbelleğe almak önerilmez** (geri yükleme süresi indirmeyle kıyaslanabilir) ve **"operating system dependencies need to be installed, which are not cacheable"**. Repo `@playwright/test` sürümü 1.64.1 **[K]**, yani etiket bugün `v1.64.1-noble` olurdu.

## 3. Karşılaştırma (6 ölçüt)

Derecelendirme bu belgenin muhakemesidir; ölçülmemiş her hücre **[?]** ile işaretli.

| Ölçüt | S1 İyileştirilmiş apt | S2 apt cache | S3 Hazır .deb | S4 Özel imaj | S5 Playwright imajı |
| --- | --- | --- | --- | --- | --- |
| Pipeline süresi | Bugünkü gibi (medyan 14 sn) | Resmî belgeye göre OS bağımlılıkları önbelleklenemez; kazanç beklenmez **[B]** | Kurulum hızlı, ama artifact indirme süresi **[?]** | İmaj çekme süresi ve job başı gecikmesi **[?]** | İmaj çekme süresi **[?]**, apt adımı yok |
| Süre tutarlılığı | Ayna bozuksa değişmez (kök neden duruyor) | İlk kaçırmada aynı sorun; `apt-get update` yine aynaya gider | GitHub ağı içinde olduğundan daha tutarlı olması beklenir **[?]** | GitHub ağı içinde; çekme hızı ölçülmeli **[?]** | MCR'a bağımlı; MCR'ın apt aynasından daha tutarlı olduğu kanıtlı değil **[?]** |
| Ağ bağımlılığı | Ubuntu aynası (çalışma anında) | Ubuntu aynası + cache servisi | GitHub (artifact/release) | GHCR | MCR |
| Bakım maliyeti | Düşük, ama kırılgan iç dosya düzenlemesi (S1 ayna kısmı) | Orta (anahtar, kök sahipli dizin) | Yüksek (sürüm/bağımlılık eşleşmesi, yeniden üretim) | Yüksek (imaj yapım workflow'u, yama döngüsü) | Düşük-orta (etiket = Playwright sürümü) |
| Güvenlik / güncelleme | Runner imajı ile güncel | Eski paket riski, anahtar yönetimi | Bayat paket riski, imza/bütünlük sorumluluğumuzda | Yama sorumluluğu bizde, `packages: write` izni, ek tedarik zinciri yüzeyi | Microsoft yayınlar, sürüm yükseltmeyle gelir; imaj içeriğine güven gerekir |
| GitHub Actions uyumluluğu | Tam | Tam; ama üçüncü taraf cache action'ı yeni bağımlılık olur (kural: yok) | Tam | Container job'ı uyumlu; `actions/*` Node'u imajda gerekir **[?]** | Container job'ı uyumlu **[B]** (belge örneği var); imajdaki Node ve `actions` uyumu **[?]**, çalışma dizini/izin farkları denenmeli |

Ek kısıtlar: S5/S4'te Firefox+WebKit job'u da aynı imajı kullanmalı (imaj tüm tarayıcıları içerir **[B]**); `verify-production` job'ı da kurulum yapıyor **[K]**, yani üç yerde değişiklik gerekir; container job'ında `actions/checkout` ve `actions/cache` davranışı denenmeli **[?]**.

## 4. Öneri

1. **Kısa vadeli (değişiklik yok):** mevcut önlemi koru; slow-step sıklığını salt okunur ölç (adım zaman aşımı notu taşıyan job sayısı / toplam).
2. **En uygun kök çözüm adayı: S5.** Gerekçe: apt'yi tamamen kaldırır, bakım yükü S3/S4'ten çok düşüktür, sürüm eşleşmesi tek satırlık bir etiket ve test ile güvence altına alınır, resmî olarak belgelenmiş ve CI için örnek verilmiştir **[B]**. S2'yi resmî belge zaten caydırıyor, S3/S4 bu proje ölçeği için bakım maliyeti fayda oranı zayıf (S4 yalnızca S5 sürüm uyumu sorun çıkarırsa yeniden değerlendirilir), S1'in ayna düzenlemesi belgelenmemiş iç ayrıntıya dayanır.
3. **Neden henüz uygulanmıyor:** S5'in süreyi ve tutarlılığı gerçekten iyileştirdiği **ölçülmedi**: MCR çekme süresi ve kararlılığı bilinmiyor, MCR'ın da apt aynası gibi ara sıra yavaşlayabileceği dışlanamaz **[?]**. Bu yüzden önce ölçüm.

## 5. D-4: karşılaştırmalı ölçüm planı (planlama; hiçbir pipeline/imaj değişikliği yapılmadı)

Sahibin koşulu: ilk deneme üretim ve `main` dışında, izole bir yerde planlanır; mevcut apt'ye göre **somut avantaj** gösterilmeden mimari değişiklik önerilmez.

**Neden ölçüm tasarımı özel:** yavaşlıklar nadir (%3,3) ve zamanda kümeli (bölüm 1). Ortalama/medyan kıyası anlamsızdır: apt medyanı 14 sn'dir ve bir imaj çekme muhtemelen daha yavaş olacaktır; S5'in değeri **kuyruk davranışındadır**. İstatistik gücü: olasılık p=%3,3 ise 30 bağımsız örnekte hiç yavaş olay görmeme olasılığı 0,967³⁰ ≈ %37'dir; yani "30 koşuda sorun çıkmadı" kuyruk iyileşmesini kanıtlamaz. Olaylar kümeli olduğundan etkin örnek sayısı daha da küçüktür. Bu yüzden önceki "≥30 koşu" kriteri **yetersizdi** ve şu tasarımla değiştirildi.

**Tasarım (ayrı geçici depoda mikro-benchmark; D-1 deposu yeniden kullanılabilir, ayrı workflow ve ayrı onayla):**

- **Eşli kollar, aynı dakikada:** Kol A = `ubuntu-24.04` üzerinde `npx playwright install --with-deps chromium` (bugünkü yol). Kol B = job `container: mcr.microsoft.com/playwright:v1.64.1-noble` (`--init`, `--ipc=host`; belge örneği [B]) ve Chromium'u başlatan en küçük duman testi. İki kol aynı cron tetiklemesinde başlar; böylece bir "kötü pencere" iki kolu birlikte etkiler (eşli karşılaştırma).
- **Süre/örnek:** her 30 dk'da bir çift, ≥14 gün (≥600 çift); amaç birden çok kötü pencere yakalamak. Hiç yavaş apt olayı görülmezse sonuç **"kanıtsız (inconclusive)"**tır, "B daha iyi" değildir.
- **Ölçümler (API `steps[].started_at/completed_at`):** A: kurulum adımı süresi. B: `Initialize containers` (imaj çekme) süresi + duman testi süresi; toplam job süresi; başarısızlık nedeni; runner imaj sürümü; UTC zamanı.
- **Sürüm uyumu kontrolü (her çalışmada):** imajdaki `npx playwright --version` == proje `@playwright/test` sürümü (1.64.1); imaj OS'i `noble` == runner `ubuntu-24.04` ailesi; imaj içindeki Node sürümü kaydedilir (belgede yazmıyor **[?]**); `actions/setup-node`/`actions/checkout`'ın container içinde çalıştığı doğrulanır.
- **Maliyet:** ≈2×48×14 ≈ 1.350 kısa koşu; herkese açık depoda standart runner dakikalarının ücretsiz olduğu belgede yazar ama bu oturumda yeniden doğrulanmadı **[?]**.

**Ölçütler (sahibin onayına sunulan öneri eşikleri):**

| Ölçüt | Nasıl ölçülür | Önerilen kabul eşiği |
| --- | --- | --- |
| Pipeline süresi | B toplam kurulum süresi (çekme + hazırlık) medyan/p95 | B medyanı A medyanını en çok **60 sn** aşabilir (tutarlılık için ödenen bedel; sahip onaylar) |
| Süre tutarlılığı | p99 ve maksimum; A'nın yavaş olduğu çiftlerde B | A'nın ≥120 sn olduğu **her** çiftte B < 120 sn; B maksimumu < 180 sn |
| Ağ bağımlılığı | Başarısızlık nedenleri (MCR çekme zaman aşımı vs apt) | B'de ağ kaynaklı başarısızlık **0**; MCR yavaşlığı varsa A ile ilişkisi kaydedilir |
| Bakım maliyeti | Etiket güncelleme adımı, sürüm uyumu testinin kırılma sıklığı | Dependabot/manuel yükseltmede etiket ve paket sürümü uyuşmazlığını yakalayan test; tahmini ek iş ≤ yılda birkaç PR |
| Güvenlik ve güncelleme | İmaj kaynağı (MCR/Microsoft), imaj yaması sıklığı, sabitleme (etiket mi digest mi) | Etiket **digest ile sabitlenir**; güncelleme PR ile ve CI'dan geçerek |
| GitHub Actions uyumluluğu | Tüm job tipleri (Chromium, Firefox, WebKit, verify-production) container'da çalışıyor mu | Mevcut tüm testler ve assertion'lar **değişmeden** yeşil; `--user`/izin farkları belgeli |

**Sonuç yorumlama (önceden kayıtlı):** (1) *B avantajı kanıtlandı:* eşikler karşılandı **ve** ≥3 bağımsız kötü pencere gözlendi → mimari değişiklik önerisi hazırlanır (onaya sunulur). (2) *Fark yok:* A yavaşlarken B de yavaşladı → S5 değer üretmiyor; S4 veya mevcut yolda kal. (3) *Kanıtsız:* kötü pencere yok → deneme uzatılır, öneri yapılmaz. (4) *B daha kötü:* eşikler karşılanmadı → vazgeç.

**Geri alma / etki:** deneme yalnızca geçici depoda; üretim ve `main` değişmez. Üretime alma ayrı karar ve ayrı onaydır.

## 6. Doğrulama düzeyi

CI'da deneme yeşil olsa bile tutarlılık kanıtı değildir; tutarlılık ancak yukarıdaki eşli dağılımla gösterilir. Production doğrulaması (`verify-production`) bağımsız bir kapıdır ve S5'e geçilirse ayrıca ele alınır.

## 7. Karar bekleyen

- **D-4:** (a) ölçüm planının ve eşik değerlerinin onayı; (b) mikro-benchmark için geçici depo kullanımı (D-1 deposu veya ayrı) ve yürütme onayı; (c) "apt sınırı etkin değil" bulgusu için betik/belge kararı.
