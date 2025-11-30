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
//
// The function returns the *serialized* URL (`parsed.href`), never the raw input. The raw
// string is what the browser would re-parse, and it can differ from what was checked: a
// leading non-breaking space survives `String.prototype.trim()`-free browser parsing as a
// relative path, and characters such as `"` or `<` are left unencoded. The serialized form
// is exactly what was validated. What this guarantees is the *scheme*; it says nothing
// about the origin, which is the caller's concern.

const DEFAULT_PROTOCOLS = ['https:', 'http:'];

/**
 * @param {unknown} value candidate URL from an untrusted feed or API
 * @param {{ protocols?: string[], base?: string }} [options]
 * @param options.base resolves a relative input (e.g. an <img src> scraped from a feed
 *   item) against the document it came from; the resolved absolute URL is returned
 * @returns {string|null} the serialized absolute URL when its scheme is allowed, otherwise null
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
  return parsed.href;
}

/** True when `value` is safe to assign to href/src. */
export const isSafeUrl = (value, options) => safeUrl(value, options) !== null;
