# ferhattufekci.github.io

**[🇬🇧 English](#english) | [🇹🇷 Türkçe](#türkçe)**

---

## English

Personal portfolio website of **Ferhat Tüfekçi**.

**Live:** https://ferhattufekci.github.io

### Documentation

- [User guide](docs/USER-GUIDE.md): how to use the site: sections, filters, sharing, theme, keyboard, Markdown copies.
- [Maintenance guide](#maintenance-guide): how content is generated, published and verified.
- [Test strategy](TEST-STRATEGY.md#test-strategy-en): test layers, BDD scenarios and the deployment quality gate.
- [CI/CD guide](docs/CI-CD.md): pipeline flow, release gate, reports and failure handling.
- [Incident and rollback runbook](docs/INCIDENT-RUNBOOK.md): what to do when the live site is broken, how to roll back by revert, emergency unpublish.
- [Test engineering audit](docs/testing/TEST-AUDIT.md) and [manual acceptance procedure (GKP)](docs/testing/GKP.md) (Turkish): evidence, traceability, repeatable test data and pending acceptance decisions.
- [Engineering assessment](docs/ENGINEERING-ASSESSMENT.md): what this repository is, what it demonstrably does well, and the open findings with their evidence level.
- [Architecture decision records](docs/architecture/adr/README.md): why the site stays static, why a release is pinned to one SHA, why recovery is observe-only.
- [Requirements traceability matrix](docs/business-analysis/requirements-traceability-matrix.md): generated from the test titles; the build fails if it is stale or misses an id that a test carries.
- [Requirement ↔ test procedure traceability](docs/testing/TRACEABILITY.md): both directions between requirement ids, automated tests and the manual procedure (GKP), with step results; regenerated with each build's results.
- [Threat model](docs/security/threat-model.md): trust boundaries, the controls that exist and the ones that do not.
- [Open items](docs/OPEN-ITEMS.md) (Turkish): known open problems and pending decisions, each with priority, evidence and acceptance criterion.

### Tech Stack

- **HTML5 / CSS3 / JavaScript**, no framework or bundler
- **jQuery + Shuffle.js + Owl Carousel** (filtering and carousels)
- **Node.js** (content generation and tests only; nothing runs on a server)
- **Playwright + `node:test`** (browser tests in Chromium, keyboard audit in Firefox and WebKit, unit and contract tests)
- **GitHub Actions** (Medium and GitHub sync, quality gate, release)
- **GitHub Pages** (static hosting)

### Project Structure

```
.
├── index.html            # Single-page portfolio (partly generated, see "SEO / AI Discoverability")
├── about/ contact/ privacy/  # Trust pages, generated from content/trust-pages.json
├── 404.html              # Generated 404 page
├── css/  js/  images/  fonts/
├── content/              # Source content for the trust pages
├── data/                 # Medium and GitHub snapshots, written by the sync workflows
├── scripts/              # Fetchers, generators, packaging and CI helpers
│   └── tests/            # Unit and contract tests (node:test)
├── tests/browser/        # Playwright browser tests
├── docs/                 # CI/CD, ADRs, assessment, threat model, testing documents
├── .github/workflows/    # pages.yml (CI/CD), test-agent-readiness.yml (quality checks), data fetchers, release recovery
├── llms.txt              # Plain-text index for LLM/AI answer engines
└── FerhatTufekci_CV.pdf
```

### Pages

| Page | Description |
|---|---|
| About Me | Hero section with photo, rotating job titles, and "Why Work With Me?" |
| Resume | Full CV as a web page: Summary, Top Skills, Languages, Education, Experience, Skills & Toolset, and Certifications |
| Blog | Medium articles with language (EN/TR) and category filters |
| Projects | GitHub repositories with category filters, pinned repos, and starred section |
| Contact | Phone, email, Calendly interview scheduler, and links |

On phones and tablets the site hides the browser's own scrollbar and draws a slim one beside the scrolling area (`js/touch-scrollbar.js`), because native scroll indicators differ between devices. Scrolling itself stays native. Desktop browsers keep their native scrollbar.

### Blog — Medium Auto-Sync

Articles are fetched from Medium every 6 hours via GitHub Actions.

**How it works:**
1. `fetch-medium.js` reads `https://medium.com/feed/@ferhattufekci`
2. Category is detected from RSS tags (`systems` / `test` / `software`)
3. Existing language metadata is preferred; otherwise `js/medium-language.js` scores Turkish/English vocabulary in the title and content
4. Articles are saved to `data/medium-*.json`
5. The browser reads these JSON files, so there are no CORS issues

Card excerpts come from the RSS `description`, or else the first introductory paragraph of the article, shown in full.

**To exclude an article from the site:**
Add its hex ID (last segment of the Medium URL) to the `EXCLUDE` array in `scripts/fetch-medium.js`.

**No manual steps are needed when publishing a new article on Medium.**

### Blog Language & Category Filters

| Filter | Options |
|---|---|
| Language | All / 🇬🇧 EN / 🇹🇷 TR |
| Category | All / Systems Engineering & Business Analysis / Test Engineering / Software Engineering |

### Projects — GitHub Auto-Sync

Repositories are fetched from GitHub every Monday via GitHub Actions.

**How it works:**
1. `fetch-github.js` calls `GET /users/ferhattufekci/repos` (REST API)
2. Pinned repos are fetched via the GitHub GraphQL API
3. Languages per repo are fetched via `GET /repos/{owner}/{repo}/languages`
4. Starred repos are fetched via `GET /users/ferhattufekci/starred`
5. Category is detected from repo name, description, and topics
6. Results are saved to `data/github-repos.json`, `data/github-starred.json`, `data/github-meta.json`

| Section | Description |
|---|---|
| 📌 PINNED | Repos pinned on the GitHub profile |
| 📂 ALL REPOSITORIES | All public repos, sorted by stars |
| ⭐ STARRED | Repos starred by Ferhat (first 20 shown, expandable) |

The category filter applies to PINNED and ALL REPOSITORIES, and the section label shows the selected filter.

**To exclude a repo from the site:**
Add the repo name to the `EXCLUDE` set in `scripts/fetch-github.js`.

**No manual steps are needed when creating or updating a repository.**

### SEO / AI Discoverability (GEO & AEO)

Blog and Projects load their content with client-side `fetch()`. Raw HTML fallbacks and static Markdown make the same summaries readable to clients that do not run JavaScript. These files support discovery; they do not guarantee indexing or inclusion in an AI answer.

| What | Where | Purpose |
|---|---|---|
| `<noscript>` fallback | `index.html`, inside Projects and Blog | Real titles, links and descriptions in the raw HTML for crawlers that do not run JavaScript; invisible in normal browsers. |
| `llms.txt` | site root | Plain-text index of who the site is about, its core pages, and current articles/projects. |
| `scripts/build-static-seo.js`, `scripts/build-agent-content.mjs` | `scripts/` | Regenerate the fallback HTML, `llms.txt`, Markdown and sitemap from source content; unchanged files are not rewritten. |
| `Person.knowsAbout` | JSON-LD in `index.html` `<head>` | Topic signals for search/AI, drawn from the existing `<meta name="keywords">` list. |
| AI crawler allowlist | `robots.txt` | Lists GPTBot, ClaudeBot, PerplexityBot, Google-Extended and others explicitly. |

Both sync workflows run `build-static-seo.js` right after fetching, so the fallback content and `llms.txt` stay in step with the data. Re-running it with unchanged data produces no diff.

**How synced data reaches the site:** a sync never pushes to `main`. When the data changed, `scripts/ci/sync-pr.mjs` opens one pull request per source from a `data-sync/<source>-<run>` branch, as the `portfolio-data-sync` GitHub App, and turns on auto-merge. The `main` ruleset merges it only after the required Quality Gate passes on a branch that is up to date with `main`; a red or outdated sync PR stays open. Merging does not publish: the live site changes at the next release (see [docs/CI-CD.md](docs/CI-CD.md)).

<a id="maintenance-guide"></a>

### Maintenance

The site is published on GitHub Pages by the **Portfolio CI/CD** workflow (`pages.yml`): one source SHA is built once, tested, deployed and then verified live. A failed quality job blocks deployment.

The footer of every page shows a build label such as `Build 372.1`. The first number is the number of the Portfolio CI/CD run that built, tested and published those files; the second is the attempt of that run (`1` unless the run was re-run). GitHub Actions assigns both, so nothing is maintained by hand. The label links to that run, so any published page can be traced back to the pipeline run and its test reports.

Edit the source, not a generated file, then run `npm run generate`:

| Source | Generates |
| --- | --- |
| `data/github-repos.json`, `data/medium-all.json` | Noscript sections in `index.html` and lists in `llms.txt` (`build-static-seo.js`) |
| `index.html`, `content/trust-pages.json` | `index.md`, trust pages, `404.html`, `404.md`, `sitemap.xml` (`build-agent-content.mjs`) |
| `llms.txt`, `agent-instructions.md` | Maintained by hand, except the marked lists in `llms.txt` |

```powershell
npm ci
npx playwright install chromium
npm run build
npm run verify -- --local --artifact --all --output=verification-local.json
npm run verify -- https://ferhattufekci.github.io --all --output=verification-production.json
```

Tests:

```powershell
npm test                   # unit and contract tests
npm run lint               # syntax and structured-data checks
npm run test:browser       # Playwright, Chromium (needs: npx playwright install chromium)
npm run test:motion:webkit # WebKit touch profile (needs: npx playwright install webkit)
```

In CI the browser test jobs run in the official Playwright container image, pinned to the locked `@playwright/test` version, so they download no browsers or system packages at run time. When you upgrade Playwright, update the image tag and digest in `test-agent-readiness.yml` as described in the [CI/CD guide](docs/CI-CD.md); a contract test fails until they match.

Details on platform limits, the shared 404 page, page transitions, Resume navigation, advertising units and verification are in the [detailed maintenance guide](docs/MAINTENANCE.md).

### Run Locally

```bash
npm ci
npm run preview   # http://127.0.0.1:3000
```

### License

Published for portfolio and demonstration purposes.  
All personal content, articles, images, and branding are the intellectual property of **Ferhat Tüfekçi**.  
Any commercial use, redistribution, or derivative work requires prior written permission.

### Author

[![Author](https://img.shields.io/badge/author-ferhattufekci-red)](https://github.com/ferhattufekci)
[![LinkedIn](https://img.shields.io/badge/contact-linkedin-blue)](https://www.linkedin.com/in/ferhattufekci/)
[![Medium](https://img.shields.io/badge/blog-medium-black)](https://medium.com/@ferhattufekci)

---

## Türkçe

**Ferhat Tüfekçi**'nin kişisel portföy web sitesi.

**Canlı:** https://ferhattufekci.github.io

### Dokümantasyon

- [Kullanım kılavuzu](docs/USER-GUIDE.tr.md): sitenin kullanımı: bölümler, filtreler, paylaşım, tema, klavye, Markdown kopyaları.
- [Bakım rehberi](#bakim-rehberi): içeriğin nasıl üretildiği, yayınlandığı ve doğrulandığı.
- [Test stratejisi](TEST-STRATEGY.md#test-strategy-tr): test katmanları, BDD senaryoları ve yayın kalite kapısı.
- [CI/CD rehberi](docs/CI-CD.tr.md): pipeline akışı, yayın kapısı, raporlar ve hata yönetimi.
- [Olay ve geri alma rehberi](docs/INCIDENT-RUNBOOK.tr.md): canlı site bozulduğunda yapılacaklar, revert ile geri alma, acil yayından kaldırma.
- [Test mühendisliği denetimi](docs/testing/TEST-AUDIT.md) ve [manuel kabul prosedürü (GKP)](docs/testing/GKP.md): kanıtlar, izlenebilirlik, tekrarlanabilir test verisi ve bekleyen kabul kararları.
- [Mühendislik değerlendirmesi](docs/ENGINEERING-ASSESSMENT.tr.md): deponun ne olduğu, kanıtlanabilir güçlü yanları ve kanıt düzeyleriyle açık bulgular.
- [Mimari karar kayıtları](docs/architecture/adr/README.tr.md): sitenin neden statik kaldığı, yayının neden tek bir SHA'ya sabitlendiği, kurtarmanın neden yalnızca gözlem modunda olduğu.
- [Gereksinim izlenebilirlik matrisi](docs/business-analysis/requirements-traceability-matrix.md) (İngilizce, test başlıklarından otomatik üretilir): bayatlarsa ya da bir testin taşıdığı kimliği atlarsa build kırılır.
- [Gereksinim ↔ test prosedürü izlenebilirliği](docs/testing/TRACEABILITY.md) (İngilizce, otomatik üretilir): gereksinim kimlikleri, otomatik testler ve manuel prosedür (GKP) arasında iki yönlü eşleme ve adım sonuçları; her build'in sonuçlarıyla yeniden üretilir.
- [Tehdit modeli](docs/security/threat-model.tr.md): güven sınırları, mevcut ve eksik kontroller.
- [Açık maddeler](docs/OPEN-ITEMS.md): bilinen açık sorunlar ve bekleyen kararlar; her biri öncelik, kanıt ve kabul kriteriyle.

### Teknoloji Yığını

- **HTML5 / CSS3 / JavaScript**, framework veya bundler yok
- **jQuery + Shuffle.js + Owl Carousel** (filtreleme ve kaydırmalı listeler)
- **Node.js** (yalnızca içerik üretimi ve testler; sunucuda hiçbir şey çalışmaz)
- **Playwright + `node:test`** (Chromium'da tarayıcı testleri, Firefox ve WebKit'te klavye denetimi, birim ve sözleşme testleri)
- **GitHub Actions** (Medium ve GitHub senkronizasyonu, kalite kapısı, yayın)
- **GitHub Pages** (statik barındırma)

### Proje Yapısı

```
.
├── index.html            # Tek sayfalık portföy (kısmen otomatik üretilir, bkz. "SEO / Yapay Zekâ Keşfedilebilirliği")
├── about/ contact/ privacy/  # Güven sayfaları, content/trust-pages.json'dan üretilir
├── 404.html              # Otomatik üretilen 404 sayfası
├── css/  js/  images/  fonts/
├── content/              # Güven sayfalarının kaynak içeriği
├── data/                 # Medium ve GitHub anlık kopyaları, senkronizasyon workflow'ları yazar
├── scripts/              # Veri çekiciler, üreticiler, paketleme ve CI yardımcıları
│   └── tests/            # Birim ve sözleşme testleri (node:test)
├── tests/browser/        # Playwright tarayıcı testleri
├── docs/                 # CI/CD, ADR'ler, değerlendirme, tehdit modeli, test belgeleri
├── .github/workflows/    # pages.yml (CI/CD), test-agent-readiness.yml (kalite kontrolleri), veri çekiciler, yayın kurtarma
├── llms.txt              # LLM/yapay zekâ yanıt motorları için düz metin dizin
└── FerhatTufekci_CV.pdf
```

### Sayfalar

Sitenin arayüzü İngilizcedir; sayfa adları sitede göründüğü gibi yazılmıştır.

| Sayfa | Açıklama |
|---|---|
| About Me | Fotoğraf, dönen meslek unvanları ve "Why Work With Me?" bölümü |
| Resume | Web sayfası olarak tam özgeçmiş: özet, öne çıkan yetkinlikler, diller, eğitim, deneyim, beceriler ve araçlar, sertifikalar |
| Blog | Dil (EN/TR) ve kategori filtreli Medium makaleleri |
| Projects | Kategori filtreli GitHub depoları, sabitlenmiş depolar ve yıldızlanan depolar |
| Contact | Telefon, e-posta, Calendly mülakat planlayıcı ve bağlantılar |

Telefon ve tabletlerde site, tarayıcının kendi kaydırma çubuğunu gizler ve kaydırılan alanın yanına ince bir çubuk çizer (`js/touch-scrollbar.js`); çünkü yerel kaydırma göstergeleri cihazdan cihaza değişir. Kaydırmanın kendisi yerel kalır. Masaüstü tarayıcılar kendi kaydırma çubuğunu kullanır.

### Blog — Medium Otomatik Senkronizasyonu

Makaleler GitHub Actions ile her 6 saatte bir Medium'dan otomatik olarak çekilir.

**Nasıl çalışır:**
1. `fetch-medium.js`, `https://medium.com/feed/@ferhattufekci` adresini okur
2. Kategori RSS etiketlerinden otomatik belirlenir (`systems` / `test` / `software`)
3. Önce makalenin mevcut dil bilgisi kullanılır; yoksa `js/medium-language.js` başlık ve içerikteki Türkçe/İngilizce sözcükleri değerlendirir
4. Makaleler `data/medium-*.json` dosyalarına kaydedilir
5. Tarayıcı bu JSON dosyalarını okur; böylece CORS sorunu olmaz

Kart özetleri RSS `description` alanından, yoksa makalenin ilk giriş paragrafından alınır ve tamamı gösterilir.

**Bir makaleyi siteden gizlemek için:**
Medium URL'sinin son parçası olan hex kimliği `scripts/fetch-medium.js` içindeki `EXCLUDE` dizisine ekleyin.

**Medium'da yeni makale yayınlandığında hiçbir manuel adım gerekmez.**

### Blog Dil ve Kategori Filtreleri

| Filtre | Seçenekler |
|---|---|
| Dil | Tümü / 🇬🇧 EN / 🇹🇷 TR |
| Kategori | Tümü / Sistem Mühendisliği ve İş Analizi / Test Mühendisliği / Yazılım Mühendisliği |

### Projects — GitHub Otomatik Senkronizasyonu

Depolar GitHub Actions ile her pazartesi GitHub'dan otomatik olarak çekilir.

**Nasıl çalışır:**
1. `fetch-github.js`, `GET /users/ferhattufekci/repos` çağrısını yapar (REST API)
2. Sabitlenmiş depolar GitHub GraphQL API ile çekilir
3. Her deponun dilleri `GET /repos/{owner}/{repo}/languages` ile alınır
4. Yıldızlanan depolar `GET /users/ferhattufekci/starred` ile çekilir
5. Kategori; depo adı, açıklaması ve konu etiketlerinden otomatik belirlenir
6. Sonuçlar `data/github-repos.json`, `data/github-starred.json`, `data/github-meta.json` dosyalarına kaydedilir

| Bölüm | Açıklama |
|---|---|
| 📌 PINNED | GitHub profilinde sabitlenmiş depolar |
| 📂 ALL REPOSITORIES | Yıldız sayısına göre sıralı tüm herkese açık depolar |
| ⭐ STARRED | Ferhat'ın yıldızladığı depolar (ilk 20'si gösterilir, genişletilebilir) |

Kategori filtresi PINNED ve ALL REPOSITORIES bölümlerine uygulanır; bölüm başlığı seçili filtreyi gösterir.

**Bir depoyu siteden gizlemek için:**
Depo adını `scripts/fetch-github.js` içindeki `EXCLUDE` kümesine ekleyin.

**Yeni depo oluşturulduğunda veya güncellendiğinde hiçbir manuel adım gerekmez.**

### SEO / Yapay Zekâ Keşfedilebilirliği (GEO ve AEO)

Blog ve Projects içeriklerini istemci tarafında `fetch()` ile yükler. Ham HTML yedekleri ve statik Markdown, aynı özetleri JavaScript çalıştırmayan istemcilerin de okuyabilmesini sağlar. Bu dosyalar keşfedilmeyi destekler; arama motorlarında dizine eklenmeyi veya yapay zekâ yanıtlarında yer almayı garanti etmez.

| Ne | Nerede | Amacı |
|---|---|---|
| `<noscript>` yedek içerik | `index.html`, Projects ve Blog içinde | JavaScript çalıştırmayan tarayıcı botları için ham HTML'de gerçek başlık, bağlantı ve açıklamalar; normal tarayıcılarda görünmez. |
| `llms.txt` | site kökü | Sitenin kimi anlattığını, temel sayfalarını ve güncel makale/projeleri özetleyen düz metin dizin. |
| `scripts/build-static-seo.js`, `scripts/build-agent-content.mjs` | `scripts/` | Yedek HTML'i, `llms.txt`'yi, Markdown'ı ve site haritasını kaynak içerikten yeniden üretir; değişmeyen dosyalar yeniden yazılmaz. |
| `Person.knowsAbout` | `index.html` `<head>` içindeki JSON-LD | Mevcut `<meta name="keywords">` listesinden türetilen, arama ve yapay zekâ için konu sinyalleri. |
| Yapay zekâ botları izin listesi | `robots.txt` | GPTBot, ClaudeBot, PerplexityBot, Google-Extended ve diğerlerini açıkça listeler. |

İki senkronizasyon workflow'u da veriyi çektikten hemen sonra `build-static-seo.js`'i çalıştırır; böylece yedek içerik ve `llms.txt` veriyle uyumlu kalır. Veri değişmediyse yeniden çalıştırmak hiçbir değişiklik üretmez.

**Senkronize veri siteye nasıl ulaşır:** senkronizasyon `main`'e asla doğrudan push etmez. Veri değiştiyse `scripts/ci/sync-pr.mjs`, `portfolio-data-sync` GitHub App'i olarak her kaynak için `data-sync/<kaynak>-<koşu>` dalından bir pull request açar ve auto-merge'ü açar. `main` ruleset'i bu PR'ı yalnızca zorunlu Quality Gate, `main` ile güncel bir dalda geçtikten sonra birleştirir; kırmızı veya geride kalmış bir senkronizasyon PR'ı açık kalır. Merge yayın yapmaz: canlı site bir sonraki yayında değişir (bkz. [docs/CI-CD.tr.md](docs/CI-CD.tr.md)).

<a id="bakim-rehberi"></a>

### Bakım

Site, **Portfolio CI/CD** workflow'u (`pages.yml`) ile GitHub Pages'te yayınlanır: tek bir kaynak SHA'sı bir kez build edilir, test edilir, yayınlanır ve ardından canlı ortamda doğrulanır. Kalite job'u başarısızsa yayın yapılmaz.

Her sayfanın alt bilgisinde `Build 372.1` gibi bir build etiketi görünür. İlk sayı, o dosyaları build eden, test eden ve yayınlayan Portfolio CI/CD koşusunun numarasıdır; ikincisi o koşunun deneme numarasıdır (koşu yeniden çalıştırılmadıysa `1`). İkisini de GitHub Actions atar; elle güncellenen bir şey yoktur. Etiket o koşuya bağlantı verir; böylece yayındaki her sayfa, kendisini üreten pipeline koşusuna ve test raporlarına kadar izlenebilir.

Üretilen dosyayı değil kaynağını düzenleyin, ardından `npm run generate` çalıştırın:

| Kaynak | Ürettiği |
| --- | --- |
| `data/github-repos.json`, `data/medium-all.json` | `index.html` içindeki noscript alanları ve `llms.txt` listeleri (`build-static-seo.js`) |
| `index.html`, `content/trust-pages.json` | `index.md`, güven sayfaları, `404.html`, `404.md`, `sitemap.xml` (`build-agent-content.mjs`) |
| `llms.txt`, `agent-instructions.md` | Elle güncellenir; `llms.txt` içindeki işaretli listeler hariç |

```powershell
npm ci
npx playwright install chromium
npm run build
npm run verify -- --local --artifact --all --output=verification-local.json
npm run verify -- https://ferhattufekci.github.io --all --output=verification-production.json
```

Testler:

```powershell
npm test                   # birim ve sözleşme testleri
npm run lint               # sözdizimi ve yapılandırılmış veri kontrolleri
npm run test:browser       # Playwright, Chromium (gerekir: npx playwright install chromium)
npm run test:motion:webkit # WebKit dokunmatik profil (gerekir: npx playwright install webkit)
```

CI'da tarayıcı test job'ları, kilitli `@playwright/test` sürümüne sabitlenmiş resmi Playwright container imajında çalışır; çalışma anında tarayıcı veya sistem paketi indirmez. Playwright'ı yükseltirken `test-agent-readiness.yml` içindeki imaj etiketini ve digest'i [CI/CD rehberinde](docs/CI-CD.tr.md) anlatıldığı gibi güncelleyin; eşleşene kadar bir sözleşme testi başarısız olur.

Platform sınırları, ortak 404 sayfası, sayfa geçişleri, Resume gezinmesi, reklam birimleri ve doğrulama ayrıntıları [ayrıntılı bakım rehberindedir](docs/MAINTENANCE.tr.md).

### Yerel Çalıştırma

```bash
npm ci
npm run preview   # http://127.0.0.1:3000
```

### Lisans

Bu proje portföy ve tanıtım amacıyla yayınlanmıştır.<br>
Tüm kişisel içerik, makaleler, görseller ve marka öğeleri **Ferhat Tüfekçi**'ye aittir.<br>
Ticari kullanım, yeniden dağıtım veya türev çalışmalar için önceden yazılı izin alınması gerekir.

### Yazar

[![Yazar](https://img.shields.io/badge/yazar-ferhattufekci-red)](https://github.com/ferhattufekci)
[![LinkedIn](https://img.shields.io/badge/iletişim-linkedin-blue)](https://www.linkedin.com/in/ferhattufekci/)
[![Medium](https://img.shields.io/badge/blog-medium-black)](https://medium.com/@ferhattufekci)
