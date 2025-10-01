// Local acceptance-test browser. Uses the same fixtures as BDD; never rewrites data/.
import { pathToFileURL } from 'node:url';
import { createInterface } from 'node:readline';
import { chromium } from '@playwright/test';
import { createPagesServer, listen, close } from '../../scripts/lib/pages-preview.mjs';
import { isolateThirdParties } from '../browser/fixtures.mjs';
import { catalog, starred, mockCatalog } from '../browser/data/catalog.mjs';

export function manualOptions(args) {
  const options = { scenario: 'standard', starredCount: 41, hold: 'none', storage: 'normal', headless: false };
  for (const arg of args) {
    if (arg === '--headless') { options.headless = true; continue; }
    const match = /^--(scenario|starred|hold|storage)=(.+)$/.exec(arg);
    if (!match) throw new Error(`Unknown argument: ${arg}`);
    const [, key, value] = match;
    options[key === 'starred' ? 'starredCount' : key] = key === 'starred' ? Number(value) : value;
  }
  if (!['standard', 'empty', 'invalid-json'].includes(options.scenario)) throw new Error('Invalid scenario');
  if (!['none', 'blog', 'projects'].includes(options.hold)) throw new Error('Invalid hold target');
  if (!['normal', 'blocked'].includes(options.storage)) throw new Error('Invalid storage mode');
  // Test-tool resource guard, not a product limit.
  if (!Number.isInteger(options.starredCount) || options.starredCount < 0 || options.starredCount > 1000) throw new Error('Starred fixture count must be an integer from 0 to 1000');
  return options;
}

export function manualCatalog(options) {
  const snapshots = catalog({ 'github-starred.json': starred(options.starredCount) });
  if (options.scenario === 'empty') {
    for (const key of Object.keys(snapshots)) if (Array.isArray(snapshots[key])) snapshots[key] = [];
  }
  if (options.scenario === 'invalid-json') {
    for (const key of ['medium-test.json', 'github-repos.json', 'github-starred.json']) snapshots[key] = 'malformed-json';
  }
  return snapshots;
}

async function preview(options) {
  const server = createPagesServer();
  let browser, terminal, release;
  const stop = () => browser?.close();
  try {
    const origin = await listen(server);
    browser = await chromium.launch({ headless: options.headless });
    const context = await browser.newContext({ viewport: null });
    await isolateThirdParties(context, origin);
    if (options.storage === 'blocked') await context.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Synthetic storage denial', 'SecurityError'); } });
    });
    const page = await context.newPage();
    await mockCatalog(page, manualCatalog(options));
    if (options.hold !== 'none') {
      const ready = new Promise(resolve => { release = resolve; });
      const pattern = options.hold === 'blog' ? '**/data/medium-*.json' : '**/data/github-repos.json';
      await page.route(pattern, async route => { await ready; await route.fallback(); });
      console.log('JSON requests held. Choose filters, then press Enter here to release them.');
    }
    terminal = createInterface({ input: process.stdin, output: process.stdout });
    terminal.on('line', line => {
      if (line.trim() === 'q') stop();
      else if (release) { release(); console.log('JSON requests released.'); }
    });
    process.once('SIGINT', stop);
    await page.goto(origin + '/#' + (options.hold === 'blog' ? 'blog' : 'projects'), { waitUntil: 'domcontentloaded' });
    console.log(`Manual fixture: ${origin}; ${JSON.stringify(options)}. External services blocked. Close the browser or enter q to finish.`);
    await new Promise(resolve => browser.once('disconnected', resolve));
  } finally {
    process.removeListener('SIGINT', stop);
    release?.();
    terminal?.close();
    await browser?.close();
    await close(server);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await preview(manualOptions(process.argv.slice(2)));
}
