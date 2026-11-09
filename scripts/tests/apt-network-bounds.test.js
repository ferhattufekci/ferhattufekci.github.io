import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workflows = ['pages.yml', 'test-agent-readiness.yml'];
const jobs = (text) =>
  text.split(/^ {2}(?=[a-z][a-z0-9-]*:\n)/m).filter((block) => /^[a-z][a-z0-9-]*:\n/.test(block));

test('R-CI-APT-01: every browser installation with system dependencies is preceded by the apt stall bound in the same job', async () => {
  let installs = 0;
  for (const file of workflows) {
    const text = (await readFile(new URL(`../../.github/workflows/${file}`, import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
    for (const job of jobs(text)) {
      const install = job.search(/playwright install --with-deps/);
      if (install < 0) continue;
      installs++;
      const bound = job.indexOf('bash scripts/ci/bound-apt-network.sh');
      assert.ok(bound >= 0 && bound < install, `${file}: ${job.split('\n')[0]} installs browsers before bounding apt`);
      // Fail fast: healthy installs finish within 108 s (median 12-37 s), so five
      // minutes is generous and cuts a 50 minute mirror stall to five.
      const step = job.slice(job.lastIndexOf('- name:', install), install);
      assert.match(step, /timeout-minutes: 5\n/, `${file}: installation step needs its own deadline`);
    }
  }
  assert.equal(installs, 3, 'Chromium in browser-tests and verify-production, Firefox/WebKit in keyboard-tests');
});
test('R-CI-APT-02: the bound is an idle timeout far below the default and far above a healthy download', async () => {
  const script = await readFile(new URL('../ci/bound-apt-network.sh', import.meta.url), 'utf8');
  const timeouts = [...script.matchAll(/Acquire::https?::Timeout "(\d+)"/g)].map((m) => Number(m[1]));
  assert.equal(timeouts.length, 2);
  for (const seconds of timeouts) {
    // apt's default is 120 s; a healthy 21 MB font download finishes in ~1 s.
    assert.ok(seconds >= 10 && seconds <= 30, `unexpected timeout ${seconds}`);
  }
  assert.match(script, /Acquire::Retries "3"/);
  assert.match(script, /^set -euo pipefail$/m);
});
