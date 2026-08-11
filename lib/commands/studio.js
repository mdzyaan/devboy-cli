const path = require('path');
const chalk = require('chalk');
const { execSync } = require('child_process');
const fs = require('fs-extra');
const express = require('express');
const { createStudioApi } = require('../studio-api');

async function studio() {
  const projectCwd = process.cwd();
  const studioDir = path.join(__dirname, '..', '..', 'studio');
  const port = Number(process.env.DEVBOY_STUDIO_PORT || 4100);

  if (!fs.existsSync(path.join(studioDir, 'package.json'))) {
    console.log(chalk.red('Studio app missing. Expected studio/ in the devboy-cli package.'));
    process.exitCode = 1;
    return;
  }

  if (!fs.existsSync(path.join(studioDir, 'node_modules', 'next'))) {
    console.log(chalk.yellow('Installing Studio dependencies (first run)...'));
    execSync('npm install', { cwd: studioDir, stdio: 'inherit' });
  }

  let next;
  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    next = require(path.join(studioDir, 'node_modules', 'next'));
  } catch {
    console.log(chalk.red('Failed to load Next.js from studio/node_modules'));
    process.exitCode = 1;
    return;
  }

  const app = next({
    dev: true,
    dir: studioDir,
    conf: { distDir: '.next' },
  });
  const handle = app.getRequestHandler();
  await app.prepare();

  const server = express();
  server.use('/api', createStudioApi(projectCwd));
  server.all('*', (req, res) => handle(req, res));

  server.listen(port, () => {
    console.log(chalk.blue(`Devboy Studio for ${projectCwd}`));
    console.log(chalk.green(`http://localhost:${port}`));
    console.log(chalk.gray('Local-only config dashboard — not deployed with your API.'));
  });
}

module.exports = { studio };
