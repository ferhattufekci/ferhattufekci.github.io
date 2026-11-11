# Açık işler kaydı (ana takip belgesi)

Güncelleme: 2026-11-08. Bu kayıt [RECOVERY-ACTIVATION.md](RECOVERY-ACTIVATION.md), [D1-PROBE-PLAN.md](D1-PROBE-PLAN.md), [APT-MIRROR-OPTIONS.md](APT-MIRROR-OPTIONS.md), [T-4-INLINE-SCRIPTS.md](T-4-INLINE-SCRIPTS.md) ve [CI-CD.md](CI-CD.md) içindeki işleri tek yerde izler. **Bir işin belgelenmiş olması uygulandığı anlamına gelmez; CI'ın yeşil olması production'da doğrulandığı anlamına gelmez.** Dört durum birbirine karıştırılmaz.

Kanıt düzeyi: **[B]** belge, **[G]** bu repoda gözlem, **[T]** birim/tarayıcı testi, **[K]** kod incelemesi, **[?]** doğrulanamadı. Öncelik: P1 başka işleri açan veya güvenliği ilgilendiren; P2 değerli ama bekleyebilen; P3 planlı sonraki.

Genel kurallar (sahibin kararları): `PORTFOLIO_RECOVERY_ACT` kapalı; production, güvenlik politikası, test assertion'ı, recovery etkinleştirmesi ve canlı hesap/reklam ayarı sahibin onayı olmadan değişmez; birleşmiş uzak dallar izinsiz silinmez; PR #38 dışında yeni PR açılmaz.

## 1. Karar/onay bekliyor

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
- **Bulgu D4-F1:** betikteki apt sınırı (20 sn/3 deneme) etkin değil; 8/8 jobda etkin 15 sn/1 deneme [G]; **kaynak bulundu:** runner'daki `zz-retries` (Retries 1, Timeout 15) `99-ci-network`'ü sıralamada geçiyor [G, PR #40 tanı çıktısı; apt okuma sırası B]; dosyanın imajdan mı runner hazırlığından mı geldiği [?]. Etkin sınır "boşta kalma" tipidir: şekil 1'i kapsar, şekil 2'yi (yavaş ama akan indirme) kapsamaz; şekil 2 için önceki günlükler "mirror hiç boşta kalmadı" der (CI-CD.md) [G, bu oturumda yeniden doğrulanmadı]; şekil 2'yi gerçekte `timeout-minutes: 5` + recovery bağlıyor. 6 Kasım yavaş vakası betikten önceye ait (dump yok) [?]. 15 s/1 deneme ile 20 s/3 deneme farkı ölçülmedi [?]. Betik ya etkinleştirilmeli ya da ölü yapılandırma olarak belgelenmeli: D-4 ölçümüne bağlı ayrı karar. `R-CI-APT-01/02` etkin değeri doğrulamıyor.
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
- **Öncelik:** P2 (D-6'nın önkoşulu). **Durum:** testler yazıldı, mevcut kodda yeşil, mutasyonlar yakalanıyor (T-4 bölüm 5); PR CI doğrulaması bekliyor. Üretim kodu değişmedi.
- **Kanıt:** boşluklar `grep` ile kanıtlı [G]: `reblog`, `fmtDT/relTime/renderSyncBadge`, `gtag/dataLayer`, olay sırası, script sırası, inline sayısı için test yok.
- **Kabul:** A0-01..09 yeşil, mutasyonları yakalar, ≥30 ardışık yerel koşuda flaky yok, mevcut assertion'lar değişmedi.
- **Bulgu A0-F1 [G]:** jQuery yüklenirken (parser bekliyorken) seçilen dil uygulanır, sonra `PortfolioContentPanels is not defined` fırlatılır (`js/page-content-panels.js` geç yüklenir). Gerçek kullanıcı etkisi: yavaş ağda erken dokunuş konsolda hata + panel sıfırlama atlanır. Düzeltme taşıma sırasında (A-aşamaları) bilinçli davranış farkı olarak ele alınır; şimdi değiştirilmedi.
- **Sonraki adım:** PR CI yeşili sonrası birleştirme (sahip onayı: yayın tetikler); sonra A1+ planlama. **Karar:** birleştirme onayı sahibe ait.

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

### GOV-1 Başarısız testlerin merge'i GitHub düzeyinde engellemesi (zorunlu Quality Gate)
- **Öncelik:** P2. **Durum:** açık; akış kodu hazır, App kurulumu ve ruleset bekliyor. **Kanıt:** `Protect main` ruleset'i yalnızca `deletion` ve `non_fast_forward` taşır; zorunlu durum kontrolü yok [G]. Kırmızı bir PR'ın merge'ünü şu an yalnızca süreç engeller.
- **Karar (sahip, 2026-11-11):** App'e Quality Gate bypass'ı verilmez; doğrudan push yok. Akış: zamanlanmış senkronizasyon → `data-sync/<kaynak>-<koşu>` dalı → PR → zorunlu Quality Gate → koşullar sağlanınca auto-merge (`scripts/ci/sync-pr.mjs`, R-CI-01). Önceki "App ile doğrudan push + bypass" önerisi geri çekildi.
- **Sahip kurulumu (sohbette anahtar paylaşılmaz):** (1) Settings → Developer settings → GitHub Apps → New: webhook kapalı; Repository permissions yalnızca **Contents: Read and write**, **Pull requests: Read and write** (Metadata: Read zorunlu, otomatik); Actions, Workflows, Administration, Checks **No access**; "Only on this account". (2) App'i yalnızca bu depoya kur (Only select repositories). (3) Depo → Settings → Secrets and variables → Actions: secret `SYNC_APP_PRIVATE_KEY` (App'in .pem özel anahtarı), variable `SYNC_APP_CLIENT_ID` (App'in Client ID'si). (4) Settings → General → Pull Requests: **Allow auto-merge** açık. App ruleset bypass listesine **eklenmez**.
- **Doğrulama sırası:** (a) bu akışın PR'ı merge edildikten sonra `Fetch Medium Articles` elle çalıştırılır; değişiklik varsa açılan PR'da `pull_request` CI'ının kendiliğinden başladığı ve Quality Gate'in PR head SHA'sını doğruladığı kontrol edilir; (b) ruleset'e `Run Quality Checks / Quality Gate` (integration_id 15368, GitHub Actions) zorunlu kontrol ve **Require branches to be up to date** eklenir, yeni bypass eklenmez; (c) kırmızı veya eksik kontrollü bir PR'ın merge edilemediği ve yeşil bir senkronizasyon PR'ının bypass olmadan birleştiği gösterilir. Bunlar tamamlanana kadar GOV-1 açık kalır.
- **Kalan risk:** auto-merge etkinleştikten sonra yazma yetkili biri senkronizasyon dalına başka dosya push ederse merge yine Quality Gate'ten geçer ama kapsam kontrolü bir sonraki senkronizasyona kadar yeniden çalışmaz. Mevcut yönetici bypass'ı (RepositoryRole 5, always) sahibin kararıyla durur; yönetici merge'leri kuralı atlayabilir.

## 2. Araştırılıyor / kanıt bekliyor

### RF R-FILTER-04 ve R-KEYBOARD-08 kök neden
- **Güncelleme (2026-11-11): kök neden bulundu, düzeltme PR #55'te [K].** PR #52 (yalnızca belge) koşusu 42903077612'de aynı hata `small-mobile-dark`/shard 2'de tekrarladı; teşhis çıktısı `activeElement: "h2.section-title"`, `currentPages: ["blog"]`, `menuExpanded: "false"`. Yukarıdaki hipotez, PR #42'den alınan kontrollü test `R-FOCUS-09/11` ile doğrulandı: animasyon tamamlanma geri çağrısı geciktirilince yeni sayfada klavyeyle yapılan seçim `onEndAnimation`'da başlığa geri alınıyor. `f6693f9` üzerinde düzeltmesiz tüm projelerde FAIL, düzeltmeyle 18/18 PASS. Kapanış koşulu: #55 merge edildikten sonra R-FILTER-04'ün CI'da tekrarlamaması.
- **Öncelik:** P1 (olay tetikli). **Durum:** **yeni başarısızlık var (2026-11-08)**; kod/assertion değişmedi; kök neden kanıtsız.
- **Olay:** `main` push koşusu 42457503796 (merge 9955860), Browser Tests (2/2), `small-mobile-dark`, `categories.spec.mjs:132` R-FILTER-04; 710 geçti / 1 kaldı (tek hata). Hata `selectLanguage(page,'all')` içinde (spec satır 145, `navigateToSection(blog)` sonrası): `#blog-lang-toggle [aria-pressed="true"]` beklenen `all`, gelen `en`, 7 sn boyunca değişmedi (18 deneme). Focus diagnostics: `activeElement=h2.section-title`, `currentPages=[blog]`, `inertPages=[about-me,resume,projects,contact]`, `menuExpanded=false`, `hash=#blog` [G]. Sonraki koşu (9eeb9d3) yeşil: aralıklı [G].
- **Gözlem:** odak, `all` düğmesinde değil başlıktaydı; yani Space tuşu düğmeye ulaşmadı ya da odak sonradan başlığa taşındı. Uygulamada odağı başlığa taşıyan yol `onEndAnimation` (js/pages-switcher.js:279) [K]. **Bu bir hipotezdir [?]**: geçişin tamamlanması ile testin `focus()+Space` çağrısı arasında yarış. Kanıtlanmadı; `expectSection` yalnızca `.pt-page-current` kimliğini bekler, odağı beklemez.
- **Yeniden üretme:** önceden yerelde 140 tekrar; bu kez CPU yükü (2 çekirdek meşgul + 2 işçi) altında 60 tekrar `small-mobile-dark`: **60/60 geçti** [G]. Yani yerelde üretilemedi; hipotez doğrulanmadı da çürütülmedi.
- **Kanıt erişimi:** trace/video/error-context artifact'ı (browser-report-2, id 13608781765) bu ortamdan indirilemedi: ağ politikası `productionresultssa19.blob.core.windows.net` CONNECT isteğine 403 verdi. Sahip bu ana bilgisayarı (örn. `*.blob.core.windows.net`) izin listesine eklerse trace incelenebilir. Artifact süresi dolmadan (varsayılan 90 gün) elle de indirilebilir.
- **Risk:** aralıklı hata; **geçmek çözüm değildir**; retry ile gizlenmez; assertion gevşetilmez.
- **Kabul:** kanıtlı kök neden (altyapı / zamanlama yarışı / uygulama) — diagnostics, trace, video ve browser logları birlikte.
- **Sonraki adım:** trace erişimi sağlanınca (veya sonraki hatada) `press` anındaki odak ve sayfa geçişi zamanlamasını trace'ten oku; kod değişikliği ancak kanıtla. **Karar:** ağ izni sahibe ait.

### RP R-PANEL-01 masaüstü tekerlek kaydırması (yeni, 2026-11-11)
- **Öncelik:** P2. **Durum:** kök neden kanıtsız [?]; assertion değişmedi.
- **Olay [G]:** PR #54 koşusu 42907518826 (yalnızca `.gitattributes`; Linux CI'da hiçbir dosyanın baytı değişmez), Browser Tests (1/2), `desktop-dark`, `fixed-page-controls.spec.mjs:62`; 812 geçti / 1 kaldı.
- **Trace [G]:** hata döngünün ilk sayfasında, Resume'da: `goto` +70 ms, `mouseMove (808,757)` +2041 ms, `mouseWheel deltaY 420` +2086 ms; panel `scrollTop` 7 sn boyunca 0. Ekran kaydında 1,4 sn ile 8,5 sn arasında hiç kare değişmedi; yani kaydırma başlayıp geri alınmadı, hiç başlamadı. İmleç noktası normal içerik (Education) üzerindeydi.
- **Kontrol edilen [K]:** uygulamada `wheel`/`touchmove` dinleyicisi veya kaydırmayı engelleyen `preventDefault` yok; `page-content-panels.js` yalnızca panelin kendisindeki Home/End/PageUp/PageDown tuşlarını yönetir.
- **Aynı sınıfta yeni olaylar [G]:** 2026-11-11 gecesi üç PR'da daha görüldü; hepsi masaüstü, hepsi `fixed-page-controls.spec.mjs`/`adsense.spec.mjs` içindeki aynı `wheel()` yardımcısı: PR #55 koşu 42920120211 `R-PANEL-07` desktop-light, PR #56 koşu 42920348258 `R-AD-SCROLL-01` desktop-dark, PR #62 koşu 42927823365 `R-PANEL-07` desktop-dark. Koşu/iş sonuçları [G, Actions API]: 42920120211 ve 42920348258'de ikinci denemede Browser Tests (1/2) geçti; 42927823365'in ikinci denemesinde Browser Tests (1/2) **cancelled**, Quality Gate **failure** (iptal 06:27:33; dala yeni head `20b50af` 06:27:12'de geldi, PR concurrency grubu `cancel-in-progress` ile eskisini iptal etti [K]). Yani bu üçüncü olayın yeniden çalıştırması sonuç vermedi; geçti sayılmaz. Başarısız test adları ve projeler önceki oturumda job loglarından okundu; loglar kimlik doğrulaması ister, bu kayıtta yeniden doğrulanmadı [?]. İlk koşularda Browser Tests (1/2) 20–26 dk sürdü.
- **Yerel yeniden üretim [G]:** 2 worker'la 60/60 geçti; CPU aşırı yüklenince (12 worker, 30 tekrar, `R-PANEL-01`+`R-PANEL-07`, iki masaüstü projesi) **güncel main `436a211`: 1/120 kaldı, #51 öncesi main `05656e4`: 2/120 kaldı**. Bu yalnızca hatanın #51'den (dönen başlık) önce de oluştuğunu gösterir: #51 hatayı getirmedi. Hatanın ürün mü test/ortam mı kaynaklı olduğunu göstermez; 1/120 ile 2/120 arasındaki fark da bu örneklemde anlamlı değildir. Ham koşu çıktıları saklanmadı, sayılar bağımsız olarak yeniden üretilmedi [?]. `R-AD-SCROLL-01` blog, #56 dalında yük altında 40/40 geçti. Kök neden hâlâ kanıtsız [?]; #60'ın teşhis çıktısı sonraki olayda imleç altındaki öğeyi ve panelin durumunu kaydedecek.
- **#60 teşhis çıktısı, ilk gerçek olay [G]:** PR #63 koşu 42972651347, `R-PANEL-02` desktop-dark: `{"atPointer":"a.proj-name","pointerInsideOwner":true,"overflowY":"auto","scrollTop":0,"scrollHeight":3884,"clientHeight":716,"ownerInert":false,"pointerEvents":"auto","currentPages":["projects"],"menuExpanded":"false","hash":"#projects"}`. Elenen nedenler: imleç yanlış öğede değil, panel kaydırılabilir, inert değil, doğru sayfa açık. Aynı koşuda `R-AD-SCROLL-01` de düştü; PR #63 tarayıcıya giden dosya değiştirmez. Kalan: tarayıcının tekerlek olayını kaydırmaya çevirmemesi; kaynağı (ürün, test veya ortam) kanıtsız [?].
- **İkinci teşhisli olay ve yeniden çalıştırma [G]:** PR #67 (yalnızca `rtm.test.js` ve belgeler; tarayıcıya giden dosya değişmez) koşu 42988835533. **İlk deneme:** Browser Tests (1/2) 08:40–09:07 UTC, 842 geçti / 1 kaldı: `R-PANEL-01` desktop-dark, `fixed-page-controls.spec.mjs:72` (`wheel()` → `check`), beklenen > 100, gelen 0; teşhis `{"atPointer":"div#resume-education.resume-section","pointerInsideOwner":true,"overflowY":"auto","scrollTop":0,"scrollHeight":4128,"clientHeight":716,"ownerInert":false,"pointerEvents":"auto","currentPages":["resume"],"menuExpanded":"false","hash":"#resume"}`, runner imajı ubuntu-24.04. **Yeniden çalıştırma (sahibin onayıyla, yalnızca başarısız işler):** deneme 2, Browser Tests (1/2) 09:11–09:37 UTC geçti; Merge Test Reports ve Quality Gate geçti. Aynı servis edilen kod başka koşularda da geçtiği için bu olay hatanın deterministik olmadığını gösterir; altyapı kaynaklı olduğunu kanıtlamaz. #63'teki olayla aynı imza (imleç kaydırılabilir panelin içinde, panel inert değil, doğru sayfa açık, `scrollTop` 0). Başarılı rerun hatayı çözmez; kök neden kanıtsız [?].
- **Sonraki adım:** sonraki olayda #60 teşhis çıktısını oku (imleç altındaki öğe, `pointerInsideOwner`, `overflowY`, `scrollHeight`). Retry eklenmez.

### RK-01 R-KEYBOARD-01 WebKit/Firefox kararsızlığı (yeni, 2026-11-09/10)
- **Öncelik:** P1. **Durum:** kök neden kanıtsız; assertion değişmedi.
- **Gözlem [G]:** `keyboard-tests`, `keyboard-accessibility.spec.mjs:43` R-KEYBOARD-01, iki bağımsız PR'da aynı saatte düştü: `ci/recovery-act-hardening` (koşu 42650501491) ve `ci/exact-sha-release-gate` (42650805811, webkit-1440-light, "Visible focus ring on … Blog"). Deneme 1: webkit light+dark ("GitHub" ikonu); deneme 2: tarayıcı kurulumu 5 dk zaman aşımı (apt/D-4); deneme 3: webkit light ("Schedule a job interview"), webkit dark ("About") ve firefox light/dark `page.goto` 120 sn zaman aşımı. Düşen öğe her seferinde farklı; 590/594 geçti.
- **Çıkarım:** test, PR #39'un değişikliğinden (yalnızca test dosyası ve CI betikleri) bağımsız; iki farklı branch'te oluştu. Neden henüz bilinmiyor: odak halkasının ölçüldüğü an ile boyama zamanlaması (WebKit) ve yavaş `goto` (Firefox) olası ama **kanıtsız [?]**. Retry ile gizlenmeyecek.
- **Sonraki koşular (42775764822) [G]:** deneme 1: R-KEYBOARD-01 webkit light/dark + firefox `goto` bütçe zaman aşımı; deneme 2: Browser Tests (1/2) R-BLOG-SHARE-09 (30 sn test zaman aşımı) ve R-KEYBOARD-08 (`desktop-dark`: başlığa odak doğrulandıktan sonra ilk Tab dil düğmeleri yerine `button.blog-category-filter` üzerine gitti; `Focus diagnostics` ile), klavye işi ise testlere hiç ulaşmadı: `Install keyboard test browsers` 5 dk sınırına takıldı (~107 apt paketi, mirror yavaş; iki pakette 15 sn `Ign:`; etkin ayarlar Timeout 15 / Retries 1). Bu üçüncü sınıf D-4 shape 2 ("yavaş ama akıyor") örneğidir.
- **Yerel deney (Chromium, `desktop-dark`, 2 çekirdek) [G]:** R-KEYBOARD-08 yüksek CPU yükü altında (4 meşgul işlem + 3 worker) 10 koşuda 9 başarısız (6× 90 sn zaman aşımı, 3× odak halkası anketi); orta yükte (1 meşgul işlem + 2 worker) 10/10 geçti. CI'daki "Tab düğmeleri atladı" imzası yerelde **üretilemedi** [?]. Testlerin CPU açlığına duyarlı olduğu kanıtlandı; CI'daki odak atlamasının nedeni değil.
- **0e6469a [G]:** author ve committer Ferhat TÜFEKÇİ (GitHub: ferhattufekci); GitHub "Unverified" nedeni `unsigned` (imza yok), yazarlık sorunu yok. Yazarlık veya imza değiştirilmedi.
- **Sonraki adım:** `browser-report-1` içindeki `keyboard-accessibility-R-K-41798-…-desktop-dark` klasörü (video, error-context, trace) ve keyboard-browser-report incelenmeli. Sonra odak halkası ölçümünün boyama beklemesiyle yarışı test edilir.

### REPO-VIS Deponun görünürlüğü özel (private) olarak görünüyor
- **Öncelik:** P1. **Durum:** **insan kararı bekliyor.** 2026-11-09 ~10:08 UTC'den beri `repos/ferhattufekci/ferhattufekci.github.io` `private: true` dönüyor [G]; 8 Kasım'da recover işi anonim `git ls-remote` ile çalışıyordu, yani depo o zaman herkese açıktı [K]. Kimin/ne zaman değiştirdiği bu oturumdan doğrulanamadı [?].
- **Etkiler:** (1) recover, `Resolve Source` (workflow_run) ve `Reject superseded release` adımları git kimlik bilgisi olmadan düşüyordu: veri commit'leri yayınlanmadı (42607611212, 42645437976) ve Recover Release düştü (42734721526). Düzeltme #39'da, bkz. F-C1-3; (2) ücretsiz planda özel depoda GitHub Pages ve Actions dakikaları kısıtlıdır: bu pipeline koşu başına onlarca dakikalık iş üretir, kota ve yayın etkisi **doğrulanmadı** [?]; (3) bu bir iş görüşmesi referans projesi, herkese açık olması beklenir (varsayım, sahibin kararı); (4) probe deposu planı ve genel envanter açısından özel depo farklı davranır.
- **Karar:** sahibe ait (yanlışlıkla mı bilinçli mi). Bu oturum görünürlüğü değiştirmez.

### C1 `act()` argüman testleri
- **Öncelik:** P1 (D-3 önkoşulu). **Durum:** uygulandı; PR CI doğrulaması bekliyor. F-C1-1 ve F-C1-2 düzeltildi (RECOVERY-ACTIVATION bölüm 8).
- **Kanıt:** `scripts/tests/recovery-act.test.js` 14 test, gerçek alt süreç, sahte `PATH`, mutasyonlar (resolve/current dahil) yakalanıyor; yerel tekrar sonuçları PR açıklamasında [T/G].
- **Kabul:** sahte `PATH` ile gerçek GitHub çağrısı yok; her test <5 sn; 30 tekrarda flaky yok; mutasyonlar yakalanıyor. CI yeşil olunca "tamamlandı ve doğrulandı".
- **Karar:** yok (sahip otonom çalışma talimatı verdi).

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

### SEC-CSP Content-Security-Policy yok
- **Öncelik:** P2. **Durum:** uygulanmadı, bilinçli. **Kanıt:** sayfada CSP başlığı/meta'sı yok [D].
- **Neden ertelendi:** `index.html` hâlâ büyük satır içi `<script>` blokları ve satır içi olay öznitelikleri taşıyor. Anlamlı bir politika `'unsafe-inline'` gerektirirdi (koruma sağlamaz) ya da her blok için hash/nonce gerektirirdi; GitHub Pages özel başlık sunamadığı için bu `<meta>` ile yapılırdı ve her düzenlemede kırılırdı.
- **Sıra:** satır içi script çıkarımı (A1+, `docs/T-4-INLINE-SCRIPTS.md`) bitince `'unsafe-inline'` gerektirmeyen CSP eklenir. **Karar:** sahip.

### SEC-SCAN Bağımlılık ve secret taraması yok
- **Öncelik:** P2. **Durum:** kısmen uygulandı (2026-11-11). **Kanıt:** Static Checks'teki bağımlılık denetimi kapısı (`scripts/ci/dependency-audit.mjs`, R-AUDIT-01..11, GKP-047) lockfile'daki high/critical advisory'de ve denetim sonucu güvenilemediğinde başarısız olur; ilk gerçek koşuda (main `cdb7194`, 30 paket) bulgu 0. `.github/dependabot.yml` haftalık güncelleme PR'ları açar; Dependabot uyarıları depoda kapalıdır (API 403). Secret taraması ve çalışma zamanı betiklerinin taranması hâlâ yok.
- **Not:** İki ayrı yüzey var. Build zamanı: 6 devDependency (tarayıcıya gitmez; `npm audit` bunları görür). Çalışma zamanı: vendored kütüphaneler (jQuery, Modernizr, imagesloaded, jquery.shuffle, owl.carousel) ve uzaktan yüklenen AdSense, Google Tag Manager, Calendly betikleri — `package.json`'da olmadıkları için `npm audit` bunları **görmez**. Büyük olan çalışma zamanı yüzeyidir; onu CSP (SEC-CSP) ve sağlayıcının izin verdiği yerde SRI sınırlar. Pipeline'ı yukarı akış bir advisory'sinde kırabilecek bir kapı eklemek politika kararıdır. **Karar:** sahip.

### QA-TYPES Tip denetimi yok
- **Öncelik:** P3. **Durum:** uygulanmadı. **Kanıt:** TypeScript yok, `checkJs` yok [D].
- **Not:** `tsc --checkJs` kapısı gerçek bir hata sınıfını ucuza yakalar ama yeni bir devDependency gerektirir; bu depoda "yeni bağımlılık ekleme" kuralı geçerli. **Karar:** sahip.

### HYG Depo hijyeni
- **Öncelik:** P3. **Durum:** uygulanmadı. **Kanıt:** README lisans koşullarını yazıyor ama `LICENSE` dosyası yok; `SECURITY.md` yok; `TEST-STRATEGY.md` kökte, diğer belgeler `docs/` altında [D].

## 3. Uygulandı, doğrulama bekliyor

| ID | İş | Doğrulanması beklenen | Kanıt |
| --- | --- | --- | --- |
| REC-OBS | Recovery observe-only (PR #32) | İlk gerçek eylem (D-3) üretimde hiç çalışmadı; yalnızca 3 gerçek karar gözlendi | [G] |
| APT-5 | 5 dakikalık adım sınırı (PR #36) | Gerçek adım zaman aşımı notu bir kez görüldü; "aktarım hızı çöküşü" biçiminin her durumda yakalandığı; **betikteki idle sınırı etkin değil (D4-F1)** | [G][K] |
| DIAG | Focus diagnostics (PR #37) | Bir sonraki R-FILTER-04/R-KEYBOARD-08 hatasında çıktının yeterliliği | [K] |

## 4. Tamamlandı ve doğrulandı

- Production doğrulaması yeşil: `main` ucu için `Portfolio CI/CD` koşusu başarılı (deploy + verify-production; en son gözlenen `51522a7`, koşu `42449002399`).
- jQuery 3.6.0 yükseltmesi yayında ve üretim doğrulaması yeşil.
- PR #38 (belgeler) 12/12 yeşil CI ile birleştirildi (squash 9955860). Birleşme sonrası `main` push koşusu 42457503796 **kırmızı** bitti (yalnızca R-FILTER-04, yukarıya bakın; dağıtım atlandı); sonraki main koşusu (9eeb9d3) yeşil ve yayın güncel [G]. Belge PR'ı site dosyalarını değiştirmedi.
- Belge düzeyinde doğrulananlar: `workflow_run` zincir sınırı (üç seviye), yeniden çalıştırmada `requested` olayının oluşmaması, meta CSP kısıtları, AdSense'in yalnızca nonce'u belgelemesi, Playwright imaj/önbellek yönergeleri [B]; inline script bağımlılıkları (ayrıştırıcıyla) [K].
