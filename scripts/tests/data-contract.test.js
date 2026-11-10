import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeUrl, isSafeUrl } from '../lib/safe-url.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
const dataFiles = readdirSync(join(root, 'data')).filter(f => f.endsWith('.json')).sort();
const records = dataFiles.flatMap(file => {
  const parsed = read(join('data', file));
  return (Array.isArray(parsed) ? parsed : []).map((record, index) => ({ file, index, record }));
});

test('R-DATA-URL-01: every URL in the generated data uses http(s), so no href or src can execute', () => {
  assert.ok(records.length > 100, `expected the generated catalogue, found ${records.length} records`);
  for (const { file, index, record } of records) {
    for (const field of ['url', 'homepage', 'thumbnail']) {
      const value = record[field];
      if (value === null || value === undefined) continue;
      assert.ok(isSafeUrl(value), `${file}[${index}].${field} is not an http(s) URL: ${JSON.stringify(value)}`);
    }
  }
});

test('R-DATA-URL-02: safeUrl rejects the schemes a browser would execute, including obfuscated ones', () => {
  // Browsers trim leading control characters and spaces and ignore tab/newline inside the
  // scheme, so these are live javascript URLs when assigned to href.
  for (const hostile of [
    'javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', '\x01javascript:alert(1)',
    'java\tscript:alert(1)', 'java\nscript:alert(1)', 'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)', 'blob:https://x.test/abc', 'file:///etc/passwd',
    '//evil.test/x', '/relative', 'not a url', '', '   ', null, undefined, 42, {}
  ]) {
    assert.equal(safeUrl(hostile), null, `should reject ${JSON.stringify(String(hostile))}`);
  }
  for (const benign of ['https://medium.com/@a/b-1', 'http://example.test/x?y=1#z', 'HTTPS://X.TEST/']) {
    assert.equal(safeUrl(benign), benign, `should keep ${benign} unchanged`);
  }
  assert.equal(safeUrl('/relative', { base: 'https://x.test/' }), '/relative', 'a base resolves relative URLs');
  assert.equal(safeUrl('https://x.test/', { protocols: ['http:'] }), null, 'the allow-list is honoured');
});

test('R-DATA-URL-03: the generators validate at the trust boundary, not only in the committed data', () => {
  for (const [file, fields] of [['scripts/fetch-medium.js', ['url', 'thumbnail']], ['scripts/fetch-github.js', ['homepage']]]) {
    const source = readFileSync(join(root, file), 'utf8');
    assert.match(source, /import \{ safeUrl \}\s+from '\.\/lib\/safe-url\.mjs'/, `${file} does not import safeUrl`);
    const guardedLines = source.split('\n').filter(line => line.includes('safeUrl('));
    for (const field of fields) {
      assert.ok(guardedLines.some(line => line.includes(field)),
        `${file}: ${field} is not guarded by safeUrl (guarded lines: ${JSON.stringify(guardedLines)})`);
    }
  }
});

test('R-DATA-COLOR-01: language colours are hex literals, because they are interpolated into a style attribute unescaped', () => {
  // index.html builds `style="background:<colour>"` without escaping; the values come from a
  // local LANG_COLORS map in scripts/fetch-github.js, never from the API. This pins that.
  const colours = new Set();
  for (const { record } of records) {
    if (record.langColor) colours.add(record.langColor);
    for (const language of record.languages ?? []) colours.add(language.color);
  }
  assert.ok(colours.size > 0, 'no language colours found in the data');
  for (const colour of colours) assert.match(String(colour), /^#[0-9a-fA-F]{6}$/, `unsafe colour literal: ${colour}`);
});

test('R-DATA-NUM-01: counts rendered into markup without escaping are finite integers', () => {
  for (const { file, index, record } of records) {
    for (const field of ['stars', 'forks']) {
      if (record[field] === undefined) continue;
      assert.equal(typeof record[field], 'number', `${file}[${index}].${field} is not a number`);
      assert.ok(Number.isInteger(record[field]) && record[field] >= 0, `${file}[${index}].${field}: ${record[field]}`);
    }
    for (const language of record.languages ?? []) {
      assert.ok(Number.isInteger(language.percent) && language.percent >= 0 && language.percent <= 100,
        `${file}[${index}] language percent: ${language.percent}`);
    }
  }
});
