# Açık işler kaydı

Tarih: 2026-11-07. Bu kayıt, [RECOVERY-ACTIVATION.md](RECOVERY-ACTIVATION.md), [APT-MIRROR-OPTIONS.md](APT-MIRROR-OPTIONS.md), [T-4-INLINE-SCRIPTS.md](T-4-INLINE-SCRIPTS.md) ve [CI-CD.md](CI-CD.md) içindeki işleri tek yerde önceliklendirir. **Bir işin belgelenmiş olması uygulandığı anlamına gelmez; CI'ın yeşil olması production'da doğrulandığı anlamına gelmez.**

Durum başlıkları: **Karar/onay bekliyor** (sahip kararı), **Araştırılıyor / kanıt bekliyor** (teknik araştırma veya olay bekleme), **Uygulandı, doğrulama bekliyor**, **Tamamlandı ve doğrulandı**. Öncelik: P1 başka işleri açan / güvenliği ilgilendiren, P2 değerli ama bekleyebilen, P3 planlı sonraki.

## Karar/onay gerektiren işler

| ID | İş | Öncelik | Bağımlılık | Risk | Kabul / tamamlanma | Sonraki adım |
| --- | --- | --- | --- | --- | --- | --- |
| PR-38 | Bu belgelerin `main`'e birleştirilmesi | P1 | Sahip onayı; CI yeşil | Birleştirme standart push koşusu ve altbilgide yeni build numarasıyla yayın başlatır (`docs/` Pages paketine girmez) | Merge sonrası push koşusu yeşil, `test:production` yeşil | Onayı bekle |
| D-1 | GITHUB_TOKEN rerun/dispatch → `workflow_run` probe deneyi (P-1 ayrı depo / P-2 bu depoda iki geçici workflow) | P1 | Sahip kararı (seçenek + yürütme); P-1 için boş depo | P-2: iki ek `main` yayını; yeni workflow dosyası | E0-E3 N=3 sonuçları belgeye işlendi; beklenmeyen çoğalma yok; geçici dosyalar/depo temizlendi | Tasarım seçimi ve onay |
| D-2 | Dispatch öncesi kapsam yeniden okuma (H1) | P2 | D-1 sonucu | Kod değişikliği (recovery kapalıyken davranış değişmez) | Sahte API simülasyon testi; R-CI-RECOVER-01..22 değişmeden yeşil | D-1 sonrası onay |
| D-3 | `PORTFOLIO_RECOVERY_ACT` etkinleştirme | P2 | D-1, D-2, C1, açık onay | Üretimde ilk gerçek eylem | RECOVERY-ACTIVATION bölüm 5 AC-1..5 | **Yalnızca sahibin açık onayıyla; D-1/D-2 tamamlanmadan düşünülmez** |
| D-4 | Playwright imajı (S5) denemesi | P2 | Ölçüm verisi; sahip onayı | Pipeline mimarisine dokunur | ≥30 koşuda ağ kaynaklı hata 0, süre/tutarlılık kriterleri (APT belgesi bölüm 5) | Onay sonrası dalda deneme |
| D-5/D-6 | Inline script externalization (A0, sonra A1-A7) | P3 | A0 önce; sahip onayı | Sıra/`DOMContentLoaded`/global sözleşmesi | Her aşama: allowlist küçüldü, tüm testler değişmeden yeşil, canlı duman testi yeşil, reklam yapılandırması aynı | A0'a onay |
| D-7a | Reklamsız 4 sayfada meta CSP pilotu | P3 | Derleme adımında tema-başlatma hash'inin hesaplanması | Güvenlik politikası değişikliği | `securitypolicyviolation` = 0 yerel başlık testinde; canlı gözlem | Onay |
| D-7b | Ana sayfa CSP hedefi | P3 | AdSense uyumu (varsayılan: CSP'siz) | AdSense reklam sunumu kesintisi | Sahip kararı kaydı | Karar |
| BR-1 | Birleşmiş uzak dalların silinmesi | P3 | Sahip izni | Geri dönülemez, düşük | Silmeden önce birleştirildiği doğrulanır | Yalnızca izinle |

## Teknik araştırma / kanıt bekleyen işler

| ID | İş | Öncelik | Bağımlılık | Risk | Kabul / tamamlanma | Sonraki adım |
| --- | --- | --- | --- | --- | --- | --- |
| C1 | `act()` argv sözleşme testi (sahte `gh`) | P1 | Yok (yalnızca test) | Yok | Test, tam argv'yi doğrular; mutasyon kontrolü | Hazırlanabilir, onay isteğe bağlı (yalnızca test) |
| C3 | Recovery koşusu hatası için izleme rutini | P2 | Yok | Sessiz kurtarma kaybı | Haftalık salt okunur kontrol komutları çalıştırıldı | Rutin tanımı |
| RF | R-FILTER-04 ve R-KEYBOARD-08 kök neden | P1 (olay tetikli) | Bir sonraki CI hatası | Aralıklı hata; **geçmek çözüm değildir** | Kanıtlı kök neden (altyapı / zamanlama yarışı / uygulama), diagnostics+trace+video+log incelemesi; assertion gevşetilmedi, retry ile gizlenmedi | Hata olursa diagnostics'i incele; olmazsa değişiklik yok |
| APT-M | Apt yavaşlık sıklığı ölçümü | P2 | Yok (salt okunur) | Yok | Son N koşuda adım zaman aşımı oranı | Ölçüm |
| T4-A | Aşama başında `index.html`'ye bağlı diğer testlerin satır bağımlılıkları | P3 | D-5/D-6 onayı | Gizli bağımlılık | Her test için bağımlı olduğu işaretçi listesi | Aşama A0'da |
| AD-1 | AdSense gerçek doldurma (fill) gözlemi | P2 | Hesap tarafı, süre | Gelir/politika | Yalnızca salt okunur gözlem notu; **henüz yapılmadı** | Salt okunur izleme |
| AD-2 | Hesap tarafı gizlilik/mesajlar ve onay iletisi kontrolleri | P2 | Hesap erişimi (sahip) | Politika uyumu | Sahip kontrol edip sonucu bildirir; **henüz yapılmadı** | Sahibin hesap kontrolü; ayar değişikliği yapılmaz |
| GKP | GKP/RTM v0.1 taslak kalemleri | P3 | Yok | Belge eskimesi | Taslaktan çıkış kriteri tanımlı | Planlı |

## Uygulandı, doğrulama bekliyor

| ID | İş | Neyin doğrulanması bekleniyor |
| --- | --- | --- |
| REC-OBS | Recovery observe-only (PR #32) | İlk gerçek eylem (D-3) üretimde hiç çalıştırılmadı; yalnızca karar gözlendi (3 gerçek karar) |
| APT-5 | 5 dakikalık adım sınırı ve apt boşta sınırı (PR #36) | Adım zaman aşımı notu gerçek koşuda bir kez görüldü; "aktarım hızı çöküşü" biçiminin her durumda yakalandığı ve rerun'ın sağlıklı aynaya düştüğü tek gözlem (550→19 sn) |
| DIAG | Focus diagnostics (PR #37) | Bir sonraki R-FILTER-04/R-KEYBOARD-08 hatasında çıktının gerçekten yeterli olduğu |

## Tamamlandı ve doğrulandı

- Üretim doğrulaması yeşil: `852ae17` (run 42344279527, deploy + verify-production).
- jQuery 3.6.0 yükseltmesi yayında ve üretim doğrulaması yeşil.
- Bu belgelerin PR'ı (#38) CI'da yeşil; **bu, üretimde doğrulandığı anlamına gelmez** (yalnızca belge).
