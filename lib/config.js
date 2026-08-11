const fs = require('fs-extra');
const path = require('path');

const DEFAULT_CONFIG = {
  compute: { provider: 'aws', region: 'us-east-1' },
  auth: { provider: 'none' },
  db: { provider: 'none' },
  cron: { provider: 'none' },
  api: {
    handler: 'index.js',
    routes: [],
  },
  jobs: [],
};

function projectRoot(cwd = process.cwd()) {
  return cwd;
}

function configPath(cwd = process.cwd()) {
  return path.join(projectRoot(cwd), 'devboy.config.js');
}

function normalizeConfig(raw = {}) {
  const api = raw.api || { handler: 'index.js', routes: [] };
  if (!Array.isArray(api.routes)) api.routes = [];

  // Legacy: named functions with .routes besides api
  const legacyFunctions = {};
  for (const [key, value] of Object.entries(raw)) {
    if (['compute', 'auth', 'db', 'cron', 'api', 'jobs'].includes(key)) continue;
    if (value && Array.isArray(value.routes)) {
      legacyFunctions[key] = {
        handler: value.handler || `${key}.js`,
        routes: value.routes,
      };
    }
  }

  return {
    compute: {
      provider: (raw.compute && raw.compute.provider) || 'aws',
      region: (raw.compute && raw.compute.region) || 'us-east-1',
      functionName: (raw.compute && raw.compute.functionName) || null,
      stackName: (raw.compute && raw.compute.stackName) || null,
    },
    auth: { provider: (raw.auth && raw.auth.provider) || 'none' },
    db: { provider: (raw.db && raw.db.provider) || 'none' },
    cron: { provider: (raw.cron && raw.cron.provider) || 'none' },
    api: {
      handler: api.handler || 'index.js',
      routes: api.routes,
    },
    jobs: Array.isArray(raw.jobs) ? raw.jobs : [],
    functions: legacyFunctions,
  };
}

function readConfig(cwd = process.cwd()) {
  const file = configPath(cwd);
  if (!fs.existsSync(file)) {
    return normalizeConfig(DEFAULT_CONFIG);
  }
  delete require.cache[require.resolve(file)];
  return normalizeConfig(require(file));
}

function toWritableConfig(config) {
  const out = {
    compute: {
      provider: config.compute.provider,
      region: config.compute.region,
    },
    auth: { provider: config.auth.provider },
    db: { provider: config.db.provider },
    cron: { provider: config.cron.provider },
    api: {
      handler: config.api.handler,
      routes: config.api.routes,
    },
    jobs: config.jobs || [],
  };
  if (config.compute.functionName) out.compute.functionName = config.compute.functionName;
  if (config.compute.stackName) out.compute.stackName = config.compute.stackName;
  if (config.functions) {
    for (const [name, fn] of Object.entries(config.functions)) {
      out[name] = fn;
    }
  }
  return out;
}

function writeConfig(config, cwd = process.cwd()) {
  const writable = toWritableConfig(normalizeConfig(config));
  const body = `module.exports = ${JSON.stringify(writable, null, 2)};\n`;
  fs.writeFileSync(configPath(cwd), body);
  return writable;
}

function allRoutes(config) {
  const routes = [...(config.api.routes || [])];
  if (config.functions) {
    for (const fn of Object.values(config.functions)) {
      routes.push(...(fn.routes || []));
    }
  }
  return routes;
}

function validateConfig(config) {
  const errors = [];
  const providers = ['aws', 'azure', 'gcp', 'oci'];
  if (!providers.includes(config.compute.provider)) {
    errors.push(`Unknown compute provider: ${config.compute.provider}`);
  }
  for (const route of allRoutes(config)) {
    if (!route.path || !route.method || !route.handler) {
      errors.push(`Invalid route entry: ${JSON.stringify(route)}`);
    }
  }
  return errors;
}

module.exports = {
  DEFAULT_CONFIG,
  configPath,
  readConfig,
  writeConfig,
  normalizeConfig,
  allRoutes,
  validateConfig,
};
