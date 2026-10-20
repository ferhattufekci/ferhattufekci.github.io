import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { parseHTML } from 'linkedom';
import { ROOT as DEFAULT_ROOT } from './lib/public-files.mjs';
import { renderDocument, renderTrustContent, replaceThemeBoot, toMarkdown } from './lib/agent-documents.mjs';
import { renderNotFoundDocument } from './lib/not-found-document.mjs';

const require = createRequire(import.meta.url);
const ROOT = process.env.PORTFOLIO_ROOT ? resolve(process.env.PORTFOLIO_ROOT) : DEFAULT_ROOT;
const errorCard = require('../js/error-card.js');
const origin = 'https://ferhattufekci.github.io';
const themeBoot = (await readFile(join(ROOT, 'js/theme-init.js'), 'utf8')).replace(/\r\n/g, '\n').trim();
const pages = JSON.parse(await readFile(join(ROOT, 'content/trust-pages.json'), 'utf8'));

async function save(path, content) {
  const file = join(ROOT, path);
  const previous = await readFile(file, 'utf8').catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (previous !== content) await writeFile(file, content);
}

const source = replaceThemeBoot(await readFile(join(ROOT, 'index.html'), 'utf8'), themeBoot);
await save('index.html', source);
for (const [slug, page] of Object.entries(pages)) {
  const html = renderDocument({
    ...page, path: `/${slug}/`, currentPage: slug, body: renderTrustContent(page), origin, themeBoot
  });
  await mkdir(join(ROOT, slug), { recursive: true });
  await save(`${slug}/index.html`, html);
  await save(`${slug}/index.md`, toMarkdown(html, origin));
}

const { document: homepage } = parseHTML(source);
const sections = [...homepage.querySelectorAll('section.pt-page')].map(node => node.outerHTML).join('\n');
const homepageContent = `<html><body><h1>Ferhat Tüfekçi</h1>${sections}<p><a href="/about/">About</a> · <a href="/contact/">Contact</a> · <a href="/privacy/">Privacy</a> · <a href="/llms.txt">Agent Guide</a></p></body></html>`;
await save('index.md', toMarkdown(homepageContent, origin));

await save('404.html', renderNotFoundDocument({ source, errorCard, origin, themeBoot }));
await save('404.md', '# ' + errorCard.content.title + '\n\n' + errorCard.content.message + '\n\nCheck the URL or follow the [agent guide](/llms.txt), [sitemap](/sitemap.xml), or [portfolio](/).\n');

const urls = ['/', '/about/', '/contact/', '/privacy/'];
await save('sitemap.xml', [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(path => `  <url><loc>${origin}${path}</loc></url>`),
  '</urlset>\n'
].join('\n'));
console.log('Generated agent content; unchanged files were preserved.');
