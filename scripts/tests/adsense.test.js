import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { parseHTML } from 'linkedom';
const require = createRequire(import.meta.url);
const facts = JSON.parse(await readFile(new URL('../../tests/fixtures/adsense-states.json', import.meta.url), 'utf8'));

test('AC-01/09/10 | Provider state classification never equates processing, unknown or optimized content with no-fill', () => {
  // Processing markers and provider fill status have different meanings.
  const { classifyStatus } = require('../../js/adsense.js');
  for (const row of facts.states) assert.equal(classifyStatus(row.input), row.expected);
  for (const input of [null, undefined, 0, {}, []]) assert.equal(classifyStatus(input), 'waiting');
});

test('AC-13/15 | Both declared units match the exact user-supplied In-article snippet and remain excluded from Markdown', async () => {
  const { document } = parseHTML(await readFile(new URL('../../index.html', import.meta.url), 'utf8'));
  for (const page of ['projects', 'blog']) {
    const slot = document.querySelector(`.ad-slot-${page}`);
    assert.ok(slot.classList.contains('js-adsense'));
    // Deferred templates are permitted to prevent the global queue selecting
    // an inactive unit. Validate authored configuration in either location.
    const ins = slot.querySelector('ins.adsbygoogle') || slot.querySelector('template')?.content.querySelector('ins.adsbygoogle');
    assert.ok(ins, `${page}: authored unit exists`);
    for (const [attribute, value] of Object.entries({ 'data-ad-client': facts.publisher,
      'data-ad-slot': facts.slot, 'data-ad-format': facts.format, 'data-ad-layout': facts.layout })) assert.equal(ins.getAttribute(attribute), value, `${page}: ${attribute}`);
    assert.equal(ins.hasAttribute('data-ad-layout-key'), false);
  }
  assert.equal(document.querySelector('amp-auto-ads'), null);
  assert.equal(document.querySelector('script[custom-element="amp-auto-ads"]'), null);
  const markdown = await readFile(new URL('../../index.md', import.meta.url), 'utf8');
  assert.doesNotMatch(markdown, /Advertisements|Synthetic creative|Synthetic no-fill/);
});
