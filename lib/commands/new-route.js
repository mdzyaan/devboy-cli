const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { readConfig, writeConfig } = require('../config');

async function newRoute() {
  const config = readConfig();
  let continueCreating = true;

  while (continueCreating) {
    const routeAnswers = await inquirer.prompt([
      {
        name: 'path',
        message: 'Enter the route path (e.g., /users):',
        validate: (input) => {
          if (!input.trim()) return 'Route path cannot be empty.';
          if (!input.startsWith('/')) return 'Route path must start with "/".';
          return true;
        },
      },
      {
        name: 'method',
        type: 'list',
        message: 'Select the HTTP method:',
        choices: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      },
    ]);

    const exists = (config.api.routes || []).some(
      (r) => r.path === routeAnswers.path && r.method === routeAnswers.method
    );
    if (exists) {
      console.log(chalk.red(`Route ${routeAnswers.method} ${routeAnswers.path} already exists.`));
      const { retry } = await inquirer.prompt([
        { type: 'confirm', name: 'retry', message: 'Try a different route?', default: true },
      ]);
      if (!retry) break;
      continue;
    }

    const routePath = routeAnswers.path.replace(/^\//, '');
    const handler = `api/${routePath}/${routeAnswers.method.toLowerCase()}/index.js`;
    const fullPath = path.join(process.cwd(), handler);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(
      fullPath,
      `const { db, auth } = require('devboy');

module.exports = async (params, context) => {
  // const user = await auth.requireAuth(context);
  // if (user.error) return user.error;
  // const rows = await db.table('items').find();
  return {
    message: 'Hello from ${routeAnswers.path}',
    params,
    method: context.method,
  };
};
`
    );

    config.api.routes.push({
      path: routeAnswers.path,
      method: routeAnswers.method,
      handler,
    });
    writeConfig(config);
    console.log(chalk.green(`Created ${routeAnswers.method} ${routeAnswers.path} -> ${handler}`));

    const { createAnother } = await inquirer.prompt([
      { type: 'confirm', name: 'createAnother', message: 'Create another route?', default: false },
    ]);
    continueCreating = createAnother;
  }
}

module.exports = { newRoute };
