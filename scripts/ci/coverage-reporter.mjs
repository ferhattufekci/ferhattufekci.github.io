import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { availableParallelism, totalmem } from 'node:os';

export default class CoverageReporter {
  results = [];
  onBegin(config, suite) {
    this.assigned = suite
      .allTests()
      .map((test) => test.id)
      .sort();
    this.config = config;
  }
  onTestEnd(test, result) {
    this.results.push({
      id: test.id,
      status: result.status,
      retry: result.retry,
      duration: result.duration
    });
  }
  async onEnd(result) {
    // Playwright awaits onEnd, including --list; onBegin is synchronous.
    if (process.env.TEST_INVENTORY) {
      await mkdir(dirname(process.env.TEST_INVENTORY), { recursive: true });
      await writeFile(
        process.env.TEST_INVENTORY,
        JSON.stringify(this.assigned)
      );
    }
    if (!process.env.CI_SHARD) return;
    const path = `work/qa/shard-${process.env.CI_SHARD}/coverage.json`;
    await mkdir(dirname(path), { recursive: true });
    await writeFile(
      path,
      JSON.stringify(
        {
          index: Number(process.env.CI_SHARD),
          total: 2,
          status: result.status,
          duration: result.duration,
          workers: this.config.workers,
          cpus: availableParallelism(),
          memoryGiB: totalmem() / 2 ** 30,
          assigned: this.assigned,
          results: this.results
        },
        null,
        2
      )
    );
  }
}
