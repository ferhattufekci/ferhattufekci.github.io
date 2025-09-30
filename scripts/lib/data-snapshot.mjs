import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Writes a generated data snapshot only when its content changed.
//
// The Medium sync runs every six hours. It used to rewrite data/meta.json with a fresh
// `lastUpdated` on every run, so every run produced a commit even when no article changed:
// 19 commits in 2026-11-01..10, each touching only that timestamp, and each commit started
// a full CI validation (about 1,600 Actions minutes in those ten days). `lastUpdated` now
// means "when the published content last changed", which is also what the page's sync badge
// can honestly claim for the data it is serving.
//
// files:     { 'medium-all.json': value, ... } -- the content files
// buildMeta: () => object, called only when something changed
// returns    { changed: string[] } -- names of the content files whose bytes changed
export function writeSnapshot(dir, files, metaName, buildMeta) {
  const serialized = Object.fromEntries(
    Object.entries(files).map(([name, value]) => [name, JSON.stringify(value, null, 2)]));
  const current = name => {
    try { return readFileSync(join(dir, name), 'utf8'); } catch { return null; }
  };
  const changed = Object.keys(serialized).filter(name => current(name) !== serialized[name]);
  if (!changed.length) return { changed };
  for (const name of changed) writeFileSync(join(dir, name), serialized[name], 'utf-8');
  writeFileSync(join(dir, metaName), JSON.stringify(buildMeta(), null, 2), 'utf-8');
  return { changed };
}
