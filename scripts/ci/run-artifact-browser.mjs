import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { verifyMetadata } from './build-metadata.mjs';

const sourceSha =
  process.env.SOURCE_SHA ||
  execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
await verifyMetadata('.pages-site', sourceSha);
const child = spawn(
  process.execPath,
  ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    env: { ...process.env, PORTFOLIO_TEST_ROOT: '.pages-site' }
  }
);
child.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
