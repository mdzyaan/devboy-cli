const fs = require('fs-extra');
const path = require('path');

const id = 'mongodb-atlas';
const envKeys = ['MONGODB_URI'];

async function doctor(env = process.env) {
  if (!env.MONGODB_URI) {
    return { ok: false, message: 'MONGODB_URI is missing' };
  }
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    await client.db().command({ ping: 1 });
    await client.close();
    return { ok: true, message: 'MongoDB Atlas connection OK' };
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      return { ok: true, message: 'MONGODB_URI set (install `mongodb` in the app to run live checks)' };
    }
    return { ok: false, message: `Mongo check failed: ${error.message}` };
  }
}

function scaffold(projectPath) {
  const libDir = path.join(projectPath, 'lib');
  fs.ensureDirSync(libDir);
  fs.writeFileSync(
    path.join(libDir, 'db.js'),
    `const { MongoClient } = require('mongodb');

let client;
let db;

async function getDb() {
  if (db) return db;
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  db = client.db(process.env.MONGODB_DB || undefined);
  return db;
}

module.exports = { getDb };
`
  );

  fs.ensureDirSync(path.join(projectPath, 'models'));
  fs.writeFileSync(
    path.join(projectPath, 'models', 'README.md'),
    `# Models (MongoDB Atlas)

Use \`lib/db.js\`:

\`\`\`js
const { getDb } = require('../lib/db');
const db = await getDb();
await db.collection('items').find({}).toArray();
\`\`\`
`
  );

  const routeDir = path.join(projectPath, 'api', 'health', 'db', 'get');
  fs.ensureDirSync(routeDir);
  fs.writeFileSync(
    path.join(routeDir, 'index.js'),
    `const { getDb } = require('../../../../lib/db');

module.exports = async () => {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true, provider: 'mongodb-atlas' }),
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
    dependencies: { mongodb: '^6.10.0' },
  };
}

module.exports = { id, envKeys, doctor, scaffold };
