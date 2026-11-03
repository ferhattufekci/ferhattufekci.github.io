import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const facts = JSON.parse(await readFile(new URL('../../tests/fixtures/starred-ad-policy.json', import.meta.url), 'utf8'));
const keys = (start, count) => Array.from({ length: count }, (_, i) => `https://github.com/fixture/repo-${start + i}`);
const empty = () => ({ seenKeys: [], newCards: 0, reservedKeys: [] });

test('SM-01/02/03/04/14 | Manual append boundaries use the independent 20/40/60/100 table and at most two reservations', () => {
  const { planBatch } = require('../../js/starred-ad-planner.js');
  for (const [total, expected] of facts.boundaries) {
    let state = planBatch(empty(), keys(0, Math.min(20, total)), { ...facts.policy, initial: true }).state;
    const placements = [];
    for (let start = 20; start < total; start += 20) {
      const result = planBatch(state, keys(start, Math.min(20, total - start)), facts.policy);
      state = result.state; placements.push(...result.placements);
    }
    assert.equal(placements.length, expected, `total=${total}`);
    assert.equal(state.reservedKeys.length, expected);
    for (const placement of placements) {
      assert.ok(placement.afterIndex >= 6 && placement.afterIndex <= 14, 'New content exists on each side of the placement');
      assert.match(placement.key, /^starred-ad-[12]$/);
    }
  }
});

test('SM-04/05/06/09 | Duplicate identities, replayed appends, empty batches and resets create no new opportunity', () => {
  const { planBatch } = require('../../js/starred-ad-planner.js');
  let state = planBatch(empty(), keys(0, 20), { ...facts.policy, initial: true }).state;
  for (const batch of [keys(20, 20), keys(40, 20)]) state = planBatch(state, batch, facts.policy).state;
  const before = structuredClone(state);
  for (const batch of [keys(40, 20), [], [...keys(0, 10), ...keys(0, 10)]]) {
    const result = planBatch(state, batch, facts.policy);
    assert.deepEqual(result.state, before); assert.deepEqual(result.placements, []);
  }
  const reset = planBatch(state, keys(0, 20), { ...facts.policy, initial: true });
  assert.deepEqual(reset.state, before); assert.deepEqual(reset.placements, []);
  assert.deepEqual(state, before, 'The planner does not mutate its input state');
});

test('SM-03/05/10 | Failed or unfilled reservations continue consuming the document quota', () => {
  const { planBatch } = require('../../js/starred-ad-planner.js');
  let state = planBatch(empty(), keys(0, 20), { ...facts.policy, initial: true }).state;
  for (let start = 20; start < 100; start += 20) state = planBatch(state, keys(start, 20), facts.policy).state;
  assert.equal(state.reservedKeys.length, 2);
  const originalKeys = [...state.reservedKeys];
  const result = planBatch(state, keys(100, 40), facts.policy);
  assert.deepEqual(result.placements, []); assert.deepEqual(result.state.reservedKeys, originalKeys);
});

test('SM-12/14/15 | Production dynamic feed ads stay disabled without a verified In-feed unit; the fixed In-article slot is not repurposed', () => {
  const { starred } = require('../../js/adsense-config.js');
  assert.equal(starred.enabled, false); assert.equal(starred.unit, null);
  for (const [key, value] of Object.entries(facts.policy)) assert.equal(starred[key], value);
});
