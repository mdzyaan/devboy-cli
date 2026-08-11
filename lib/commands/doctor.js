const chalk = require('chalk');
const { readConfig } = require('../config');
const { loadEnv, readEnvFile } = require('../env');
const { getComputeProvider } = require('../providers');
const { getAuthIntegration } = require('../integrations/auth');
const { getDbIntegration } = require('../integrations/db');
const { getCronIntegration } = require('../integrations/cron');

async function doctor() {
  const cwd = process.cwd();
  loadEnv(cwd);
  const config = readConfig(cwd);
  const env = { ...readEnvFile(cwd), ...process.env };

  console.log(chalk.blue('Devboy doctor'));
  console.log(chalk.gray(`compute=${config.compute.provider} auth=${config.auth.provider} db=${config.db.provider} cron=${config.cron.provider}`));

  const compute = getComputeProvider(config.compute.provider);
  const computeResult = compute
    ? await compute.validateCredentials(config.compute.region)
    : { ok: false, message: 'Unknown compute provider' };
  printCheck('compute', computeResult);

  const auth = getAuthIntegration(config.auth.provider);
  printCheck('auth', auth ? await auth.doctor(env) : { ok: false, message: 'Unknown auth provider' });

  const db = getDbIntegration(config.db.provider);
  printCheck('db', db ? await db.doctor(env) : { ok: false, message: 'Unknown db provider' });

  const cron = getCronIntegration(config.cron.provider);
  printCheck('cron', cron ? await cron.doctor(env) : { ok: false, message: 'Unknown cron provider' });
}

function printCheck(name, result) {
  if (result.ok) console.log(chalk.green(`✓ ${name}: ${result.message}`));
  else console.log(chalk.red(`✗ ${name}: ${result.message}`));
}

module.exports = { doctor };
