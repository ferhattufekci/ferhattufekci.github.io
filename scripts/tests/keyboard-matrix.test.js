import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import YAML from 'yaml';
import { ROOT } from '../lib/public-files.mjs';
import { requiredChecks } from '../ci/policy.mjs';

const quality = YAML.parse(await readFile(join(ROOT, '.github/workflows/test-agent-readiness.yml'), 'utf8'));
const job = quality.jobs['keyboard-tests'];
const { default: config } = await import(pathToFileURL(join(ROOT, 'playwright.keyboard.config.mjs')));

test('R-CI-KB-01: each keyboard engine runs in its own job, and together the jobs run every keyboard project exactly once', () => {
  const browsers = job.strategy.matrix.browser;
  assert.deepEqual(browsers, ['firefox', 'webkit']);
  assert.equal(job.strategy['fail-fast'], false, 'one engine failing must not hide the other engine\'s result');
  assert.equal(job.env.KEYBOARD_BROWSER, '${{ matrix.browser }}');
  const run = job.steps.find(step => /playwright\.keyboard\.config\.mjs/.test(step.run ?? '')).run;
  assert.equal(run, 'npx playwright test --config=playwright.keyboard.config.mjs --project="$KEYBOARD_BROWSER-*"');
  // The `--project` glob selects by name prefix: every project must belong to exactly one leg,
  // so a project added for another engine cannot be skipped silently.
  for (const project of config.projects) {
    const legs = browsers.filter(browser => project.name.startsWith(`${browser}-`));
    assert.equal(legs.length, 1, `${project.name} is run by ${legs.length} legs`);
    assert.equal(project.use.browserName, legs[0], `${project.name} runs in the ${legs[0]} job`);
  }
  for (const browser of browsers) assert.ok(config.projects.some(project => project.name.startsWith(`${browser}-`)), `${browser} leg has projects`);
});

test('R-CI-KB-02: the WebKit-only touch arrows run once, installs match the leg, failures still block and reports stay per leg', () => {
  const arrows = job.steps.find(step => /playwright\.webkit\.config\.mjs/.test(step.run ?? ''));
  assert.equal(arrows.if, "matrix.browser == 'webkit'");
  assert.equal(job.steps.find(step => step.name === 'Check container browsers').run, 'node scripts/ci/check-container-browsers.mjs "$KEYBOARD_BROWSER"');
  for (const step of job.steps) assert.equal(step['continue-on-error'], undefined, step.name);
  const upload = job.steps.find(step => step.name === 'Publish keyboard browser reports');
  assert.equal(upload.with.name, 'keyboard-browser-report-${{ matrix.browser }}', 'unique artifact per leg; a shared name would collide');
  assert.equal(upload.if, 'always()');
  assert.equal(upload.with['if-no-files-found'], 'error');
  assert.ok(requiredChecks.includes('keyboard-tests'), 'the quality gate still requires the (matrix) keyboard job');
  assert.ok(quality.jobs['quality-gate'].needs.includes('keyboard-tests'));
});
