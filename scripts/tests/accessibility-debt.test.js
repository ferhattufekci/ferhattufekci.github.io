import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { unexpectedAccessibilityFindings } from '../../tests/helpers/accessibility-debt.mjs';

const debt = JSON.parse(await readFile(new URL('../../tests/fixtures/accessibility-debt.json', import.meta.url), 'utf8'));
const known = debt.profiles['desktop-light'][0];
const issue = finding => [{ id: finding.id, nodes: [finding] }];

test('R-A11Y-02: only the recorded rule, target, severity and measured failure are legacy debt', () => {
  assert.deepEqual(unexpectedAccessibilityFindings(issue(structuredClone(known)), [known]), []);
  for (const mutate of [
    node => { node.id = 'new-accessibility-rule'; },
    node => { node.target = ['.new-component']; },
    node => { node.impact = 'critical'; },
    node => { node.any[0].data.contrastRatio = 1.01; },
    node => { node.any[0].data.fgColor = '#eeeeee'; }
  ]) {
    const changed = structuredClone(known);
    mutate(changed);
    assert.equal(unexpectedAccessibilityFindings(issue(changed), [known]).length, 1, JSON.stringify(changed));
  }
});

test('R-A11Y-02: removing debt is allowed, an empty profile never accepts new findings, and no rules are disabled', () => {
  assert.deepEqual(unexpectedAccessibilityFindings([], [known]), []);
  assert.equal(unexpectedAccessibilityFindings(issue(known), debt.profiles['mobile-dark']).length, 1);
});
