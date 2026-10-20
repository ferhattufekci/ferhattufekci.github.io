import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

for (const stored of [undefined, 'invalid', 'light', 'dark']) for (const systemDark of [false, true]) test(`R-THEME-02: startup preference stored=${stored}, darkOS=${systemDark}`, async () => {
  let selected;
  const media = { matches: systemDark, addEventListener() {} };
  const document = {
    readyState: 'complete',
    documentElement: { setAttribute: (name, value) => { selected = value; } },
    querySelectorAll: () => []
  };
  const sandbox = { document, window: { matchMedia: () => media }, localStorage: { getItem: () => stored } };
  vm.runInNewContext(await readFile(new URL('../../js/theme-init.js', import.meta.url), 'utf8'), sandbox);
  const expected = ['light', 'dark'].includes(stored) ? stored : systemDark ? 'dark' : 'light';
  assert.equal(selected, expected);
  vm.runInNewContext(await readFile(new URL('../../js/theme.js', import.meta.url), 'utf8'), sandbox);
  assert.equal(selected, expected);
});
test('R-THEME-03: blocked storage does not prevent the initial theme being applied', async () => {
  let selected;
  vm.runInNewContext(await readFile(new URL('../../js/theme-init.js', import.meta.url), 'utf8'), {
    document: { documentElement: { setAttribute: (name, value) => { selected = value; } } },
    window: { matchMedia: () => ({ matches: true }) },
    localStorage: { getItem() { throw new Error('blocked'); } }
  });
  assert.equal(selected, 'dark');
});
