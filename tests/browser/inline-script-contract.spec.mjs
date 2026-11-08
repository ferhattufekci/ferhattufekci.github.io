import { test, expect, expectSection } from './fixtures.mjs';
import { mockCatalog, starred } from './data/catalog.mjs';

// A0 (docs/T-4-INLINE-SCRIPTS.md): characterization of what the inline scripts of
// index.html do today. These tests pin observable behavior, not where the code
// lives, so the later extraction (A1+) can prove it changed nothing. They must be
// green on the current code and are never loosened to follow a move.
const GA_ID = 'G-Z00CDE35NT';

async function open(page, hash = '') {
  await mockCatalog(page);
  await page.goto(`/${hash}`);
  await expect(page.locator('.preloader')).toHaveCount(0);
}

// Date.now is frozen only for the synchronous duration of `fn`, so no page timer can interleave.
const withNow = (page, now, fn, arg) =>
  page.evaluate(([iso, source, argument]) => {
    const real = Date.now;
    Date.now = () => Date.parse(iso);
    try { return new Function('arg', `return (${source})(arg)`)(argument); }
    finally { Date.now = real; }
  }, [now, fn.toString(), arg]);

test.describe('A0-03 | global contract of the inline scripts', () => {
  test('every global the markup, other scripts and tests rely on exists after load', async ({ page }) => {
    await open(page);
    const kinds = await page.evaluate(() => Object.fromEntries(
      ['setBlogLang', 'showMoreStarred', 'reblog', 'fmtDT', 'relTime', 'renderSyncBadge', 'gtag']
        .map(name => [name, typeof window[name]])
    ));
    expect(kinds).toEqual({
      setBlogLang: 'function', showMoreStarred: 'function', reblog: 'function',
      fmtDT: 'function', relTime: 'function', renderSyncBadge: 'function', gtag: 'function'
    });
    expect(await page.evaluate(() => Array.isArray(window.dataLayer))).toBe(true);
    expect(await page.evaluate(() => typeof window.PortfolioContentPanels?.reset)).toBe('function');
  });

  test('the inline handlers in the markup resolve to those globals', async ({ page }) => {
    await open(page);
    const handlers = await page.evaluate(() => [...document.querySelectorAll('[onclick]')]
      .map(node => node.getAttribute('onclick')));
    expect(handlers.sort()).toEqual(
      ["setBlogLang('all')", "setBlogLang('en')", "setBlogLang('tr')", 'showMoreStarred()'].sort()
    );
    for (const call of handlers) {
      const name = call.slice(0, call.indexOf('('));
      expect(await page.evaluate(n => typeof window[n], name), `${call} must resolve`).toBe('function');
    }
  });
});

test.describe('A0-04 | measurement bootstrap', () => {
  test('dataLayer starts with js then config for the production measurement id, with no network', async ({ page }) => {
    const external = [];
    page.on('requestfailed', request => { if (!request.url().startsWith('http://127.0.0.1')) external.push(request.url()); });
    await open(page);
    const layer = await page.evaluate(() => window.dataLayer.map(entry => ({
      args: Array.from(entry).map(value => value instanceof Date ? '[Date]' : value),
      isDate: entry[1] instanceof Date
    })));
    expect(layer.slice(0, 2)).toEqual([
      { args: ['js', '[Date]'], isDate: true },
      { args: ['config', GA_ID], isDate: false }
    ]);
    // The tag request is made, and is refused by the test sandbox: nothing real is measured.
    expect(external.some(url => url.includes('googletagmanager.com/gtag/js'))).toBe(true);
  });

  test('gtag pushes its arguments object, not an array copy', async ({ page }) => {
    await open(page);
    const shape = await page.evaluate(() => {
      const before = window.dataLayer.length;
      window.gtag('event', 'a0_probe', { n: 1 });
      const entry = window.dataLayer[before];
      return { added: window.dataLayer.length - before, array: Array.isArray(entry), tag: Object.prototype.toString.call(entry), args: Array.from(entry) };
    });
    expect(shape).toEqual({ added: 1, array: false, tag: '[object Arguments]', args: ['event', 'a0_probe', { n: 1 }] });
  });
});

test.describe('A0-06 | date formatting helpers', () => {
  test('fmtDT renders Istanbul wall-clock time and rejects unusable input with an empty string', async ({ page }) => {
    await open(page);
    const cases = [
      ['2026-01-15T12:00:00Z', '15.01.2026 15:00'],
      ['2026-07-01T21:30:00Z', '02.07.2026 00:30'],
      ['2026-12-31T21:00:00Z', '01.01.2027 00:00'],
      ['2026-03-29T00:59:00+03:00', '29.03.2026 00:59'],
      ['', ''], [null, ''], [undefined, ''], ['undefined', ''], ['not a date', ''], [0, '']
    ];
    for (const [input, expected] of cases)
      expect(await page.evaluate(value => window.fmtDT(value), input), `fmtDT(${JSON.stringify(input)})`).toBe(expected);
  });

  test('relTime picks the unit by rounded distance and falls back to the date after a week', async ({ page }) => {
    await open(page);
    const now = '2026-11-08T12:00:00Z';
    const ago = ms => new Date(Date.parse(now) - ms).toISOString();
    const SEC = 1000, MIN = 60 * SEC, HOUR = 60 * MIN, DAY = 24 * HOUR;
    const cases = [
      [0, 'just now'], [29 * SEC, 'just now'], [31 * SEC, '1m ago'], [59 * MIN, '59m ago'],
      [89 * MIN, '1h ago'], [90 * MIN, '2h ago'], [23 * HOUR, '23h ago'],
      [36 * HOUR, '2d ago'], [6 * DAY, '6d ago'], [7 * DAY, '01.11.2026'], [40 * DAY, '29.09.2026'],
      [-5 * MIN, 'just now']
    ];
    for (const [offset, expected] of cases) {
      const value = await withNow(page, now, iso => window.relTime(new Date(iso)), ago(offset));
      expect(value, `${offset / SEC}s ago`).toBe(expected);
    }
  });
});

test.describe('A0-06 | sync badge', () => {
  const mount = (page, className = 'sync-badge') => page.evaluate(cls => {
    document.getElementById('a0-badge')?.remove();
    const badge = Object.assign(document.createElement('span'), { id: 'a0-badge', className: cls });
    badge.textContent = 'untouched';
    document.body.append(badge);
  }, className);

  test('renders the source, a relative time, an exact tooltip and keyboard semantics', async ({ page }) => {
    await open(page);
    await mount(page);
    await withNow(page, '2026-11-08T12:00:00Z', () => window.renderSyncBadge('a0-badge', 'GitHub', '2026-11-08T11:00:00Z'));
    const badge = page.locator('#a0-badge');
    await expect(badge.locator('.sync-badge-source')).toHaveText('GitHub');
    await expect(badge.locator('time.sync-badge-time')).toHaveText('1h ago');
    await expect(badge.locator('time.sync-badge-time')).toHaveAttribute('datetime', '2026-11-08T11:00:00.000Z');
    await expect(badge.locator('time.sync-badge-time')).toHaveAttribute('data-ts', String(Date.parse('2026-11-08T11:00:00Z')));
    await expect(badge.locator('.sync-badge-tip')).toHaveText('GitHub synced 08.11.2026 14:00');
    await expect(badge.locator('.sync-badge-icon')).toHaveAttribute('aria-hidden', 'true');
    await expect(badge).toHaveAttribute('tabindex', '0');
    await expect(badge).toHaveAttribute('aria-label', 'GitHub data last synced 08.11.2026 14:00');
    await expect(badge).not.toHaveAttribute('title', /.*/);
    await expect(badge).toHaveClass(/\bis-ready\b/);
  });

  test('missing element, empty date or invalid date change nothing and do not throw', async ({ page }) => {
    await open(page);
    await mount(page);
    for (const [id, iso] of [['a0-missing', '2026-11-08T11:00:00Z'], ['a0-badge', ''], ['a0-badge', undefined], ['a0-badge', 'garbage']]) {
      await page.evaluate(([i, d]) => window.renderSyncBadge(i, 'GitHub', d), [id, iso]);
      await expect(page.locator('#a0-badge')).toHaveText('untouched');
      await expect(page.locator('#a0-badge')).not.toHaveAttribute('tabindex', /.*/);
    }
  });

  test('a tap opens the tooltip, another tap or Escape closes it, and only one is open at a time', async ({ page }) => {
    await open(page);
    await page.evaluate(() => {
      for (const id of ['a0-one', 'a0-two']) {
        const badge = Object.assign(document.createElement('span'), { id, className: 'sync-badge' });
        document.body.append(badge);
        window.renderSyncBadge(id, id, '2026-11-08T11:00:00Z');
      }
    });
    const one = page.locator('#a0-one'), two = page.locator('#a0-two');
    await one.evaluate(node => node.click());
    await expect(one).toHaveClass(/tip-open/);
    await two.evaluate(node => node.click());
    await expect(two).toHaveClass(/tip-open/);
    await expect(one).not.toHaveClass(/tip-open/);
    await two.evaluate(node => node.click());
    await expect(two).not.toHaveClass(/tip-open/);
    await one.evaluate(node => node.click());
    await expect(one).toHaveClass(/tip-open/);
    await page.keyboard.press('Escape');
    await expect(one).not.toHaveClass(/tip-open/);
  });

  test('the page timer refreshes relative times without refetching', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-08T12:00:00Z') });
    await open(page);
    await mount(page);
    await page.evaluate(() => window.renderSyncBadge('a0-badge', 'GitHub', '2026-11-08T11:59:30Z'));
    await expect(page.locator('#a0-badge time')).toHaveText('1m ago');
    const requests = [];
    page.on('request', request => requests.push(request.url()));
    await page.clock.fastForward('02:00:00');
    await expect(page.locator('#a0-badge time')).toHaveText('2h ago');
    expect(requests.filter(url => url.includes('/data/'))).toEqual([]);
  });
});

test.describe('A0-07 | reblog', () => {
  const grid = page => page.locator('#blog-grid .blog-article-title');

  test('reblog redraws the Blog from the current selection and is idempotent', async ({ page }) => {
    await open(page, '#blog');
    await expectSection(page, 'blog');
    await page.evaluate(() => window.setBlogLang('tr'));
    await expect(grid(page)).toHaveText(['Testing TR', 'Software TR', 'Systems TR']);
    const marker = await page.evaluate(() => {
      document.querySelector('#blog-grid .blog-article-title').setAttribute('data-a0', 'old');
      window.reblog();
      return document.querySelectorAll('#blog-grid [data-a0]').length;
    });
    // render() rebuilds the cards: a marker on an old card does not survive, content does.
    expect(marker).toBe(0);
    await expect(grid(page)).toHaveText(['Testing TR', 'Software TR', 'Systems TR']);
    await page.evaluate(() => { window.reblog(); window.reblog(); });
    await expect(grid(page)).toHaveText(['Testing TR', 'Software TR', 'Systems TR']);
    await expect(page.locator('#blog-empty')).toBeHidden();
    await expect(page.locator('#blog-grid')).toHaveAttribute('aria-busy', 'false');
  });

  test('reblog keeps language and category selection and the active button state', async ({ page }) => {
    await open(page, '#blog');
    await expectSection(page, 'blog');
    await page.evaluate(() => window.setBlogLang('en'));
    await page.evaluate(() => window.reblog());
    await expect(page.locator('#blog-lang-toggle [aria-pressed="true"]')).toHaveAttribute('data-lang-filter', 'en');
    await expect(grid(page)).toHaveText(['Systems EN', 'Software EN', 'Testing EN']);
  });
});

test.describe('A0-07 | showMoreStarred', () => {
  const stars = page => page.evaluate(() => new Set(
    [...document.querySelectorAll('#proj-starred-grid a[href^="https://github.com/fixture/star-"]')].map(a => a.href)
  ).size);
  const remaining = page => page.locator('#proj-starred-remaining');

  test('pages the starred list 20 at a time, hides the control at the end and never duplicates', async ({ page }) => {
    await mockCatalog(page, { 'github-starred.json': starred(45) });
    await page.goto('/#projects');
    await expectSection(page, 'projects');
    await expect.poll(() => stars(page)).toBe(20);
    await expect(page.locator('#proj-starred-more-wrap')).toBeVisible();
    await expect(remaining(page)).toHaveText('(25 more)');

    await page.locator('#proj-starred-more-btn').click();      // the inline onclick path
    await expect.poll(() => stars(page)).toBe(40);
    await expect(remaining(page)).toHaveText('(5 more)');

    await page.evaluate(() => window.showMoreStarred());        // the global itself
    await expect.poll(() => stars(page)).toBe(45);
    await expect(page.locator('#proj-starred-more-wrap')).toBeHidden();

    await page.evaluate(() => window.showMoreStarred());        // past the end: harmless
    await expect.poll(() => stars(page)).toBe(45);
    await expect(page.locator('#proj-starred-more-wrap')).toBeHidden();
  });

  test('keyboard focus moves into the new cards when the last page was loaded from the control', async ({ page }) => {
    await mockCatalog(page, { 'github-starred.json': starred(25) });
    await page.goto('/#projects');
    await expectSection(page, 'projects');
    await expect.poll(() => stars(page)).toBe(20);
    await page.locator('#proj-starred-more-btn').focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => stars(page)).toBe(25);
    await expect(page.locator('#proj-starred-more-wrap')).toBeHidden();
    expect(await page.evaluate(() => document.activeElement.closest('#proj-starred-grid') !== null)).toBe(true);
  });

  test('with no starred repositories the section stays hidden and the call is harmless', async ({ page }) => {
    await mockCatalog(page);
    await page.goto('/#projects');
    await expectSection(page, 'projects');
    await page.evaluate(() => window.showMoreStarred());
    await expect(page.locator('#proj-starred-wrap')).toBeHidden();
    await expect(page.locator('#proj-starred-grid a')).toHaveCount(0);
  });
});

test.describe('A0-08 | language button state', () => {
  test('exactly the chosen button is active and pressed; repeating or invalid choices do not touch the DOM', async ({ page }) => {
    await open(page, '#blog');
    await expectSection(page, 'blog');
    const state = () => page.evaluate(() => [...document.querySelectorAll('#blog-lang-toggle button')].map(button => ({
      lang: button.dataset.langFilter, pressed: button.getAttribute('aria-pressed'), active: button.classList.contains('active')
    })));
    const expectOnly = async lang => expect(await state()).toEqual(
      ['all', 'tr', 'en'].map(item => ({ lang: item, pressed: String(item === lang), active: item === lang }))
    );
    await expectOnly('all');
    for (const lang of ['tr', 'en', 'all', 'en']) {
      await page.evaluate(value => window.setBlogLang(value), lang);
      await expectOnly(lang);
    }
    const mutations = await page.evaluate(() => new Promise(resolve => {
      const records = [];
      const observer = new MutationObserver(list => records.push(...list));
      observer.observe(document.querySelector('.pt-page[data-id="blog"]'), { subtree: true, childList: true, attributes: true, characterData: true });
      for (const value of ['en', 'unsupported', 'TR', '', undefined, null, 5]) window.setBlogLang(value);
      setTimeout(() => { observer.disconnect(); resolve(records.length); }, 100);
    }));
    expect(mutations).toBe(0);
    await expectOnly('en');
  });

  test('clicking each button calls the same global and ends in the same state', async ({ page }) => {
    await open(page, '#blog');
    await expectSection(page, 'blog');
    for (const lang of ['tr', 'en', 'all']) {
      await page.locator(`#blog-lang-toggle [data-lang-filter="${lang}"]`).click();
      await expect(page.locator('#blog-lang-toggle [aria-pressed="true"]')).toHaveAttribute('data-lang-filter', lang);
    }
  });
});

test.describe('A0-09 | script ordering at startup', () => {
  test('the Projects and Blog boot code has run before the first jQuery ready callback', async ({ page }) => {
    await page.addInitScript(() => {
      window.__a0Ready = [];
      window.__a0Fetch = [];
      const realFetch = window.fetch;
      window.fetch = function (input, ...rest) {
        window.__a0Fetch.push(String(input?.url || input));
        return realFetch.call(this, input, ...rest);
      };
      let value;
      Object.defineProperty(window, 'jQuery', {
        configurable: true,
        get: () => value,
        set(next) {
          value = next;
          const original = next.fn.ready;
          next.fn.ready = function (callback) {
            return original.call(this, function () {
              window.__a0Ready.push({
                setBlogLang: typeof window.setBlogLang, showMoreStarred: typeof window.showMoreStarred,
                reblog: typeof window.reblog, renderSyncBadge: typeof window.renderSyncBadge,
                requested: window.__a0Fetch.map(url => url.split('/').pop()),
                state: document.readyState
              });
              return callback.apply(this, arguments);
            });
          };
        }
      });
    });
    await open(page);
    const log = await page.evaluate(() => window.__a0Ready);
    expect(log.length, 'jQuery ready callbacks must be observed').toBeGreaterThan(0);
    for (const entry of log) {
      expect(entry, 'globals must precede jQuery ready').toMatchObject({
        setBlogLang: 'function', showMoreStarred: 'function', reblog: 'function', renderSyncBadge: 'function'
      });
      // Each boot's observable side effect is its data requests: both must already be issued.
      expect(entry.requested, 'Projects and Blog boot must have started their requests').toEqual(
        expect.arrayContaining(['github-repos.json', 'medium-systems.json'])
      );
    }
  });

  // jQuery 3 runs ready callbacks asynchronously, so they can land after `load`; the
  // deterministic ordering fact is the sequence of DOMContentLoaded listeners.
  test('both boots listen for DOMContentLoaded ahead of jQuery\'s own listener and run before it', async ({ page }) => {
    await page.addInitScript(() => {
      window.__a0Dcl = [];
      const original = document.addEventListener;
      document.addEventListener = function (type, listener, ...rest) {
        if (type !== 'DOMContentLoaded' || typeof listener !== 'function') return original.call(this, type, listener, ...rest);
        // Who registered it: the executing script's file, or "inline" for an inline block.
        const owner = (document.currentScript?.getAttribute('src') || 'inline').split('?')[0].split('/').pop();
        const name = `${owner}:${listener.name || 'anonymous'}`;
        return original.call(this, type, function () { window.__a0Dcl.push(name); return listener.apply(this, arguments); }, ...rest);
      };
    });
    await open(page);
    const order = await page.evaluate(() => window.__a0Dcl);
    const jquery = order.findIndex(name => name.startsWith('jquery-3.6.0.min.js:'));
    expect(jquery, `jQuery registers a DOMContentLoaded listener (${order})`).toBeGreaterThan(-1);
    const boots = order.filter(name => name === 'inline:boot');
    expect(boots, 'Projects and Blog each register one inline boot').toHaveLength(2);
    expect(order.lastIndexOf('inline:boot')).toBeLessThan(jquery);
  });

  test('catalog content exists once the page has settled, with no runtime error', async ({ page }) => {
    await open(page, '#blog');
    await expectSection(page, 'blog');
    await expect(page.locator('#blog-grid .blog-article-title')).toHaveCount(6);
    await expect(page.locator('#blog-loading')).toBeHidden();
  });
});

test.describe('A0-10 | early interaction (documents today\'s behavior)', () => {
  // Today setBlogLang exists as soon as its inline block ran, but it finishes by
  // calling PortfolioContentPanels, which js/page-content-panels.js defines much
  // later. A choice made while jQuery is still loading therefore takes effect and
  // then throws. The migration may only change this deliberately: if the throw
  // disappears (an improvement) this test is updated together with that change.
  test('a language chosen before page-content-panels.js loads is applied, then throws ReferenceError', async ({ page }) => {
    await mockCatalog(page);
    await page.route('**/js/jquery-3.6.0.min.js*', async route => {
      // Holding jQuery keeps the parser, and therefore the later scripts, waiting.
      await new Promise(resolve => setTimeout(resolve, 1500));
      await route.continue();
    });
    const loading = page.goto('/#blog', { waitUntil: 'commit' });
    await page.waitForFunction(() => typeof window.setBlogLang === 'function' && document.getElementById('blog-lang-toggle'));
    // The inline onclick attribute is exactly this call; calling it directly keeps the throw observable here.
    const outcome = await page.evaluate(() => {
      const handler = document.querySelector('#blog-lang-toggle [data-lang-filter="tr"]').getAttribute('onclick');
      let thrown = null;
      try { window.setBlogLang('tr'); } catch (error) { thrown = `${error.name}: ${error.message}`; }
      return { handler, thrown, panels: typeof window.PortfolioContentPanels };
    });
    await loading;
    expect(outcome).toEqual({
      handler: "setBlogLang('tr')", thrown: 'ReferenceError: PortfolioContentPanels is not defined', panels: 'undefined'
    });
    await expect(page.locator('.preloader')).toHaveCount(0, { timeout: 15000 });
    await expect(page.locator('#blog-lang-toggle [aria-pressed="true"]')).toHaveAttribute('data-lang-filter', 'tr');
    await expect(page.locator('#blog-grid .blog-article-title')).toHaveText(['Testing TR', 'Software TR', 'Systems TR']);
  });
});
