# ADR 0004 — Carry requirement ids in test titles and generate the matrix

**Status:** Accepted · **Date:** 2026-11-10 (recording a practice already in force)

## Context
A traceability matrix maintained by hand drifts from the suite within weeks and then misleads
the reader it was written for. The project had no separate requirements database, but it did
already have a convention: every test title begins with an id, `R-AREA-NN`.

## Decision
Treat the test titles as the single source of traceability. `scripts/generate-rtm.mjs`
extracts ids, behaviour text, layer and file into
`docs/business-analysis/requirements-traceability-matrix.md`, and
`scripts/tests/rtm.test.js` fails the build when the file is stale.

## Consequences
- **Good:** an id in the matrix always has a test, and a test with an id is always in the
  matrix. The document cannot become decorative.
- **Good:** adding a requirement is adding a test, which is the behaviour worth encouraging.
- **Bad:** the matrix only covers *requirement id → verifying test*. It does not link a
  business objective to a requirement, nor a requirement to the source file that implements
  it. Those directions remain prose, and the generated file says so.
- **Bad:** the title convention is now load-bearing; a test written without an id is invisible
  to traceability. The extractor's own tests assert the format it accepts.
