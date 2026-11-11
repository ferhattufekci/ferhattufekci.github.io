// A minimal browser for unit-testing the scripts in js/ without changing them.
// linkedom provides the DOM; layout, scrolling and media queries are stubbed with
// values each test controls, and calls are recorded so tests can assert behaviour.
import { parseHTML } from 'linkedom';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function browser(html, { reducedMotion = false, coarse = false } = {}) {
  const { window, document } = parseHTML(`<!doctype html><html><head></head><body>${html}</body></html>`);
  const rects = new WeakMap();
  const proto = Object.getPrototypeOf(document.body).constructor.prototype;
  const base = Object.getPrototypeOf(proto);
  const element = Object.getPrototypeOf(base);
  for (const target of [proto, base, element]) {
    Object.defineProperty(target, 'getBoundingClientRect', { configurable: true, value() {
      const r = rects.get(this) ?? { top: 0, left: 0, width: 0, height: 0 };
      return { ...r, right: r.left + r.width, bottom: r.top + r.height, x: r.left, y: r.top };
    } });
  }
  const scrolls = [];
  const frames = new Map();
  let frameId = 0;
  const flush = () => { const due = [...frames.values()]; frames.clear(); due.forEach(callback => callback()); };
  const win = Object.assign(new window.EventTarget(), {
    document, window: null,
    getComputedStyle: () => ({ paddingTop: '16px', overflowY: 'auto', getPropertyValue: () => '' }),
    matchMedia: query => ({ matches: (/reduce/.test(query) && reducedMotion) || (/coarse|hover: none/.test(query) && coarse),
      addEventListener() {}, removeEventListener() {} }),
    // Frames run only when a test calls flush(), as a browser runs them on the next frame.
    requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout, clearTimeout, setInterval: () => 1, clearInterval() {}
  });
  win.window = win;
  const layout = (node, rect) => rects.set(node, { top: 0, left: 0, width: 0, height: 0, ...rect });
  const scrollable = node => {
    node.scrollTop = 0; node.scrollLeft = 0;
    node.scrollTo = options => { scrolls.push({ node, ...options }); if (typeof options.top === 'number') node.scrollTop = options.top; };
    return node;
  };
  return { window, document, win, layout, scrollable, scrolls, flush };
}

/** Run a browser script (js/*.js) as the page would, with `globals` as window. */
export function load(file, globals) {
  const path = fileURLToPath(new URL(`../../../js/${file}`, import.meta.url));
  vm.runInNewContext(readFileSync(path, 'utf8'), Object.assign(globals, { globalThis: globals }), { filename: path });
  return globals;
}

// linkedom's KeyboardEvent is not constructible; a keydown Event with the same fields is
// what the scripts read (key and the modifier flags).
export const key = (window, name, options = {}) => Object.assign(new window.Event('keydown', { bubbles: true, cancelable: true }),
  { key: name, ctrlKey: false, altKey: false, metaKey: false, shiftKey: false, ...options });
