import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { parseHTML } from 'linkedom';
import { fileURLToPath } from 'node:url';

const bootUrl = new URL('../../js/theme-init.js', import.meta.url);
const moduleUrl = new URL('../../js/theme.js', import.meta.url);
const boot = await readFile(bootUrl, 'utf8');
const module = await readFile(moduleUrl, 'utf8');

function themeFixture({ stored, systemDark = false, blocked = false, loading = false } = {}) {
  const { document, Event } = parseHTML('<html><body>' +
    '<button class="theme-toggle-btn"><span class="theme-toggle-icon"></span></button>'.repeat(2) + '</body></html>');
  if (loading) Object.defineProperty(document, 'readyState', { value: 'loading' });
  const changes = [];
  const media = { matches: systemDark, addEventListener: (type, listener) => {
    assert.equal(type, 'change'); changes.push(listener);
  } };
  const storage = { value: stored,
    getItem(key) { assert.equal(key, 'ft-theme'); if (blocked) throw new Error('Storage blocked'); return this.value; },
    setItem(key, value) { assert.equal(key, 'ft-theme'); if (blocked) throw new Error('Storage blocked'); this.value = value; }
  };
  const sandbox = { document, localStorage: storage, window: { matchMedia: query => {
    assert.equal(query, '(prefers-color-scheme: dark)'); return media;
  } } };
  vm.runInNewContext(boot, sandbox, { filename: fileURLToPath(bootUrl) });
  vm.runInNewContext(module, sandbox, { filename: fileURLToPath(moduleUrl) });
  return { document, storage, buttons: [...document.querySelectorAll('button')],
    ready: () => document.dispatchEvent(new Event('DOMContentLoaded')),
    changeSystem(dark) { media.matches = dark; changes.forEach(listener => listener({ matches: dark })); }
  };
}

function expectTheme(fixture, theme) {
  assert.equal(fixture.document.documentElement.getAttribute('data-theme'), theme);
  for (const button of fixture.buttons) {
    assert.equal(button.getAttribute('aria-label'), theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    assert.equal(button.getAttribute('title'), theme === 'dark' ? 'Light mode' : 'Dark mode');
    assert.equal(button.querySelector('span').textContent, theme === 'dark' ? '☀️' : '🌙');
  }
}

for (const stored of [undefined, 'invalid', 'light', 'dark']) for (const systemDark of [false, true]) test(`R-THEME-02: startup preference stored=${stored}, darkOS=${systemDark}`, async () => {
  const expected = ['light', 'dark'].includes(stored) ? stored : systemDark ? 'dark' : 'light';
  expectTheme(themeFixture({ stored, systemDark }), expected);
});
test('R-THEME-03: blocked storage does not prevent the initial theme being applied', async () => {
  const fixture = themeFixture({ systemDark: true, blocked: true });
  expectTheme(fixture, 'dark');
  fixture.buttons[0].click();
  expectTheme(fixture, 'light');
  fixture.buttons[1].click();
  expectTheme(fixture, 'dark');
});

for (const stored of [undefined, 'invalid', 'light', 'dark']) {
  test(`R-THEME-02: OS changes follow only when no valid saved choice exists (${stored})`, () => {
    const fixture = themeFixture({ stored });
    fixture.changeSystem(true);
    expectTheme(fixture, ['light', 'dark'].includes(stored) ? stored : 'dark');
    fixture.changeSystem(false);
    expectTheme(fixture, ['light', 'dark'].includes(stored) ? stored : 'light');
  });
}

for (const initial of ['light', 'dark']) {
  test(`R-THEME-04: both controls synchronize labels/icons, save a ${initial} override and ignore later OS changes`, () => {
    const fixture = themeFixture({ stored: initial });
    const next = initial === 'light' ? 'dark' : 'light';
    fixture.buttons[0].click();
    expectTheme(fixture, next);
    assert.equal(fixture.storage.value, next);
    fixture.changeSystem(next !== 'dark');
    expectTheme(fixture, next);
    fixture.buttons[1].click();
    expectTheme(fixture, initial);
    assert.equal(fixture.storage.value, initial);
  });
}

test('R-THEME-01: boot applies the theme before paint and controls initialize once DOM content is ready', () => {
  const fixture = themeFixture({ stored: 'dark', loading: true });
  assert.equal(fixture.document.documentElement.getAttribute('data-theme'), 'dark');
  assert.equal(fixture.buttons[0].getAttribute('aria-label'), null);
  fixture.ready();
  expectTheme(fixture, 'dark');
  fixture.buttons[0].click();
  expectTheme(fixture, 'light');
});
