# ADR 0004 — Carry requirement ids in test titles and generate the matrix

**🇬🇧 English | [🇹🇷 Türkçe](0004-requirement-ids-in-test-titles.tr.md)**

**Status:** Accepted · **Date:** 2026-11-10 (recording a practice already in force)

## Context
A traceability matrix maintained by hand drifts from the suite within weeks and then misleads
the reader it was written for. The project had no separate requirements database, but it did
already have a convention: every test title begins with an id, `R-AREA-NN`.

## Decision
Treat the test titles as the single source of traceability. `scripts/generate-rtm.mjs`
extracts ids, behaviour text, layer and file into
`docs/business-analysis/requirements-traceability-matrix.md`, and
`scripts/tests/rtm.test.js` fails the build when the file is stale, and when an independent
scan of every test title (a different, looser pattern) finds an id the generator did not list.

## Consequences
- **Good:** an id in the matrix always has a test, and an id that appears in a test title but
  not in the matrix fails the build. The second guarantee was added after an independent
  review found the first generator silently dropping multi-id titles (`R-PROGRESS-01/02/04`),
  nine ids in all — the staleness check alone could not catch that, because it compares the
  generator with its own output.
- **Good:** adding a requirement is adding a test, which is the behaviour worth encouraging.
- **Bad:** the matrix only covers *requirement id → verifying test*. It does not link a
  business objective to a requirement, nor a requirement to the source file that implements
  it. Those directions remain prose, and the generated file says so.
- **Bad:** the title convention is now load-bearing; a test written without any id is still
  invisible to traceability.
