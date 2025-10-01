import { test, expect, expectSection, navigateToSection } from './fixtures.mjs';

test.use({ reducedMotion: 'no-preference' });

test('R-MOTION-06 | Selecting active routes preserves navigation and mobile drawer re-entry', async ({ page }) => {
  await open(page);
  const mobile = await page.locator('.menu-toggle').isVisible();
  for (const id of ['about-me', 'resume', 'resume', 'projects']) {
    if (mobile) await navigateToSection(page, id);
    else {
      await select(page, id);
      await settled(page, id);
    }
  }
});

async function settled(page, id) {
  await expectSection(page, id);
  await expect.poll(() => page.locator('.subpages > .pt-page').evaluateAll(nodes => nodes.flatMap(node =>
    [...node.classList].filter(name => name.startsWith('pt-page-') && name !== 'pt-page-current')))).toEqual([]);
}

async function open(page, id = 'about-me') {
  await page.goto('/#' + id);
  await expect(page.locator('.preloader')).toHaveCount(0);
  await settled(page, id);
}

async function record(page, from, to) {
  await page.evaluate(({ from, to }) => {
    const trace = { frames: [], activations: [], settlements: [] };
    window.motionTrace = trace;
    const started = performance.now();
    const activate = event => trace.activations.push(event.detail.page.dataset.id);
    const settle = event => trace.settlements.push(event.detail.page.dataset.id);
    document.addEventListener('portfolio:page-activate', activate);
    document.addEventListener('portfolio:page-settled', settle);
    let frame;
    function sample() {
      const incoming = document.querySelector(`[data-id="${to}"]`), outgoing = document.querySelector(`[data-id="${from}"]`);
      const overlay = getComputedStyle(document.querySelector('.mobile-menu-overlay'));
      const header = getComputedStyle(document.querySelector('#site_header'));
      const a = getComputedStyle(incoming), b = getComputedStyle(outgoing);
      const bounds = incoming.getBoundingClientRect(), main = document.querySelector('.site-main').getBoundingClientRect();
      const left = Math.max(bounds.left, main.left), right = Math.min(bounds.right, main.right);
      const hit = right - left > 20 ? document.elementFromPoint((left + right) / 2, Math.min(innerHeight - 30, main.top + 100)) : null;
      const position = style => new DOMMatrixReadOnly(style.transform === 'none' ? undefined : style.transform).m41;
      trace.frames.push({ time: performance.now() - started, incoming: position(a), outgoing: position(b),
        incomingVisible: a.visibility === 'visible' && a.opacity === '1', outgoingVisible: b.visibility === 'visible' && b.opacity === '1',
        incomingInert: incoming.hasAttribute('inert'), outgoingInert: outgoing.hasAttribute('inert'),
        overlayClear: overlay.display === 'none' || overlay.visibility === 'hidden' || Number(overlay.opacity) === 0,
        headerClear: getComputedStyle(document.querySelector('.mobile-header')).display === 'none' || Number(header.opacity) === 0,
        hitIncoming: hit ? hit.closest('.pt-page') === incoming : null,
        overflow: document.documentElement.scrollWidth > innerWidth + 1 });
      if (trace.frames.length < 180) frame = requestAnimationFrame(sample);
    }
    frame = requestAnimationFrame(sample);
    trace.stop = () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('portfolio:page-activate', activate);
      document.removeEventListener('portfolio:page-settled', settle);
    };
  }, { from, to });
}

async function trace(page) {
  return page.evaluate(() => {
    window.motionTrace.stop();
    const { frames, activations, settlements } = window.motionTrace;
    return { frames, activations, settlements };
  });
}

async function select(page, id) {
  const toggle = page.locator('.menu-toggle');
  if (await toggle.isVisible()) {
    await toggle.click();
    await expect(page.locator('#site_header')).toHaveCSS('opacity', '1');
  }
  await page.locator(`.site-main-menu a[href="#${id}"]`).click();
}

test('R-MOTION-01 | TC-01/02/03/07/09: visible directional frames follow drawer closure and settle cleanly', async ({ page }, testInfo) => {
  await open(page);
  for (const [from, to, direction] of [['about-me', 'resume', 1], ['resume', 'projects', 1], ['projects', 'resume', -1]]) {
    // Keep desktop's existing configured mapping deterministic; mobile overrides it by route order.
    await page.locator(`.site-main-menu a[href="#${to}"]`).evaluate((node, animation) => {
      node.setAttribute('data-animation', animation);
      window.jQuery(node).data('animation', animation);
    }, direction > 0 ? '1' : '2');
    await record(page, from, to);
    await select(page, to);
    await settled(page, to);
    const result = await trace(page);
    await testInfo.attach(`motion-${from}-${to}`, { body: Buffer.from(JSON.stringify(result)), contentType: 'application/json' });
    const moving = result.frames.filter(frame => Math.abs(frame.incoming) > 2 && frame.incomingVisible);
    expect(moving.length, 'Real intermediate transforms must be rendered').toBeGreaterThan(1);
    expect(moving.every(frame => frame.overlayClear && frame.headerClear), 'Drawer and overlay must not obscure the page animation').toBe(true);
    expect(moving.some(frame => frame.incoming * direction > 10 && frame.outgoing * direction < -10 && frame.outgoingVisible)).toBe(true);
    expect(moving.every(frame => frame.outgoingInert && !frame.incomingInert)).toBe(true);
    expect(moving.some(frame => frame.hitIncoming), 'The incoming page must occupy a visible hit-tested portion of the viewport').toBe(true);
    expect(result.frames.some(frame => frame.overflow)).toBe(false);
    expect(result.activations).toEqual([to]);
    expect(result.settlements).toEqual([to]);
    await expect(page.locator('.pt-page:not(.pt-page-current):not([inert])')).toHaveCount(0);
  }
  await page.locator('#resume').evaluate(node => { node.scrollTop = 120; });
  expect(await page.locator('#resume').evaluate(node => node.scrollTop)).toBe(120);
});

test('R-MOTION-02 | TC-04: reduced motion navigates without sliding or a transition lock', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  await record(page, 'about-me', 'resume');
  await select(page, 'resume');
  await settled(page, 'resume');
  if (await page.locator('.menu-toggle').isVisible()) {
    await expect(page.locator('#site_header')).toHaveCSS('transition-duration', '0s');
    await expect(page.locator('.mobile-menu-overlay')).toHaveCSS('transition-duration', '0s');
  }
  const result = await trace(page);
  expect(result.frames.every(frame => frame.incoming === 0 && frame.outgoing === 0)).toBe(true);
  expect(result.activations).toEqual(['resume']);
  await select(page, 'blog');
  await settled(page, 'blog');
});

test('R-MOTION-03 | TC-05/06: rapid arrow requests use the latest route and history remains consistent', async ({ page }) => {
  await open(page);
  await page.locator('.lmpixels-arrow-right').click();
  await expect(page).toHaveURL(/#resume$/);
  await page.locator('.lmpixels-arrow-right').click();
  await settled(page, 'blog');
  await page.goBack();
  await settled(page, 'resume');
  await page.goForward();
  await settled(page, 'blog');
});

for (const failure of ['missing-events', 'zero-duration', 'cancelled', 'paused']) {
  test(`R-MOTION-04 | TC-07: ${failure} cannot retain two pages or lock navigation`, async ({ page }) => {
    await open(page);
    if (failure === 'missing-events') await page.evaluate(() => {
      for (const name of ['animationend', 'webkitAnimationEnd', 'animationcancel']) {
        window.addEventListener(name, event => event.stopImmediatePropagation(), true);
      }
    });
    if (failure === 'zero-duration') await page.addStyleTag({ content: '.subpages > section.pt-page.pt-page-current { animation-duration: 0s; animation-delay: 0s; }' });
    if (failure === 'cancelled' || failure === 'paused') await page.evaluate(mode => {
      document.addEventListener('animationstart', event => {
        if (event.target.matches('.pt-page')) event.target.getAnimations().forEach(animation => mode === 'paused' ? animation.pause() : animation.cancel());
      });
    }, failure);
    await select(page, 'resume');
    await settled(page, 'resume');
    await select(page, 'contact');
    await settled(page, 'contact');
    await page.evaluate(() => { location.hash = '#invalid-motion-route'; });
    await settled(page, 'not-found');
    await page.getByRole('link', { name: 'View Resume', exact: true }).click();
    await settled(page, 'resume');
  });
}

test('R-MOTION-05 | TC-08: desktop keeps its configured animation while mobile uses the safe ordered slide', async ({ page }, testInfo) => {
  await open(page);
  const classes = await page.evaluate(async () => {
    const link = document.querySelector('.site-main-menu a[href="#resume"]');
    link.setAttribute('data-animation', '5');
    const started = new Promise(resolve => document.querySelector('#resume').addEventListener('animationstart', () => resolve(document.querySelector('#resume').className), { once: true }));
    link.click();
    return started;
  });
  expect(classes.includes('pt-page-ontop')).toBe(!testInfo.project.use.isMobile);
  await settled(page, 'resume');
});

test('R-MOTION-07 | Direct routes remain readable, focusable only when active, and recover after interruption', async ({ page }) => {
  for (const id of ['about-me', 'resume', 'blog', 'projects', 'contact']) {
    await open(page, id);
    await expect(page.locator('.pt-page:not(.pt-page-current):not([inert])')).toHaveCount(0);
    await expect(page.locator('.pt-page-current')).not.toHaveAttribute('aria-hidden');
  }
  await page.evaluate(() => {
    document.querySelector('[data-id="resume"]').addEventListener('animationstart', () => { location.hash = '#unknown-during-motion'; }, { once: true });
    location.hash = '#resume';
  });
  await settled(page, 'not-found');
  await expect(page.getByRole('heading', { name: '404 — Page Not Found', exact: true })).toBeFocused();
  await page.getByRole('link', { name: 'View Resume', exact: true }).click();
  await settled(page, 'resume');
});
