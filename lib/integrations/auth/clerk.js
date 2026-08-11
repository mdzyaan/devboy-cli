const fs = require('fs-extra');
const path = require('path');

const id = 'clerk';
const envKeys = ['CLERK_SECRET_KEY', 'CLERK_PUBLISHABLE_KEY'];

async function doctor(env = process.env) {
  if (!env.CLERK_SECRET_KEY) {
    return { ok: false, message: 'CLERK_SECRET_KEY is missing in .env.local' };
  }
  try {
    const res = await fetch('https://api.clerk.com/v1/users?limit=1', {
      headers: { Authorization: `Bearer ${env.CLERK_SECRET_KEY}` },
    });
    if (!res.ok) {
      return { ok: false, message: `Clerk API returned ${res.status}` };
    }
    return { ok: true, message: 'Clerk credentials look valid' };
  } catch (error) {
    return { ok: false, message: `Clerk check failed: ${error.message}` };
  }
}

function scaffold(projectPath) {
  const libDir = path.join(projectPath, 'lib');
  fs.ensureDirSync(libDir);

  const authHelper = `const { createClerkClient, verifyToken } = require('@clerk/backend');

function getClerk() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error('CLERK_SECRET_KEY is not set');
  return createClerkClient({ secretKey });
}

async function requireAuth(event) {
  const header = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return {
      error: {
        statusCode: 401,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized' }),
      },
    };
  }
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    return { userId: payload.sub, sessionId: payload.sid, claims: payload };
  } catch (error) {
    return {
      error: {
        statusCode: 401,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid token', message: error.message }),
      },
    };
  }
}

function getUserId(auth) {
  return auth && auth.userId;
}

module.exports = { getClerk, requireAuth, getUserId };
`;
  fs.writeFileSync(path.join(libDir, 'auth.js'), authHelper);

  const meRouteDir = path.join(projectPath, 'api', 'me', 'get');
  fs.ensureDirSync(meRouteDir);
  fs.writeFileSync(
    path.join(meRouteDir, 'index.js'),
    `const { requireAuth, getUserId } = require('../../../lib/auth');

module.exports = async (event) => {
  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId: getUserId(auth) }),
  };
};
`
  );

  return {
    routes: [{ path: '/me', method: 'GET', handler: 'api/me/get/index.js' }],
    dependencies: { '@clerk/backend': '^1.21.0' },
  };
}

module.exports = { id, envKeys, doctor, scaffold };
