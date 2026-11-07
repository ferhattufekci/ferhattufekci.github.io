# Chromium/OS bağımlılığı kurulumu: kalıcı çözüm seçenekleri

Durum: **değerlendirme; hiçbir pipeline, container veya workflow değişikliği yapılmadı.** Mevcut önlem korunur: apt boşta-kalma sınırı (20 sn, 3 deneme), kurulum adımında 5 dakikalık `timeout-minutes` ve recovery sınıflandırması (observe-only). Bkz. [CI-CD.md](CI-CD.md) "Browser installation stalls". Öncelik, bağımlılık ve kabul kriterleri: [OPEN-ITEMS.md](OPEN-ITEMS.md).

Tarih: 2026-11-07. Kanıt etiketleri: **[B]** resmî belge, **[G]** bu repoda gözlem, **[K]** kod incelemesi, **[?]** DOĞRULANAMADI.

## 1. Sorun ve 5 dakikalık sınırın yeri

`npx playwright install --with-deps` her çalışmada Ubuntu paket aynasından indirir. Üç kurulum noktası var **[K]**: `pages.yml` (Verify Production, Chromium), `test-agent-readiness.yml` (Chromium job'ları ve Firefox+WebKit job'u). CI-CD.md'ye göre 130 tamamlanan adımın medyanı 14 sn, 128'i 108 sn içinde; yavaş vakalar az ama her biri 50 dakikaya mal oldu **[G]**. Sağlıklı aynada yeniden çalıştırma 550 sn yerine 19 sn sürdü **[G]**.

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

## 5. Deneme planı (pipeline değişikliği; onay gerekir, uygulanmadı)

- **Ölçüm önceliği:** önce mevcut verinin çıkarılması (salt okunur): son N koşuda kurulum adımı süreleri ve zaman aşımı sayısı.
- **Deneme:** ayrı bir dalda, `pull_request` koşusunda, yalnızca bir tarayıcı job'ı için S5 imajı kullanılır; mevcut apt'li yol korunur. Kıyas: S5 job süresi, imaj çekme süresi (ayrı satırda), hata oranı; ≥30 ardışık koşu (flaky/ağ değişkenliği için) O0 ile karşılaştırılır.
- **Kabul kriterleri:** (1) ≥30 koşuda S5 yolunda ağ kaynaklı hata 0; (2) en yavaş S5 adımı en yavaş sağlıklı apt adımından (108 sn) yavaş değil veya fark gerekçeli kabul edilmiş; (3) imaj etiketi == `@playwright/test` sürümü olduğunu doğrulayan test; (4) tüm mevcut testler ve assertion'lar değişmeden yeşil; (5) Node/`actions` uyumu belgelenmiş.
- **Geri alma:** deneme dalı silinir; `main` değişmez. `main`'e alma ayrı onay.
- **Başarısızlık kriteri:** S5 yolunda tek bir ağ kaynaklı yavaşlama/hata ≥ mevcut oran → S5 değer üretmiyor, ek önlem (S4) veya O0'da kalınır.

## 6. Doğrulama düzeyi

CI'da deneme yeşil olsa bile bu, tutarlılığın kanıtı değildir; tutarlılık ancak ≥30 koşuluk dağılımla gösterilir. Production doğrulaması (`verify-production`) bağımsız bir kapıdır ve S5 denemesine alınacaksa ayrıca ele alınır.

## 7. Karar bekleyen

- **D-4:** S5 denemesinin dalda yürütülmesine onay (pipeline mimarisine dokunur; `main`'e alma ayrıca onaylanır).
