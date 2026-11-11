import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import YAML from 'yaml';
import { ROOT } from '../lib/public-files.mjs';

const quality = YAML.parse(await readFile(join(ROOT, '.github/workflows/test-agent-readiness.yml'), 'utf8'));
const lock = JSON.parse(await readFile(join(ROOT, 'package-lock.json'), 'utf8'));
const version = lock.packages['node_modules/@playwright/test'].version;
const containerJobs = ['browser-tests', 'keyboard-tests'];

test('R-CI-PWC-01: the browser jobs run in the official Playwright image for the locked Playwright version, pinned by digest', () => {
  for (const name of containerJobs) {
    const { container } = quality.jobs[name];
    assert.ok(container, `${name} runs in a container`);
    // The image holds browser builds for one Playwright version only; another version cannot launch them.
    assert.match(container.image, /^mcr\.microsoft\.com\/playwright:v[\d.]+-noble@sha256:[0-9a-f]{64}$/, name);
    assert.equal(container.image.split('@')[0], `mcr.microsoft.com/playwright:v${version}-noble`, `${name}: image tag equals the locked @playwright/test version`);
    assert.equal(container.options, '--user 1001 --init --ipc=host', name);
    assert.equal(quality.jobs[name]['runs-on'], 'ubuntu-24.04', `${name}: noble image on the noble runner`);
  }
  assert.equal(quality.jobs['browser-tests'].container.image, quality.jobs['keyboard-tests'].container.image, 'one image for every engine');
});

test('R-CI-PWC-02: the container jobs download no browser or system package at run time and check the image before testing', () => {
  for (const name of containerJobs) {
    const steps = quality.jobs[name].steps;
    for (const step of steps) {
      assert.doesNotMatch(step.run ?? '', /playwright install|apt-get|apt install|bound-apt-network/, `${name}: ${step.name}`);
      assert.equal(step['continue-on-error'], undefined, `${name}: ${step.name}`);
    }
    const check = steps.findIndex(step => /check-container-browsers\.mjs/.test(step.run ?? ''));
    const firstTest = steps.findIndex(step => /playwright test|test:browser/.test(step.run ?? ''));
    assert.ok(check >= 0 && check < firstTest, `${name}: the image is checked before the first test step`);
  }
  assert.equal(quality.jobs['browser-tests'].steps.find(step => step.name === 'Check container browsers').run, 'node scripts/ci/check-container-browsers.mjs chromium');
});
