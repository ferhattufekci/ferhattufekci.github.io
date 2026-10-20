import { parseHTML } from 'linkedom';
import TurndownService from 'turndown';

const NON_CONTENT = [
  'script', 'style', 'iframe', 'nav', 'footer', '.preloader', '.js-adsense',
  '.sync-badge', '.category-filter-scroll', '.blog-lang-toggle',
  '#proj-loading', '#blog-loading', '.proj-show-more-btn'
].join(', ');

export function escapeHtml(value) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value).replace(/[&<>"']/g, character => entities[character]);
}

export function toMarkdown(html, origin) {
  const { document } = parseHTML(html);
  document.querySelectorAll(NON_CONTENT).forEach(node => node.remove());
  for (const anchor of document.querySelectorAll('a[href]')) {
    anchor.setAttribute('href', new URL(anchor.getAttribute('href'), origin + '/').href);
  }
  const converter = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });
  return converter.turndown(document.body.innerHTML).trim() + '\n';
}

export function renderTrustContent(page) {
  const sections = page.sections.map(section => [
    '<section>',
    `<h2>${escapeHtml(section.heading)}</h2>`,
    ...section.paragraphs.map(text => `<p>${escapeHtml(text)}</p>`),
    '</section>'
  ].join('\n'));
  const links = page.links.map(link =>
    `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`
  );
  return [...sections, '<h2>Links</h2>', '<ul>', ...links, '</ul>'].join('\n');
}

export function renderDocument({ title, description, path, body, indexable = true, origin, themeBoot }) {
  const markdownPath = path === '/404.html' ? '/404.md' : path + 'index.md';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <script>${themeBoot}</script>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | Ferhat Tüfekçi</title>
  <meta name="description" content="${escapeHtml(description)}">
  ${indexable ? `<link rel="canonical" href="${origin}${path}">` : '<meta name="robots" content="noindex">'}
  <link rel="alternate" type="text/markdown" href="${markdownPath}">
  <link rel="describedby" href="/llms.txt">
  <link rel="icon" href="/images/favicon.png">
  <link rel="stylesheet" href="/css/bootstrap.min.css">
  <link rel="stylesheet" href="/css/main.css">
  <link rel="stylesheet" href="/css/trust-pages.css">
  <link rel="stylesheet" href="/css/dark-theme.css">
  <link rel="stylesheet" href="/css/error-page.css">
</head>
<body class="trust-page">
  <main class="trust-document">
    <nav aria-label="Portfolio">
      <a href="/">Ferhat Tüfekçi</a>
      <a href="/about/">About</a>
      <a href="/contact/">Contact</a>
      <a href="/privacy/">Privacy</a>
      <button type="button" class="icon-btn theme-toggle-btn" aria-label="Switch theme">
        <span class="theme-toggle-icon" aria-hidden="true">🌙</span>
      </button>
    </nav>
    <h1>${escapeHtml(title)}</h1>
${body}
    <footer>
      <a href="/">Portfolio</a>
      <a href="/llms.txt">Agent Guide</a>
      <a href="/sitemap.xml">Sitemap</a>
    </footer>
  </main>
  <script src="/js/theme.js"></script>
</body>
</html>\n`;
}

export function replaceThemeBoot(html, themeBoot) {
  const startMarker = '<!-- THEME-INIT:START -->';
  const endMarker = '<!-- THEME-INIT:END -->';
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker);
  if (start === -1 || end < start) throw new Error('Theme initializer markers are missing or out of order.');
  return html.slice(0, start + startMarker.length) +
    `\n    <script>\n${themeBoot}\n    </script>\n    ` + html.slice(end);
}
