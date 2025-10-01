import assert from 'node:assert/strict';

// Keep the real entry points and native HTTP stack; only redirect upstream URLs.
const nativeFetch = globalThis.fetch;
if (process.env.SYNC_TEST_TIMEOUT === '1') {
  const nativeTimeout = AbortSignal.timeout;
  AbortSignal.timeout = (milliseconds) => {
    assert.equal(milliseconds, 20000, 'Production requests must retain their timeout');
    return nativeTimeout(50);
  };
}
globalThis.fetch = (url, options) => {
  const upstream = new URL(url);
  assert.ok(['medium.com', 'api.github.com'].includes(upstream.hostname));
  assert.ok(options.signal instanceof AbortSignal);
  return nativeFetch(new URL(upstream.pathname + upstream.search, process.env.SYNC_TEST_ORIGIN), options);
};
