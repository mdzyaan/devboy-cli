const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePackageName, validateVersion } = require('../lib/studio-packages');

test('validatePackageName accepts scoped and unscoped', () => {
  assert.equal(validatePackageName('zod'), null);
  assert.equal(validatePackageName('@clerk/backend'), null);
  assert.equal(validatePackageName('lodash'), null);
});

test('validatePackageName rejects injection', () => {
  assert.ok(validatePackageName('foo;rm -rf'));
  assert.ok(validatePackageName('foo && bar'));
  assert.ok(validatePackageName('../evil'));
  assert.ok(validatePackageName(''));
});

test('validateVersion accepts semver-ish ranges', () => {
  assert.equal(validateVersion('1.2.3'), null);
  assert.equal(validateVersion('^1.0.0'), null);
  assert.equal(validateVersion('latest'), null);
  assert.ok(validateVersion('1.0.0;rm'));
});
