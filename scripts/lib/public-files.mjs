import { readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
export const publicDirectories = ['css', 'js', 'fonts', 'images', 'data', 'about', 'contact', 'privacy'];
export const publicFiles = ['index.html', 'index.md', '404.html', '404.md', 'agent-instructions.md', 'llms.txt', 'robots.txt', 'sitemap.xml', 'ads.txt', 'BingSiteAuth.xml', 'google27b749974c98d3ae.html', 'yandex_76fab459d2c4e004.html', 'FerhatTufekci_CV.pdf'];
export async function inventory(root = ROOT) {
  const result = [...publicFiles];
  async function visit(directory) {
    for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
      const path = directory + '/' + entry.name;
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) result.push(path);
    }
  }
  for (const directory of publicDirectories) await visit(directory);
  return result.sort();
}
