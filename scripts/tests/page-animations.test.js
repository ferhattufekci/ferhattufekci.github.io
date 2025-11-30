import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const animations = require('../../js/page-animations.js');

test('R-NAV-06: every selectable animation refers only to classes provided by the stylesheet', async () => {
  const css = (await Promise.all(['animations.css', 'main.css'].map(file => readFile(new URL('../../css/' + file, import.meta.url), 'utf8')))).join('\n');
  for (let index = 0; index <= 67; index++) {
    const animation = animations.get(index);
    assert.ok(animation, String(index));
    for (const className of `${animation.inClass} ${animation.outClass}`.split(' ').filter(Boolean)) {
      assert.ok(css.includes('.' + className), className);
    }
  }
  assert.equal(animations.get(0).inClass, '');
  assert.equal(animations.get(1).inClass, 'pt-page-moveFromRight');
  assert.equal(animations.get(2).inClass, 'pt-page-moveFromLeft');
});
test('R-NAV-06: invalid boundary values cannot become animation definitions', () => {
  for (const index of [-1, 68, 1.5, NaN, 'constructor', '__proto__']) assert.equal(animations.get(index), null);
});
