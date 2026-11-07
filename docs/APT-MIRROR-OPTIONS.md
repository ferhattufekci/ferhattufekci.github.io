# Chromium/OS bağımlılığı kurulumu: kalıcı çözüm seçenekleri

Durum: **değerlendirme; hiçbir pipeline değişikliği yapılmadı.** Mevcut önlem korunur: apt boşta-kalma sınırı (20 sn, 3 deneme), kurulum adımında 5 dakikalık `timeout-minutes` ve recovery sınıflandırması (observe-only). Bkz. [CI-CD.md](CI-CD.md) "Browser installation stalls".

Tarih: 2026-11-07.

## Sorun

`npx playwright install --with-deps` adımı Ubuntu paket aynasından indirir ve ayna yavaşladığında (boşta takılma veya düşük aktarım hızı) job'ları 50 dakikalık sınıra kadar tutmuştur. Üç kurulum noktası vardır: `pages.yml` (Verify Production, Chromium) ile `test-agent-readiness.yml` (Chromium ve Firefox/WebKit). Önceki ölçüm: sağlıklı aynada yeniden çalıştırma 550 sn yerine 19 sn sürdü. Mevcut önlem "takılmayı erken ve açıkça başarısız kıl" çözümüdür; sorunu ortadan kaldırmaz, yalnızca süresini sınırlar ve recovery ile uyumlu hale getirir. Düşük aktarım hızı biçimi 20 sn boşta sınırına takılmaz; onu 5 dakikalık adım sınırı yakalar.

## Seçenekler

| | Seçenek | Ne çözer | Maliyet / risk | Değerlendirme |
| --- | --- | --- | --- | --- |
| O0 | Mevcut: boşta sınırı + 5 dk adım sınırı + recovery | Takılma süresini sınırlar | Yeniden deneme hâlâ aynı aynaya gidebilir | Korunur |
| O1 | Resmî Playwright container image'ı (job `container:`) | apt'yi tamamen kaldırır: OS bağımlılıkları ve tarayıcılar imajda | İmaj çekme süresi ve kaynağı (MCR, ~GB boyutu) kendi başına yavaşlayabilir; imaj etiketi `@playwright/test` sürümüyle (şu an 1.64.1) birebir eşleşmeli, aksi hâlde tarayıcı bulunamaz; Dependabot yalnızca npm'i yükseltir, etiket elle/teste bağlanmalı; container içinde Node sürümü, çalışma dizini ve `actions/*` davranışı doğrulanmalı; Firefox/WebKit işi de aynı imajı kullanır | En güçlü aday; pipeline'a dokunur, onay ve deneme gerekir |
| O2 | apt arşiv önbelleği (`actions/cache` ile `.deb` dosyaları) | İndirmeyi önbellekten karşılar | `apt-get update` dizin indirmesi hâlâ aynaya gider; önbellek ilk kaçırmada aynı sorunu yaşar; kök sahipli dizinler ve anahtar tasarımı kırılgan; hazır üçüncü taraf action'lar yeni bağımlılık olur (kural: yeni bağımlılık yok) | Kısmi fayda, kırılgan; önerilmez |
| O3 | Önceden hazırlanmış kendi imajımız (GHCR) | Sürüm ve bağımlılıklar tam kontrolümüzde, GitHub ağı içinde | Ayrı imaj yapım workflow'u, güvenlik yama sorumluluğu, `packages: write` izni, ek tedarik zinciri yüzeyi | Bu proje ölçeği için fazla; O1 sürüm uyumu sorun olursa yeniden düşünülür |
| O4 | İkinci ayna / bozuk aynayı devre dışı bırakma (`/etc/apt/apt-mirrors.txt`) | Tek ayna sorununu aşar | Dosya runner imajının belgelenmemiş iç ayrıntısı; hangi aynanın bozulduğu ölçülmedi; sudo ile sistem dosyası düzenlemek | Kanıt olmadan önerilmez |

Doğrulanamayanlar (DOĞRULANAMADI): hangi aynanın yavaşladığı; O1'de MCR çekme süresinin apt'den daha kararlı olduğu; O1'de imajın Node 22 ve mevcut `actions` sürümleriyle sorunsuz çalıştığı. Bunlar yalnızca denemeyle ölçülür.

## Öneri

1. **Şimdi:** O0'ı koru. Sıklığı ölçmeye başla (salt okunur): adım zaman aşımı notu ("has timed out after 5 minutes") taşıyan job'ların sayısı ve toplam koşuya oranı.
2. **Eşik:** [CI-CD.md](CI-CD.md)'ye göre 130 tamamlanan kurulum adımının 128'i 108 sn içinde bitti (medyan 14 sn); yavaş vakalar az ama her biri 50 dakikaya mal oldu. Son 20 `main`/PR koşusunda ≥2 adım zaman aşımı görülürse O1 denemesi anlamlıdır (eşik bir öneridir, ölçümle yeniden değerlendirilir); daha seyrekse maliyet-fayda zayıftır.
3. **O1 denemesi (onayla):** ayrı bir dalda yalnızca Verify Production ya da bir tarayıcı job'ı için imajı kullan, kırılganlık için sürüm eşleşmesini test eden bir kontrol ekle (imaj etiketi == `@playwright/test` sürümü), ≥30 ardışık koşuda süre/hata oranını O0 ile karşılaştır, kanıt yeterli olmadan `main`'e alma. O0 geri dönüş yolu olarak kalır.

## Karar bekleyen

- **D-4:** O1'in dalda denenmesine onay (pipeline değişikliği; `main`'e alma ayrıca onaylanır).
