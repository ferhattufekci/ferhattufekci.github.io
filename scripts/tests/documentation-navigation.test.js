import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8');
const strategy = readFileSync(new URL('../../TEST-STRATEJISI.md', import.meta.url), 'utf8');

function section(document, language) {
  const marker = `## ${language}\n`;
  const normalized = document.replace(/\r\n/g, '\n');
  const start = normalized.indexOf(marker);
  assert.notEqual(start, -1, `${language} section must exist`);
  const end = normalized.indexOf('\n## ', start + marker.length);
  return normalized.slice(start, end === -1 ? undefined : end);
}

test('R-DOC-01: maintenance and test links belong to their README language sections', () => {
  const preamble = readme.split('## English')[0];
  assert.doesNotMatch(preamble, /\[(?:Bakım rehberi|Test stratejisi|Maintenance guide|Test strategy)\]/);
  for (const [language, label, anchor] of [
    ['English', 'Maintenance guide', 'maintenance-guide'],
    ['Türkçe', 'Bakım rehberi', 'bakim-rehberi'],
  ]) {
    const content = section(readme, language);
    assert.ok(content.includes(`[${label}](#${anchor})`), `${language} must link to its guide`);
    assert.ok(content.includes(`<a id="${anchor}"></a>`), `${language} guide target must resolve inside its section`);
    assert.ok(content.indexOf(`[${label}]`) < content.indexOf(`<a id="${anchor}">`));
  }
});

test('R-DOC-02: test strategy links open the matching language, with a return path', () => {
  for (const [language, label, anchor, returnAnchor] of [
    ['English', 'Test strategy', 'test-strategy-en', 'english'],
    ['Türkçe', 'Test stratejisi', 'test-strategy-tr', 'türkçe'],
  ]) {
    assert.ok(section(readme, language).includes(`[${label}](TEST-STRATEJISI.md#${anchor})`));
    const content = section(strategy, language);
    assert.ok(content.includes(`<a id="${anchor}"></a>`), `${language} strategy target must resolve`);
    assert.ok(content.includes(`(README.md#${returnAnchor})`), `${language} must return to the matching README section`);
  }
});

test('R-DOC-03: both strategy translations preserve risk coverage and executable commands', () => {
  const english = section(strategy, 'English');
  const turkish = section(strategy, 'Türkçe');
  const risks = (text) => [...new Set(text.match(/R-[A-Z]+-\d+(?:[–/-]\d+)*/g))].sort();
  const commands = (text) => [...text.matchAll(/```powershell\n([\s\S]*?)```/g)].map((match) => match[1].trim());
  assert.ok(risks(english).length >= 10, 'English must include the risk matrix, not just a translated introduction');
  assert.deepEqual(risks(english), risks(turkish));
  assert.deepEqual(commands(english), commands(turkish));
  assert.ok(commands(english).length > 0);
});
