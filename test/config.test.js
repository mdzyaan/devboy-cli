const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const { normalizeConfig, writeConfig, readConfig, allRoutes } = require('../lib/config');
const { expressToEvent } = require('../lib/runtime/event');

test('normalizeConfig fills defaults', () => {
  const cfg = normalizeConfig({});
  assert.equal(cfg.compute.provider, 'aws');
  assert.equal(cfg.auth.provider, 'none');
  assert.equal(cfg.db.provider, 'none');
  assert.equal(cfg.cron.provider, 'none');
  assert.deepEqual(cfg.api.routes, []);
});

test('write/read config roundtrip', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devboy-cfg-'));
  writeConfig(
    {
      compute: { provider: 'aws', region: 'eu-west-1' },
      auth: { provider: 'clerk' },
      db: { provider: 'neon' },
      cron: { provider: 'qstash' },
      api: { handler: 'index.js', routes: [{ path: '/x', method: 'GET', handler: 'api/x/get/index.js' }] },
      jobs: [],
    },
    dir
  );
  const cfg = readConfig(dir);
  assert.equal(cfg.compute.region, 'eu-west-1');
  assert.equal(cfg.auth.provider, 'clerk');
  assert.equal(allRoutes(cfg).length, 1);
  fs.removeSync(dir);
});

test('expressToEvent builds Lambda-compatible shape', () => {
  const event = expressToEvent({
    method: 'POST',
    path: '/me',
    url: '/me?x=1',
    headers: { authorization: 'Bearer t' },
    query: { x: '1' },
    body: { a: 1 },
    ip: '127.0.0.1',
    protocol: 'http',
    params: {},
  });
  assert.equal(event.httpMethod, 'POST');
  assert.equal(event.path, '/me');
  assert.equal(event.queryStringParameters.x, '1');
  assert.ok(event.body.includes('"a":1'));
});
