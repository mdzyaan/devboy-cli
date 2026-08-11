const chalk = require('chalk');
const { readConfig, validateConfig } = require('../config');
const { getComputeProvider } = require('../providers');

async function deploy() {
  const config = readConfig();
  const errors = validateConfig(config);
  if (errors.length) {
    console.log(chalk.red('Invalid config:'));
    errors.forEach((e) => console.log(chalk.red(`- ${e}`)));
    process.exitCode = 1;
    return;
  }

  const provider = getComputeProvider(config.compute.provider);
  if (!provider) {
    console.log(chalk.red(`Unknown compute provider: ${config.compute.provider}`));
    process.exitCode = 1;
    return;
  }

  console.log(chalk.yellow(`Deploying with ${config.compute.provider} (${config.compute.region})...`));
  const result = await provider.deploy({ cwd: process.cwd(), region: config.compute.region });
  if (!result.ok) {
    console.log(chalk.red('Deploy failed:'));
    console.log(chalk.red(result.error));
    process.exitCode = 1;
    return;
  }

  console.log(chalk.green('Deploy succeeded'));
  console.log(chalk.blue(`Public API URL: ${result.url}`));
  console.log(chalk.gray(`Function: ${result.functionName}`));
  console.log(chalk.gray('Consumers can call this URL from any app/service.'));
  if (result.routes && result.routes.length) {
    console.log(chalk.blue('Routes:'));
    result.routes.forEach((r) => console.log(chalk.gray(`  ${r.method} ${r.path}`)));
  }
}

module.exports = { deploy };
