const fs = require('fs-extra');
const path = require('path');

const id = 'qstash';
const envKeys = ['QSTASH_TOKEN', 'QSTASH_CURRENT_SIGNING_KEY', 'QSTASH_NEXT_SIGNING_KEY'];

async function doctor(env = process.env) {
  if (!env.QSTASH_TOKEN) {
    return { ok: false, message: 'QSTASH_TOKEN is missing' };
  }
  return { ok: true, message: 'QStash token present (schedules managed via Upstash dashboard or API)' };
}

function scaffold(projectPath) {
  const libDir = path.join(projectPath, 'lib');
  fs.ensureDirSync(libDir);
  fs.writeFileSync(
    path.join(libDir, 'qstash.js'),
    `const { Receiver } = require('@upstash/qstash');

function getReceiver() {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (!currentSigningKey || !nextSigningKey) {
    throw new Error('QStash signing keys are not set');
  }
  return new Receiver({ currentSigningKey, nextSigningKey });
}

async function verifyQStash(event) {
  const signature =
    (event.headers && (event.headers['upstash-signature'] || event.headers['Upstash-Signature'])) || '';
  const body = event.body || '';
  try {
    await getReceiver().verify({ signature, body });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: {
        statusCode: 401,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid QStash signature', message: error.message }),
      },
    };
  }
}

module.exports = { verifyQStash };
`
  );

  const jobDir = path.join(projectPath, 'api', 'jobs', 'heartbeat', 'post');
  fs.ensureDirSync(jobDir);
  fs.writeFileSync(
    path.join(jobDir, 'index.js'),
    `const { verifyQStash } = require('../../../../lib/qstash');

module.exports = async (event) => {
  const verified = await verifyQStash(event);
  if (!verified.ok) return verified.error;
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ok: true, job: 'heartbeat', at: new Date().toISOString() }),
  };
};
`
  );

  return {
    routes: [{ path: '/jobs/heartbeat', method: 'POST', handler: 'api/jobs/heartbeat/post/index.js' }],
    jobs: [
      {
        name: 'heartbeat',
        path: '/jobs/heartbeat',
        method: 'POST',
        schedule: '0 * * * *',
        handler: 'api/jobs/heartbeat/post/index.js',
      },
    ],
    dependencies: { '@upstash/qstash': '^2.7.0' },
  };
}

async function registerJob(_job, _env) {
  // Schedules are created in Upstash dashboard pointing at the deployed URL + path.
  return {
    ok: true,
    message:
      'Add a QStash schedule in the Upstash console targeting POST {API_URL}/jobs/<name> with the cron expression from config.jobs',
  };
}

module.exports = { id, envKeys, doctor, scaffold, registerJob };
