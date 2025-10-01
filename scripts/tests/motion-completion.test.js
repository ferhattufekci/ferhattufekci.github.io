import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { duration, wait } = createRequire(import.meta.url)('../../js/motion-completion.js');

function fixture(styles) {
  const timers = new Map(), frames = new Map();
  let id = 0;
  const nodes = styles.map(style => {
    const listeners = new Map();
    return { style, listeners,
      addEventListener(name, fn) { listeners.set(name, fn); },
      removeEventListener(name) { listeners.delete(name); },
      emit(name, properties = {}) { listeners.get(name)?.({ type: name, target: this, ...properties }); }
    };
  });
  const environment = {
    getComputedStyle: node => node.style,
    setTimeout(fn, delay) { timers.set(++id, { fn, delay }); return id; },
    clearTimeout(key) { timers.delete(key); },
    requestAnimationFrame(fn) { frames.set(++id, fn); return id; },
    cancelAnimationFrame(key) { frames.delete(key); }
  };
  return { nodes, timers, frames, environment,
    expire() { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(({ fn }) => fn()); },
    paint() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); }
  };
}
const animation = (time = '300ms') => ({ animationName: 'slide', animationDuration: time, animationDelay: '0s', animationIterationCount: '1' });

test('R-MOTION-06: CSS lists repeat timings, include delays/iterations, and clamp negative remaining time', () => {
  assert.equal(duration({ animationName: 'a, b', animationDuration: '100ms, .3s', animationDelay: '50ms, -100ms', animationIterationCount: '2, 1' }, 'animation'), 250);
  assert.equal(duration({ transitionProperty: 'opacity, transform, visibility', transitionDuration: '.2s, 500ms', transitionDelay: '-.1s, 50ms' }, 'transition'), 550);
  assert.equal(duration({ ...animation(), animationDelay: '-1s' }, 'animation'), 0);
  assert.equal(duration({ ...animation(), animationName: 'none' }, 'animation'), 0);
  assert.equal(duration({ ...animation(), animationIterationCount: 'infinite' }, 'animation'), 300);
});

test('R-MOTION-06: zero duration finishes without events or timers', async () => {
  const f = fixture([animation('0s')]);
  await wait(f.nodes, 'animation', f.environment).finished;
  assert.equal(f.timers.size, 0);
  assert.equal(f.nodes[0].listeners.size, 0);
});

test('R-MOTION-06: an already idle element does not wait for configured but inactive CSS transitions', async () => {
  const f = fixture([{ transitionProperty: 'opacity', transitionDuration: '.25s' }]);
  f.nodes[0].getAnimations = () => [];
  await wait(f.nodes, 'transition', f.environment).finished;
  assert.equal(f.timers.size, 0);
});

test('R-MOTION-06: missing events use the longest actual CSS deadline and one paint boundary', async () => {
  const f = fixture([animation('100ms'), { ...animation('.3s'), animationDelay: '50ms' }]);
  const motion = wait(f.nodes, 'animation', f.environment);
  assert.equal([...f.timers.values()][0].delay, 350);
  f.expire();
  assert.equal(f.frames.size, 1);
  f.paint();
  await motion.finished;
  assert.ok(f.nodes.every(node => node.listeners.size === 0));
});

test('R-MOTION-06: child/short events cannot finish a parent or the other page prematurely', async () => {
  const f = fixture([animation(), animation('100ms')]);
  const motion = wait(f.nodes, 'animation', f.environment);
  f.nodes[0].emit('animationend', { target: {}, elapsedTime: 1 });
  f.nodes[0].emit('animationend', { elapsedTime: .1 });
  f.nodes[1].emit('animationend', { elapsedTime: .1 });
  assert.equal(f.timers.size, 1);
  f.nodes[0].emit('webkitAnimationEnd', { elapsedTime: .3 });
  await motion.finished;
  assert.equal(f.timers.size, 0);
  assert.ok(f.nodes.every(node => node.listeners.size === 0));
});

test('R-MOTION-06: cancelled Web Animations promises complete safely and clear the fallback', async () => {
  const f = fixture([animation()]);
  let reject;
  f.nodes[0].getAnimations = () => [{ effect: { target: f.nodes[0], getComputedTiming: () => ({ endTime: 300 }) }, currentTime: 120,
    animationName: 'slide', playState: 'running', finished: new Promise((_, fail) => { reject = fail; }) }];
  const motion = wait(f.nodes, 'animation', f.environment);
  assert.equal([...f.timers.values()][0].delay, 180);
  reject(new Error('Synthetic CSS cancellation'));
  await motion.finished;
  assert.equal(f.timers.size, 0);
  assert.equal(f.nodes[0].listeners.size, 0);
});

test('R-MOTION-06: interrupting a watcher is idempotent and removes a pending paint callback', async () => {
  const f = fixture([animation()]);
  const motion = wait(f.nodes, 'animation', f.environment);
  f.expire();
  motion.cancel();
  motion.cancel();
  await motion.finished;
  assert.equal(f.frames.size, 0);
  assert.equal(f.timers.size, 0);
  assert.equal(f.nodes[0].listeners.size, 0);
});
