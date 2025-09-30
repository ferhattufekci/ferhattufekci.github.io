import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseHTML } from 'linkedom';
import { repository } from './policy.mjs';

const targets = ['index.html', 'about/index.html', 'contact/index.html', 'privacy/index.html', '404.html'];
const start = '<!-- BUILD-INFO:START -->', end = '<!-- BUILD-INFO:END -->';
const label = build => `Build ${build.runNumber}.${build.buildAttempt}`;
const accessibleName = build => `${label(build)} — View Portfolio CI/CD run (opens in a new tab)`;

function validateBuild(build) {
  assert.deepEqual(Object.keys(build).sort(), ['buildAttempt', 'runId', 'runNumber', 'runUrl']);
  for (const key of ['runId', 'runNumber', 'buildAttempt']) {
    assert.equal(typeof build[key], 'string', `Invalid build identity: ${key}`);
    assert.match(build[key], /^[1-9][0-9]*$/, `Invalid build identity: ${key}`);
  }
  assert.equal(build.runUrl, `https://github.com/${repository}/actions/runs/${build.runId}`, 'Invalid build run URL');
  return build;
}

export function resolveBuildContext(env) {
  if (env.CI !== 'true' && env.GITHUB_ACTIONS !== 'true') return null;
  assert.equal(env.GITHUB_ACTIONS, 'true', 'CI build requires GitHub Actions context');
  assert.equal(env.GITHUB_SERVER_URL, 'https://github.com', 'Invalid build GitHub server');
  assert.equal(env.GITHUB_REPOSITORY, repository, 'Invalid build repository');
  assert.equal(env.GITHUB_WORKFLOW, 'Portfolio CI/CD', 'Invalid build caller workflow');
  return validateBuild({
    runId: env.GITHUB_RUN_ID, runNumber: env.GITHUB_RUN_NUMBER,
    buildAttempt: env.GITHUB_RUN_ATTEMPT,
    runUrl: `https://github.com/${repository}/actions/runs/${env.GITHUB_RUN_ID}`
  });
}

function render(build) {
  if (!build) return '';
  validateBuild(build);
  // URL and text contain only the validated fixed origin/repository and decimal IDs.
  return `\n<div class="build-info-row"><a class="build-info" href="${build.runUrl}" target="_blank" rel="noopener noreferrer" aria-label="${accessibleName(build)}"><span class="build-info__label">${label(build)}</span><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3zM5 5h6v2H7v10h10v-4h2v6H5V5z"/></svg></a></div>\n`;
}

export async function applyBuildIdentity(root, build) {
  const changes = [];
  for (const path of targets) {
    const html = await readFile(join(root, path), 'utf8');
    assert.equal(html.split(start).length, 2, `Missing or ambiguous build start marker: ${path}`);
    assert.equal(html.split(end).length, 2, `Missing or ambiguous build end marker: ${path}`);
    const left = html.indexOf(start) + start.length, right = html.indexOf(end);
    assert.ok(right >= left, `Reversed build insertion markers: ${path}`);
    changes.push([path, html.slice(0, left) + render(build) + html.slice(right)]);
  }
  for (const [path, html] of changes) await writeFile(join(root, path), html);
}

export function verifyBuildHtml(html, build, path) {
  const { document } = parseHTML(html);
  const links = document.querySelectorAll('a.build-info');
  assert.equal(links.length, build ? 1 : 0, `Build link count: ${path}`);
  if (!build) return;
  validateBuild(build);
  const link = links[0];
  assert.equal(link.textContent.trim(), label(build), `Build label: ${path}`);
  assert.equal(link.getAttribute('href'), build.runUrl, `Build run link: ${path}`);
  assert.equal(link.getAttribute('aria-label'), accessibleName(build), `Build accessible name: ${path}`);
}

export async function verifyBuildIdentity(root, build) {
  assert.ok(build === null || (build && typeof build === 'object'), 'Missing build identity');
  if (build) validateBuild(build);
  for (const path of targets) verifyBuildHtml(await readFile(join(root, path), 'utf8'), build, path);
}

export { targets as buildHtmlTargets };
