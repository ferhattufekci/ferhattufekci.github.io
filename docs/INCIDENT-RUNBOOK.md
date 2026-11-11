# Incident and rollback runbook

**🇬🇧 English | [🇹🇷 Türkçe](INCIDENT-RUNBOOK.tr.md)**

What to do when the published site is wrong, broken or must come down. It states what the
pipeline actually allows; read [CI-CD.md](CI-CD.md) for how the pipeline works.

## Facts this plan depends on

| Fact | Where it is enforced |
|---|---|
| Only the **current head of `main`** can be published. An older SHA cannot be redeployed directly. | `requireCurrentSource` in `scripts/ci/commands.mjs` (`current` step of `pages.yml`) |
| Publishing needs a manual `workflow_dispatch` of **Portfolio CI/CD** with `release_sha` = that head. Pushes, PRs and data syncs never publish. | `pages.yml`, ADR 0002 |
| Force-push and deletion of `main` are blocked for everyone except the repository admin. | Ruleset "Protect main" |
| Nothing rolls back automatically. Recovery automation is observe-only. | ADR 0003, `PORTFOLIO_RECOVERY_ACT` unset |
| A full release takes about **30 minutes**: quality gate ≈ 27 min, deploy ≈ 25 s, production verification ≈ 1 min (run 42872535005). | Measured |
| The live site reports its own source in `/build-metadata.json` (`sourceSha`) and in the footer build link. | `scripts/package-pages.mjs` |

## 1. Identify what is live

```bash
curl -s https://ferhattufekci.github.io/build-metadata.json
```

Note `sourceSha` and `build.runUrl`. Compare `sourceSha` with the last known-good release in the
Actions history (a **Portfolio CI/CD** `workflow_dispatch` run whose Verify Production passed).

## 2. Decide the response

| Situation | Response |
|---|---|
| A recent release broke something | **Roll back by revert** (section 3) |
| Verify Production failed but the site looks right | Rerun the failed jobs on the same SHA while it is still the head of `main`; see CI-CD.md "Production checks and failure handling" |
| A data sync published bad Medium/GitHub content | Revert the data commit (section 3), or add the item to `EXCLUDE` in the fetcher and release |
| A third-party service is down (AdSense, Calendly, Analytics, Google Fonts) | No action. These are optional and degrade without breaking the page (R-AD-03, R-EXTERNAL-01) |
| Content must be taken down **now** (legal, security, personal data) | **Unpublish** (section 4), then fix and release |

## 3. Roll back by revert (normal path)

1. Find the commit or merge that introduced the problem: `git log --oneline origin/main`.
2. Revert it on a branch and open a PR. For a merge commit, revert against its first parent:
   ```bash
   git switch -c revert/<short-sha> origin/main
   git revert -m 1 <merge-sha>   # use plain `git revert <sha>` for a normal commit
   git push -u origin revert/<short-sha>
   ```
3. Let the PR's Portfolio CI/CD pass, then merge it.
4. In Actions run **Portfolio CI/CD** with `release_sha` = the new head of `main` (the merge commit).
5. When Verify Production passes, check that `/build-metadata.json` shows the new `sourceSha`.

Expected time to a verified rollback: about 30 minutes, plus PR review. Do not force-push `main`
to an older commit: it rewrites history, the scheduled data commits are lost, and the release
gate would still require a fresh run.

## 4. Emergency unpublish

When even 30 minutes is too long: **Settings → Pages → Unpublish site** (or set the source to
"None"). The site returns 404 until Pages is enabled again and a release is dispatched. This is a
repository setting and needs the owner.

## 5. After the incident

- Record what happened, the live SHA before and after, and the run links in `docs/OPEN-ITEMS.md`.
- Add a regression test that would have failed before the fix.
- If a pipeline step should have caught it, change the gate, not the assertion.

## Readiness

| Check | Status |
|---|---|
| Revert-and-release path follows the enforced release rules | Documented from the code above |
| A real rollback rehearsal (revert → CI → dispatch → verify) | **NOT VERIFIED.** No rehearsal has been run. Do one on a harmless commit before relying on the 30-minute figure. |
| Unpublish | **NOT VERIFIED.** GitHub UI action, not exercised. |
