import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// A0-01, A0-02, A0-05 (docs/T-4-INLINE-SCRIPTS.md): a ratchet on the inline code of
// index.html and a contract on script order. Nothing here pins *where* code lives
// beyond what the page needs: the count of executable inline blocks and inline event
// attributes may only go down, and the order constraints stay true after any move.
const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');

// Every executable inline block must be one of these (marker found in its source).
// Removing a block (extraction, A1+) is progress; adding or rewriting one is not.
export const KNOWN_INLINE = [
  ['theme boot', /Build embeds this source before stylesheets on every page/],
  ['gtag bootstrap', /function gtag\(\)/],
  ['date and sync helpers', /window\.fmtDT = function/],
  ['calendly widget', /document\.getElementById\("calendlyContainer"\)/],
  ['projects boot', /window\.showMoreStarred = function/],
  ['blog boot', /window\.setBlogLang = function/],
  ['contact boot', /atob\("KzkwICg1MDcpIDYwMCA4MSA3OQ=="\)/],
  ['personality tooltip', /resume-personality-info/]
];
const MAX_INLINE_BLOCKS = 8;
const MAX_INLINE_HANDLERS = 5;

export function scripts(source) {
  return [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].map((match) => {
    const attributes = match[1];
    const src = attributes.match(/\bsrc="([^"]+)"/)?.[1] || null;
    const type = attributes.match(/\btype="([^"]+)"/)?.[1] || 'text/javascript';
    return { index: match.index, src, type, body: match[2], executableInline: !src && !/json/i.test(type) };
  });
}
export function handlers(source) {
  // Event attributes on elements only; text inside <script> blocks is not markup.
  const markup = source.replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/<style\b[\s\S]*?<\/style>/g, '');
  return [...markup.matchAll(/<([a-z0-9-]+)\b[^>]*?\s(on[a-z]+)="([^"]*)"/g)].map((m) => `${m[1]}.${m[2]}=${m[3]}`);
}
const position = (list, predicate) => list.findIndex(predicate);
const byName = (name) => (item) => item.src?.split('?')[0] === name;

export function orderViolations(source) {
  const list = scripts(source);
  const problems = [];
  const at = (label, predicate) => {
    const found = position(list, predicate);
    if (found < 0) problems.push(`missing: ${label}`);
    return found;
  };
  const tag = at('gtag/js tag', (s) => s.src?.startsWith('https://www.googletagmanager.com/gtag/js?id='));
  const gtag = at('inline gtag', (s) => /function gtag\(\)/.test(s.body));
  const jquery = at('jquery', byName('js/jquery-3.6.0.min.js'));
  const contact = at('contact boot', (s) => /atob\("KzkwICg1/.test(s.body));
  const projects = at('projects boot', (s) => /window\.showMoreStarred = function/.test(s.body));
  const blog = at('blog boot', (s) => /window\.setBlogLang = function/.test(s.body));
  const panels = at('page-content-panels', byName('js/page-content-panels.js'));
  const sync = at('date and sync helpers', (s) => /window\.renderSyncBadge = function/.test(s.body));
  const adsenseConfig = at('adsense-config', byName('js/adsense-config.js'));
  const adsense = at('adsense', byName('js/adsense.js'));
  const before = (a, b, what) => { if (a >= 0 && b >= 0 && !(a < b)) problems.push(what); };
  before(tag, gtag, 'gtag/js tag must precede the inline gtag block');
  before(jquery, contact, 'jQuery must precede the block that uses $');
  for (const dep of ['js/medium-language.js', 'js/medium-excerpt.js', 'js/blog-sharing-data.js', 'js/blog-sharing.js'])
    before(at(dep, byName(dep)), blog, `${dep} must precede the Blog boot`);
  // Deliberate today: the boots run first and reach PortfolioContentPanels only on demand.
  before(projects, panels, 'Projects boot precedes page-content-panels.js (documented deferral)');
  before(blog, panels, 'Blog boot precedes page-content-panels.js (documented deferral)');
  before(sync, projects, 'renderSyncBadge helper must precede the Projects boot');
  before(sync, blog, 'renderSyncBadge helper must precede the Blog boot');
  before(adsenseConfig, adsense, 'adsense-config.js must precede adsense.js');
  return problems;
}

test('R-A0-01: executable inline script blocks are a known, shrinking set', () => {
  const inline = scripts(html).filter((s) => s.executableInline);
  assert.ok(inline.length <= MAX_INLINE_BLOCKS, `${inline.length} inline blocks; the ratchet allows ${MAX_INLINE_BLOCKS}`);
  for (const block of inline) {
    const known = KNOWN_INLINE.filter(([, marker]) => marker.test(block.body));
    assert.equal(known.length, 1, `unrecognised or ambiguous inline script: ${block.body.trim().slice(0, 80)}`);
  }
  assert.equal(new Set(inline.map((b) => KNOWN_INLINE.find(([, m]) => m.test(b.body))[0])).size, inline.length, 'no block may be duplicated');
  // Structured data is not executable code and is allowed.
  assert.ok(scripts(html).filter((s) => /json/i.test(s.type)).every((s) => (JSON.parse(s.body), true)));
});

test('R-A0-02: inline event attributes are a known, shrinking set', () => {
  const found = handlers(html).sort();
  assert.ok(found.length <= MAX_INLINE_HANDLERS, `${found.length} inline handlers; the ratchet allows ${MAX_INLINE_HANDLERS}`);
  const allowed = new Set([
    "button.onclick=setBlogLang('all')", "button.onclick=setBlogLang('tr')", "button.onclick=setBlogLang('en')",
    'button.onclick=showMoreStarred()', "link.onload=this.media='all'"
  ]);
  for (const handler of found) assert.ok(allowed.has(handler), `unexpected inline handler ${handler}`);
  // Style attributes are a separate concern (CSP style-src) and tracked in T-4, not here.
});

test('R-A0-05: script order contract holds', () => {
  assert.deepEqual(orderViolations(html), []);
});

test('R-A0-05b: the ratchet and the order contract detect real regressions (mutation checks)', () => {
  const mutate = (from, to) => {
    assert.ok(html.includes(from), `anchor missing: ${from.slice(0, 40)}`);
    return html.replace(from, to);
  };
  const extra = mutate('</head>', '<script>window.__x = 1;</script></head>');
  assert.equal(scripts(extra).filter((s) => s.executableInline).length, MAX_INLINE_BLOCKS + 1);
  assert.ok(scripts(extra).filter((s) => s.executableInline).some((b) => !KNOWN_INLINE.some(([, m]) => m.test(b.body))));
  assert.ok(handlers(mutate('<body>', '<body onload="init()">')).length > MAX_INLINE_HANDLERS || handlers(mutate('<body>', '<body onload="init()">')).includes('body.onload=init()'));
  // jQuery moved after its first consumer.
  const jq = html.match(/\s*<script src="js\/jquery-3\.6\.0\.min\.js[^"]*"><\/script>/)[0];
  assert.ok(orderViolations(html.replace(jq, '').replace('</body>', `${jq}</body>`)).some((p) => /jQuery must precede/.test(p)));
  // A Blog dependency moved after the Blog boot.
  const lang = html.match(/\s*<script src="js\/medium-language\.js[^"]*"><\/script>/)[0];
  assert.ok(orderViolations(html.replace(lang, '').replace('</body>', `${lang}</body>`)).some((p) => /medium-language/.test(p)));
  // The panels script moved ahead of the boots (would change today's order).
  const panels = html.match(/\s*<script src="js\/page-content-panels\.js[^"]*"><\/script>/)[0];
  assert.ok(orderViolations(html.replace(panels, '').replace('<body>', `<body>${panels}`)).some((p) => /page-content-panels/.test(p)));
  // gtag tag after the bootstrap block.
  const tagMatch = html.match(/<script\s+async\s+src="https:\/\/www\.googletagmanager\.com\/gtag\/js[^"]*"\s*><\/script>/)[0];
  assert.ok(orderViolations(html.replace(tagMatch, '').replace('</head>', `${tagMatch}</head>`)).some((p) => /gtag\/js tag/.test(p)));
  // adsense loaded before its config.
  const config = html.match(/\s*<script src="js\/adsense-config\.js[^"]*"><\/script>/)[0];
  assert.ok(orderViolations(html.replace(config, '').replace('</head>', `${config}</head>`)).some((p) => /adsense-config/.test(p)));
  // Removing a required script is reported, not silently accepted.
  assert.ok(orderViolations(html.replace(lang, '')).some((p) => /missing: js\/medium-language/.test(p)));
});
