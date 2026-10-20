import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { parseHTML } from 'linkedom';
import { ROOT } from './lib/public-files.mjs';
import { renderDocument, renderTrustContent, replaceThemeBoot, toMarkdown } from './lib/agent-documents.mjs';

const require = createRequire(import.meta.url);
const { render: renderErrorCard } = require('../js/error-card.js');
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
    ...page, path: `/${slug}/`, body: renderTrustContent(page), origin, themeBoot
  });
  await mkdir(join(ROOT, slug), { recursive: true });
  await save(`${slug}/index.html`, html);
  await save(`${slug}/index.md`, toMarkdown(html, origin));
}

const { document: homepage } = parseHTML(source);
const sections = [...homepage.querySelectorAll('section.pt-page')].map(node => node.outerHTML).join('\n');
const homepageContent = `<html><body><h1>Ferhat Tüfekçi</h1>${sections}<p><a href="/about/">About</a> · <a href="/contact/">Contact</a> · <a href="/privacy/">Privacy</a> · <a href="/llms.txt">Agent guide</a></p></body></html>`;
await save('index.md', toMarkdown(homepageContent, origin));

await save('404.html', renderDocument({
  title: '404 — Page not found',
  description: 'The requested page could not be found.',
  path: '/404.html', indexable: false, origin, themeBoot,
  body: renderErrorCard({
    message: 'The requested page could not be found. It may have moved or the URL may be incorrect. Use the links below to find a published page.',
    homeHref: '/', resumeHref: '/#resume'
  })
}));
await save('404.md', '# 404 — Page not found\n\nThe requested page could not be found. Check the URL or follow the [agent guide](/llms.txt), [sitemap](/sitemap.xml), or [portfolio](/).\n');

const urls = ['/', '/about/', '/contact/', '/privacy/'];
await save('sitemap.xml', [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(path => `  <url><loc>${origin}${path}</loc></url>`),
  '</urlset>\n'
].join('\n'));
console.log('Generated agent content; unchanged files were preserved.');
