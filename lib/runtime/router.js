const path = require('path');
const { allRoutes } = require('../config');

/**
 * Drop require.cache for project-local modules (handlers + relative imports).
 * Leaves node_modules (and linked packages outside cwd) intact for pools/SDK.
 */
function clearProjectModuleCache(cwd) {
  const root = path.resolve(cwd);
  const rootPrefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  for (const key of Object.keys(require.cache)) {
    const mod = require.cache[key];
    const filename = mod && mod.filename;
    if (!filename) continue;
    const resolved = path.resolve(filename);
    if (resolved !== root && !resolved.startsWith(rootPrefix)) continue;
    if (resolved.includes(`${path.sep}node_modules${path.sep}`)) continue;
    delete require.cache[key];
  }
}

function clearHandlerCache(handlerPath) {
  try {
    const resolved = require.resolve(handlerPath);
    delete require.cache[resolved];
  } catch {
    // not loaded yet
  }
}

function loadHandler(cwd, handlerRel) {
  const full = path.join(cwd, handlerRel);
  clearProjectModuleCache(cwd);
  clearHandlerCache(full);
  // eslint-disable-next-line import/no-dynamic-require, global-require
  return require(full);
}

function matchRoute(config, httpMethod, reqPath) {
  const method = String(httpMethod || '').toUpperCase();
  return allRoutes(config).find(
    (r) => r.method.toUpperCase() === method && r.path === reqPath
  );
}

function parseBody(event) {
  if (event.body == null || event.body === '') return {};
  let raw = event.body;
  if (event.isBase64Encoded && typeof raw === 'string') {
    raw = Buffer.from(raw, 'base64').toString('utf8');
  }
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return { _raw: raw };
  }
}

function buildParams(event) {
  const method = String(
    event.httpMethod ||
      (event.requestContext && event.requestContext.http && event.requestContext.http.method) ||
      'GET'
  ).toUpperCase();

  if (method === 'GET' || method === 'HEAD' || method === 'DELETE') {
    return { ...(event.queryStringParameters || {}) };
  }
  const body = parseBody(event);
  // Merge query onto body for convenience (body wins on key clash)
  return { ...(event.queryStringParameters || {}), ...(typeof body === 'object' && body ? body : {}) };
}

function buildContext(event, lambdaContext) {
  const headers = {};
  for (const [key, value] of Object.entries(event.headers || {})) {
    headers[key.toLowerCase()] = value;
  }
  const bag = {
    _status: 200,
    _headers: {},
  };

  const context = {
    method: String(
      event.httpMethod ||
        (event.requestContext && event.requestContext.http && event.requestContext.http.method) ||
        'GET'
    ).toUpperCase(),
    path: event.path || event.rawPath || '',
    headers,
    query: { ...(event.queryStringParameters || {}) },
    event,
    lambda: lambdaContext,
    status(code) {
      bag._status = Number(code) || 200;
      return context;
    },
    set(field, value) {
      if (field) bag._headers[String(field).toLowerCase()] = String(value);
      return context;
    },
    remove(field) {
      if (field) delete bag._headers[String(field).toLowerCase()];
      return context;
    },
    _bag: bag,
  };
  return context;
}

function isLambdaResult(result) {
  return (
    result &&
    typeof result === 'object' &&
    result.statusCode != null &&
    Object.prototype.hasOwnProperty.call(result, 'body')
  );
}

function normalizeResult(result, context) {
  if (isLambdaResult(result)) {
    return result;
  }
  const headers = {
    'content-type': 'application/json',
    ...(context && context._bag ? context._bag._headers : {}),
  };
  const statusCode = (context && context._bag && context._bag._status) || 200;
  return {
    statusCode,
    headers,
    body: JSON.stringify(result === undefined ? null : result),
  };
}

/**
 * Detect legacy Lambda-style handlers that expect (event, context).
 * Heuristic: function length === 2 is ambiguous; we always call with (params, context)
 * and also attach event on context. Legacy handlers that use event.path / event.httpMethod
 * should read context.event. For true dual-mode, if the first arg looks unused and they
 * return statusCode/body, still works when they ignore params.
 *
 * Additionally: if handler.toString matches /statusCode/, no change needed.
 * We call fn(params, context) always; legacy code using first arg as event will break
 * unless we pass event when arity suggests Lambda style.
 *
 * Safer dual-mode: call as fn(params, context) but make params also carry event fields
 * for migration, AND if fn.length >= 2 we still pass params as first arg (AirCode style).
 * Legacy handlers used (event, context) — to keep them working, detect common event keys usage
 * by calling with a hybrid first argument: params with .path/.httpMethod from event.
 */
function buildFirstArg(params, event) {
  // Hybrid: AirCode params plus Lambda event fields so old handlers keep working
  const hybrid = Object.assign(Object.create(null), params);
  hybrid.path = event.path || event.rawPath;
  hybrid.httpMethod =
    event.httpMethod ||
    (event.requestContext && event.requestContext.http && event.requestContext.http.method);
  hybrid.headers = event.headers;
  hybrid.body = event.body;
  hybrid.queryStringParameters = event.queryStringParameters;
  hybrid.isBase64Encoded = event.isBase64Encoded;
  hybrid.requestContext = event.requestContext;
  hybrid.rawPath = event.rawPath;
  hybrid.version = event.version;
  return hybrid;
}

async function invokeRoute(config, cwd, event, lambdaContext) {
  const method =
    event.httpMethod ||
    (event.requestContext && event.requestContext.http && event.requestContext.http.method);
  const reqPath = event.path || event.rawPath;
  const route = matchRoute(config, method, reqPath);
  if (!route) {
    return {
      statusCode: 404,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Not Found' }),
    };
  }
  const handler = loadHandler(cwd, route.handler);
  const fn = typeof handler === 'function' ? handler : handler.handler || handler.default;
  if (typeof fn !== 'function') {
    throw new Error(`Handler ${route.handler} does not export a function`);
  }

  const params = buildParams(event);
  const context = buildContext(event, lambdaContext);
  const firstArg = buildFirstArg(params, event);
  const result = await fn(firstArg, context);
  return normalizeResult(result, context);
}

module.exports = {
  matchRoute,
  invokeRoute,
  loadHandler,
  clearProjectModuleCache,
  buildParams,
  buildContext,
  normalizeResult,
  isLambdaResult,
};
