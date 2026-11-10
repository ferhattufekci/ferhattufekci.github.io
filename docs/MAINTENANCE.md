# Maintenance guide

**🇬🇧 English | [🇹🇷 Türkçe](MAINTENANCE.tr.md)**

Implementation notes for maintainers, moved out of the README so the README stays an
overview. [Back to README](../README.md#maintenance-guide)

## Agent readiness and verification

The site is published at `https://ferhattufekci.github.io` on GitHub Pages. Pages uses `build_type=workflow`: `pages.yml` → shared quality job → `.pages-site` artifact containing only public files → deployment → live GET verification. `.nojekyll` is retained. Node is used only for generation and testing. A failed quality job blocks deployment; data commits made with GITHUB_TOKEN are tested through `workflow_run`. Flow, concurrency, runtime, reports and failure-investigation commands are in the [CI/CD guide](CI-CD.md).

| Source | Producer / consumer |
| --- | --- |
| Medium RSS / GitHub API | `scripts/fetch-medium.js`, `scripts/fetch-github.js` → `data/*.json`; the browser's Blog/Projects sections and generators read these snapshots |
| `data/github-repos.json`, `data/medium-all.json` | `build-static-seo.js` → marked noscript sections in `index.html` and lists in `llms.txt` |
| `index.html`, `content/trust-pages.json`, `js/theme-init.js`, `js/error-card.js` | `build-agent-content.mjs` → `index.md`, trust-page HTML/Markdown, `404.html`, `404.md`, `sitemap.xml` |
| `llms.txt`, `agent-instructions.md` | Manually maintained usage guidance; marked lists in llms.txt are generated automatically |

Update the source rather than editing a generated file alone, then run `npm run generate`. The Person description and static contact links live in `index.html`. Trust-page content comes from `content/trust-pages.json`; the privacy text describes the existing Analytics, AdSense, Calendly and browser storage usage. Provider and consent-management settings are the site owner's responsibility.

**Platform limits:** GitHub Pages does not run application code that changes a URL's body and Content-Type based on Accept; it also [does not support custom MIME configuration](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site#mime-types-on-github-pages). `/index.md` is a useful alternative representation, not Markdown negotiation on the homepage. `/404.html` provides explanatory HTML and a real 404 for missing root and nested paths; it does not provide a Markdown error response. Since fragments are not sent to the server, `/#resumes` shows a client-side 404 view within an HTTP 200 document. The MIME type of `.md` files is measured from live responses.

**Shared 404 and controls:** `js/error-card.js` owns the heading, message and recovery destinations for both error views. The generator extracts the sidebar, mobile header and navigation from `index.html` through `scripts/lib/not-found-document.mjs`; `js/site-shell.js` handles the shared drawer and measured header height without SPA/plugin dependencies. Static 404 links and assets are root-absolute. There is no redirect: missing paths retain HTTP 404 and `noindex`; invalid fragments retain HTTP 200. About/Contact/Privacy keep their simple document layout. Both recovery links reuse the unchanged About Me Resume CTA.

Theme and menu controls share `.icon-btn`: hover is limited to fine pointers with hover support, pressed feedback ends on release, and keyboard focus uses `:focus-visible`. Closing by Escape/keyboard restores drawer focus; pointer closes do not steal it. Reduced motion disables icon rotation/scaling. The neutral base margin also keeps trust-page theme controls aligned.

**Trust-page navigation:** About, Contact and Privacy remain indexable, linked in the sitemap/agent guide, and available through the footer. Their header contains only “← Back to portfolio” (`/`, opening About Me) and a right-aligned theme toggle. The footer marks the current page as non-clickable text with `aria-current="page"`; its link list lives in `scripts/lib/agent-documents.mjs`. Both header targets are at least 44px tall. Navigation is excluded from Markdown, so this layout does not change the trust content or its Markdown outputs. The full-shell 404 keeps its existing navigation.

**Page transitions:** Mobile navigation waits for the drawer/overlay to close before the existing 300ms 2D slide; route order determines direction. Reduced motion skips sliding and drawer motion. Desktop animation selection stays unchanged. Optional engine regression: `npx playwright install webkit`, then `npm run test:motion:webkit`; see the [test strategy](../TEST-STRATEGY.md#test-strategy-en) for lifecycle and emulation limits.

**Accessibility baseline:** the existing Resume CTA palette and some existing sidebar text/link colors have light-theme contrast/distinguishability findings. They are preserved by the requested design constraint. The axe regression test scans and records these inherited findings against the actual source shell/CTA; unexpected findings still fail. The CTA baseline is measured on the theme surface because the hero image makes its original contrast inconclusive. This is not a claim of full WCAG conformance; correcting these colors requires a separate design change.

**MCP:** The portfolio provides no MCP server, product API or tool service. An MCP server needs a POST/JSON-RPC runtime, which GitHub Pages cannot host, so no placeholder manifest (such as `/.well-known/mcp`) is added; a static file would not create a service.

```powershell
npm ci
npx playwright install chromium
npm run build
npm run verify -- --local --artifact --all --output=verification-local.json
npm run verify -- https://ferhattufekci.github.io --all --output=verification-production.json
```

Each verification run generates fresh UUID root and nested paths absent from the public inventory, then GETs the homepage and those paths with both Accept values. It records status, final URL, Content-Type, Vary and body evidence. Network, HTTP and content/format errors are distinct; an HTML fallback with status 200 is not valid JSON. Unsupported platform capabilities remain in `limitations`, do not count as passed capabilities and do not permanently break normal CI. A local server cannot prove the real Pages header behavior; inspect the post-deployment report together with the Actions commit.

Format references: [llms.txt proposal](https://llmstxt.org/), [GitHub Pages custom 404](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site). Risk coverage, the category decision table, FIRST and BDD are documented in the [Test strategy](../TEST-STRATEGY.md#test-strategy-en).

## Resume navigation and disclosures

Resume has a section navigation bar using the shared category-control styles, named **Resume section navigation** for assistive technology. Its ten buttons scroll the Resume content panel without changing `#resume`, browser history, CV content, or native disclosure state. All returns the panel to its beginning; Summary has its own selection and focus destination, which may share the same initial scroll position. Selection records the last navigation choice and resets to All on Resume activation. Keyboard activation focuses the target; reduced motion skips smooth scrolling. The final Certifications/PDF group has a minimum height equal to the content viewport so Certifications can align at its top even with the disclosure closed; unused space follows the PDF. The group grows with expanded content and releases that minimum when printed.

Resume, Blog, Projects and Contact share `css/page-content-panels.css`: a natural-height title/control row and one `minmax(0, 1fr)` content row. Only the named, keyboard-focusable `.page-content-panel` scrolls vertically. The existing global mobile header positions the page, so no extra header offset or duplicate controls are needed. `js/page-content-panels.js` supplies the scroll owner, activation/filter resets, and paging keys when the region itself is focused. Wheel, touch and descendant control keys stay native. Changed category/language selections reset only their results; horizontal bar scrolling and repeated selections retain the content position. Contact uses the same fixed title/description row and a named Contact content region for its four communication cards; it adds no filter controls. Print and no-JavaScript layouts release screen overflow constraints.

Resume disclosures use **Show More (+N)** / **Show Less** (Summary has no count). `scripts/lib/resume-disclosures.mjs`, called by `npm run generate`, derives N from the semantic HTML lists and the existing decorative previews, and adds school/employer context to the accessible names. Edit the CV lists/previews in `index.html`, then regenerate; do not hand-maintain counts. With no additional records the generator emits ordinary content. Native `details/summary` owns expansion state. Navigation and disclosure controls are excluded from CV Markdown; the original PDF action remains.

## Manual advertising units

`js/adsense.js` owns both Projects and Blog units; `css/adsense.css` owns their
outer presentation. Only provider `data-ad-status` determines fill. Confirmed
no-fill and SDK load failures collapse the empty shell; pending and optimized
responses are retained. Hidden pages do not expose unrequested units to the
global SDK queue.
A unit may name its page's loading placeholder in `data-ad-await` (Projects and
Blog do); it is requested only after that placeholder is hidden, so the one request
is made against the final content layout instead of the empty loading state
(`AC-05/13`). Provider creatives are neither clipped nor recolored.

The application content grid remains bounded by its containing page even when
the fluid SDK applies important auto height to that ancestor. This preserves the
inner Projects/Blog scrollport without rewriting provider styles or creative sizes.
`R-AD-SCROLL-01` reproduces that external sizing side effect and checks wheel/touch,
fixed controls and keyboard paging across provider fill states.

Starred expansion uses the pure `js/starred-ad-planner.js` and the same ad owner.
`js/adsense-config.js` enables the configured In-feed unit for manual expansion.
Static Projects uses `autorelaxed` with the account's Multiplex slot (`1912820269`, "multiplex reklam yatay esnek"):
the format must match the slot's unit type in AdSense, and `2029775306` is an In-article unit.
Static Blog uses the account's In-article code for `2029775306` verbatim
(`data-ad-layout="in-article"`, `fluid`; no layout key, which is an In-feed attribute). These existing static settings are not
reused for new dynamic placements. Every 40 unique manually revealed cards can reserve one
placement, with at most two per document; failed/no-fill reservations still count.
The first 20 cards, filters, themes and revisits do not create opportunities.
Run the two advertising browser specs and both advertising Node test files after
changes. Synthetic provider tests do not prove account approval or real ad fill.
