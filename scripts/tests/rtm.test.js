import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collect, render } from '../generate-rtm.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const matrix = readFileSync(join(root, 'docs/business-analysis/requirements-traceability-matrix.md'), 'utf8');

test('R-DOC-RTM-01: the traceability matrix is generated from the tests and not stale', () => {
  assert.equal(matrix, render(collect()), 'run: node scripts/generate-rtm.mjs');
});

test('R-DOC-RTM-02: the extractor finds the titles it is built for and rejects malformed ids', () => {
  const rows = collect();
  assert.ok(rows.length > 200, `expected over 200 titled tests, found ${rows.length}`);
  for (const row of rows) {
    assert.match(row.id, /^R-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d+[a-z]?$/);
    assert.ok(row.behavior.length >= 10, `${row.id} has no behavior text`);
  }
  assert.ok(rows.some(r => r.layer.startsWith('Browser')) && rows.some(r => r.layer.startsWith('Unit')), 'both layers are represented');
});
