const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { loadCatalog } = require('./catalog');
const { readConfig, writeConfig, allRoutes } = require('./config');
const { loadEnv, readEnvFile, writeEnvLocal } = require('./env');
const { getComputeProvider } = require('./providers');
const { getAuthIntegration } = require('./integrations/auth');
const { getDbIntegration } = require('./integrations/db');
const { getCronIntegration } = require('./integrations/cron');
const { applyIntegrations } = require('./commands/apply-integrations');
const { buildTree, readProjectFile, writeProjectFile } = require('./studio-files');
const {
  listDependencies,
  searchNpm,
  installPackage,
  removePackage,
} = require('./studio-packages');
const { readDebugStore, writeDebugStore } = require('./studio-debug');
const { debugToEvent, createContext } = require('./runtime/event');
const { invokeRoute } = require('./runtime/router');
const { withCapturedConsole } = require('./capture-console');

function createStudioApi(projectCwd) {
  const router = express.Router();
  router.use(express.json({ limit: '2mb' }));

  router.get('/catalog', (_req, res) => {
    res.json(loadCatalog());
  });

  router.get('/config', (_req, res) => {
    res.json({
      cwd: projectCwd,
      config: readConfig(projectCwd),
      envPresent: Object.keys(readEnvFile(projectCwd)),
    });
  });

  router.put('/config', (req, res) => {
    const body = req.body || {};
    const current = readConfig(projectCwd);
    const next = {
      ...current,
      compute: { ...current.compute, ...(body.compute || {}) },
      auth: { ...current.auth, ...(body.auth || {}) },
      db: { ...current.db, ...(body.db || {}) },
      cron: { ...current.cron, ...(body.cron || {}) },
    };
    writeConfig(next, projectCwd);
    res.json({ ok: true, config: readConfig(projectCwd) });
  });

  router.post('/env', (req, res) => {
    const vars = (req.body && req.body.vars) || {};
    const merged = writeEnvLocal(vars, projectCwd);
    res.json({ ok: true, keys: Object.keys(merged) });
  });

  router.post('/doctor', async (_req, res) => {
    loadEnv(projectCwd);
    const config = readConfig(projectCwd);
    const env = { ...readEnvFile(projectCwd), ...process.env };
    const compute = getComputeProvider(config.compute.provider);
    const auth = getAuthIntegration(config.auth.provider);
    const db = getDbIntegration(config.db.provider);
    const cron = getCronIntegration(config.cron.provider);
    res.json({
      ok: true,
      results: {
        compute: compute
          ? await compute.validateCredentials(config.compute.region)
          : { ok: false, message: 'Unknown compute provider' },
        auth: auth ? await auth.doctor(env) : { ok: false, message: 'Unknown auth' },
        db: db ? await db.doctor(env) : { ok: false, message: 'Unknown db' },
        cron: cron ? await cron.doctor(env) : { ok: false, message: 'Unknown cron' },
      },
    });
  });

  router.post('/apply', async (req, res) => {
    try {
      const body = req.body || {};
      const config = await applyIntegrations({
        cwd: projectCwd,
        auth: body.auth,
        db: body.db,
        cron: body.cron,
        compute: body.compute,
        region: body.region,
        skipInstall: Boolean(body.skipInstall),
      });
      res.json({ ok: true, config });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/deploy', async (_req, res) => {
    const config = readConfig(projectCwd);
    const provider = getComputeProvider(config.compute.provider);
    if (!provider) {
      res.status(400).json({ ok: false, error: 'Unknown compute provider' });
      return;
    }
    const result = await provider.deploy({ cwd: projectCwd, region: config.compute.region });
    res.status(result.ok ? 200 : 500).json(result);
  });

  router.get('/routes', (_req, res) => {
    const config = readConfig(projectCwd);
    const routes = allRoutes(config).map((r) => ({
      path: r.path,
      method: r.method,
      handler: r.handler,
      exists: fs.existsSync(path.join(projectCwd, r.handler)),
    }));
    const jobs = (config.jobs || []).map((j) => ({
      name: j.name,
      path: j.path,
      method: j.method || 'POST',
      schedule: j.schedule,
      handler: j.handler,
      exists: j.handler ? fs.existsSync(path.join(projectCwd, j.handler)) : false,
    }));
    res.json({ routes, jobs });
  });

  router.post('/routes', async (req, res) => {
    try {
      const body = req.body || {};
      const routePath = String(body.path || '').trim();
      const method = String(body.method || 'GET').toUpperCase();
      if (!routePath.startsWith('/')) {
        res.status(400).json({ ok: false, error: 'path must start with /' });
        return;
      }
      if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        res.status(400).json({ ok: false, error: 'invalid method' });
        return;
      }

      const config = readConfig(projectCwd);
      const exists = (config.api.routes || []).some(
        (r) => r.path === routePath && r.method === method
      );
      if (exists) {
        res.status(409).json({ ok: false, error: 'Route already exists' });
        return;
      }

      const handler = `api/${routePath.replace(/^\//, '')}/${method.toLowerCase()}/index.js`;
      const fullPath = path.join(projectCwd, handler);
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(
        fullPath,
        `const { db, auth } = require('devboy');

module.exports = async (params, context) => {
  // const user = await auth.requireAuth(context);
  // if (user.error) return user.error;
  // const rows = await db.table('items').find();
  return {
    message: 'Hello from ${routePath}',
    params,
    method: context.method,
  };
};
`
      );

      config.api.routes.push({ path: routePath, method, handler });
      writeConfig(config, projectCwd);
      res.json({
        ok: true,
        route: { path: routePath, method, handler, exists: true },
        config: readConfig(projectCwd),
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/files/tree', (_req, res) => {
    try {
      res.json(buildTree(projectCwd));
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/files/content', (req, res) => {
    try {
      const filePath = req.query.path;
      const file = readProjectFile(projectCwd, filePath);
      res.json({ ok: true, ...file });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.put('/files/content', (req, res) => {
    try {
      const body = req.body || {};
      const result = writeProjectFile(projectCwd, body.path, body.content);
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.get('/packages', (_req, res) => {
    try {
      res.json({ ok: true, ...listDependencies(projectCwd) });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/packages/search', async (req, res) => {
    try {
      const q = req.query.q || '';
      const result = await searchNpm(q, 20);
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(502).json({ ok: false, error: error.message });
    }
  });

  router.post('/packages/install', async (req, res) => {
    try {
      const body = req.body || {};
      const result = await installPackage(projectCwd, body.name, body.version);
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.post('/packages/remove', async (req, res) => {
    try {
      const body = req.body || {};
      const result = await removePackage(projectCwd, body.name);
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.get('/debug/requests', (_req, res) => {
    try {
      res.json({ ok: true, ...readDebugStore(projectCwd) });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.put('/debug/requests', (req, res) => {
    try {
      const body = req.body || {};
      const saved = writeDebugStore(projectCwd, { requests: body.requests || [] });
      res.json({ ok: true, ...saved });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.post('/debug/invoke', async (req, res) => {
    const started = Date.now();
    try {
      const body = req.body || {};
      const method = String(body.method || 'GET').toUpperCase();
      const routePath = String(body.path || '').trim();
      if (!routePath.startsWith('/')) {
        res.status(400).json({ ok: false, error: 'path must start with /' });
        return;
      }

      loadEnv(projectCwd, { override: true });
      const config = readConfig(projectCwd);
      const event = debugToEvent({
        method,
        path: routePath,
        params: body.params,
        headers: body.headers,
      });

      const { result, logs, error } = await withCapturedConsole(() =>
        invokeRoute(config, projectCwd, event, createContext())
      );
      const durationMs = Date.now() - started;

      if (error) {
        res.status(500).json({
          ok: false,
          error: error.message,
          durationMs,
          logs,
        });
        return;
      }

      const rawBody = result.body == null ? '' : String(result.body);
      const bytes = Buffer.byteLength(rawBody, 'utf8');

      let parsedBody = rawBody;
      const contentType = String(
        (result.headers && (result.headers['content-type'] || result.headers['Content-Type'])) || ''
      ).toLowerCase();
      if (contentType.includes('application/json') || rawBody.trim().startsWith('{') || rawBody.trim().startsWith('[')) {
        try {
          parsedBody = JSON.parse(rawBody);
        } catch {
          parsedBody = rawBody;
        }
      }

      res.json({
        ok: true,
        statusCode: result.statusCode,
        headers: result.headers || {},
        body: parsedBody,
        durationMs,
        bytes,
        logs,
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error.message,
        durationMs: Date.now() - started,
        logs: [],
      });
    }
  });

  return router;
}

module.exports = { createStudioApi };
