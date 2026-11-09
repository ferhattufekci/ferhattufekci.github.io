# REQ-FOCUS-01 — navigation completion respects a newer focus choice

Owner: developer role. Date: 2026-11-08. Baseline: `995586066b031e1475ff71dcae3d9ca4ee3e829f`.
Status: delegated role review passed; implementation and local verification recorded below.
This is not human approval, a completed release gate, or production verification.

## Problem and scope

A keyboard visitor can begin interacting with the available incoming page while
its visual transition is completing. Navigation must establish a sensible initial
focus without overriding that newer choice. The original CI run
`42457503796`, attempt 1, failed R-FILTER-04 (small-mobile-dark): All was expected,
EN remained selected, and heading focus was recorded. Local diagnostic reruns
have passed; the original reduced-motion CI timing remains under investigation.
A separately reproduced completion race must not be presented as proof of that
CI root cause without matching evidence.

## Contract, examples and test seam

| AC | Rule | Positive / negative / boundary |
| --- | --- | --- |
| FOCUS-AC1 | A newer explicit focus choice in the incoming, non-inert page survives completion | Focus All and hold Space during a real visual transition; complete transition; release Space: All selected and button still focused. Heading override fails. |
| FOCUS-AC2 | An untouched navigation still gives the destination its initial focus | With no newer input, completing menu navigation focuses its heading. Omitting all focus management fails. |
| FOCUS-AC3 | Keyboard arrow navigation keeps arrow focus unless a newer choice is made | Enter on Next leaves Next focused after completion; a newer control in the destination takes precedence. |
| FOCUS-AC4 | Existing route/filter contracts remain intact | R-FILTER-04 and R-KEYBOARD-08 plus relevant motion/history/navigation regressions preserve assertions and retries=0. |

BDD-F1: Given Blog is becoming available after a menu navigation and the visitor
has focused All and pressed Space down, when the visual transition completes and
Space is released, then All is selected and navigation does not take focus away.

BDD-F2: Given no visitor focus choice after menu navigation begins, when Blog
settles, then its heading receives initial focus and the next Tab reaches its
first control.

The test seam is the actual served page, native keyboard events and observable
focus/selection. A test-only controllable completion gate may delay the real
motion watcher's finished promise to select the interleaving; no product action
or selection is mocked. This checks lifecycle ordering, not every browser's native
fragment scheduling. The original test is repeated separately as diagnostic
evidence, never substituted by retries or a widened timeout.

Risks: changing completion focus may affect menu/arrow/skip/history behavior.
No public route, dependency, workflow or third-party integration is added.
Rollback is a normal revert through the existing quality gates.

## Traceability and gates

Reliable keyboard journey → REQ-FOCUS-01 → FOCUS-AC1..4 → BDD-F1/F2 →
`tests/browser/navigation-focus.spec.mjs` and existing suites →
`js/pages-switcher.js` → integration commit/PR/CI/live evidence assigned by root.

DoR: BA, developer, QA and DevOps example/seam review recorded.
DoD: behavioral RED then minimal GREEN, original diagnostic rerun and relevant
regressions, and honest separation of the reproduced defect from unresolved CI
causality. Source instrumentation and temporary probes are removed from delivery.

## Review, implementation and scope preservation record

Before implementation, developer proposed the served-page/native keyboard seam;
QA supplied the newer-focus and untouched-navigation counterexamples; BA/root
accepted the user-value and boundary examples; DevOps accepted the bounded change
and release/rollback surface. These are delegated AI role reviews, not independent
human approval. The user's revised frontend-preservation instruction keeps this
technical defect fix in scope: it adds no content, route, control, style or motion.

The minimal implementation checks whether an available descendant of the incoming
page already owns focus. If so, completion does not replace that newer choice with
the heading or the navigation arrow. Focus on the page element itself still allows
the existing initial-heading behavior. Existing navigation, filter and motion
assertions, retry count and timeouts remain unchanged.

Evidence (2026-11-08): the pristine baseline source fixture at SHA `9955860` fails
both R-FOCUS-09 and R-FOCUS-11 with `{ focused: false, selected: 'false' }`; its
untouched-heading control R-FOCUS-10 passes. The same test file passes all three
examples across six Chromium viewport/theme projects after the guard: 18/18.
The source fixture is a local package with build identity `null`, not the published
CI artifact. Logs and failed trace/screenshot/video stay outside the public site
and repository delivery at `work/evidence/focus/` in the task workspace.

The original CI R-FILTER-04 is not declared fixed by this separate no-preference
motion example. Reduced-motion policy chooses a synchronous zero-animation path;
the exact interleaving in run `42457503796` remains unproven. Diagnostic passes are
recorded separately and do not erase that failure. Full artifact/CI/live evidence
must be attached by the integration owner before changing release status.
