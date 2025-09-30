import { expect, expectSection } from '../fixtures.mjs';
import { mockCatalog, starred } from '../data/catalog.mjs';

// Synthetic SDK at the external provider seam; the actual application controller
// still runs. Never send ad requests, click ads or copy controller logic here.
export async function adFixture(page, { script = 'ready', synchronous = null, widthBlocked = false, starredCount = 3, dynamic = null, fluidAncestorSizing = false } = {}) {
  await page.addInitScript(({ synchronous, widthBlocked, fluidAncestorSizing }) => {
    const probe = window.__adFixture = { calls: [], synchronous, mode: 'normal', resources: [], shifts: [], phase: null };
    probe.layoutShiftSupported = !!window.PerformanceObserver?.supportedEntryTypes?.includes('layout-shift');
    if (probe.layoutShiftSupported) new PerformanceObserver(list => {
      for (const entry of list.getEntries()) if (probe.phase) probe.shifts.push({
        phase: probe.phase, value: entry.value, hadRecentInput: entry.hadRecentInput,
        sources: (entry.sources || []).map(source => source.node?.className || source.node?.nodeName || null)
      });
    }).observe({ type: 'layout-shift' });
    const tracked = Observer => class extends Observer {
      observe(target, options) {
        if (target.matches?.('.js-adsense,ins.adsbygoogle')) probe.resources.push({ observer: this, target, active: true });
        return super.observe(target, options);
      }
      disconnect() { for (const resource of probe.resources) if (resource.observer === this) resource.active = false; return super.disconnect(); }
    };
    window.MutationObserver = tracked(window.MutationObserver);
    window.ResizeObserver = tracked(window.ResizeObserver);
    if (widthBlocked) document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style'); style.id = 'fixture-zero-width';
      style.textContent = '.js-adsense, .js-adsense ins { width:0 !important }'; document.head.appendChild(style);
    });
    probe.respond = (section, state, height = 600) => {
      probe.phase = section + ':' + state;
      const wrapper = document.querySelector(`[data-ad-placement="${section}"]`) || document.querySelector(`.ad-slot-${section}`);
      const ins = wrapper?.querySelector('ins.adsbygoogle') || wrapper?.querySelector('template[data-ad-rejected]')?.content.querySelector('ins.adsbygoogle');
      if (!ins) throw new Error('Eligible ad unit was not mounted: ' + section);
      let frame = ins.querySelector('iframe');
      if (!frame) { frame = document.createElement('iframe'); frame.title = 'Synthetic provider creative'; frame.srcdoc = '<!doctype html><html lang="en"><head><title>Test creative</title></head><body><p>Test creative; not an advertisement</p></body></html>'; ins.appendChild(frame); }
      frame.style.cssText = `width:100%;height:${height}px;border:0`;
      ins.style.height = height + 'px';
      if (state !== null) ins.setAttribute('data-ad-status', state);
      return frame;
    };
    probe.install = () => {
      const queued = Array.isArray(window.adsbygoogle) ? [...window.adsbygoogle] : [];
      window.adsbygoogle = { push() {
        const ins = [...document.querySelectorAll('ins.adsbygoogle')].find(node => !node.getAttribute('data-adsbygoogle-status'));
        const key = ins?.closest('[data-ad-placement]')?.getAttribute('data-ad-placement') || 'static-' + ins?.closest('.pt-page')?.getAttribute('data-id');
        probe.calls.push({ section: ins?.closest('.pt-page')?.getAttribute('data-id'), key, node: ins });
        if (probe.mode === 'throw-before') throw new Error('Synthetic SDK rejection');
        if (!ins) throw new Error('No unprocessed ad unit');
        ins.setAttribute('data-adsbygoogle-status', 'done');
        // Observed on the real fluid SDK: ancestor auto sizing must not remove
        // the application's bounded scrollport. This is provider behavior only.
        if (fluidAncestorSizing) ins.closest('.section-inner').style.setProperty('height', 'auto', 'important');
        if (probe.synchronous) probe.respond(key.startsWith('static-') ? ins.closest('.pt-page').getAttribute('data-id') : key, probe.synchronous);
        if (probe.mode === 'throw-after') throw new Error('Synthetic SDK rejection after processing');
      } };
      for (const entry of queued) window.adsbygoogle.push(entry);
    };
  }, { synchronous, widthBlocked, fluidAncestorSizing });
  let release;
  const gate = script === 'late' ? new Promise(resolve => { release = resolve; }) : Promise.resolve();
  await page.route('**/pagead/js/adsbygoogle.js?*', async route => {
    if (script === 'blocked') return route.abort('failed');
    await gate;
    return route.fulfill({ contentType: 'application/javascript', body: 'window.__adFixture.install();' });
  });
  if (dynamic) await page.route('**/js/adsense-config.js*', route => route.fulfill({
    contentType: 'application/javascript', body: 'window.PortfolioAdConfig = ' + JSON.stringify({ starred: dynamic }) + ';'
  }));
  await mockCatalog(page, { 'github-starred.json': starred(starredCount) });
  return { release: () => release?.() };
}

export async function enterAdPage(page, section) {
  await page.goto('/#' + section);
  await expectSection(page, section);
  await expect(page.locator('.preloader')).toHaveCount(0);
  await expect(page.locator(section === 'blog' ? '#blog-loading' : '#proj-loading')).toBeHidden();
  await expect(page.locator(section === 'blog' ? '.blog-article-card' : '#proj-grid .proj-card')).not.toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
}
export const slot = (page, section) => page.locator(`.ad-slot-${section}`);
export const calls = page => page.evaluate(() => window.__adFixture.calls.map(record => record.section));
export async function requested(page, section) {
  await expect.poll(() => calls(page)).toContain(section);
}
export async function respond(page, section, state, height = 600) {
  await page.evaluate(({ section, state, height }) => window.__adFixture.respond(section, state, height), { section, state, height });
}
export const geometry = target => target.evaluate(el => {
  const box = el.getBoundingClientRect(), style = getComputedStyle(el);
  return { width: box.width, height: box.height, marginTop: style.marginTop, marginBottom: style.marginBottom,
    paddingTop: style.paddingTop, paddingBottom: style.paddingBottom, display: style.display };
});
export const layoutShifts = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve({
  supported: window.__adFixture.layoutShiftSupported, entries: window.__adFixture.shifts
})))));
