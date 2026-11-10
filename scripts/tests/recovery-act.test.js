import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// C1 (docs/RECOVERY-ACTIVATION.md §8): real subprocess tests of the recovery
// command. `node scripts/ci/commands.mjs recover` runs for real; only the two
// programs it shells out to (gh, git) are replaced at the child-process boundary.
// The shims answer with the response shapes that R-CI-RECOVER-14 and the
// recorded Actions runs established (single object for a run, array of pages for
// --paginate --slurp). They prove what this repository's code asks GitHub to do,
// not how GitHub reacts: rerun/dispatch semantics are the subject of D-1.
const here = dirname(fileURLToPath(import.meta.url));
const ciDir = join(here, '..', 'ci');
const fixture = JSON.parse(readFileSync(join(here, 'fixtures', 'deploy-recovery-runs.json'), 'utf8'));
const clone = (value) => structuredClone(value);
const REPO = 'ferhattufekci/ferhattufekci.github.io';
const TIP = fixture.timeout.run.head_sha;
const OTHER_TIP = 'a'.repeat(40);

const FAKE_GH = `const fs = require('fs');
const argv = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify({ tool: 'gh', argv }) + '\\n');
const sc = JSON.parse(fs.readFileSync(process.env.FAKE_SCENARIO, 'utf8'));
const run = argv[0] === 'run' && argv[1] === 'rerun';
const dispatch = argv[0] === 'workflow' && argv[1] === 'run';
if (argv[0] === 'api') {
  const url = argv[argv.length - 1];
  let out;
  if (url.includes('/annotations')) out = [(sc.annotations || {})[url.match(/check-runs\\/(\\d+)/)[1]] || []];
  else if (url.includes('/jobs?')) out = [{ jobs: sc.jobs }];
  else if (url.includes('/workflows/pages.yml/runs')) out = { workflow_runs: sc.tipRuns || [] };
  else if (url.endsWith('/git/ref/heads/main')) out = { ref: 'refs/heads/main', object: { type: 'commit', sha: process.env.FAKE_MAIN_SHA } };
  else if (/\\/attempts\\/\\d+$/.test(url)) out = sc.run;
  else if (/\\/actions\\/runs\\/\\d+$/.test(url)) out = { ...sc.run, run_attempt: sc.latestAttempt ?? sc.run.run_attempt };
  else { console.error('fake gh: unexpected api call ' + url); process.exit(2); }
  console.log(JSON.stringify(out));
} else if (run || dispatch) {
  if (sc.actExit) { console.error('gh: HTTP 403: Resource not accessible by integration'); process.exit(sc.actExit); }
  console.log('fake gh: accepted');
} else { console.error('fake gh: unexpected command ' + argv.join(' ')); process.exit(2); }
`;
const FAKE_GIT = `const fs = require('fs');
const argv = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify({ tool: 'git', argv }) + '\\n');
// The recovery job has no git credentials: any git network call fails exactly as it does there.
console.error("fatal: could not read Username for 'https://github.com': No such device or address");
process.exit(128);
`;
const EXTERNAL_COMMANDS = `const childProcess = require('node:child_process');
const { syncBuiltinESMExports } = require('node:module');
const { join } = require('node:path');
const exec = childProcess.execFileSync;
childProcess.execFileSync = (file, args, options) => {
  if (file !== 'gh' && file !== 'git') throw new Error('Unexpected external command: ' + file);
  return exec(process.execPath, [join(__dirname, file + '.cjs'), ...args], options);
};
syncBuiltinESMExports();
`;

const sandboxes = [];
function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'recovery-act-'));
  sandboxes.push(dir);
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'gh.cjs'), FAKE_GH);
  writeFileSync(join(bin, 'git.cjs'), FAKE_GIT);
  const preload = join(bin, 'external-commands.cjs');
  writeFileSync(preload, EXTERNAL_COMMANDS);
  return { dir, preload };
}
test.after(() => sandboxes.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

// The real recovery CLI calls only the two test subprocesses. This uses Node's
// own executable so it works where Windows cannot execute POSIX shebangs.
function recoverCommand({ command = 'recover', args = ['42043003964', '1'], scenario = {}, env = {}, dir = ciDir, mainSha = TIP, event } = {}) {
  const { dir: root, preload } = sandbox();
  const scenarioFile = join(root, 'scenario.json');
  const log = join(root, 'calls.jsonl');
  const summary = join(root, 'summary.md');
  writeFileSync(scenarioFile, JSON.stringify(scenario));
  writeFileSync(log, '');
  writeFileSync(summary, '');
  const eventFile = join(root, 'event.json');
  const output = join(root, 'output.txt');
  writeFileSync(output, '');
  if (event) writeFileSync(eventFile, JSON.stringify(event));
  const result = spawnSync(process.execPath, ['--require', preload, join(dir, 'commands.mjs'), command, ...args], {
    encoding: 'utf8',
    timeout: 20000,
    env: {
      PATH: '',
      FAKE_SCENARIO: scenarioFile,
      FAKE_LOG: log,
      FAKE_MAIN_SHA: mainSha,
      GITHUB_STEP_SUMMARY: summary,
      GITHUB_OUTPUT: output,
      ...(event ? { GITHUB_EVENT_PATH: eventFile } : {}),
      ...env
    }
  });
  const calls = readFileSync(log, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    calls,
    summary: readFileSync(summary, 'utf8'),
    output: readFileSync(output, 'utf8'),
    actions: calls.filter((c) => c.tool === 'gh' && c.argv[0] !== 'api'),
    apiCalls: calls.filter((c) => c.tool === 'gh' && c.argv[0] === 'api')
  };
}
const timeoutScenario = (extra = {}) => ({ ...clone(fixture.timeout), tipRuns: [], ...extra });
// A rejected-as-superseded run whose commit is no longer the tip of main.
const supersededScenario = (extra = {}) => ({ ...clone(fixture.superseded), tipRuns: [], ...extra });
const RERUN = ['run', 'rerun', '42043003964', '--failed', '--repo', REPO];
const DISPATCH = ['workflow', 'run', 'pages.yml', '--ref', 'main', '--repo', REPO];

test('R-CI-RECOVER-C1-00: the shims stand in for gh/git, nothing else is reachable, and git is never needed', () => {
  const { preload } = sandbox();
  const blocked = spawnSync(process.execPath, [
    '--require', preload, '-e', "require('node:child_process').execFileSync('unexpected')"
  ], { encoding: 'utf8', env: { PATH: '' } });
  assert.equal(blocked.status, 1);
  assert.match(blocked.stderr, /Unexpected external command: unexpected/);
  const run = recoverCommand({ scenario: timeoutScenario() });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(run.calls[0], { tool: 'gh', argv: ['api', `repos/${REPO}/git/ref/heads/main`] });
  assert.deepEqual(run.calls.filter((c) => c.tool === 'git'), [], 'the recovery job has no git credentials: git must not be used');
  assert.ok(run.apiCalls.length >= 3, 'the command must read through the shim');
});

test('R-CI-RECOVER-C1-01: observe mode reports the decision and runs no action', () => {
  // Only the exact string "true" enables acting; every other value must not.
  for (const value of [undefined, '', 'false', 'TRUE', 'True', '1', 'yes', ' true', 'true ', 'ture']) {
    const env = value === undefined ? {} : { RECOVERY_ACT: value };
    const run = recoverCommand({ scenario: timeoutScenario(), env });
    assert.equal(run.status, 0, `${JSON.stringify(value)}: ${run.stderr}`);
    assert.deepEqual(run.actions, [], `RECOVERY_ACT=${JSON.stringify(value)} must not act`);
    assert.match(run.stdout, /recovery=rerun mode=observe performed=false/);
    assert.match(run.summary, /- Mode: observe only/);
  }
});

test('R-CI-RECOVER-C1-02: act mode reruns a deadline-cancelled run with exactly the documented command', () => {
  const run = recoverCommand({ scenario: timeoutScenario(), env: { RECOVERY_ACT: 'true' } });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(run.actions.map((c) => c.argv), [RERUN]);
  assert.match(run.stdout, /recovery=rerun mode=act performed=true/);
  assert.match(run.summary, /- Decision: \*\*rerun\*\*\n- Mode: act\n- Performed: true/);
});

test('R-CI-RECOVER-C1-03: act mode dispatches only when nothing covers the newest commit', () => {
  const dispatched = recoverCommand({
    scenario: supersededScenario(),
    env: { RECOVERY_ACT: 'true' },
    mainSha: OTHER_TIP
  });
  assert.equal(dispatched.status, 0, dispatched.stderr);
  assert.deepEqual(dispatched.actions.map((c) => c.argv), [DISPATCH]);
  assert.match(dispatched.stdout, /recovery=dispatch mode=act performed=true/);

  const base = supersededScenario();
  const covering = { ...base.run, id: 1, head_sha: OTHER_TIP, event: 'workflow_run', run_attempt: 1, conclusion: null };
  const covered = recoverCommand({
    scenario: { ...base, tipRuns: [covering] },
    env: { RECOVERY_ACT: 'true' },
    mainSha: OTHER_TIP
  });
  assert.equal(covered.status, 0, covered.stderr);
  assert.deepEqual(covered.actions, []);
  assert.match(covered.stdout, /recovery=none .*performed=false/);
});

test('R-CI-RECOVER-C1-04: an action that fails keeps the decision on record, shows the error and fails the step', () => {
  for (const [scenario, mainSha, expected] of [
    [timeoutScenario({ actExit: 1 }), TIP, 'rerun'],
    [supersededScenario({ actExit: 1 }), OTHER_TIP, 'dispatch']
  ]) {
    const run = recoverCommand({ scenario, env: { RECOVERY_ACT: 'true' }, mainSha });
    assert.notEqual(run.status, 0, 'a failed action must fail the step');
    assert.equal(run.actions.length, 1, 'the failed action is attempted once, never retried here');
    assert.match(run.stdout, new RegExp(`recovery=${expected} mode=act performed=failed`));
    assert.match(run.stdout, /error=".*"/);
    assert.match(run.summary, new RegExp(`- Decision: \\*\\*${expected}\\*\\*`));
    assert.match(run.summary, /- Performed: failed\n/);
    assert.match(run.summary, /- Error: .+/);
    assert.doesNotMatch(run.stdout, /performed=true/);
  }
});

test('R-CI-RECOVER-C1-05: an unknown action is rejected and never turns into a dispatch', async () => {
  const { actionArgv } = await import(pathToFileURL(join(ciDir, 'recovery.mjs')).href);
  assert.deepEqual(actionArgv('rerun', '42043003964'), RERUN);
  assert.deepEqual(actionArgv('dispatch', '42043003964'), DISPATCH);
  for (const bad of ['none', '', undefined, null, 'Rerun', 'RERUN', 'rerun ', 'dispatch ', 'cancel', 'delete', 0, {}])
    assert.throws(() => actionArgv(bad, '42043003964'), /Unknown recovery action/, `${JSON.stringify(bad)}`);
  for (const id of ['', undefined, 'abc', '--repo=x', '1;id', '1 2', '-1', '1.5', '１２'])
    assert.throws(() => actionArgv('rerun', id), /decimal/, `${JSON.stringify(id)}`);
});

test('R-CI-RECOVER-C1-06: recover() only ever hands rerun or dispatch to the actor', async () => {
  const { recover } = await import(pathToFileURL(join(ciDir, 'recovery.mjs')).href);
  const seen = [];
  for (const [scenario, mainSha] of [
    [timeoutScenario(), TIP],
    [supersededScenario(), OTHER_TIP],
    [timeoutScenario({ run: { ...fixture.timeout.run, run_attempt: 2 } }), TIP],
    [clone({ ...fixture.verifyTimeout, tipRuns: [] }), fixture.verifyTimeout.run.head_sha]
  ]) {
    const api = async (...parts) => {
      const url = parts.at(-1);
      if (url.includes('/annotations')) return [(scenario.annotations || {})[url.match(/check-runs\/(\d+)/)[1]] || []];
      if (url.includes('/jobs?')) return [{ jobs: scenario.jobs }];
      if (url.includes('/workflows/pages.yml/runs')) return { workflow_runs: scenario.tipRuns || [] };
      return scenario.run;
    };
    await recover({ runId: '1', attempt: String(scenario.run.run_attempt), api, mainSha, act: async (a) => seen.push(a) });
  }
  assert.ok(seen.length >= 2, 'the scenarios must exercise acting');
  for (const action of seen) assert.ok(['rerun', 'dispatch'].includes(action), action);
});

test('R-CI-RECOVER-C1-07: invalid or missing arguments stop before GitHub is contacted', () => {
  const bad = [
    [], ['42043003964'], ['', '1'], ['abc', '1'], ['--repo=x', '1'], ['1;id', '1'], ['1 2', '1'],
    ['-1', '1'], ['１２', '1'], ['$(id)', '1'], ['42043003964', ''], ['42043003964', 'x'], ['42043003964', '1.5'],
    ['42043003964', '-1']
  ];
  for (const args of bad) {
    const run = recoverCommand({ args, scenario: timeoutScenario(), env: { RECOVERY_ACT: 'true' } });
    assert.notEqual(run.status, 0, `${JSON.stringify(args)} must fail`);
    assert.deepEqual(run.actions, [], `${JSON.stringify(args)} must not act`);
    assert.deepEqual(run.apiCalls, [], `${JSON.stringify(args)} must not read the API`);
    assert.doesNotMatch(run.stdout, /performed=true/);
  }
});

test('R-CI-RECOVER-C1-08: a malformed main sha from git is rejected before any action', () => {
  for (const mainSha of ['', 'main', 'zz'.repeat(20), 'a'.repeat(39), `${'a'.repeat(40)};id`]) {
    const run = recoverCommand({ scenario: timeoutScenario(), env: { RECOVERY_ACT: 'true' }, mainSha });
    assert.notEqual(run.status, 0, `${JSON.stringify(mainSha)} must fail`);
    assert.deepEqual(run.actions, []);
  }
});

test('R-CI-RECOVER-C1-09: repeated calls never act twice for the same failure', () => {
  const env = { RECOVERY_ACT: 'true' };
  // The shim has no memory, as in a fresh job: the guard is what GitHub reports.
  const first = recoverCommand({ scenario: timeoutScenario(), env });
  assert.deepEqual(first.actions.map((c) => c.argv), [RERUN]);
  // After the rerun, GitHub reports attempt 2 as the run under observation.
  const second = recoverCommand({
    args: ['42043003964', '2'],
    scenario: timeoutScenario({ run: { ...fixture.timeout.run, run_attempt: 2 } }),
    env
  });
  assert.deepEqual(second.actions, []);
  assert.match(second.stdout, /Already retried/);
  // A decision made for attempt 1 is dropped when the run moved on in the meantime.
  const stale = recoverCommand({ scenario: timeoutScenario({ latestAttempt: 2 }), env });
  assert.equal(stale.status, 0, stale.stderr);
  assert.deepEqual(stale.actions, []);
  assert.match(stale.stdout, /Run was rerun meanwhile/);
});

test('R-CI-RECOVER-C1-10: a run with a genuine failure is never acted on', () => {
  const scenario = timeoutScenario();
  scenario.jobs.find((job) => job.name.endsWith('Unit Tests')).conclusion = 'failure';
  const run = recoverCommand({ scenario, env: { RECOVERY_ACT: 'true' } });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(run.actions, []);
  assert.match(run.stdout, /recovery=none .*Genuine failure/);
});

// Mutation checks: each behaviour above must be load-bearing. The check is run
// against a copy of scripts/ci with one defect injected and must then fail.
function mutant(file, from, to) {
  const { dir } = sandbox();
  const copy = join(dir, 'ci');
  cpSync(ciDir, copy, { recursive: true });
  const path = join(copy, file);
  const source = readFileSync(path, 'utf8');
  assert.ok(source.includes(from), `mutation anchor missing in ${file}: ${from}`);
  writeFileSync(path, source.replace(from, to));
  return copy;
}
const failedActionCheck = (dir) => {
  const run = recoverCommand({ scenario: timeoutScenario({ actExit: 1 }), env: { RECOVERY_ACT: 'true' }, dir });
  assert.notEqual(run.status, 0);
  assert.match(run.stdout, /performed=failed/);
  assert.match(run.summary, /- Error: /);
};
const observeCheck = (dir) => {
  for (const value of [undefined, 'TRUE', '1'])
    assert.deepEqual(
      recoverCommand({ scenario: timeoutScenario(), env: value ? { RECOVERY_ACT: value } : {}, dir }).actions,
      []
    );
};
const unknownActionCheck = async (dir) => {
  const { actionArgv } = await import(pathToFileURL(join(dir, 'recovery.mjs')).href);
  assert.throws(() => actionArgv('bogus', '1'), /Unknown recovery action/);
};
const badArgsCheck = (dir) => {
  const run = recoverCommand({ args: ['abc', '1'], scenario: timeoutScenario(), env: { RECOVERY_ACT: 'true' }, dir });
  assert.notEqual(run.status, 0);
  assert.deepEqual(run.apiCalls, []);
};
const exactArgvCheck = (dir) => {
  const run = recoverCommand({ scenario: timeoutScenario(), env: { RECOVERY_ACT: 'true' }, dir });
  assert.deepEqual(run.actions.map((c) => c.argv), [RERUN]);
};

test('R-CI-RECOVER-C1-12: resolve (workflow_run) and current read main through the API, never through git', () => {
  // Production runs 42607611212 and 42645437976: `git ls-remote origin` failed in these jobs
  // (persist-credentials: false, private repository), so no data-commit release was published.
  const writerRun = {
    name: 'Fetch Medium Articles', path: '.github/workflows/fetch-medium.yml',
    head_repository: { full_name: REPO }, head_branch: 'main', conclusion: 'success', event: 'schedule', head_sha: OTHER_TIP
  };
  const event = { repository: { full_name: REPO }, workflow_run: writerRun };
  const resolved = recoverCommand({
    command: 'resolve', args: [], event,
    env: { GITHUB_EVENT_NAME: 'workflow_run', GITHUB_REF: 'refs/heads/main', GITHUB_SHA: OTHER_TIP }
  });
  assert.equal(resolved.status, 0, resolved.stderr);
  assert.equal(resolved.output, `sha=${TIP}\npublish=true\n`, 'the release is the main tip read through the API, not the stale workflow_run head');
  assert.deepEqual(resolved.calls, [{ tool: 'gh', argv: ['api', `repos/${REPO}/git/ref/heads/main`] }]);

  const untrusted = recoverCommand({
    command: 'resolve', args: [],
    event: { ...event, workflow_run: { ...writerRun, head_branch: 'feature' } },
    env: { GITHUB_EVENT_NAME: 'workflow_run' }
  });
  assert.notEqual(untrusted.status, 0);
  assert.deepEqual(untrusted.calls, [], 'trust fields are checked before anything is contacted');

  const current = recoverCommand({ command: 'current', args: [TIP] });
  assert.equal(current.status, 0, current.stderr);
  assert.deepEqual(current.calls, [{ tool: 'gh', argv: ['api', `repos/${REPO}/git/ref/heads/main`] }]);
  const superseded = recoverCommand({ command: 'current', args: [OTHER_TIP] });
  assert.notEqual(superseded.status, 0);
  assert.match(superseded.stderr, /Superseded source/);
});

test('R-CI-RECOVER-C1-13: every workflow step that reads main through the API provides GH_TOKEN', () => {
  const root = join(here, '..', '..', '.github', 'workflows');
  for (const [file, command] of [['pages.yml', 'resolve'], ['pages.yml', 'current'], ['recover-release.yml', 'recover']]) {
    const text = readFileSync(join(root, file), 'utf8');
    const step = text.split(/\n\s*- /).find((chunk) => chunk.includes(`commands.mjs ${command}`));
    assert.ok(step, `${file}: no step runs commands.mjs ${command}`);
    assert.match(step, /GH_TOKEN: \$\{\{ github\.token \}\}/, `${file}: the ${command} step has no GH_TOKEN`);
  }
});

test('R-CI-RECOVER-C1-11: the checks pass on the real code and fail on injected defects', async () => {
  await failedActionCheck(ciDir);
  observeCheck(ciDir);
  await unknownActionCheck(ciDir);
  exactArgvCheck(ciDir);
  badArgsCheck(ciDir);

  const mutants = [
    ['unknown action falls back to dispatch',
      mutant('recovery.mjs', "throw new Error(`Unknown recovery action: ${JSON.stringify(action)}`);",
        "return ['workflow', 'run', 'pages.yml', '--ref', 'main', '--repo', repo];"),
      unknownActionCheck],
    ['failed action loses the decision record',
      mutant('recovery.mjs', 'return { ...plan, performed: false, failed: true, error: String(error?.message || error) };',
        'throw error;'),
      failedActionCheck],
    ['failed action leaves the step green',
      mutant('commands.mjs', 'if (plan.failed) process.exitCode = 1;', ''),
      failedActionCheck],
    ['failed action is reported as performed',
      mutant('commands.mjs', "const performed = plan.failed ? 'failed' : plan.performed;", 'const performed = true;'),
      failedActionCheck],
    ['observe mode ignored',
      mutant('recovery.mjs', "const performed = plan.action !== 'none' && !observeOnly;", "const performed = plan.action !== 'none';"),
      observeCheck],
    ['any non-empty RECOVERY_ACT enables acting',
      mutant('commands.mjs', "process.env.RECOVERY_ACT !== 'true'", '!process.env.RECOVERY_ACT'),
      observeCheck],
    ['main sha read through git again (no credentials in the job)',
      mutant('commands.mjs', "gh(`repos/${repository}/git/ref/heads/main`).object?.sha ?? ''",
        "execFileSync('git', ['ls-remote', 'origin', 'refs/heads/main'], { encoding: 'utf8' }).split(/\\s/)[0]"),
      exactArgvCheck],
    ['arguments validated only after GitHub was contacted',
      mutant('commands.mjs', 'requireRunArgs(args[0], args[1]);', ''),
      badArgsCheck],
    ['rerun drops --failed',
      mutant('recovery.mjs', "'rerun', runId, '--failed'", "'rerun', runId"),
      exactArgvCheck]
  ];
  for (const [name, dir, check] of mutants)
    await assert.rejects(async () => check(dir), undefined, `mutant survived: ${name}`);
});
