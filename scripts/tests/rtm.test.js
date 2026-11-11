import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collect, render } from '../generate-rtm.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const matrix = readFileSync(join(root, 'docs/business-analysis/requirements-traceability-matrix.md'), 'utf8');

test('R-DOC-RTM-01: the traceability matrix is generated from the tests and not stale', () => {
  assert.equal(matrix, render(collect()), 'run: node scripts/generate-rtm.mjs');
});

test('R-DOC-RTM-02: the extractor finds the titles it is built for and rejects malformed ids', () => {
  const rows = collect();
  assert.ok(rows.length > 200, `expected over 200 titled tests, found ${rows.length}`);
  for (const row of rows) {
    assert.match(row.id, /^R-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d+[a-z]?$/);
    assert.ok(row.behavior.length >= 10, `${row.id} has no behavior text`);
  }
  assert.ok(rows.some(r => r.layer.startsWith('Browser')) && rows.some(r => r.layer.startsWith('Unit')), 'both layers are represented');
});

test('R-DOC-RTM-03: an independent scan of every test title finds no id the matrix is missing', () => {
  // Deliberately not the generator's regex: take every test/it title string as a whole and
  // look for id-shaped tokens anywhere in it. Comparing the generator with itself (RTM-01)
  // cannot catch a title shape the generator does not understand; this can.
  const title = /\b(?:test|it)(?:\.\w+)*\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  const token = /R-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d+[a-z]?(?:\/\d+[a-z]?)*/g;
  const scanned = new Set();
  for (const dir of ['tests/browser', 'scripts/tests']) {
    for (const file of readdirSync(join(root, dir)).filter(name => /\.(?:spec\.mjs|test\.js)$/.test(name))) {
      for (const match of readFileSync(join(root, dir, file), 'utf8').matchAll(title)) {
        for (const group of match[2].match(token) ?? []) {
          const [first, ...rest] = group.split('/');
          const area = first.slice(0, first.search(/-\d+[a-z]?$/));
          scanned.add(first);
          for (const number of rest) scanned.add(`${area}-${number}`);
        }
      }
    }
  }
  const listed = new Set(collect().map(row => row.id));
  const missing = [...scanned].filter(id => !listed.has(id)).sort();
  assert.deepEqual(missing, [], `ids in test titles that the matrix does not list: ${missing.join(', ')}`);
  assert.ok(scanned.size > 200, `the scan itself found only ${scanned.size} ids`);
});

// A title built from a template placeholder ("`${id} | ...`") hides its requirement id from
// both the generator and the independent scan above: neither can see an id that only exists
// at run time. R-FOCUS-09/11 were missing from the matrix this way. The id part of a title
// (everything before the first " | " or ": ") must therefore be written literally.
export function templatedIdTitles(files) {
  const title = /\b(?:test|it)(?:\.\w+)*\(\s*`((?:\.|[^`])*?)`/g;
  const found = [];
  for (const [file, text] of files) {
    for (const match of text.matchAll(title)) {
      // Only the id slot: a title that opens with a placeholder, or an id with one inside it.
      // Titles that carry no id at all ("When category=${category}") are not traced either
      // way and are outside this check.
      if (/^\s*(?:\$\{|R-[A-Z0-9-]*\$\{)/.test(match[1])) found.push(`${file}: ${match[1].slice(0, 60)}`);
    }
  }
  return found;
}

test('R-DOC-RTM-04: no test title builds its requirement id from a template placeholder', () => {
  assert.deepEqual(templatedIdTitles([['a.spec.mjs', "test(`${id} | FOCUS-AC1 | survives ${entry}`, () => {})"]]),
    ['a.spec.mjs: ${id} | FOCUS-AC1 | survives ${entry}'], 'the check must catch a templated id');
  assert.deepEqual(templatedIdTitles([['b.spec.mjs', "test(`R-NAV-01 | opens the ${name} page`, () => {})"]]), [],
    'a placeholder after a literal id is allowed');
  assert.deepEqual(templatedIdTitles([['c.spec.mjs', "test(`R-NAV-${n} | opens`, () => {})"]]).length, 1, 'a placeholder inside the id is caught');
  const files = [];
  for (const dir of ['tests/browser', 'scripts/tests']) {
    for (const file of readdirSync(join(root, dir)).filter(name => /\.(?:spec\.mjs|test\.js)$/.test(name)))
      files.push([`${dir}/${file}`, readFileSync(join(root, dir, file), 'utf8')]);
  }
  const found = templatedIdTitles(files).filter(entry => !entry.startsWith('scripts/tests/rtm.test.js'));
  assert.deepEqual(found, [], 'write the requirement id literally in each test title');
});
