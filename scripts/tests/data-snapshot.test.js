import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeSnapshot } from '../lib/data-snapshot.mjs';

function sandbox(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'snapshot-'));
  try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}
const read = (dir, name) => readFileSync(join(dir, name), 'utf8');
let clock = 0;
const meta = () => ({ lastUpdated: `t${++clock}`, counts: { total: 1 } });

test('R-DATA-SYNC-02: the first sync writes every content file and the meta file', () => sandbox(dir => {
  const { changed } = writeSnapshot(dir, { 'a.json': [1], 'b.json': [] }, 'meta.json', meta);
  assert.deepEqual(changed.sort(), ['a.json', 'b.json']);
  assert.equal(read(dir, 'a.json'), JSON.stringify([1], null, 2));
  assert.ok(existsSync(join(dir, 'meta.json')));
}));

test('R-DATA-SYNC-03: an unchanged sync writes nothing, so the timestamp does not move and git sees no diff', () => sandbox(dir => {
  writeSnapshot(dir, { 'a.json': [1] }, 'meta.json', meta);
  const before = read(dir, 'meta.json');
  let called = false;
  const { changed } = writeSnapshot(dir, { 'a.json': [1] }, 'meta.json', () => { called = true; return meta(); });
  assert.deepEqual(changed, []);
  assert.equal(called, false, 'meta is not even built when nothing changed');
  assert.equal(read(dir, 'meta.json'), before);
}));

test('R-DATA-SYNC-04: a real change rewrites only the changed file and refreshes the meta file', () => sandbox(dir => {
  writeSnapshot(dir, { 'a.json': [1], 'b.json': [2] }, 'meta.json', meta);
  writeFileSync(join(dir, 'b.json'), 'sentinel-untouched-content');
  const before = read(dir, 'meta.json');
  // b.json differs from its intended content, a.json changes value: both are rewritten.
  const { changed } = writeSnapshot(dir, { 'a.json': [9], 'b.json': [2] }, 'meta.json', meta);
  assert.deepEqual(changed.sort(), ['a.json', 'b.json']);
  assert.notEqual(read(dir, 'meta.json'), before);
  // And with only one real difference, only that file is reported.
  const again = writeSnapshot(dir, { 'a.json': [10], 'b.json': [2] }, 'meta.json', meta);
  assert.deepEqual(again.changed, ['a.json']);
}));

test('R-DATA-SYNC-05: a missing or unreadable file counts as changed, never as equal', () => sandbox(dir => {
  writeSnapshot(dir, { 'a.json': [] }, 'meta.json', meta);
  rmSync(join(dir, 'a.json'));
  assert.deepEqual(writeSnapshot(dir, { 'a.json': [] }, 'meta.json', meta).changed, ['a.json']);
}));
