import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const gkpPath = fileURLToPath(new URL('../../docs/testing/GKP.md', import.meta.url));
const document = await readFile(gkpPath, 'utf8');
const requirementIds = text => text.match(/R-[A-Z0-9]+-\d{2}/g) || [];
const rows = text => text.split('\n').filter(line => line.startsWith('|')).map(line =>
  line.split('|').slice(1, -1).map(cell => cell.trim()));
const columns = ['Test Durumu Adı', 'Test Durumu Açıklaması', 'Adım No', 'Test Adımı',
  'Beklenen Test Sonuçları', 'Açıklama', 'Sonuç', 'Gereksinim No', 'Ön Koşul', 'Test Girdileri', 'Varsayımlar ve Kısıtlamalar'];

function validateGkp(text) {
  text = text.replace(/\r\n/g, '\n');
  const matrix = rows(text).filter(row => /^R-[A-Z0-9]+-\d{2}$/.test(row[0]));
  assert.ok(matrix.length, 'RTM must contain requirements');
  const requirements = new Map(matrix.map(row => [row[0], row]));
  assert.equal(requirements.size, matrix.length, 'Duplicate RTM requirement');
  const cases = [...text.matchAll(/^### (GKP-\d{3}) — (.+)\n([\s\S]*?)(?=^### |^## |$(?![\s\S]))/gm)];
  assert.ok(cases.length, 'Cases must exist');
  const caseIds = new Set(cases.map(match => match[1]));
  assert.equal(caseIds.size, cases.length, 'Duplicate case ID');
  let steps = 0;
  for (const [, id, title, body] of cases) {
    assert.ok(title.trim());
    for (const field of ['Amaç', 'Tür', 'Öncelik', 'Otomasyon']) assert.ok(body.includes(`**${field}:**`), `${id}: missing ${field}`);
    const table = rows(body);
    assert.deepEqual(table[0], columns, `${id}: exact eleven core GKP columns`);
    assert.equal(table[1]?.length, 11, `${id}: Markdown table delimiter required`);
    assert.ok(table[1].every(cell => /^:?-{3,}:?$/.test(cell)), `${id}: valid Markdown table delimiter`);
    const executable = table.slice(2);
    assert.ok(executable.length, `${id}: steps required`);
    executable.forEach((row, index) => {
      assert.equal(row.length, 11, `${id}: column count`);
      assert.ok(row.every(Boolean), `${id}/${index + 1}: missing precondition/input/expected result or other required cell`);
      assert.equal(row[2], String(index + 1), `${id}: sequential step numbers`);
      assert.equal(row[6], 'Not Run', `${id}: source procedure must not fabricate manual execution`);
      const references = requirementIds(row[7]);
      assert.ok(references.length, `${id}: step requirement missing`);
      for (const reference of references) {
        assert.ok(requirements.has(reference), `${id}: unknown requirement ${reference}`);
        assert.ok(requirements.get(reference)[3].includes(id), `${id}: missing reverse RTM mapping for ${reference}`);
      }
    });
    for (const requirement of matrix.filter(row => row[3].includes(id))) {
      assert.ok(executable.some(row => requirementIds(row[7]).includes(requirement[0])), `${id}: RTM maps a requirement absent from its steps`);
    }
    steps += executable.length;
  }
  for (const row of matrix) {
    const references = row[3].match(/GKP-\d{3}/g) || [];
    assert.ok(references.length, `${row[0]} has no manual design`);
    for (const id of references) assert.ok(caseIds.has(id), `${row[0]} references absent ${id}`);
  }
  return { requirements: matrix.length, cases: cases.length, steps, manualExecuted: 0 };
}

async function validateLinks(text, path) {
  for (const [, href] of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    if (/^https?:\/\//.test(href)) continue;
    const [target, anchor] = href.split('#');
    const destination = resolve(dirname(path), target || '.');
    assert.ok((await stat(destination)).isFile(), `${href}: file target`);
    if (anchor) assert.ok((await readFile(destination, 'utf8')).includes(`id="${decodeURIComponent(anchor)}"`), `${href}: explicit anchor`);
  }
}

test('R-GKP-02: manual cases have traceable requirements, eleven columns, complete steps and no invented execution', () => {
  const result = validateGkp(document);
  console.log('GKP design metrics:', JSON.stringify(result));
});

test('R-GKP-02: duplicated IDs, invalid sequences, blank expectations, unknown references and fabricated Pass are rejected', () => {
  for (const broken of [
    document.replace('### GKP-002 —', '### GKP-001 —'),
    document.replace('| Ana gezinme | Rota ve menü | 1 |', '| Ana gezinme | Rota ve menü | 9 |'),
    document.replace('About Me görünür; yalnız About Me menü öğesi aktiftir.', ''),
    document.replace('| Not Run | R-NAV-01 |', '| Not Run | R-UNKNOWN-01 |'),
    document.replace('| Not Run | R-NAV-01 |', '| Pass | R-NAV-01 |')
  ]) {
    assert.notEqual(broken, document, 'Mutation must actually change the document');
    assert.throws(() => validateGkp(broken));
  }
});

test('R-GKP-03: all manual/audit document links resolve and RTM risk IDs exist in real automated tests', async () => {
  const auditPath = join(dirname(gkpPath), 'TEST-AUDIT.md');
  await validateLinks(document, gkpPath);
  await validateLinks(await readFile(auditPath, 'utf8'), auditPath);
  let automation = '';
  for (const relative of ['scripts/tests', 'tests/browser']) {
    const directory = resolve(dirname(gkpPath), '../..', relative);
    for (const file of await readdir(directory)) {
      if (/\.(test\.js|spec\.mjs)$/.test(file)) automation += await readFile(join(directory, file), 'utf8');
    }
  }
  for (const row of rows(document).filter(row => /^R-[A-Z0-9]+-\d{2}$/.test(row[0]))) {
    assert.ok(automation.includes(row[0]), `RTM risk ID must trace to a real test: ${row[0]}`);
  }
});
