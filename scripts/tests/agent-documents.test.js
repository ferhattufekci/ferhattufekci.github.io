import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { replaceThemeBoot, renderTrustContent, toMarkdown } from '../lib/agent-documents.mjs';

test('R-CONTENT-01: Markdown resolves links, preserves facts and excludes executable scaffolding', () => {
  const result = toMarkdown('<html><body><h1>Profile</h1><p>Engineering evidence <a href="/resume">resume</a>.</p><script>secret()</script><style>.bad{}</style><nav>Menu noise</nav></body></html>', 'https://ferhattufekci.github.io');
  assert.match(result, /^# Profile/);
  assert.match(result, /\[resume\]\(https:\/\/ferhattufekci.github.io\/resume\)/);
  assert.doesNotMatch(result, /secret|bad|Menu noise/);
});
test('R-CONTENT-02: authored trust content is escaped before rendering', () => {
  const html = renderTrustContent({ sections: [{ heading: '<img src=x>', paragraphs: ['<script>x</script>'] }], links: [{ label: '<img>', href: '/?q="x"' }] });
  const { document } = parseHTML(html);
  assert.equal(document.querySelector('img,script'), null);
  assert.equal(document.querySelector('h2').textContent, '<img src=x>');
});
test('R-THEME-01: theme boot replacement is explicit and fails loudly on damaged markers', () => {
  const input = 'first script<!-- THEME-INIT:START -->old<!-- THEME-INIT:END -->rest';
  assert.match(replaceThemeBoot(input, 'new boot'), /^first script/);
  assert.doesNotMatch(replaceThemeBoot(input, 'new boot'), /old/);
  assert.throws(() => replaceThemeBoot('<script>unrelated()</script>', 'boot'), /markers/);
});
