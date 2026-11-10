// Bidirectional traceability between requirement ids, automated tests and the manual
// acceptance procedure (docs/testing/GKP.md). Sources, never a hand-kept copy:
//   - requirement id -> automated tests: the test titles (same extractor as the RTM);
//   - requirement id <-> procedure case/step: the "Gereksinim No" column of each GKP step;
//   - step results: the "Sonuç" column of each GKP step;
//   - optional build results: a Playwright JSON report (CI passes the merged report).
// Usage: node scripts/generate-traceability.mjs [--results <playwright.json>] [--out <file>]
// Without --results it writes docs/testing/TRACEABILITY.md, which rtm-style staleness checks.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collect, expandIds } from './generate-rtm.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROCEDURE = join(root, 'docs/testing/GKP.md');
const OUT = join(root, 'docs/testing/TRACEABILITY.md');
// The procedure's own result vocabulary (GKP.md, "Sonuç sözlüğü").
const RESULTS = ['Pass', 'Fail', 'Blocked', 'Not Run', 'Not Applicable'];
const ID = /R-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d+[a-z]?(?:\/\d+[a-z]?)*/g;
const byId = (a, b) => a.localeCompare(b, 'en', { numeric: true });
const cells = line => line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());

/** GKP markdown -> [{ id, title, steps: [{ step, result, requirements }] }] */
export function parseProcedure(markdown) {
  const cases = [];
  let current = null, columns = null;
  for (const line of markdown.replace(/\r\n/g, '\n').split('\n')) {
    const heading = line.match(/^### (GKP-\d+) — (.+)$/);
    if (heading) { current = { id: heading[1], title: heading[2].trim(), steps: [] }; cases.push(current); columns = null; continue; }
    if (/^#{1,2} /.test(line)) { current = null; continue; }
    if (!current || !line.startsWith('|')) continue;
    const row = cells(line);
    if (row.includes('Sonuç') && row.includes('Gereksinim No')) {
      columns = { step: row.indexOf('Adım No'), result: row.indexOf('Sonuç'), requirements: row.indexOf('Gereksinim No') };
      continue;
    }
    if (!columns || /^-+$/.test(row[0])) continue;
    const step = row[columns.step], result = row[columns.result];
    if (!RESULTS.includes(result)) throw new Error(`${current.id} step ${step}: unknown result "${result}"`);
    const requirements = [...new Set((row[columns.requirements].match(ID) ?? []).flatMap(expandIds))].sort(byId);
    current.steps.push({ step, result, requirements });
  }
  return cases;
}

/** Playwright JSON report -> Map(requirement id -> Pass | Fail | Flaky | Skipped) */
export function buildResults(report) {
  const outcomes = new Map();
  const visit = suite => {
    for (const spec of suite.specs ?? []) {
      const group = spec.title.match(/^\s*(R-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d+[a-z]?(?:\/\d+[a-z]?)*)\s*[|:]/);
      if (!group) continue;
      for (const run of spec.tests ?? []) {
        const statuses = (run.results ?? []).map(result => result.status);
        const outcome = run.status === 'flaky' ? 'Flaky'
          : statuses.some(s => s === 'failed' || s === 'timedOut' || s === 'interrupted') ? 'Fail'
            : statuses.length && statuses.every(s => s === 'skipped') ? 'Skipped' : 'Pass';
        for (const id of expandIds(group[1])) (outcomes.get(id) ?? outcomes.set(id, new Set()).get(id)).add(outcome);
      }
    }
    for (const child of suite.suites ?? []) visit(child);
  };
  for (const suite of report.suites ?? []) visit(suite);
  const rank = ['Fail', 'Flaky', 'Pass', 'Skipped'];
  return new Map([...outcomes].map(([id, set]) => [id, rank.find(outcome => set.has(outcome))]));
}

export function trace({ automated = collect(), cases = parseProcedure(readFileSync(PROCEDURE, 'utf8')), results = null } = {}) {
  const requirements = new Map();
  for (const row of automated) {
    const entry = requirements.get(row.id) ?? { tests: new Set(), layers: new Set(), cases: [], steps: {} };
    entry.tests.add(row.file); entry.layers.add(row.layer); requirements.set(row.id, entry);
  }
  const caseMap = new Map(), unknown = new Set();
  for (const testCase of cases) {
    const ids = [...new Set(testCase.steps.flatMap(step => step.requirements))].sort(byId);
    const steps = {};
    for (const step of testCase.steps) steps[step.result] = (steps[step.result] ?? 0) + 1;
    caseMap.set(testCase.id, { title: testCase.title, requirements: ids, steps, total: testCase.steps.length });
    for (const step of testCase.steps) for (const id of step.requirements) {
      const entry = requirements.get(id);
      if (!entry) { unknown.add(id); continue; }
      if (!entry.cases.includes(testCase.id)) entry.cases.push(testCase.id);
      entry.steps[step.result] = (entry.steps[step.result] ?? 0) + 1;
    }
  }
  const sorted = new Map([...requirements].sort(([a], [b]) => byId(a, b)));
  const withProcedure = [...sorted.values()].filter(entry => entry.cases.length).length;
  return { requirements: sorted, cases: caseMap, unknown: [...unknown].sort(byId), results,
    coverage: { total: sorted.size, withProcedure } };
}

const summary = steps => RESULTS.filter(result => steps[result]).map(result => `${result} ${steps[result]}`).join(', ') || '—';

export function render(report) {
  const { requirements, cases, unknown, results, coverage } = report;
  const percent = coverage.total ? (100 * coverage.withProcedure / coverage.total).toFixed(1) : '0.0';
  const allSteps = {};
  for (const entry of cases.values()) for (const [result, count] of Object.entries(entry.steps)) allSteps[result] = (allSteps[result] ?? 0) + count;
  const lines = [
    '# Requirement ↔ test procedure traceability',
    '',
    '> Generated by `node scripts/generate-traceability.mjs` from the test titles and the step tables of',
    '> [GKP.md](GKP.md). Do not edit by hand; `scripts/tests/traceability.test.js` fails when this file is stale.',
    '> Each CI build regenerates it with that build\'s browser results (job summary and `merged-browser-report`).',
    '',
    `**${coverage.total} requirement ids carried by automated tests; ${coverage.withProcedure} (${percent}%) also have a manual procedure step.**`,
    `**${cases.size} procedure cases; steps: ${summary(allSteps)}.**`,
    '',
    'A manual step result is recorded in GKP.md by the person who executes it; an automated pass never marks a manual step Pass.',
    ''
  ];
  if (results) {
    const counts = {};
    for (const id of requirements.keys()) { const value = results.get(id) ?? 'Not in this build\'s browser results'; counts[value] = (counts[value] ?? 0) + 1; }
    lines.push(`**This build (browser layer):** ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}.`, '');
  }
  lines.push('## Requirement → automated tests → procedure', '',
    results ? '| Requirement | Automated tests | Procedure cases | Manual steps | This build |' : '| Requirement | Automated tests | Procedure cases | Manual steps |',
    results ? '| --- | --- | --- | --- | --- |' : '| --- | --- | --- | --- |');
  for (const [id, entry] of requirements) {
    const row = [id, [...entry.tests].map(file => file.replace(/^.*\//, '')).sort().join(', '), entry.cases.join(', ') || '**none**', summary(entry.steps)];
    if (results) row.push(results.get(id) ?? 'Not in this build\'s browser results');
    lines.push(`| ${row.join(' | ')} |`);
  }
  lines.push('', '## Procedure case → requirements', '', '| Case | Title | Requirements | Steps |', '| --- | --- | --- | --- |');
  for (const [id, entry] of cases) lines.push(`| ${id} | ${entry.title} | ${entry.requirements.join(', ')} | ${summary(entry.steps)} |`);
  lines.push('', '## Consistency', '',
    unknown.length ? `Procedure ids that no automated test carries (check for a typo or a retired requirement): ${unknown.join(', ')}.` : 'Every requirement id in the procedure is carried by an automated test.', '');
  return lines.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const arg = name => { const index = process.argv.indexOf(name); return index > 0 ? process.argv[index + 1] : null; };
  const resultsFile = arg('--results');
  const results = resultsFile ? buildResults(JSON.parse(readFileSync(resultsFile, 'utf8'))) : null;
  const out = arg('--out') ?? OUT;
  writeFileSync(out, render(trace({ results })));
  console.log(`wrote ${out}`);
}
