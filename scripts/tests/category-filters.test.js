import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const policy = require('../../js/page-transition-policy.js');
const hints = require('../../js/category-filter-hints.js');

class Events {
  listeners = new Map();
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type, detail = {}) { this.listeners.get(type)?.forEach(listener => listener(detail)); }
  count(type) { return this.listeners.get(type)?.size || 0; }
}

function classList(initial = []) {
  const values = new Set(initial);
  return {
    contains: value => values.has(value),
    toggle(value, enabled) { enabled ? values.add(value) : values.delete(value); }
  };
}

function fixture() {
  const doc = new Events();
  const win = new Events();
  const frames = new Map();
  let nextFrame = 0;
  let finishFonts;
  const observers = [];
  doc.fonts = new Events();
  doc.fonts.ready = new Promise(resolve => { finishFonts = resolve; });
  win.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame; };
  win.cancelAnimationFrame = id => frames.delete(id);
  win.ResizeObserver = class {
    observed = new Set();
    disconnected = false;
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(element) { this.observed.add(element); }
    disconnect() { this.disconnected = true; this.observed.clear(); }
  };
  function entry(active) {
    const list = new Events();
    const page = { classList: classList(active ? ['pt-page-current'] : []) };
    const hint = { classList: classList() };
    const selection = { defaultSelected: true };
    Object.assign(list, {
      clientWidth: 300, scrollWidth: 650, scrollLeft: 0,
      closest: selector => selector === '.pt-page' ? page : hint,
      querySelector: () => ({ getAttribute: () => String(selection.defaultSelected) })
    });
    return { list, page, hint, selection };
  }
  const blog = entry(true), projects = entry(false);
  doc.querySelectorAll = () => [blog.list, projects.list];
  function flush() {
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach(callback => callback());
  }
  function activate(entry) {
    blog.page.classList.toggle('pt-page-current', entry === blog);
    projects.page.classList.toggle('pt-page-current', entry === projects);
    doc.emit('portfolio:page-activate', { detail: { page: entry.page } });
  }
  return { doc, win, frames, observers, blog, projects, flush, activate, finishFonts };
}

for (const reducedMotion of [false, true]) {
  test('desktop transition policy, reduced motion: ' + reducedMotion, () => {
    assert.equal(policy.select({ mobile: false, reducedMotion, fromIndex: 3, toIndex: 4 }), reducedMotion ? 0 : null);
  });
}
test('mobile forward navigation always uses the existing horizontal slide', () => {
  for (let repeat = 0; repeat < 50; repeat++) {
    assert.equal(policy.select({ mobile: true, fromIndex: 3, toIndex: 4 }), 1);
  }
});
test('mobile backward navigation uses the matching reverse slide', () => {
  assert.equal(policy.select({ mobile: true, fromIndex: 4, toIndex: 3 }), 2);
});
test('initial mobile activation has a deterministic transition', () => {
  assert.equal(policy.select({ mobile: true, fromIndex: -1, toIndex: 3 }), 1);
});
test('reduced motion bypasses mobile transitions', () => {
  assert.equal(policy.select({ mobile: true, reducedMotion: true, fromIndex: 4, toIndex: 3 }), 0);
});
test('only visible filter bars are measured', () => {
  const f = fixture();
  const controller = hints.init(f.doc, f.win);
  f.flush();
  assert.equal(f.blog.hint.classList.contains('has-overflow'), true);
  assert.equal(f.projects.hint.classList.contains('has-overflow'), false);
  controller.destroy();
});
test('scroll hint disappears at the end and returns when scrolling back', () => {
  const f = fixture();
  const controller = hints.init(f.doc, f.win);
  f.blog.list.scrollLeft = 350;
  f.blog.list.emit('scroll'); f.flush();
  assert.equal(f.blog.hint.classList.contains('at-end'), true);
  f.blog.list.scrollLeft = 70;
  f.blog.list.emit('scroll'); f.flush();
  assert.equal(f.blog.hint.classList.contains('at-end'), false);
  controller.destroy();
});
test('container resize clears a hint when overflow no longer exists', () => {
  const f = fixture();
  const controller = hints.init(f.doc, f.win);
  f.flush();
  f.blog.list.clientWidth = 650;
  f.observers[0].callback(); f.flush();
  assert.equal(f.blog.hint.classList.contains('has-overflow'), false);
  assert.equal(f.blog.hint.classList.contains('at-end'), true);
  controller.destroy();
});
test('activation resets All on that page without changing the other page or selection', () => {
  const f = fixture();
  const controller = hints.init(f.doc, f.win);
  f.blog.selection.defaultSelected = false;
  f.blog.list.scrollLeft = 80;
  f.projects.list.scrollLeft = 140;
  f.activate(f.projects); f.flush();
  assert.equal(f.projects.list.scrollLeft, 0);
  assert.equal(f.blog.list.scrollLeft, 80);
  assert.equal(f.blog.selection.defaultSelected, false);
  f.projects.selection.defaultSelected = false;
  f.projects.list.scrollLeft = 200;
  f.activate(f.blog); f.flush();
  assert.equal(f.blog.list.scrollLeft, 80);
  assert.equal(f.projects.list.scrollLeft, 200);
  controller.destroy();
});
test('manual scrolling within an active All filter is preserved', () => {
  const f = fixture();
  const controller = hints.init(f.doc, f.win);
  f.blog.list.scrollLeft = 120;
  f.blog.list.emit('scroll');
  f.doc.emit('portfolio:page-settled'); f.flush();
  assert.equal(f.blog.list.scrollLeft, 120);
  controller.destroy();
});
test('scroll, resize, fonts and page events coalesce into one frame', async () => {
  const f = fixture();
  const controller = hints.init(f.doc, f.win);
  f.flush();
  f.win.emit('resize'); f.blog.list.emit('scroll');
  f.doc.emit('portfolio:page-settled'); f.observers[0].callback();
  f.doc.fonts.emit('loadingdone'); f.finishFonts();
  await Promise.resolve();
  assert.equal(f.frames.size, 1);
  controller.destroy();
});
test('activation measures a previously hidden filter bar after its layout becomes available', () => {
  const f = fixture();
  f.projects.list.clientWidth = 0;
  const controller = hints.init(f.doc, f.win);
  f.flush();
  f.activate(f.projects);
  f.projects.list.clientWidth = 300;
  f.flush();
  assert.equal(f.projects.hint.classList.contains('has-overflow'), true);
  controller.destroy();
});
test('initialization is idempotent and destruction removes all observers and listeners', async () => {
  const f = fixture();
  const controller = hints.init(f.doc, f.win);
  assert.equal(hints.init(f.doc, f.win), controller);
  assert.equal(f.observers.length, 1);
  controller.destroy();
  assert.equal(f.frames.size, 0);
  assert.equal(f.observers[0].disconnected, true);
  for (const [target, type] of [[f.blog.list, 'scroll'], [f.projects.list, 'scroll'], [f.win, 'resize'], [f.win, 'pagehide'], [f.doc, 'portfolio:page-activate'], [f.doc, 'portfolio:page-settled'], [f.doc.fonts, 'loadingdone']]) {
    assert.equal(target.count(type), 0, type);
  }
  f.finishFonts(); await Promise.resolve();
  assert.equal(f.frames.size, 0);
  const replacement = hints.init(f.doc, f.win);
  assert.notEqual(replacement, controller);
  replacement.destroy();
});
test('bfcache pagehide preserves listeners, a normal pagehide releases them', () => {
  const f = fixture();
  hints.init(f.doc, f.win);
  f.win.emit('pagehide', { persisted: true });
  assert.equal(f.win.count('resize'), 1);
  f.win.emit('pagehide', { persisted: false });
  assert.equal(f.win.count('resize'), 0);
});
test('hint lifecycle works without ResizeObserver', () => {
  const f = fixture();
  f.win.ResizeObserver = undefined;
  const controller = hints.init(f.doc, f.win);
  f.flush();
  assert.equal(f.blog.hint.classList.contains('has-overflow'), true);
  controller.destroy();
});

test('an empty Projects category still updates aria-pressed before returning', async () => {
  const index = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
  const start = index.indexOf('                function render() {');
  const end = index.indexOf('                function initCatFilters()', start);
  const controls = ['proj_all', 'proj_systems', 'proj_test', 'proj_software'].map(group => ({
    group, pressed: group === 'proj_all' ? 'true' : 'false',
    getAttribute() { return this.group; },
    setAttribute(name, value) { this.pressed = value; }
  }));
  const elements = Object.fromEntries(['proj-loading', 'proj-pinned-wrap', 'proj-all-wrap', 'proj-pinned', 'proj-grid', 'proj-empty'].map(id => [id, { style: {}, innerHTML: '', appendChild() {} }]));
  const document = {
    getElementById: id => elements[id],
    querySelectorAll: () => controls,
    createElement: () => ({})
  };
  vm.runInNewContext(index.slice(start, end) + '\nrender();', {
    document, allRepos: [], curPCat: 'proj_systems',
    CAT_LABELS: { proj_systems: 'Systems Engineering & Business Analysis' }, CAT_MAP: {}
  });
  assert.deepEqual(controls.map(button => button.pressed), ['false', 'true', 'false', 'false']);
  assert.equal(elements['proj-empty'].style.display, 'block');
});
