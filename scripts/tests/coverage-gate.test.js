import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLcov, applicationFiles, measure, check } from '../ci/coverage-gate.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const lcov = ['SF:js\\a.js', 'LF:10', 'LH:8', 'end_of_record', 'SF:scripts/tests/x.test.js', 'LF:50', 'LH:50', 'end_of_record'].join('\n');

test('R-COV-01: lcov records are read per file with normalized paths', () => {
  assert.deepEqual([...parseLcov(lcov)], [['js/a.js', { found: 10, hit: 8 }], ['scripts/tests/x.test.js', { found: 50, hit: 50 }]]);
});

test('R-COV-02: test files never count, and an application file no unit test loads counts as 0% instead of disappearing', () => {
  const result = measure(parseLcov(lcov), ['js/a.js', 'js/b.js'], file => (file === 'js/b.js' ? 30 : 0));
  assert.deepEqual(result.unmeasured, ['js/b.js']);
  assert.equal(result.found, 40);
  assert.equal(result.hit, 8);
  assert.equal(result.percent, 20);
});

test('R-COV-03: the gate fails below the committed baseline and passes at or above it', () => {
  assert.throws(() => check({ percent: 54.9 }, { lines: 55 }), /54\.9% is below the 55% baseline/);
  assert.doesNotThrow(() => check({ percent: 55 }, { lines: 55 }));
});

test('R-COV-04: application files are the first-party scripts, not vendored libraries or tests', () => {
  const files = applicationFiles();
  assert.ok(files.includes('js/pages-switcher.js') && files.includes('scripts/fetch-github.js') && files.includes('scripts/ci/policy.mjs'));
  assert.ok(!files.some(file => /\.min\.js$|pkgd|modernizr|^scripts\/tests\/|^tests\//.test(file)), files.join(', '));
});

test('R-COV-05: the committed baseline is a percentage the gate can enforce', () => {
  const baseline = JSON.parse(readFileSync(join(root, 'scripts/ci/coverage-baseline.json'), 'utf8'));
  assert.ok(Number.isFinite(baseline.lines) && baseline.lines > 0 && baseline.lines <= 100, JSON.stringify(baseline));
});
