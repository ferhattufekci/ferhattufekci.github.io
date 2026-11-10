// Trust boundary for URLs that reach the DOM.
//
// data/*.json is generated from third-party sources (the Medium RSS feed, the GitHub REST
// API) and the page assigns some of those values straight to `href` and `src`
// (index.html: `link.href = art.url`, `image.src = art.thumbnail`). A URL whose scheme is
// `javascript:` executes on click, and `data:`/`blob:` can carry a document, so the scheme
// has to be checked somewhere. Checking it at generation time keeps one rule in one place
// and means the committed data itself is the thing under contract -- see
// scripts/tests/data-contract.test.js, which enforces it on what is in the repository now.
//
// Browsers strip leading/trailing C0 control characters and spaces before parsing a URL and
// ignore tab/newline inside the scheme, so "java\tscript:x" and " javascript:x" are live
// javascript URLs in a href. `new URL()` does the same normalisation, which is why parsing
// is used here instead of a regular expression over the raw string.

const DEFAULT_PROTOCOLS = ['https:', 'http:'];

/**
 * @param {unknown} value candidate URL from an untrusted feed or API
 * @param {{ protocols?: string[], base?: string }} [options]
 * @returns {string|null} the value unchanged when its scheme is allowed, otherwise null
 */
export function safeUrl(value, { protocols = DEFAULT_PROTOCOLS, base } = {}) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  let parsed;
  try {
    parsed = new URL(trimmed, base);
  } catch {
    return null; // relative URL with no base, or not a URL at all
  }
  if (!protocols.includes(parsed.protocol)) return null;
  return value;
}

/** True when `value` is safe to assign to href/src. */
export const isSafeUrl = (value, options) => safeUrl(value, options) !== null;
