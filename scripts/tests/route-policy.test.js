import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const routes = require('../../js/route-policy.js');
const validRoutes = ['#about-me', '#resume', '#blog', '#projects', '#contact'];

for (const hash of validRoutes) test(`R-NAV-01: exact route ${hash} is accepted`, () => {
  assert.equal(routes.resolve(hash, validRoutes), hash);
});
for (const hash of ['#res', '#resumes', '#Resume', '#resume/nope', '#%E0%A4%A', '#%22%5D', '#constructor', '#__proto__']) test(`R-NAV-02: invalid equivalence class ${hash} is rejected`, () => {
  assert.equal(routes.resolve(hash, validRoutes), null);
});
test('R-NAV-01: empty route defaults home and encoded known names are supported', () => {
  assert.equal(routes.resolve('', validRoutes), '#about-me');
  assert.equal(routes.resolve('#%72esume', validRoutes), '#resume');
  assert.equal(routes.resolve('', []), null);
});
test('R-NAV-03: only existing AJAX detail documents are accepted', () => {
  assert.equal(routes.resolve('#projects/case-study', validRoutes, ['case-study.html']), '#projects');
  assert.equal(routes.resolve('#projects/case-stud', validRoutes, ['case-study.html']), null);
});
