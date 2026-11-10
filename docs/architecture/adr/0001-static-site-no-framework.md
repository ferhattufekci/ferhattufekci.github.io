# ADR 0001 — Keep a static, framework-free site

**🇬🇧 English | [🇹🇷 Türkçe](0001-static-site-no-framework.tr.md)**

**Status:** Accepted · **Date:** 2026-11-10 (recording a decision already in force)

## Context
The site is one person's portfolio: a handful of sections, content generated from two public
feeds, no accounts and no server-side state. It is hosted on GitHub Pages, which serves static
files and runs nothing. The existing code is HTML, CSS, jQuery 3.6 and plain ES5-era scripts.

## Decision
Keep it static and framework-free. Do not introduce React/Vue/a bundler, and do not add a
backend. Generated content stays as committed JSON produced by scheduled workflows.

## Consequences
- **Good:** no build toolchain to keep alive, no dependency churn in the shipped page, the
  deployable artifact is exactly what is reviewed, and the hosting cost stays zero.
- **Good:** the whole runtime is inspectable in a browser's view-source, which suits a
  portfolio whose point is to be read.
- **Bad:** no component model, so shared markup is assembled by string concatenation, and
  `index.html` has grown large (F-4). This is the price being paid, and it is being addressed
  by extracting inline scripts into modules (`docs/T-4-INLINE-SCRIPTS.md`), not by adopting a
  framework.
- **Bad:** no compile-time type checking (F-5).

## Alternatives considered
- **A static-site generator (Eleventy, Astro).** Would fix templating duplication, but adds a
  build step and a dependency tree to a site whose page count is fixed and small.
- **A framework SPA.** The routing and transitions already exist and are covered by tests; a
  rewrite would trade a working, tested implementation for an unproven one.
