const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { readConfig, writeConfig } = require('../config');
const { getCronIntegration } = require('../integrations/cron');

async function newJob() {
  const config = readConfig();
  if (config.cron.provider === 'none') {
    console.log(chalk.yellow('cron.provider is "none". Set cron to qstash in Studio or config first.'));
  }

  const answers = await inquirer.prompt([
    {
      name: 'name',
      message: 'Job name (slug):',
      validate: (v) => (/^[a-z0-9-_]+$/i.test(v) ? true : 'Use letters, numbers, - or _'),
    },
    {
      name: 'schedule',
      message: 'Cron expression:',
      default: '0 * * * *',
    },
  ]);

  const routePath = `/jobs/${answers.name}`;
  const handler = `api/jobs/${answers.name}/post/index.js`;
  const full = path.join(process.cwd(), handler);
  await fs.ensureDir(path.dirname(full));

  const body =
    config.cron.provider === 'qstash'
      ? `const { verifyQStash } = require('../../../lib/qstash');

module.exports = async (event) => {
  const verified = await verifyQStash(event);
  if (!verified.ok) return verified.error;
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ok: true, job: '${answers.name}', at: new Date().toISOString() }),
  };
};
`
      : `module.exports = async () => {
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ok: true, job: '${answers.name}', at: new Date().toISOString() }),
  };
};
`;

  await fs.writeFile(full, body);

  if (!config.api.routes.some((r) => r.path === routePath && r.method === 'POST')) {
    config.api.routes.push({ path: routePath, method: 'POST', handler });
  }
  config.jobs = config.jobs || [];
  config.jobs.push({
    name: answers.name,
    path: routePath,
    method: 'POST',
    schedule: answers.schedule,
    handler,
  });
  writeConfig(config);

  const cron = getCronIntegration(config.cron.provider);
  if (cron && cron.registerJob) {
    const result = await cron.registerJob(config.jobs[config.jobs.length - 1], process.env);
    console.log(chalk.blue(result.message));
  }

  console.log(chalk.green(`Job ${answers.name} created at POST ${routePath}`));
}

module.exports = { newJob };
