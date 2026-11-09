# REQ-UI-PRESERVE — retain the existing website

Owner: business analysis / technical lead. Review date: 2026-11-08; continued 2026-11-09.
The user's revised instruction §0 replaces the earlier role-menu/public-case-page proposal.
Only README and repository documentation may introduce hiring/evidence narratives.

Reference source: `995586066b031e1475ff71dcae3d9ca4ee3e829f`, recorded as the initial clean checkout
before task edits. Its difference from previously live `51522a7...` is six internal documents only.
Saved reference artifact: `13608077225`, run `42457503796`, attempt 1. Its original browser gate
failed; reference use does not imply a healthy release. Later main `9eeb9d3...` only updates data/meta.json.
Rejected UI was never committed, pushed or deployed. A reversible pre-correction file copy and patch
are retained locally in `work/checkpoint-before-ui-correction`.

| AC | Contract and example | Negative/boundary | Seam |
| --- | --- | --- | --- |
| UI-AC1 | Preserve visible markup, styles, images, typography, spacing and page order | New role menu, CTA, text or hidden hiring element fails | Frozen source-derived HTML/CSS/media digest |
| UI-AC2 | Remove only task role menu, three CTA links, engineering page and their generator/tests | Original Resume/PDF/Projects/Contact remain | DOM/source review and unchanged browser regressions |
| UI-AC3 | Same rendering conditions produce matching desktop/mobile screenshots | Inject rejected role menu and require the same oracle to detect it | Paired decoded PNG pixels; no masks or candidate baseline update |
| UI-AC4 | Preserve correct routes, history, filters, theme, keyboard and error behavior | Newer focus may be protected only by separately specified REQ-FOCUS-01 bug fix | Existing browser suites plus focused regression |
| UI-AC5 | Generate cannot recreate hiring UI; docs/specs/evidence stay outside Pages | Real internal fixture and engineering file must not leak | Idempotency, package manifest and HTTP |
| UI-AC6 | Report measured layer and scope | Pixel comparison is not physical device/screen-reader/human UAT | Dated reports |

Allowed normalization: local CSS/JS content-hash URL query values, text line endings and existing
BUILD-INFO marker contents only. In paired rendering, baseline build markup may be inserted into
both DOMs strictly as an identity fixture; it is not a deployment claim. Data refresh is fixed with
the same catalog; vendor resources are blocked equally. Carousel is stopped on the same first slide;
fonts are ready and reduced motion is equal. Animation behavior is separately regression-tested.
Matrix: Chromium, scale=1, zoom=1; 1440×900/390×844/320×700 × light/dark; five SPA routes and
About/Contact/Privacy/404 documents = 54 paired views. No visible element is masked.

BDD-UI1: Given the pre-edit reference and corrected candidate under identical conditions, when desktop
and mobile views are rendered, then content/style contracts and pixels match.

BDD-UI2: Given the corrected candidate, when generate and package run again, then hiring UI does not
return and original CV/Projects/Contact functions remain available.

BDD-UI3: Given a rejected role menu injected into a disposable page, when the same oracle runs, then
the change is detected without changing the reference.

BA, developer, QA and DevOps reviewed these examples and seams before comparison implementation.
Required: independent immutable reference, same fixtures, narrow identity normalization, real negative
control, original assertions preserved and explicit Not Run limits. These are delegated AI role reviews,
not human approval. Results and commit/PR/run/artifact/live linkage: `docs/PORTFOLIO-DELIVERY.md`.

## Production preservation continuation, 2026-11-09

The owner selected the published source `e6fd8f9` as the visual and functional
reference and authorized conflict resolution without releasing the newer subtitle
animation or unrelated visual changes. Main `01e7a93` contains those changes plus
valid catalog synchronization. The resolution restores the published subtitle
markup and three stylesheets through a forward change. The original commits remain
in history. The scrollbar proposal remains available in `64a00b5` for separate
review of engines, scroll owners, and input modes.

The five conflicting HTML files were regenerated from that visual source, preserving
main's current catalog. Asset hashes reflect the actual LF source bytes. The test
mutation in `not-found-shell.test.js` is restored to the published plain subtitle.
The stylesheet and markup comparisons exclude no additional content.

The 52-file contract was checked against an independent worktree at `e6fd8f9`
with main's unchanged `data/` payload and the existing generators. Only the
`index.html` digest changes from the earlier reference, because the catalog
refresh removes the now-private portfolio repository from static Projects SEO
content. The candidate matched every independently derived file digest. The
contract records the published reference and catalog SHAs, and the normalization
rules are unchanged.

Local validation of the reconciled source passed the six focus cases on desktop
light and small-mobile dark. Twelve controlled Chromium screenshot pairs at
1440×900 and 390×844, both themes, About Me/Blog/Projects, matched the published
source with the same catalog fixture. This is a subset of the matrix above.
Production remains at `e6fd8f9`; hosted validation is required before merging.
