import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseProcedure, buildResults, trace, render } from '../generate-traceability.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const header = '| Test Durumu Adı | Test Durumu Açıklaması | Adım No | Test Adımı | Beklenen Test Sonuçları | Açıklama | Sonuç | Gereksinim No | Ön Koşul |';
const divider = '| --- | --- | --- | --- | --- | --- | --- | --- | --- |';
const procedure = [
  '## TEST DURUMLARI', '',
  '### GKP-001 — Navigation', '', header, divider,
  '| a | b | 1 | step | ok | x | Pass | R-NAV-01 | ÖK-1 |',
  '| a | b | 2 | step | ok | x | Not Run | R-NAV-01, R-NAV-08 | ÖK-1 |', '',
  '### GKP-002 — Recovery', '', header, divider,
  '| a | b | 1 | step | ok | x | Fail | R-NAV-02 | ÖK-1 |',
  '| a | b | 2 | step | ok | x | Not Applicable | R-UNKNOWN-01 | ÖK-1 |', ''
].join('\n');

test('R-DOC-TRACE-01: the committed traceability report is generated from the tests and the procedure, and not stale', () => {
  const committed = readFileSync(join(root, 'docs/testing/TRACEABILITY.md'), 'utf8');
  assert.equal(committed, render(trace()), 'run: node scripts/generate-traceability.mjs');
});

test('R-DOC-TRACE-02: procedure steps map requirements to cases and cases to requirements, with step results', () => {
  const cases = parseProcedure(procedure);
  assert.deepEqual(cases.map(c => c.id), ['GKP-001', 'GKP-002']);
  assert.deepEqual(cases[0].steps.map(s => [s.step, s.result, s.requirements]), [
    ['1', 'Pass', ['R-NAV-01']], ['2', 'Not Run', ['R-NAV-01', 'R-NAV-08']]
  ]);
  const report = trace({ automated: [{ id: 'R-NAV-01', file: 'a.spec.mjs', layer: 'Browser' }, { id: 'R-NAV-02', file: 'a.spec.mjs', layer: 'Browser' },
    { id: 'R-NAV-08', file: 'a.spec.mjs', layer: 'Browser' }, { id: 'R-OTHER-01', file: 'b.test.js', layer: 'Unit' }], cases });
  assert.deepEqual(report.requirements.get('R-NAV-01').cases, ['GKP-001']);
  assert.deepEqual(report.requirements.get('R-NAV-01').steps, { Pass: 1, 'Not Run': 1 });
  assert.deepEqual(report.requirements.get('R-OTHER-01').cases, [], 'an automated id without a procedure is reported, not hidden');
  assert.deepEqual(report.cases.get('GKP-001').requirements, ['R-NAV-01', 'R-NAV-08']);
  assert.deepEqual(report.unknown, ['R-UNKNOWN-01'], 'a procedure id that no test carries is reported as unknown');
  assert.equal(report.coverage.withProcedure, 3);
  assert.equal(report.coverage.total, 4);
});

test('R-DOC-TRACE-03: an unrecognised step result is rejected instead of being counted', () => {
  const bad = procedure.replace('| Fail |', '| Done |');
  assert.throws(() => parseProcedure(bad), /GKP-002 step 1: unknown result "Done"/);
});

test('R-DOC-TRACE-04: build results aggregate every project run of a requirement, failures and flakiness first', () => {
  const run = (title, ...statuses) => ({ title, tests: statuses.map(status => ({ results: [{ status }], status: status === 'flaky' ? 'flaky' : undefined })) });
  const json = { suites: [{ specs: [run('R-NAV-01 | ok', 'passed', 'passed')], suites: [{ specs: [
    run('R-NAV-02/08 | combined', 'passed', 'failed'), run('R-NAV-09 | skipped', 'skipped')] }] }] };
  const results = buildResults(json);
  assert.equal(results.get('R-NAV-01'), 'Pass');
  assert.equal(results.get('R-NAV-02'), 'Fail');
  assert.equal(results.get('R-NAV-08'), 'Fail');
  assert.equal(results.get('R-NAV-09'), 'Skipped');
  const report = trace({ automated: [{ id: 'R-NAV-01', file: 'a', layer: 'Browser' }, { id: 'R-X-01', file: 'b', layer: 'Unit' }], cases: [], results });
  assert.match(render(report), /\| R-NAV-01 \|.*\| Pass \|/);
  assert.match(render(report), /\| R-X-01 \|.*\| Not in this build's browser results \|/);
});

test('R-DOC-TRACE-05: the real procedure parses and every case maps to at least one requirement', () => {
  const cases = parseProcedure(readFileSync(join(root, 'docs/testing/GKP.md'), 'utf8'));
  assert.ok(cases.length >= 30, `expected the 30 GKP cases, found ${cases.length}`);
  for (const testCase of cases) {
    assert.ok(testCase.steps.length > 0, `${testCase.id} has no steps`);
    assert.ok(testCase.steps.some(step => step.requirements.length > 0), `${testCase.id} maps to no requirement`);
  }
});
