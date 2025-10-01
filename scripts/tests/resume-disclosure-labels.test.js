import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { synchronizeResumeDisclosures } from '../lib/resume-disclosures.mjs';

const list = count => Array.from({ length: count }, (_, i) => `<li class="resume-tag">Tool ${i + 1}</li>`).join('');
function source(total, shown) {
  return `<html><body><section id="resume"><div class="timeline-item"><span class="item-company">Employer &amp; School</span><h4 class="item-title">Engineer</h4>
    <details class="resume-disclosure resume-tools"><summary><span class="resume-disclosure-title">Technologies &amp; Tools</span>
    <span class="resume-when-closed">Show More</span><span class="resume-when-open">Show Less</span>
    <span class="resume-disclosure-preview" aria-hidden="true">${list(shown).replaceAll('<li ', '<span ').replaceAll('</li>', '</span>')}</span></summary><ul>${list(total)}</ul></details>
    </div></section></body></html>`;
}

for (const [total, shown, extra] of [[8, 8, 0], [9, 8, 1], [44, 8, 36]]) {
  test(`R-DISCLOSURE-01: ${total} records and ${shown} preview entries produce ${extra} additional records`, () => {
    const output = synchronizeResumeDisclosures(source(total, shown));
    const { document } = parseHTML(output);
    assert.equal(document.querySelectorAll('li').length, total);
    if (!extra) {
      assert.equal(document.querySelector('details'), null);
      assert.equal(document.querySelector('summary'), null);
      assert.equal(document.querySelector('h5').textContent, 'Technologies & Tools');
    } else {
      assert.equal(document.querySelector('.resume-when-closed').textContent, `Show More (+${extra})`);
      assert.equal(document.querySelector('.resume-when-open').textContent, 'Show Less');
      assert.equal(document.querySelectorAll('.resume-disclosure-count').length, 1);
      assert.match(document.querySelector('.resume-disclosure-context').textContent, /Employer & School, Engineer/);
    }
    assert.equal(synchronizeResumeDisclosures(output), output, 'Generation is idempotent');
  });
}

test('R-DISCLOSURE-02: adding/removing a semantic record updates only the additional count', () => {
  const first = synchronizeResumeDisclosures(source(20, 8));
  const added = synchronizeResumeDisclosures(first.replace('</ul>', '<li class="resume-tag">JavaScript, iOS, C#</li></ul>'));
  assert.match(added, /\(\+13\)/);
  const removed = synchronizeResumeDisclosures(added.replace('<li class="resume-tag">JavaScript, iOS, C#</li>', ''));
  assert.equal(removed, first);
});
