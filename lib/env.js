const fs = require('fs-extra');
const path = require('path');

function parseEnvFile(content) {
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function loadEnv(cwd = process.cwd(), options = {}) {
  const override = Boolean(options.override);
  const files = ['.env.local', '.env'];
  const merged = {};
  for (const file of files) {
    const full = path.join(cwd, file);
    if (fs.existsSync(full)) {
      Object.assign(merged, parseEnvFile(fs.readFileSync(full, 'utf8')));
    }
  }
  for (const [key, value] of Object.entries(merged)) {
    if (override || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
  return merged;
}

function readEnvFile(cwd = process.cwd()) {
  const local = path.join(cwd, '.env.local');
  const fallback = path.join(cwd, '.env');
  const file = fs.existsSync(local) ? local : fallback;
  if (!fs.existsSync(file)) return {};
  return parseEnvFile(fs.readFileSync(file, 'utf8'));
}

function writeEnvLocal(vars, cwd = process.cwd()) {
  const file = path.join(cwd, '.env.local');
  const existing = fs.existsSync(file) ? parseEnvFile(fs.readFileSync(file, 'utf8')) : {};
  const merged = { ...existing, ...vars };
  const body = Object.entries(merged)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n') + '\n';
  fs.writeFileSync(file, body);
  return merged;
}

function pickEnv(keys, source = process.env) {
  const out = {};
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== '') out[key] = source[key];
  }
  return out;
}

module.exports = {
  loadEnv,
  readEnvFile,
  writeEnvLocal,
  pickEnv,
  parseEnvFile,
};
