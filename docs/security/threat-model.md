# Threat Model

Scope: the published site, the generated data and the release pipeline. Evidence levels as in
`docs/ENGINEERING-ASSESSMENT.md`.

## Assets

| Asset | Why it matters |
|---|---|
| The published site | It is the author's professional record; defacement or injected content is the real damage. |
| The release pipeline | Write access to `main` or to the Pages deployment is equivalent to controlling the site. |
| The generated catalogue (`data/*.json`) | It is third-party content that the page renders. |

There is no user data, no account, no session and no payment path [D]: the site stores
nothing about visitors beyond what Google Analytics and AdSense collect through their own
scripts.

## Trust boundaries

1. **Medium RSS feed → `data/medium-*.json` → DOM.** The feed is fetched by
   `scripts/fetch-medium.js`, committed, then rendered. Titles and excerpts reach the DOM via
   `textContent` [D]. Links reach it via `link.href = art.url` and `image.src = art.thumbnail`
   [D] — an attribute sink where a `javascript:` scheme executes. **Control:** `safeUrl()` at
   generation time plus `scripts/tests/data-contract.test.js` on the committed data.
2. **GitHub REST API → `data/github-*.json` → DOM.** Project cards are built as an HTML
   string and assigned with `innerHTML` [D]. Text fields are escaped by `escHtml` (`& < > "`).
   The repository link is rendered as `href="${escHtml(r.url)}"`; escaping prevents breaking
   out of the attribute but not a `javascript:` scheme, so `html_url` is now validated by
   `safeUrl()` at generation time and a repository with an unsafe URL is not published.
   Three values are interpolated **unescaped**: `l.color`/`r.langColor` into
   `style="background:…"`, and `percent`/`stars`/`forks` as text. The colours come from a
   local `LANG_COLORS` map in `fetch-github.js`, never from the API [D], so they are not
   attacker-controlled. That was an implicit assumption; `R-DATA-COLOR-01` and
   `R-DATA-NUM-01` now assert it on the committed data, so a future change that starts taking
   colours from the API fails the suite instead of silently opening an attribute injection.
3. **Third-party scripts in the page** (Google Analytics, AdSense, Calendly). These execute
   with full page privileges by design. Nothing in this repository constrains them; a CSP
   would, which is finding F-2.
4. **Pipeline → production.** `pages.yml` resolves one source SHA, tests that artifact and
   refuses a superseded release. Actions are SHA-pinned; permissions are least-privilege;
   deployment uses the `github-pages` environment [D].
5. **Recovery automation.** `recover-release.yml` can rerun or dispatch runs. It is
   observe-only unless `PORTFOLIO_RECOVERY_ACT` is `true`, which is off [G]. It checks out
   with `persist-credentials: false` and holds `contents: read`, `actions: write`.

## Risks and status

| # | Risk | Status |
|---|---|---|
| T1 | Hostile URL scheme in feed or API data becomes an executing `href`/`src` | **Mitigated**: `safeUrl()` at generation; behavioural tests R-DATA-URL-03/04 against a fake feed and API; data contract R-DATA-URL-01/02 |
| T2 | Unescaped attribute interpolation in project cards | **Constrained**: values are local literals; invariant now asserted |
| T3 | No CSP, so any injected script runs unconstrained | **Open** (F-2): blocked on inline-script extraction |
| T4 | Compromised third-party action alters the release | **Mitigated**: all actions pinned to SHA |
| T5 | Vulnerable devDependency | **Open** (F-3): no scanning configured |
| T6 | Recovery automation acts on a stale or wrong run | **Mitigated by default**: observe-only; activation criteria in `docs/RECOVERY-ACTIVATION.md` |
| T7 | Mixed content from an `http://` cover image (`image.src`) on the https site | **Open, low**: `safeUrl()` allows `http:`; no `http` thumbnail exists in the data today [D]. (Three repositories have `http` homepages, but `homepage` is not rendered, and a plain link is navigation, not mixed content.) |

## What was deliberately not done

- No CSP was added — see F-2 for why a weak one would be worse than none.
- No change to AdSense, analytics or privacy configuration: those are live account settings,
  outside what this repository should alter unilaterally.
- No assertion was relaxed and no retry was introduced to make a red test green.
