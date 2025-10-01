import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const bash = process.platform === 'win32' ? 'C:\\Program Files\\Git\\bin\\bash.exe' : 'bash';
for (const file of ['fetch-medium.yml', 'fetch-github.yml']) {
  for (const succeedsAt of [2, 99]) test(`R-CI-01: ${file} reports ${succeedsAt === 2 ? 'a successful retry' : 'exhausted retries'} truthfully`, async () => {
    const workflow = await readFile(new URL('../../.github/workflows/' + file, import.meta.url), 'utf8');
    const retryLoop = workflow.slice(workflow.indexOf('          for i in')).split('\n').map(line => line.replace(/^ {10}/, '')).join('\n');
    const fixture = `attempts=0
git() {
  if [ "$1" = pull ]; then return 0; fi
  attempts=$((attempts + 1))
  echo "MOCK_PUSH_$attempts"
  [ "$attempts" -ge ${succeedsAt} ]
}
sleep() { :; }
${retryLoop}`;
    const result = spawnSync(bash, ['-c', fixture], { encoding: 'utf8' });
    if (result.error) throw result.error;
    assert.equal(result.status, succeedsAt === 2 ? 0 : 1, result.stdout + result.stderr);
    assert.equal((result.stdout.match(/MOCK_PUSH_/g) || []).length, succeedsAt === 2 ? 2 : 5);
  });
}
