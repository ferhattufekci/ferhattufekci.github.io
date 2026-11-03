import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { hash, contentHash } from './build-metadata.mjs';
import { buildHtmlTargets, verifyBuildHtml } from './build-identity.mjs';

export const criticalFiles = [
  'index.html',
  'js/resume-navigation.js',
  'js/page-content-panels.js',
  'js/pages-switcher.js',
  'js/site-shell.js',
  'js/blog-sharing.js',
  'js/blog-sharing-data.js',
  'css/main.css',
  'css/dark-theme.css',
  'css/keyboard.css',
  'css/blog-cards.css',
  'css/card-interactions.css',
  'css/page-content-panels.css',
  'css/build-info.css',
  'css/adsense.css',
  'js/adsense.js',
  'js/adsense-config.js',
  'js/starred-ads.js',
  'js/starred-ad-planner.js',
  'data/github-repos.json',
  'data/medium-all.json',
  'FerhatTufekci_CV.pdf'
];
export async function waitForRelease(
  base,
  expected,
  {
    timeoutMs = 120000,
    intervalMs = 5000,
    fetcher = fetch,
    now = Date.now,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  } = {}
) {
  assert.equal(expected.schemaVersion, 2, 'Expected artifact metadata schema');
  assert.equal(
    expected.contentSha256,
    contentHash(expected.files),
    'Invalid expected manifest'
  );
  const deadline = now() + timeoutMs,
    attempts = [];
  while (now() < deadline) {
    const attempt = { number: attempts.length + 1 };
    try {
      const get = (path) =>
        fetcher(
          new URL(
            `${path}?release=${expected.sourceSha}-${attempt.number}`,
            base
          ),
          {
            headers: { 'Cache-Control': 'no-cache' },
            signal: AbortSignal.timeout(
              Math.max(1, Math.min(10000, deadline - now()))
            )
          }
        );
      const response = await get('build-metadata.json');
      assert.equal(response.status, 200, 'Metadata HTTP status');
      const actual = await response.json();
      assert.equal(
        actual.sourceSha,
        expected.sourceSha,
        'Previous version is still published'
      );
      assert.deepEqual(
        actual,
        expected,
        'Published manifest differs from tested artifact'
      );
      const verified = [];
      for (const path of new Set([...criticalFiles, ...(expected.build ? buildHtmlTargets : [])])) {
        assert.ok(now() < deadline, 'Readiness deadline elapsed');
        const file = expected.files.find((file) => file.path === path);
        assert.ok(file, `Missing critical manifest entry: ${path}`);
        const response = await get(path);
        assert.equal(response.status, 200, `HTTP status: ${path}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        assert.equal(
          hash(bytes),
          file.sha256,
          `Published bytes differ: ${path}`
        );
        if (expected.build && buildHtmlTargets.includes(path)) verifyBuildHtml(bytes.toString('utf8'), expected.build, path);
        verified.push(path);
      }
      attempts.push({ ...attempt, ready: true });
      return {
        passed: true,
        sourceSha: expected.sourceSha,
        contentSha256: expected.contentSha256,
        build: expected.build,
        verified,
        attempts
      };
    } catch (error) {
      attempts.push({ ...attempt, ready: false, reason: error.message });
    }
    const remaining = deadline - now();
    if (remaining > 0) await sleep(Math.min(intervalMs, remaining));
  }
  return {
    passed: false,
    sourceSha: expected.sourceSha,
    attempts,
    reason: 'Expected deployment did not become ready before the deadline'
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [base, manifest] = process.argv.slice(2);
  const report = await waitForRelease(
    base,
    JSON.parse(await readFile(manifest, 'utf8'))
  );
  await mkdir('work/qa', { recursive: true });
  await writeFile(
    'work/qa/production-readiness.json',
    JSON.stringify(report, null, 2)
  );
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.passed ? 0 : 1;
}
