import test from 'node:test';
import assert from 'node:assert/strict';

// GOV-1 proof only: this PR must stay red and unmergeable. Never merge it.
test('GOV-1 proof: a failing unit test turns the Quality Gate red', () => {
  assert.equal(1, 2);
});
