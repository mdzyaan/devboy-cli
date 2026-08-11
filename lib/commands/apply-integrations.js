const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const { readConfig, writeConfig } = require('../config');
const { getAuthIntegration } = require('../integrations/auth');
const { getDbIntegration } = require('../integrations/db');
const { getCronIntegration } = require('../integrations/cron');

function mergeDeps(projectPath, deps) {
  const pkgPath = path.join(projectPath, 'package.json');
  const pkg = fs.readJsonSync(pkgPath);
  pkg.dependencies = { ...(pkg.dependencies || {}), ...deps };
  fs.writeJsonSync(pkgPath, pkg, { spaces: 2 });
}

function upsertRoutes(config, routes) {
  for (const route of routes || []) {
    const exists = config.api.routes.some((r) => r.path === route.path && r.method === route.method);
    if (!exists) config.api.routes.push(route);
  }
}

async function applyIntegrations(options = {}) {
  const cwd = options.cwd || process.cwd();
  const config = readConfig(cwd);
  const deps = {};

  if (options.auth !== undefined) config.auth.provider = options.auth;
  if (options.db !== undefined) config.db.provider = options.db;
  if (options.cron !== undefined) config.cron.provider = options.cron;
  if (options.compute !== undefined) config.compute.provider = options.compute;
  if (options.region !== undefined) config.compute.region = options.region;

  const auth = getAuthIntegration(config.auth.provider);
  if (auth) {
    const result = auth.scaffold(cwd);
    upsertRoutes(config, result.routes);
    Object.assign(deps, result.dependencies || {});
  }

  const db = getDbIntegration(config.db.provider);
  if (db) {
    const result = db.scaffold(cwd);
    upsertRoutes(config, result.routes);
    Object.assign(deps, result.dependencies || {});
  }

  const cron = getCronIntegration(config.cron.provider);
  if (cron) {
    const result = cron.scaffold(cwd);
    upsertRoutes(config, result.routes);
    if (result.jobs && result.jobs.length) {
      config.jobs = config.jobs || [];
      for (const job of result.jobs) {
        if (!config.jobs.some((j) => j.name === job.name)) config.jobs.push(job);
      }
    }
    Object.assign(deps, result.dependencies || {});
  }

  writeConfig(config, cwd);
  if (Object.keys(deps).length) {
    mergeDeps(cwd, deps);
    if (!options.skipInstall) {
      console.log(chalk.yellow('Installing integration dependencies...'));
      execSync('npm install', { cwd, stdio: 'inherit' });
    }
  }
  console.log(chalk.green('Integrations applied and config updated.'));
  return config;
}

module.exports = { applyIntegrations };
