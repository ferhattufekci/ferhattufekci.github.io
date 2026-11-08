# Açık işler kaydı (ana takip belgesi)

Güncelleme: 2026-11-08. Bu kayıt [RECOVERY-ACTIVATION.md](RECOVERY-ACTIVATION.md), [D1-PROBE-PLAN.md](D1-PROBE-PLAN.md), [APT-MIRROR-OPTIONS.md](APT-MIRROR-OPTIONS.md), [T-4-INLINE-SCRIPTS.md](T-4-INLINE-SCRIPTS.md) ve [CI-CD.md](CI-CD.md) içindeki işleri tek yerde izler. **Bir işin belgelenmiş olması uygulandığı anlamına gelmez; CI'ın yeşil olması production'da doğrulandığı anlamına gelmez.** Dört durum birbirine karıştırılmaz.

Kanıt düzeyi: **[B]** belge, **[G]** bu repoda gözlem, **[T]** birim/tarayıcı testi, **[K]** kod incelemesi, **[?]** doğrulanamadı. Öncelik: P1 başka işleri açan veya güvenliği ilgilendiren; P2 değerli ama bekleyebilen; P3 planlı sonraki.

Genel kurallar (sahibin kararları): `PORTFOLIO_RECOVERY_ACT` kapalı; production, güvenlik politikası, test assertion'ı, recovery etkinleştirmesi ve canlı hesap/reklam ayarı sahibin onayı olmadan değişmez; birleşmiş uzak dallar izinsiz silinmez; PR #38 dışında yeni PR açılmaz.

## 1. Karar/onay bekliyor

### PR-38 Bu belgelerin `main`'e birleştirilmesi
- **Öncelik:** P1. **Durum:** PR açık; son doğrulanan baş `3250a97` (CI yeşil, `mergeable=clean`); sonraki belge commit'leri bu PR'a eklenir ve CI yeniden doğrulanır.
- **Kanıt:** [G] uzak dal = yerel HEAD; birleştirme simülasyonu çakışmasız ve birleşen ağaç `main`'den yalnızca belge dosyalarıyla ayrılıyor; PR dosyalarının hiçbiri public site envanterinde değil; `pages-package.test.js` `docs/`'un pakete girmediğini doğrular [T]. `main` bu arada yalnızca bot veri commit'leriyle ilerledi.
- **Bağımlılık:** sahibin açık onayı; güncel baş için yeşil CI; uçuşta production koşusu yok.
- **Risk:** merge standart push koşusunu ve yayını başlatır; site dosyaları aynı kalır, altbilgideki build numarası değişir.
- **Kabul:** merge sonrası push koşusu yeşil, `test:production` yeşil, site içeriği/davranışı/güvenlik yapılandırması aynı.
- **Sonraki adım:** onayı bekle. **Karar:** sahip.

### D-1 GITHUB_TOKEN rerun/dispatch → `workflow_run` probe deneyi (P-1 ayrı depo)
- **Öncelik:** P1. **Durum:** plan hazır ([D1-PROBE-PLAN.md](D1-PROBE-PLAN.md)); uygulanmadı.
- **Kanıt:** Q1/Q2/Q3/Q4/Q5/Q6 **[?]**; yalnızca kullanıcı rerun'ı için dolaylı gözlem [G].
- **Bağımlılık:** sahibin boş herkese açık depo oluşturması (U1), Actions ayar bilgisi (U2), oturuma depo eklenmesi (U3), başlatma onayı (U4).
- **Risk:** probe çoğalması (sert sınırlarla ≤108 koşu); ayar farkı nedeniyle sonucun üretime birebir aktarılamaması.
- **Kabul:** AC-D1-1..5 (D1-PROBE-PLAN bölüm 9).
- **Sonraki adım:** onay ve U1-U3. **Karar:** sahip (uygulama onayı; yetki eksikse kullanıcı işlemleri listelendi, yetkiler zorlanmaz).

### D-2 Dispatch öncesi kapsam yeniden okuma (H1)
- **Öncelik:** P2. **Durum:** teknik değerlendirme hazır (RECOVERY-ACTIVATION bölüm 7); uygulanmadı; D-1 doğrulanmadan uygulanmaz.
- **Kanıt:** yarış kod yapısından çıkarıldı [K]; görünürlük gecikmesi L bilinmiyor [?].
- **Bağımlılık:** D-1 sonucu.
- **Risk:** H1 yarışı tamamen kapatmaz (S4/S5); artık risk = aynı SHA için ek pipeline koşusu.
- **Kabul:** T-D2-01..10 yeşil + mutasyon kontrolü, R-CI-RECOVER-01..22 değişmeden yeşil, karar tablosu değişmedi.
- **Sonraki adım:** D-1 sonrası uygulama onayı. **Karar:** sahip (artık risk kabulü dahil).

### D-3 `PORTFOLIO_RECOVERY_ACT` etkinleştirme
- **Öncelik:** P2. **Durum:** kapalı; koşullar tablosu RECOVERY-ACTIVATION bölüm 9'da (6 koşul, hiçbiri tam sağlanmadı).
- **Bağımlılık:** D-1, GITHUB_TOKEN davranışının kanıtı, D-2, C1, sessiz hata değerlendirmesi (C3), döngü/mükerrer risk kabulü.
- **Risk:** üretimde ilk gerçek eylem hiç denenmedi.
- **Kabul:** AC-1..5 (RECOVERY-ACTIVATION bölüm 5).
- **Sonraki adım:** yok (önkoşullar tamamlanana kadar). **Karar:** koşullar sağlansa bile **ayrıca açık onay**.

### D-4 Playwright container imajı ve apt sınırı
- **Öncelik:** P2. **Durum:** ölçüm planı hazır (APT-MIRROR-OPTIONS bölüm 5); uygulanmadı; üretim pipeline'ı değişmedi.
- **Kanıt:** gerçek CI verisi [G] (275 adım: medyan 14 sn, p99 541 sn, yavaş %3,3, kümeli); yavaşlık `azure.archive.ubuntu.com` paket indirmesinde (29 kB/s vs 18,7 MB/s) [G]; imaj belgeleri [B]; S5'in süre/tutarlılık etkisi [?].
- **Bulgu D4-F1:** betikteki apt sınırı (20 sn/3 deneme) etkin değil; 8/8 jobda etkin 15 sn/1 deneme [G]; **kaynak bulundu:** runner'daki `zz-retries` (Retries 1, Timeout 15) `99-ci-network`'ü sıralamada geçiyor [G, PR #40 tanı çıktısı; apt okuma sırası B]; dosyanın imajdan mı runner hazırlığından mı geldiği [?]. Yavaş vaka betikten önceye ait (dump yok): o koşuda etkin sınır bilinmiyor [?]; "idle tipi sınır 29 kB/s'lik akışı kesmez" hipotezdir [?] (apt kılavuzu kesin tanım vermez); doğrulanırsa çözüm sayı değil toplam süre sınırı/kaynak değişimi olur. `R-CI-APT-01/02` etkin değeri doğrulamıyor.
- **Bağımlılık:** sahibin ölçüm planı ve eşik onayı; mikro-benchmark için geçici depo.
- **Risk:** kuyruk iyileşmesi nadir olayları ölçmeyi gerektirir (≥14 gün, eşli kollar); S5 medyanı büyük olasılıkla daha yavaş.
- **Kabul:** APT-MIRROR-OPTIONS bölüm 5 ölçütleri ve önceden kayıtlı sonuç yorumlama; somut avantaj gösterilmeden mimari değişiklik önerilmez.
- **Sonraki adım:** plan ve eşik onayı; D4-F1 için betik/belge kararı. **Karar:** sahip.

### C1-F `act()` bulgularının düzeltilmesi (F-C1-1, F-C1-2)
- **Öncelik:** P2. **Durum:** yalnızca bulgu; kod değişmedi. **Kanıt:** [K].
- **Risk:** bilinmeyen eylem sessizce dispatch'e dönüşebilir; eylem hatasında karar günlüğü kaybolur.
- **Kabul:** açık dallar + bilinmeyende istisna; hata durumunda `performed=failed` günlüğü; C1-01..10 yeşil.
- **Bağımlılık:** C1 testlerinin yazılması. **Karar:** sahip (kod değişikliği).

### D-5/D-6 Inline script externalization (A0 önce)
- **Öncelik:** P3. **Durum:** analiz ve plan hazır ([T-4-INLINE-SCRIPTS.md](T-4-INLINE-SCRIPTS.md) bölüm 1-3); script taşınmadı.
- **Bağımlılık:** A0 koruma testlerinin yazılıp mutasyon kontrolüyle doğrulanması; sahip onayı.
- **Risk:** sıra/`DOMContentLoaded`/global sözleşmesi; `category-filters.test.js` kodu metin dilimliyor.
- **Kabul:** her aşama: allowlist küçüldü, mevcut testler değişmeden yeşil, canlıda duman testi yeşil, reklam yapılandırması bayt düzeyinde aynı.
- **Sonraki adım:** A0 test yazım onayı. **Karar:** sahip.

### A0 T-4 koruma testleri
- **Öncelik:** P2 (D-6'nın önkoşulu). **Durum:** plan ve boşluk analizi hazır (T-4 bölüm 5); test yazılmadı.
- **Kanıt:** boşluklar `grep` ile kanıtlı [G]: `reblog`, `fmtDT/relTime/renderSyncBadge`, `gtag/dataLayer`, olay sırası, script sırası, inline sayısı için test yok.
- **Kabul:** A0-01..09 yeşil, mutasyonları yakalar, ≥30 ardışık yerel koşuda flaky yok, mevcut assertion'lar değişmedi.
- **Sonraki adım:** yazım onayı. **Karar:** sahip (yeni test kodu).

### D-7a Reklamsız dört sayfada meta CSP pilotu
- **Öncelik:** P3. **Durum:** yalnızca öneri; ayrı aşama. **Kanıt:** reklamsız ve tek 533 B inline blok [G]; meta CSP kısıtları [B].
- **Risk:** güvenlik politikası değişikliği; meta ile rapor modu yok.
- **Kabul:** yerel başlık testinde `securitypolicyviolation` = 0; canlı gözlem; geri alma planı.
- **Karar:** sahip.

### D-7b Ana sayfa CSP hedefi
- **Öncelik:** P3. **Durum:** şimdilik zorunlu değil (sahibin kararı); varsayılan: CSP'siz.
- **Kanıt:** AdSense yalnızca nonce tabanlı strict CSP'yi belgeliyor [B]; hash uyumu **doğrulanamadı** [?]; testler AdSense'i taklit ettiği için yerelde kanıtlanamaz [K].
- **Risk:** reklam sunumu kesintisi. **Kabul:** sahip kararı kaydı. **Karar:** sahip.

### BR-1 Birleşmiş uzak dalların silinmesi
- **Öncelik:** P3. **Durum:** silinmedi. **Karar:** yalnızca sahibin ayrı izniyle; silmeden önce birleştirildiği doğrulanır.

## 2. Araştırılıyor / kanıt bekliyor

### RF R-FILTER-04 ve R-KEYBOARD-08 kök neden
- **Öncelik:** P1 (olay tetikli). **Durum:** yeni başarısızlık yok; değişiklik yapılmadı; kök neden kanıtsız.
- **Kanıt:** yerelde 140 tekrar yeniden üretmedi [G]; özgün artifact erişilemiyor; diagnostics yerinde [K].
- **Risk:** aralıklı hata; **geçmek çözüm değildir**; retry ile gizlenmez; assertion gevşetilmez.
- **Kabul:** kanıtlı kök neden (altyapı / zamanlama yarışı / uygulama) — diagnostics, trace, video ve browser logları birlikte.
- **Sonraki adım:** bir sonraki CI hatasında bu kanıtları birlikte incele. **Karar:** yok.

### C1 `act()` argüman testleri
- **Öncelik:** P1 (D-3 önkoşulu). **Durum:** tasarım hazır (RECOVERY-ACTIVATION bölüm 8); test yazılmadı.
- **Kabul:** C1-01..10; sahte `PATH` ile gerçek GitHub çağrısı yok; her test <5 sn; 30 tekrarda flaky yok; mutasyonlar yakalanıyor.
- **Karar:** test yazım onayı (sahip).

### C3 Recovery hatalarının sessiz kalması
- **Öncelik:** P2. **Durum:** recovery hatası koşuyu kırmızı yapar [K]; bildirim davranışı doğrulanmadı [?]; izleme rutini yok.
- **Kabul:** haftalık salt okunur kontrol komutları tanımlı ve çalıştırıldı (RECOVERY-ACTIVATION bölüm 5). **Karar:** rutin/bildirim sahibin kararı.

### AD-1 AdSense gerçek doldurma (fill)
- **Öncelik:** P2. **Durum:** **yapılmadı**; yalnızca salt okunur gözlem. **Kanıt:** yok [?].
- **Risk:** gelir/politika; **hesap ayarı, reklam yapılandırması değiştirilmez; kendi reklamlarına tıklanmaz.**
- **Kabul:** gözlem notu (sahip hesap verisiyle). **Karar:** hesap erişimi sahibe aittir.

### AD-2 Hesap tarafı gizlilik/mesajlar ve onay iletisi kontrolleri
- **Öncelik:** P2. **Durum:** **yapılmadı**; hesap tarafında sahibin kontrolünü bekler. **Kanıt:** yok [?].
- **Kabul:** sahip kontrol edip sonucu bildirir; hiçbir ayar/gizlilik politikası değiştirilmez. **Karar:** sahip.

### GKP GKP/RTM v0.1 taslak kalemleri (T-6)
- **Öncelik:** P3. **Durum:** taslak. **Kabul:** taslaktan çıkış kriteri tanımlı. **Karar:** planlı iş.

## 3. Uygulandı, doğrulama bekliyor

| ID | İş | Doğrulanması beklenen | Kanıt |
| --- | --- | --- | --- |
| REC-OBS | Recovery observe-only (PR #32) | İlk gerçek eylem (D-3) üretimde hiç çalışmadı; yalnızca 3 gerçek karar gözlendi | [G] |
| APT-5 | 5 dakikalık adım sınırı (PR #36) | Gerçek adım zaman aşımı notu bir kez görüldü; "aktarım hızı çöküşü" biçiminin her durumda yakalandığı; **betikteki idle sınırı etkin değil (D4-F1)** | [G][K] |
| DIAG | Focus diagnostics (PR #37) | Bir sonraki R-FILTER-04/R-KEYBOARD-08 hatasında çıktının yeterliliği | [K] |

## 4. Tamamlandı ve doğrulandı

- Production doğrulaması yeşil: `main` ucu için `Portfolio CI/CD` koşusu başarılı (deploy + verify-production; en son gözlenen `51522a7`, koşu `42449002399`).
- jQuery 3.6.0 yükseltmesi yayında ve üretim doğrulaması yeşil.
- Üç belgenin ve bu kaydın CI'ı **PR üzerinde** yeşil; bu, üretimde doğrulama anlamına gelmez (yalnızca belge).
- Belge düzeyinde doğrulananlar: `workflow_run` zincir sınırı (üç seviye), yeniden çalıştırmada `requested` olayının oluşmaması, meta CSP kısıtları, AdSense'in yalnızca nonce'u belgelemesi, Playwright imaj/önbellek yönergeleri [B]; inline script bağımlılıkları (ayrıştırıcıyla) [K].
