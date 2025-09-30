// Unit coverage gate for first-party application code.
// Node's own "all files" figure counts the test files themselves and silently omits any
// application file that no unit test imports, so it overstates coverage. This gate reads the
// lcov report, keeps only application files, and counts an unloaded file as 0% of its lines.
// It fails when the result falls below scripts/ci/coverage-baseline.json (a ratchet: raise the
// baseline when coverage improves, never lower it to make a build pass).
// Usage: node scripts/ci/coverage-gate.mjs <unit.lcov>
import { readFileSync, readdirSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const normalize = path => path.split(String.fromCharCode(92)).join('/').replace(/^.*?\/(?=(?:js|scripts)\/)/, '');

/** lcov text -> Map(relative path -> { found, hit }) */
export function parseLcov(text) {
  const files = new Map();
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('SF:')) current = { path: normalize(line.slice(3)), found: 0, hit: 0 };
    else if (current && line.startsWith('LF:')) current.found = Number(line.slice(3));
    else if (current && line.startsWith('LH:')) current.hit = Number(line.slice(3));
    else if (current && line === 'end_of_record') { files.set(current.path, { found: current.found, hit: current.hit }); current = null; }
  }
  return files;
}

/** First-party browser and Node scripts; vendored libraries and tests are excluded. */
export function applicationFiles(base = root) {
  const walk = dir => readdirSync(join(base, dir), { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? (entry.name === 'tests' ? [] : walk(`${dir}/${entry.name}`)) : [`${dir}/${entry.name}`]);
  const browser = walk('js').filter(file => file.endsWith('.js') && !/\.min\.js$|pkgd|modernizr/.test(file));
  const node = walk('scripts').filter(file => /\.m?js$/.test(file));
  return [...browser, ...node].sort();
}

export function measure(report, files, lineCount = file => readFileSync(join(root, file), 'utf8').split('\n').length) {
  let found = 0, hit = 0;
  const unmeasured = [];
  for (const file of files) {
    const entry = report.get(file);
    if (entry) { found += entry.found; hit += entry.hit; } else { found += lineCount(file); unmeasured.push(file); }
  }
  return { found, hit, unmeasured, percent: found ? Math.round(1000 * hit / found) / 10 : 0 };
}

export function check(result, baseline) {
  if (result.percent < baseline.lines) throw new Error(`Unit line coverage ${result.percent}% is below the ${baseline.lines}% baseline`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const result = measure(parseLcov(readFileSync(process.argv[2], 'utf8')), applicationFiles());
  const baseline = JSON.parse(readFileSync(join(root, 'scripts/ci/coverage-baseline.json'), 'utf8'));
  const text = [`## Unit coverage (application code)`, '',
    `**${result.percent}%** of ${result.found} lines (baseline ${baseline.lines}%).`,
    `Not loaded by any unit test (counted as 0%, covered by browser tests only): ${result.unmeasured.join(', ') || 'none'}.`, ''].join('\n');
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + '\n');
  check(result, baseline);
}
