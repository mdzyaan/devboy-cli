const express = require('express');
const chalk = require('chalk');
const { readConfig, allRoutes } = require('../config');
const { loadEnv } = require('../env');
const { expressToEvent, createContext } = require('./event');
const { sendResult } = require('./respond');
const { invokeRoute } = require('./router');

function startServer(options = {}) {
  const cwd = options.cwd || process.cwd();
  const port = options.port || process.env.PORT || 3000;
  loadEnv(cwd, { override: true });

  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/__devboy/health', (_req, res) => {
    loadEnv(cwd, { override: true });
    const config = readConfig(cwd);
    res.json({
      ok: true,
      compute: config.compute.provider,
      auth: config.auth.provider,
      db: config.db.provider,
      cron: config.cron.provider,
      routes: allRoutes(config).length,
    });
  });

  app.all('*', async (req, res) => {
    try {
      loadEnv(cwd, { override: true });
      const config = readConfig(cwd);
      const event = expressToEvent(req);
      const context = createContext();
      const result = await invokeRoute(config, cwd, event, context);
      sendResult(res, result);
    } catch (error) {
      console.error(chalk.red(`Error ${req.method} ${req.path}:`), error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
      }
    }
  });

  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      const config = readConfig(cwd);
      console.log(chalk.green(`Devboy API running on http://localhost:${port}`));
      console.log(chalk.blue('Routes:'));
      const routes = allRoutes(config);
      if (!routes.length) console.log(chalk.gray('  (none — run `devboy new:route` or open Studio)'));
      routes.forEach((route) => {
        console.log(chalk.gray(`  ${route.method} ${route.path} -> ${route.handler}`));
      });
      console.log(chalk.gray('Hot reload: config, .env, and project handlers refresh each request.'));
      resolve(server);
    });
  });
}

module.exports = { startServer };
