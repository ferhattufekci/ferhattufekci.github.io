// Stage-2 manual test utility: real site, fixture catalog, real browser APIs.
// No Share UI/production implementation or Clipboard read is provided here.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, firefox } from '@playwright/test';
import { createPagesServer, listen, close } from '../../scripts/lib/pages-preview.mjs';
import { isolateThirdParties } from '../browser/fixtures.mjs';
import { mockCatalog } from '../browser/data/catalog.mjs';

const args = process.argv.slice(2);
for (const arg of args) if (!['--artifact', '--clipboard=real', '--clipboard=absent', '--native=real', '--native=absent', '--theme=light', '--theme=dark', '--browser=chromium', '--browser=firefox'].includes(arg)) throw new Error('Unknown manual test option: ' + arg);
const absent = args.includes('--clipboard=absent');
const nativeAbsent = args.includes('--native=absent');
const colorScheme = args.includes('--theme=dark') ? 'dark' : 'light';
const browserName = args.includes('--browser=firefox') ? 'firefox' : 'chromium';
const facts = JSON.parse(await readFile(new URL('../fixtures/blog-sharing.json', import.meta.url), 'utf8'));
const long = { ...facts.articles.A, title: 'Uzun Türkçe başlık ve güvenilir paylaşım '.repeat(10).trim(),
  url: 'https://medium.com/@fixture/long?value=' + 'x'.repeat(400) + '#özet', date: '2020-01-01T00:00:00Z' };
const filler = Array.from({ length: 12 }, (_, i) => ({ ...facts.articles.B, title: `Scroll fixture ${i}`,
  url: `https://medium.com/@fixture/manual-${i}`, excerpt: 'Readable scroll fixture. '.repeat(12), date: '2021-01-01T00:00:00Z' }));
const server = createPagesServer(args.includes('--artifact') ? resolve('.pages-site') : undefined);
let browser;
const stop = () => browser?.close();
try {
  const origin = await listen(server);
  browser = await ({ chromium, firefox }[browserName]).launch({ headless: false });
  const context = await browser.newContext({ viewport: null, colorScheme });
  await isolateThirdParties(context, origin);
  if (absent) await context.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
  });
  if (nativeAbsent) await context.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
  });
  const page = await context.newPage();
  await mockCatalog(page, { 'medium-systems.json': [facts.articles.A, long], 'medium-test.json': [facts.articles.B, ...filler], 'medium-software.json': [facts.articles.U] });
  await page.goto(origin + '/#blog', { waitUntil: 'domcontentloaded' });
  const pad = await context.newPage();
  await pad.setContent('<!doctype html><title>Local test URL paste check</title><label>Known test URL only <textarea rows="8" cols="80"></textarea></label><p>Paste only after copying a known fixture URL. No Clipboard API reads or external transmission.</p>');
  await page.bringToFront();
  console.log(JSON.stringify({ origin, browserName, clipboard: absent ? 'API absent; manual OS copy remains real' : 'real, not mocked', native: nativeAbsent ? 'API absent; Copy fallback only' : 'real capability, not mocked', colorScheme,
    expected: { A: facts.articles.A.url, B: facts.articles.B.url, U: facts.articles.U.url, long: long.url },
    note: 'Not an acceptance result. Use the manual procedure; close the browser or Ctrl+C to finish.' }, null, 2));
  process.once('SIGINT', stop);
  await new Promise(done => browser.once('disconnected', done));
} finally {
  process.removeListener('SIGINT', stop);
  await browser?.close();
  await close(server);
}
