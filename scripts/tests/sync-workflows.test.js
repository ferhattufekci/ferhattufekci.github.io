import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import YAML from 'yaml';
import { GITHUB_ACTIONS_APP, QUALITY_GATE, allowed, autoMergeAllowed, plan } from '../ci/sync-pr.mjs';

const repo = 'ferhattufekci/ferhattufekci.github.io';
const bot = 'portfolio-sync[bot]';
const pr = (over = {}) => ({ number: 5, user: { login: bot }, head: { ref: 'data-sync/medium-1', repo: { full_name: repo } }, base: { ref: 'main' }, parentSha: 'm1', treeSha: 't1', ...over });
const enforced = [{ type: 'required_status_checks', parameters: { strict_required_status_checks_policy: true, required_status_checks: [{ context: QUALITY_GATE, integration_id: GITHUB_ACTIONS_APP }] } }];
const files = names => names.map(filename => ({ filename }));

test('R-CI-01: sync workflows read with the job token and leave changes only through the App-token pull request step', async () => {
  for (const source of ['medium', 'github']) {
    const workflow = YAML.parse(await readFile(new URL(`../../.github/workflows/fetch-${source}.yml`, import.meta.url), 'utf8'));
    const job = workflow.jobs['fetch-and-commit'];
    assert.deepEqual(job.permissions, { contents: 'read' }, source);
    assert.equal(job.steps.find(step => step.uses?.startsWith('actions/checkout@')).with['persist-credentials'], false);
    const app = job.steps.find(step => step.uses?.startsWith('actions/create-github-app-token@'));
    assert.match(app.uses, /@[0-9a-f]{40}$/, 'pinned to a full SHA');
    assert.deepEqual(Object.keys(app.with).filter(key => key.startsWith('permission-')).sort(), ['permission-contents', 'permission-pull-requests']);
    assert.equal(app.with['permission-contents'], 'write');
    assert.equal(app.with['permission-pull-requests'], 'write');
    assert.equal(app.with['private-key'], '${{ secrets.SYNC_APP_PRIVATE_KEY }}');
    const last = job.steps.at(-1);
    assert.equal(last.run, `node scripts/ci/sync-pr.mjs ${source}`);
    assert.equal(job.steps.indexOf(app), job.steps.length - 2, 'the App token exists only for the final step');
    assert.doesNotMatch(JSON.stringify(job.steps), /git push|contents: write/);
  }
});

test('R-CI-01: Given unchanged data, then no PR is opened and the source\'s obsolete sync PR is closed', () => {
  const open = pr();
  assert.deepEqual(plan({ source: 'medium', changed: [], openPrs: [open], bot, repo, mainSha: 'm1', tree: null }), { action: 'none', close: [open], reason: 'main already has this data' });
});

test('R-CI-01: Given the same data on the same main, then the open PR is kept; changed data or a newer main opens one replacement', () => {
  const open = pr();
  const args = { source: 'medium', changed: ['data/medium-all.json'], openPrs: [open], bot, repo, mainSha: 'm1', tree: 't1' };
  assert.equal(plan(args).action, 'keep');
  assert.deepEqual(plan({ ...args, tree: 't2' }), { action: 'open', close: [open] });
  assert.deepEqual(plan({ ...args, mainSha: 'm2' }), { action: 'open', close: [open] });
  const github = pr({ head: { ref: 'data-sync/github-9', repo: { full_name: repo } } });
  const human = pr({ user: { login: 'someone' } });
  assert.deepEqual(plan({ ...args, openPrs: [github, human] }), { action: 'open', close: [] }, 'another source\'s PR and a human PR are never touched');
});

test('R-CI-01: Given generation changed a file outside the source scope, then the sync fails instead of opening a PR', () => {
  for (const path of ['js/main.js', '.github/workflows/pages.yml', 'data/github-repos.json', 'package-lock.json']) {
    const result = plan({ source: 'medium', changed: ['data/medium-all.json', path], openPrs: [], bot, repo, mainSha: 'm1', tree: 't1' });
    assert.equal(result.action, 'fail', path);
  }
  assert.ok(allowed('medium', 'about/index.html') && allowed('github', 'data/github-starred.json') && !allowed('github', 'data/medium-all.json'));
});

test('R-CI-01: Auto-merge is allowed only for the bot\'s own in-scope PR while main requires the Quality Gate from GitHub Actions and up-to-date branches', () => {
  const base = { source: 'medium', pr: pr(), files: files(['data/medium-all.json', 'index.html', 'sitemap.xml']), bot, repo, rules: enforced };
  assert.deepEqual(autoMergeAllowed(base), { ok: true, reasons: [] });
  const refused = [
    { pr: pr({ user: { login: 'dependabot[bot]' } }) },
    { pr: pr({ head: { ref: 'feature/x', repo: { full_name: repo } } }) },
    { pr: pr({ head: { ref: 'data-sync/medium-1', repo: { full_name: 'fork/repo' } } }) },
    { pr: pr({ base: { ref: 'release' } }) },
    { files: files(['data/medium-all.json', 'js/main.js']) },
    { files: [{ filename: 'data/medium-all.json', previous_filename: 'scripts/fetch-medium.js' }] },
    { files: [] },
    { files: files(Array.from({ length: 100 }, () => 'data/medium-all.json')) },
    { rules: [] },
    { rules: [{ type: 'required_status_checks', parameters: { strict_required_status_checks_policy: true, required_status_checks: [{ context: QUALITY_GATE }] } }] },
    { rules: [{ type: 'required_status_checks', parameters: { strict_required_status_checks_policy: false, required_status_checks: enforced[0].parameters.required_status_checks } }] }
  ];
  for (const change of refused) {
    const verdict = autoMergeAllowed({ ...base, ...change });
    assert.equal(verdict.ok, false, JSON.stringify(change).slice(0, 80));
    assert.ok(verdict.reasons.length > 0);
  }
});
