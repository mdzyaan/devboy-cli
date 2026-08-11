const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildParams,
  buildContext,
  normalizeResult,
  isLambdaResult,
} = require('../lib/runtime/router');

test('buildParams uses query for GET', () => {
  const params = buildParams({
    httpMethod: 'GET',
    queryStringParameters: { a: '1' },
    body: null,
  });
  assert.equal(params.a, '1');
});

test('buildParams parses JSON body for POST', () => {
  const params = buildParams({
    httpMethod: 'POST',
    queryStringParameters: { q: 'x' },
    body: JSON.stringify({ name: 'zyaan' }),
  });
  assert.equal(params.name, 'zyaan');
  assert.equal(params.q, 'x');
});

test('normalizeResult wraps plain objects', () => {
  const ctx = buildContext({ httpMethod: 'GET', path: '/x', headers: {} }, {});
  ctx.status(201).set('x-test', '1');
  const out = normalizeResult({ ok: true }, ctx);
  assert.equal(out.statusCode, 201);
  assert.equal(out.headers['x-test'], '1');
  assert.deepEqual(JSON.parse(out.body), { ok: true });
});

test('normalizeResult passes through Lambda shape', () => {
  const lambda = {
    statusCode: 401,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ error: 'Unauthorized' }),
  };
  assert.equal(isLambdaResult(lambda), true);
  assert.equal(normalizeResult(lambda, null), lambda);
});
