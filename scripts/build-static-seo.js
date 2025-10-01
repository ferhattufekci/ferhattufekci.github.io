// scripts/build-static-seo.js
//
// Regenerates two things from the auto-synced JSON data:
//   1. The <noscript> fallback content in index.html for the Projects
//      and Blog subpages (data/github-repos.json, data/medium-all.json).
//   2. The "Recent articles" / "Selected projects" lists in llms.txt.
//
// Why this exists (GEO/AEO):
// The Projects and Blog subpages are populated entirely client-side via
// fetch() after page load. Googlebot renders JavaScript, but many AI
// answer-engine crawlers (GPTBot, PerplexityBot, and others) fetch raw
// HTML only and never run the page's scripts — to them, these sections
// are empty <div>s. Content placed inside <noscript> is part of the raw
// HTML response either way, so non-JS fetchers see real titles, links,
// and descriptions, while browsers with JavaScript enabled never render
// <noscript> content at all (no visual change, no duplicate content for
// real visitors). llms.txt is the emerging equivalent for LLM-based
// answer engines: a plain-text index of what the site is and what's on
// it, fetched directly rather than crawled/rendered.
//
// This script keeps both in sync with the live data instead of letting
// them go stale, by running as an extra step in the same GitHub Actions
// workflows that already fetch the data (see
// .github/workflows/fetch-github.yml and fetch-medium.yml).
//
// Usage: node scripts/build-static-seo.js

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const INDEX_HTML = join(ROOT, 'index.html');
const LLMS_TXT = join(ROOT, 'llms.txt');
const SITEMAP_XML = join(ROOT, 'sitemap.xml');
const DATA_DIR = join(ROOT, 'data');

const MAX_PROJECTS = 6;
const MAX_ARTICLES = 6;


function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function readJson(name, fallback) {
  const path = join(DATA_DIR, name);
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function buildProjectsFragment() {
  const repos = readJson('github-repos.json', []);
  let picked = repos.filter((r) => r.pinned);
  if (picked.length === 0) {
    picked = [...repos].sort((a, b) => (b.stars || 0) - (a.stars || 0));
  }
  picked = picked.slice(0, MAX_PROJECTS);

  if (picked.length === 0) {
    return '<p>Projects are listed on <a href="https://github.com/ferhattufekci" target="_blank" rel="noopener noreferrer">github.com/ferhattufekci</a>.</p>';
  }

  const items = picked
    .map((r) => {
      const name = escapeHtml(r.name);
      const url = escapeHtml(r.url);
      const desc = r.description ? ' — ' + escapeHtml(r.description) : '';
      const lang = r.language ? ' (' + escapeHtml(r.language) + ')' : '';
      return `    <li><a href="${url}" target="_blank" rel="noopener noreferrer">${name}</a>${lang}${desc}</li>`;
    })
    .join('\n');

  return [
    '<p>Selected projects (full list on <a href="https://github.com/ferhattufekci" target="_blank" rel="noopener noreferrer">GitHub</a>):</p>',
    '  <ul>',
    items,
    '  </ul>',
  ].join('\n');
}

function buildBlogFragment() {
  const articles = readJson('medium-all.json', []);
  const picked = [...articles]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, MAX_ARTICLES);

  if (picked.length === 0) {
    return '<p>Articles are published on <a href="https://medium.com/@ferhattufekci" target="_blank" rel="noopener noreferrer">medium.com/@ferhattufekci</a>.</p>';
  }

  const items = picked
    .map((a) => {
      const title = escapeHtml(a.title);
      const url = escapeHtml(a.url);
      const excerpt = a.excerpt ? ' — ' + escapeHtml(a.excerpt) : '';
      return `    <li><a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a>${excerpt}</li>`;
    })
    .join('\n');

  return [
    '<p>Recent articles (full archive on <a href="https://medium.com/@ferhattufekci" target="_blank" rel="noopener noreferrer">Medium</a>):</p>',
    '  <ul>',
    items,
    '  </ul>',
  ].join('\n');
}

function replaceBetweenMarkers(html, startMarker, endMarker, fragment, opts = {}) {
  const { indent = true } = opts;
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Markers not found or out of order: ${startMarker} / ${endMarker}`);
  }
  const before = html.slice(0, start + startMarker.length);
  const after = html.slice(end);
  const body = indent
    ? fragment
        .split('\n')
        .map((line) => (line ? '                  ' + line : line))
        .join('\n')
    : fragment;
  const pad = indent ? '                  ' : '';
  return `${before}\n${body}\n${pad}${after}`;
}

function buildLlmsProjectsList() {
  const repos = readJson('github-repos.json', []);
  let picked = repos.filter((r) => r.pinned);
  if (picked.length === 0) {
    picked = [...repos].sort((a, b) => (b.stars || 0) - (a.stars || 0));
  }
  picked = picked.slice(0, MAX_PROJECTS);
  return picked
    .map((r) => {
      const desc = r.description ? `: ${r.description}` : '';
      return `- [${r.name}](${r.url})${desc}`;
    })
    .join('\n');
}

function buildLlmsArticlesList() {
  const articles = readJson('medium-all.json', []);
  const picked = [...articles]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, MAX_ARTICLES);
  return picked
    .map((a) => {
      const excerpt = a.excerpt ? `: ${a.excerpt}` : '';
      return `- [${a.title}](${a.url})${excerpt}`;
    })
    .join('\n');
}

function updateLlmsTxt() {
  if (!existsSync(LLMS_TXT)) {
    console.warn('⚠️  llms.txt not found, skipping.');
    return false;
  }
  const original = readFileSync(LLMS_TXT, 'utf8');
  let txt = original;
  txt = replaceBetweenMarkers(
    txt,
    '<!-- STATIC-SEO:ARTICLES:START -->',
    '<!-- STATIC-SEO:ARTICLES:END -->',
    buildLlmsArticlesList(),
    { indent: false },
  );
  txt = replaceBetweenMarkers(
    txt,
    '<!-- STATIC-SEO:PROJECTS:START -->',
    '<!-- STATIC-SEO:PROJECTS:END -->',
    buildLlmsProjectsList(),
    { indent: false },
  );
  if (txt === original) return false;
  writeFileSync(LLMS_TXT, txt, 'utf8');
  return true;
}

// Bumps sitemap.xml's <lastmod> to today only when this run actually
// changed index.html or llms.txt — so lastmod stays truthful (reflects a
// real content change) instead of being rewritten on every CI run
// regardless of whether anything changed.
function bumpSitemapLastmod() {
  if (!existsSync(SITEMAP_XML)) {
    console.warn('⚠️  sitemap.xml not found, skipping.');
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  let xml = readFileSync(SITEMAP_XML, 'utf8');
  const updated = xml.replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${today}</lastmod>`);
  if (updated === xml) return;
  writeFileSync(SITEMAP_XML, updated, 'utf8');
  console.log(`✅ sitemap.xml lastmod bumped to ${today}`);
}

function main() {
  let html = readFileSync(INDEX_HTML, 'utf8');
  const originalHtml = html;

  html = replaceBetweenMarkers(
    html,
    '<!-- STATIC-SEO:PROJECTS:START -->',
    '<!-- STATIC-SEO:PROJECTS:END -->',
    buildProjectsFragment(),
  );
  html = replaceBetweenMarkers(
    html,
    '<!-- STATIC-SEO:BLOG:START -->',
    '<!-- STATIC-SEO:BLOG:END -->',
    buildBlogFragment(),
  );

  const htmlChanged = html !== originalHtml;
  if (htmlChanged) {
    writeFileSync(INDEX_HTML, html, 'utf8');
    console.log('✅ Static SEO fallback content regenerated in index.html');
  } else {
    console.log('ℹ️  index.html fallback content unchanged, skipped write');
  }

  const llmsChanged = updateLlmsTxt();
  console.log(
    llmsChanged
      ? '✅ llms.txt article/project lists regenerated'
      : 'ℹ️  llms.txt lists unchanged, skipped write',
  );

  if (htmlChanged || llmsChanged) {
    bumpSitemapLastmod();
  }
}

main();
