const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const { buildTree, readProjectFile, writeProjectFile, resolveSafePath } = require('../lib/studio-files');

test('blocks env and traversal', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devboy-files-'));
  assert.throws(() => resolveSafePath(dir, '../outside.js'));
  assert.throws(() => resolveSafePath(dir, '.env.local'));
  fs.removeSync(dir);
});

test('tree and read/write api files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devboy-files-'));
  fs.ensureDirSync(path.join(dir, 'api', 'hello', 'get'));
  fs.writeFileSync(path.join(dir, 'api', 'hello', 'get', 'index.js'), 'module.exports = 1;\n');
  fs.writeFileSync(path.join(dir, 'devboy.config.js'), 'module.exports = {};\n');
  fs.writeFileSync(path.join(dir, '.env.local'), 'SECRET=1\n');

  const tree = buildTree(dir);
  const names = tree.children.map((c) => c.name);
  assert.ok(names.includes('api'));
  assert.ok(names.includes('devboy.config.js'));
  assert.ok(!names.includes('.env.local'));

  const file = readProjectFile(dir, 'api/hello/get/index.js');
  assert.match(file.content, /module\.exports/);

  writeProjectFile(dir, 'api/hello/get/index.js', 'module.exports = 2;\n');
  assert.equal(fs.readFileSync(path.join(dir, 'api', 'hello', 'get', 'index.js'), 'utf8'), 'module.exports = 2;\n');
  fs.removeSync(dir);
});
