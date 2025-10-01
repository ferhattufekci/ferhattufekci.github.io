import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import YAML from 'yaml';
const files = execFileSync(
  'git',
  [
    'ls-files',
    '--cached',
    '--others',
    '--exclude-standard',
    '--',
    '*.js',
    '*.mjs',
    '*.json',
    '*.yml',
    '*.yaml'
  ],
  { encoding: 'utf8' }
)
  .trim()
  .split('\n')
  .filter((file) => file && existsSync(file));
for (const file of files) {
  if (/\.(?:m?js)$/.test(file))
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  else if (file.endsWith('.json')) JSON.parse(await readFile(file, 'utf8'));
  else YAML.parse(await readFile(file, 'utf8'), { uniqueKeys: true });
}
console.log(
  `Syntax and structured-data checks passed for ${files.length} files`
);
