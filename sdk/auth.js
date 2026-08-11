'use strict';

const path = require('path');
const { createRequire } = require('module');

function appRequire(id) {
  const fromApp = createRequire(path.join(process.cwd(), 'package.json'));
  return fromApp(id);
}

function unauthorized(message = 'Unauthorized') {
  return {
    error: {
      statusCode: 401,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: message }),
    },
  };
}

function configError(message) {
  return {
    error: {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: message }),
    },
  };
}

async function requireAuth(context) {
  if (!process.env.CLERK_SECRET_KEY) {
    return configError('CLERK_SECRET_KEY is not set. Configure Clerk in Studio or .env.local.');
  }

  const headers = (context && context.headers) || {};
  const header = headers.authorization || headers.Authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return unauthorized('Unauthorized');
  }

  try {
    // Resolve from the app project so peer deps install works with file: sdk
    const { verifyToken } = appRequire('@clerk/backend');
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    return {
      userId: payload.sub,
      sessionId: payload.sid,
      claims: payload,
    };
  } catch (error) {
    return unauthorized(error.message || 'Invalid token');
  }
}

function getUserId(authResult) {
  return authResult && authResult.userId;
}

module.exports = { requireAuth, getUserId };
