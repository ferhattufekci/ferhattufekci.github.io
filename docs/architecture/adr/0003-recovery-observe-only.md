# ADR 0003 — Keep CI failure recovery observe-only

**Status:** Accepted · **Date:** 2026-11-10

## Context
Some pipeline failures are infrastructure, not code: a cancelled job at a deadline, an apt
mirror stalling during browser installation. `scripts/ci/policy.mjs` can classify a failure
and `recovery.mjs` can rerun or dispatch a run in response. Acting automatically on that
classification is the tempting part and the dangerous part.

## Decision
The recovery workflow computes and records a decision on every failure but performs nothing
unless the repository variable `PORTFOLIO_RECOVERY_ACT` is `true`. It is off. Activation
requires the criteria in `docs/RECOVERY-ACTIVATION.md` to be met first, including evidence
about how `GITHUB_TOKEN`-initiated runs behave and how large the run-visibility lag is.

## Consequences
- **Good:** a decision log accumulates against real failures, so activation can be judged on
  evidence instead of intuition.
- **Good:** an automatic rerun cannot mask a genuine regression as flakiness — the failure
  mode that would most damage trust in the suite.
- **Bad:** infrastructure failures are retried by hand.
- **Note:** after ADR 0002 made publishing require an explicit `release_sha`, the recovery
  `dispatch` action can no longer publish anything by itself. Its original purpose has
  narrowed, which is an argument for redefining it rather than enabling it.
