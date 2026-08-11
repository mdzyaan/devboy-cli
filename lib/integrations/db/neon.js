const fs = require('fs-extra');
const path = require('path');

const id = 'neon';
const envKeys = ['DATABASE_URL'];

async function doctor(env = process.env) {
  if (!env.DATABASE_URL) {
    return { ok: false, message: 'DATABASE_URL is missing (Neon connection string)' };
  }
  if (!env.DATABASE_URL.startsWith('postgres')) {
    return { ok: false, message: 'DATABASE_URL does not look like a Postgres URL' };
  }
  try {
    const { Client } = require('pg');
    const client = new Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await client.connect();
    await client.query('select 1');
    await client.end();
    return { ok: true, message: 'Neon / Postgres connection OK' };
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      return { ok: true, message: 'DATABASE_URL set (install `pg` in the app to run live checks)' };
    }
    return { ok: false, message: `DB check failed: ${error.message}` };
  }
}

function scaffold(projectPath) {
  const libDir = path.join(projectPath, 'lib');
  fs.ensureDirSync(libDir);
  fs.writeFileSync(
    path.join(libDir, 'db.js'),
    `const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

async function query(text, params) {
  return getPool().query(text, params);
}

module.exports = { getPool, query };
`
  );

  fs.ensureDirSync(path.join(projectPath, 'models'));
  fs.writeFileSync(
    path.join(projectPath, 'models', 'README.md'),
    `# Models (Neon / Postgres)

Use \`lib/db.js\` for queries. Example:

\`\`\`js
const { query } = require('../lib/db');
await query('select now()');
\`\`\`
`
  );

  const routeDir = path.join(projectPath, 'api', 'health', 'db', 'get');
  fs.ensureDirSync(routeDir);
  fs.writeFileSync(
    path.join(routeDir, 'index.js'),
    `const { query } = require('../../../../lib/db');

module.exports = async () => {
  try {
    const result = await query('select now() as now');
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true, now: result.rows[0].now }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: false, error: error.message }),
    };
  }
};
`
  );

  return {
    routes: [{ path: '/health/db', method: 'GET', handler: 'api/health/db/get/index.js' }],
    dependencies: { pg: '^8.13.0' },
  };
}

module.exports = { id, envKeys, doctor, scaffold };
