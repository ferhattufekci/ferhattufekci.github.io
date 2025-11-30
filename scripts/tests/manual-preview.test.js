import test from 'node:test';
import assert from 'node:assert/strict';
import { manualOptions, manualCatalog } from '../../tests/manual/preview.mjs';

test('R-GKP-01: manual fixture input rejects unknown or unsafe configurations', () => {
  assert.deepEqual(manualOptions([]), { scenario: 'standard', starredCount: 41, hold: 'none', storage: 'normal', headless: false });
  assert.deepEqual(manualOptions(['--scenario=empty', '--starred=0', '--hold=blog', '--storage=blocked', '--headless']), { scenario: 'empty', starredCount: 0, hold: 'blog', storage: 'blocked', headless: true });
  for (const input of ['--typo=x', '--starred=-1', '--starred=1.5', '--starred=NaN', '--starred=1001', '--scenario=unknown', '--hold=all', '--storage=unknown']) {
    assert.throws(() => manualOptions([input]), undefined, input);
  }
});

test('R-GKP-01: empty and malformed manual scenarios remain isolated from a later standard session', () => {
  const empty = manualCatalog(manualOptions(['--scenario=empty']));
  assert.equal(Object.values(empty).filter(Array.isArray).flat().length, 0);
  const broken = manualCatalog(manualOptions(['--scenario=invalid-json']));
  assert.equal(broken['medium-test.json'], 'malformed-json');
  assert.equal(broken['github-repos.json'], 'malformed-json');
  const standard = manualCatalog(manualOptions([]));
  assert.equal(standard['medium-test.json'].length, 2);
  assert.equal(standard['github-repos.json'].length, 4);
  assert.equal(standard['github-starred.json'].length, 41);
});
