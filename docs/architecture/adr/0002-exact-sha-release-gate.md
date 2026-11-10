# ADR 0002 — Deploy only the exact SHA that was tested

**🇬🇧 English | [🇹🇷 Türkçe](0002-exact-sha-release-gate.tr.md)**

**Status:** Accepted · **Date:** 2026-11-10 (recording a decision already in force)

## Context
`main` receives commits from two scheduled data fetchers as well as from people. With a naive
pipeline, a run that started on commit A can finish and deploy after commit B has landed, so
what reaches production is not what was tested. A production failure
(`Reject superseded release`, run on 2026-11-05) made this concrete.

## Decision
`pages.yml` resolves one immutable source SHA in a first job, every later job checks out that
exact SHA, the artifact is byte-verified before production verification, and the deploy job
refuses to publish when `main` has moved on. Publishing now requires an explicit
`release_sha`, so a release is always a deliberate act on a named commit.

## Consequences
- **Good:** what is verified and what is served are provably the same bytes.
- **Good:** two concurrent pushes cannot interleave into a half-new site.
- **Bad:** a superseded run fails rather than silently re-running, which looks like a red
  pipeline when it is in fact the gate working.
- **Bad:** publishing is now a manual step; the site can sit behind `main` until someone
  dispatches a release. That is accepted: a wrong deploy costs more than a late one.

## Related
`docs/CI-CD.md`; recovery behaviour in ADR 0003.
