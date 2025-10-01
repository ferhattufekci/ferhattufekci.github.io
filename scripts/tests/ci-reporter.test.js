import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import CoverageReporter from '../ci/coverage-reporter.mjs';

test('R-PIPE-07: list-only inventory is written by the awaited reporter completion hook', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-inventory-'));
  const previous = {
    inventory: process.env.TEST_INVENTORY,
    shard: process.env.CI_SHARD
  };
  try {
    process.env.TEST_INVENTORY = join(directory, 'nested', 'tests.json');
    delete process.env.CI_SHARD;
    const reporter = new CoverageReporter();
    reporter.onBegin(
      { workers: 2 },
      { allTests: () => [{ id: 'b' }, { id: 'a' }] }
    );
    await reporter.onEnd({ status: 'passed' });
    assert.deepEqual(
      JSON.parse(await readFile(process.env.TEST_INVENTORY, 'utf8')),
      ['a', 'b']
    );
  } finally {
    for (const [key, value] of [
      ['TEST_INVENTORY', previous.inventory],
      ['CI_SHARD', previous.shard]
    ]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await rm(directory, { recursive: true, force: true });
  }
});
