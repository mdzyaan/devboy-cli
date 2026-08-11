const test = require('node:test');
const assert = require('node:assert/strict');
const { table } = require('../sdk/db');

test('table rejects invalid names', () => {
  assert.throws(() => table('items;drop'), /Invalid/);
  assert.throws(() => table('a-b'), /Invalid/);
});

test('table where requires for update/delete', async () => {
  const t = table('items');
  await assert.rejects(() => t.update({ name: 'x' }), /where/);
  await assert.rejects(() => t.delete(), /where/);
});
