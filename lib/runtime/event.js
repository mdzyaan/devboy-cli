/**
 * Build an API Gateway HTTP API (payload format 2.0-ish) / REST-compatible event
 * from an Express request so handlers see the same shape locally and on Lambda.
 */
function expressToEvent(req) {
  const headers = {};
  for (const [key, value] of Object.entries(req.headers || {})) {
    headers[key] = Array.isArray(value) ? value.join(',') : String(value);
  }

  let body = null;
  if (req.body !== undefined && req.body !== null) {
    body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  const queryStringParameters =
    req.query && Object.keys(req.query).length
      ? Object.fromEntries(
          Object.entries(req.query).map(([k, v]) => [
            k,
            Array.isArray(v) ? v[v.length - 1] : String(v),
          ])
        )
      : null;

  return {
    version: '2.0',
    routeKey: `${req.method} ${req.path}`,
    rawPath: req.path,
    rawQueryString: req.url.includes('?') ? req.url.split('?')[1] : '',
    headers,
    queryStringParameters,
    pathParameters: req.params && Object.keys(req.params).length ? req.params : null,
    requestContext: {
      http: {
        method: req.method,
        path: req.path,
        protocol: req.protocol ? `HTTP/${req.httpVersion || '1.1'}` : 'HTTP/1.1',
        sourceIp: req.ip || (req.socket && req.socket.remoteAddress) || '',
        userAgent: headers['user-agent'] || '',
      },
      requestId: `local-${Date.now()}`,
      stage: 'local',
    },
    // REST API Gateway compatibility fields used by many handlers / our router
    path: req.path,
    httpMethod: req.method,
    body,
    isBase64Encoded: false,
  };
}

function createContext() {
  return {
    awsRequestId: `local-${Date.now()}`,
    functionName: 'devboy-local',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:local:000000000000:function:devboy-local',
    memoryLimitInMB: '256',
    getRemainingTimeInMillis: () => 30000,
  };
}

/**
 * Build a local Lambda-shaped event for Studio Debug (no Express req).
 * GET/HEAD/DELETE: params → query. POST/PUT/PATCH: params → JSON body.
 */
function debugToEvent({ method, path: reqPath, params, headers }) {
  const httpMethod = String(method || 'GET').toUpperCase();
  const routePath = String(reqPath || '/');
  const hdrs = {};
  for (const [key, value] of Object.entries(headers || {})) {
    if (value == null) continue;
    hdrs[String(key).toLowerCase()] = String(value);
  }

  const paramObj =
    params && typeof params === 'object' && !Array.isArray(params) ? params : {};

  let body = null;
  let queryStringParameters = null;

  if (httpMethod === 'GET' || httpMethod === 'HEAD' || httpMethod === 'DELETE') {
    const entries = Object.entries(paramObj);
    queryStringParameters = entries.length
      ? Object.fromEntries(entries.map(([k, v]) => [k, v == null ? '' : String(v)]))
      : null;
  } else {
    body = JSON.stringify(paramObj);
    if (!hdrs['content-type']) hdrs['content-type'] = 'application/json';
  }

  return {
    version: '2.0',
    routeKey: `${httpMethod} ${routePath}`,
    rawPath: routePath,
    rawQueryString: '',
    headers: hdrs,
    queryStringParameters,
    pathParameters: null,
    requestContext: {
      http: {
        method: httpMethod,
        path: routePath,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'devboy-studio-debug',
      },
      requestId: `debug-${Date.now()}`,
      stage: 'local',
    },
    path: routePath,
    httpMethod,
    body,
    isBase64Encoded: false,
  };
}

module.exports = { expressToEvent, createContext, debugToEvent };
