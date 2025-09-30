import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import YAML from 'yaml';
import { ROOT } from '../lib/public-files.mjs';
import { AUDIT_ARGS, CANARY_ADVISORY, EXIT, classify, checkCanary, decide, lockPackageCount, render } from '../ci/dependency-audit.mjs';

// Real npm 9.6.7 outputs recorded for this gate; only `errorObject` is constructed.
const recorded = JSON.parse(await readFile(join(ROOT, 'scripts/tests/fixtures/npm-audit/recorded.json'), 'utf8'));
const canaryFixture = JSON.parse(await readFile(join(ROOT, 'scripts/ci/audit-canary.json'), 'utf8'));
const run = (report, extra = {}) => classify({ status: 1, stdout: typeof report === 'string' ? report : JSON.stringify(report), lockPackages: 30, ...extra });
const canaryOk = run(recorded.vulnerable);
const verdict = (report, extra) => decide(run(report, extra), canaryOk);
// A report with exactly one finding of the given severity, consistent in every count.
function single(severity) {
  const report = structuredClone(recorded.clean);
  report.vulnerabilities = { 'example-package': { name: 'example-package', severity, isDirect: false, range: '<2.0.0', nodes: ['node_modules/example-package'],
    via: [{ source: 1, name: 'example-package', title: `Example ${severity} advisory`, url: `https://github.com/advisories/GHSA-test-${severity}`, severity, range: '<2.0.0' }] } };
  report.metadata.vulnerabilities[severity] = 1;
  report.metadata.vulnerabilities.total = 1;
  return report;
}

test('R-AUDIT-01: Given the recorded clean report with a detected canary, then the verdict is PASS (exit 0) and the summary shows every severity count', () => {
  const result = verdict(recorded.clean);
  assert.equal(result.kind, 'pass');
  assert.equal(EXIT[result.kind], 0);
  const text = render(result);
  assert.match(text, /Result: \*\*PASS\*\* \(exit 0\)/);
  for (const severity of ['critical', 'high', 'moderate', 'low', 'info']) assert.match(text, new RegExp(`\\| ${severity} \\| 0 \\|`));
  assert.match(text, /30 dependencies audited \(lockfile lists 30\)/);
});

test('R-AUDIT-02: Given a high advisory, then the verdict is SECURITY (exit 1) naming the package and the advisory URL', () => {
  const result = verdict(single('high'));
  assert.equal(result.kind, 'security');
  assert.equal(EXIT[result.kind], 1);
  assert.deepEqual(result.blocking.map(entry => entry.name), ['example-package']);
  assert.match(render(result), /\*\*example-package\*\* high \(BLOCKING\)[\s\S]*https:\/\/github\.com\/advisories\/GHSA-test-high/);
});

test('R-AUDIT-03: Given a critical advisory, or the recorded real lodash/minimist report, then the verdict is SECURITY with every blocking package listed', () => {
  assert.equal(verdict(single('critical')).kind, 'security');
  const real = verdict(recorded.vulnerable);
  assert.equal(real.kind, 'security');
  assert.deepEqual(real.blocking.map(entry => `${entry.name}:${entry.severity}`), ['minimist:critical', 'lodash:high']);
  assert.match(render(real), /GHSA-35jh-r3h4-6jhm/);
});

test('R-AUDIT-04: Given only moderate and low advisories, then the verdict is PASS but each finding is still listed as not blocking', () => {
  for (const severity of ['moderate', 'low', 'info']) {
    const result = verdict(single(severity));
    assert.equal(result.kind, 'pass', severity);
    assert.match(render(result), new RegExp(`\\*\\*example-package\\*\\* ${severity} \\(not blocking\\)`));
  }
});

test('R-AUDIT-05: Given a registry or npm failure (refused, DNS, 503, 429, ENOAUDIT), then the verdict is INFRASTRUCTURE (exit 2), never PASS', () => {
  for (const name of ['connectionRefused', 'notFound', 'serviceUnavailable', 'tooManyRequests', 'invalidBody', 'errorObject']) {
    const result = verdict(recorded[name]);
    assert.equal(result.kind, 'infrastructure', name);
    assert.equal(EXIT[result.kind], 2);
    assert.match(render(result), /INFRASTRUCTURE ERROR[\s\S]*not a security verdict/, name);
  }
  assert.match(verdict(recorded.serviceUnavailable).reason, /503 Service Unavailable/);
  assert.match(verdict(recorded.errorObject).reason, /ENOAUDIT/);
  assert.equal(decide(classify({ error: new Error('spawn npm ENOENT') }), canaryOk).kind, 'infrastructure');
  assert.equal(decide(classify({ signal: 'SIGTERM', stdout: '' }), canaryOk).kind, 'infrastructure');
});

test('R-AUDIT-06: Given empty, non-JSON or truncated output, then the verdict is INFRASTRUCTURE', () => {
  const text = JSON.stringify(recorded.clean);
  for (const stdout of ['', '   \n', 'npm ERR! audit endpoint returned an error', text.slice(0, text.length / 2)])
    assert.equal(verdict(stdout).kind, 'infrastructure', JSON.stringify(stdout.slice(0, 40)));
});

test('R-AUDIT-07: Given a report with missing metadata or counts inconsistent with its findings, then the verdict is INFRASTRUCTURE', () => {
  const broken = [
    report => { delete report.metadata.vulnerabilities; },
    report => { delete report.vulnerabilities; },
    report => { report.metadata.vulnerabilities.high = 1; report.metadata.vulnerabilities.total = 1; }, // counted but not listed
    report => { report.metadata.vulnerabilities.total = 3; },
    report => { report.metadata.vulnerabilities.critical = '0'; },
    report => { report.auditReportVersion = 1; }
  ];
  for (const [index, change] of broken.entries()) {
    const report = structuredClone(recorded.clean);
    change(report);
    assert.equal(verdict(report).kind, 'infrastructure', `case ${index}`);
  }
  const hidden = single('critical');
  hidden.metadata.vulnerabilities.critical = 0; hidden.metadata.vulnerabilities.total = 0; // listed but not counted
  assert.equal(verdict(hidden).kind, 'infrastructure');
  const unknown = single('high'); unknown.vulnerabilities['example-package'].severity = 'severe';
  assert.equal(verdict(unknown).kind, 'infrastructure');
});

test('R-AUDIT-08: Given an audit of 0 dependencies while the lockfile lists packages, then the verdict is INFRASTRUCTURE', () => {
  const report = structuredClone(recorded.clean);
  report.metadata.dependencies.total = 0;
  assert.match(verdict(report).reason, /checked 0 dependencies, but the lockfile lists 30/);
  assert.equal(lockPackageCount({ packages: { '': {}, 'node_modules/a': {}, 'node_modules/b': {} } }), 2);
  assert.equal(lockPackageCount({ dependencies: {} }), null, 'a v1 lockfile is not accepted');
});

test('R-AUDIT-09: The audit reads the committed lockfile and includes development dependencies', async () => {
  assert.deepEqual(AUDIT_ARGS, ['audit', '--json', '--package-lock-only']);
  assert.ok(!AUDIT_ARGS.some(arg => /^--(omit|only|production)/.test(arg)));
  const lock = JSON.parse(await readFile(join(ROOT, 'package-lock.json'), 'utf8'));
  const dev = Object.values(lock.packages).filter(entry => entry.dev).length;
  assert.ok(dev > 0, 'the project lockfile has development packages for the audit to cover');
  assert.equal(recorded.clean.metadata.dependencies.dev, dev, 'the recorded real audit covered every development package');
});

test('R-AUDIT-10: Static Checks runs the audit after npm ci, cannot be bypassed, never fixes, and keeps read-only permissions', async () => {
  const quality = YAML.parse(await readFile(join(ROOT, '.github/workflows/test-agent-readiness.yml'), 'utf8'));
  const steps = quality.jobs['static-checks'].steps;
  const install = steps.findIndex(step => step.run === 'npm ci');
  const audit = steps.findIndex(step => step.run === 'node scripts/ci/dependency-audit.mjs');
  assert.ok(install >= 0 && audit > install, 'the audit step follows npm ci');
  assert.equal(steps[audit]['continue-on-error'], undefined);
  assert.equal(steps[audit].if, undefined, 'the audit runs for every caller: PR, push, release and sync runs');
  assert.deepEqual(quality.permissions, { contents: 'read' });
  assert.equal(quality.jobs['static-checks'].permissions, undefined);
  for (const file of ['test-agent-readiness.yml', 'pages.yml', 'fetch-github.yml', 'fetch-medium.yml', 'recover-release.yml'])
    assert.doesNotMatch(await readFile(join(ROOT, '.github/workflows', file), 'utf8'), /npm audit fix|--force/, file);
});

test('R-AUDIT-11: Given an advisory service that answers 200 with no advisories, then the clean result is rejected because the canary was not detected', () => {
  const empty = run(recorded.emptyAdvisoryResponse, { status: 0 });
  assert.equal(empty.kind, 'pass', 'npm itself reports this as clean');
  const result = decide(run(recorded.clean, { status: 0 }), empty);
  assert.equal(result.kind, 'infrastructure');
  assert.match(result.reason, /did not report the canary's known advisory/);
  assert.equal(checkCanary(canaryOk).kind, 'pass');
  assert.equal(decide(run(recorded.clean), run(recorded.connectionRefused)).kind, 'infrastructure');
  assert.deepEqual(Object.keys(canaryFixture.lockfile.packages), ['', 'node_modules/minimist']);
  assert.equal(canaryFixture.lockfile.packages['node_modules/minimist'].version, '0.0.8');
  assert.match(CANARY_ADVISORY, /GHSA-xvch-5gv4-984h$/);
});
