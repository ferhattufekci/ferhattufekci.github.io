# ADR 0005 — Validate third-party URL schemes when data is generated

**Status:** Accepted · **Date:** 2026-11-10

## Context
The page assigns values from the generated catalogue straight to `href` and `src`. Those
values originate in the Medium RSS feed and the GitHub API. A `javascript:` scheme in such a
value executes when clicked. The check could live in the renderer (`index.html`), in the
generator (`scripts/fetch-*.js`), or in both.

## Decision
Validate at the generator — the trust boundary — in one shared helper
(`scripts/lib/safe-url.mjs`), and assert the resulting invariant on the committed data in
`scripts/tests/data-contract.test.js`. Parse with `new URL()` rather than matching the raw
string, because browsers strip leading control characters and ignore tab/newline inside a
scheme, so `" java\tscript:x"` is a live javascript URL that a naive regular expression misses.
Return the serialized URL (`parsed.href`), not the raw input: the raw string is what the
browser would re-parse, and it can differ from what was checked. Resolve scraped relative
covers against the article URL instead of dropping them.

Verify by running the real fetch entry points against a local fake feed and API that serve
hostile URLs (`R-DATA-URL-03/04`), not by inspecting the generator source: a source-grepping
test was tried first and an independent review showed it passed with the guards removed.

## Consequences
- **Good:** one rule in one place, and the repository's own data is the artifact under
  contract — a violation is visible in a diff, not only at runtime.
- **Good:** `index.html`'s inline scripts are untouched, which matters while they are frozen
  under characterization tests pending extraction (F-4).
- **Bad:** it is a single layer. Data hand-edited into `data/*.json` bypasses the generator;
  the contract test is what catches that, and only at test time.
- **Bad:** an unsafe article link is dropped silently rather than reported. Acceptable for a
  feed the author owns; worth revisiting if the source ever widens.
