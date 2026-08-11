/**
 * Apply a Devboy/Lambda proxy result to an Express response.
 */
function sendResult(res, result) {
  if (result == null) {
    res.status(204).end();
    return;
  }

  // Already sent by handler (should be rare with event/context contract)
  if (res.headersSent) return;

  const statusCode = result.statusCode || 200;
  const headers = result.headers || {};
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }

  let body = result.body;
  if (body == null) {
    res.status(statusCode).end();
    return;
  }

  if (result.isBase64Encoded && typeof body === 'string') {
    res.status(statusCode).send(Buffer.from(body, 'base64'));
    return;
  }

  if (typeof body === 'string') {
    const contentType = headers['content-type'] || headers['Content-Type'] || '';
    if (contentType.includes('application/json') || looksLikeJson(body)) {
      try {
        res.status(statusCode).json(JSON.parse(body));
        return;
      } catch {
        // fall through
      }
    }
    res.status(statusCode).send(body);
    return;
  }

  res.status(statusCode).json(body);
}

function looksLikeJson(str) {
  const t = str.trim();
  return (t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'));
}

module.exports = { sendResult };
