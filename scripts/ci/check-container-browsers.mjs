// Fail early and clearly when the job's container image does not hold the browser
// builds that the locked Playwright version expects (image tag and package version differ).
// Usage: node scripts/ci/check-container-browsers.mjs chromium [firefox webkit]
import { accessSync } from 'node:fs';
import * as playwright from '@playwright/test';

const names = process.argv.slice(2);
if (!names.length) throw new Error('name at least one browser');
for (const name of names) {
  const path = playwright[name]?.executablePath();
  if (!path) throw new Error(`unknown browser: ${name}`);
  try {
    accessSync(path);
  } catch {
    throw new Error(`${name} is not in this image at ${path}. The container image tag must equal the locked @playwright/test version.`);
  }
  console.log(`${name}: ${path}`);
}
