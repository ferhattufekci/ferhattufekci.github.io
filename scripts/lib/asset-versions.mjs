import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Preserve the authored document; only local CSS/JS resource URLs change.
// A content-derived URL prevents a fresh page from reusing an older release's
// still-fresh CSS or JavaScript response (Pages caches them for ten minutes).
export async function versionLocalAssets(html, root, documentPath) {
  const base = new URL(documentPath, 'https://portfolio.invalid/');
  const replacements = new Map();
  for (const match of html.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
    const tag = match[0], attribute = /\b(?:src|href)\s*=\s*(["'])([^"']+)\1/i.exec(tag);
    if (!attribute) continue;
    const original = attribute[2], url = new URL(original.replace(/&amp;/g, '&'), base);
    if (url.origin !== base.origin || !/^\/(?:css|js)\/.+\.(?:css|js)$/.test(url.pathname)) continue;
    const bytes = await readFile(join(root, url.pathname.slice(1)));
    url.searchParams.set('v', createHash('sha256').update(bytes).digest('hex').slice(0, 16));
    const path = original.split(/[?#]/)[0];
    const versioned = (path + url.search + url.hash).replace(/&/g, '&amp;');
    replacements.set(tag, tag.replace(attribute[0], attribute[0].replace(original, versioned)));
  }
  return html.replace(/<(?:script|link)\b[^>]*>/gi, tag => replacements.get(tag) || tag);
}
