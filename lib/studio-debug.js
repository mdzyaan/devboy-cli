const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

function debugFilePath(cwd) {
  return path.join(cwd, '.devboy', 'debug.json');
}

function emptyStore() {
  return { requests: [] };
}

function readDebugStore(cwd) {
  const file = debugFilePath(cwd);
  if (!fs.existsSync(file)) {
    return emptyStore();
  }
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const requests = Array.isArray(raw.requests) ? raw.requests : [];
    return { requests };
  } catch {
    return emptyStore();
  }
}

function writeDebugStore(cwd, store) {
  const file = debugFilePath(cwd);
  fs.ensureDirSync(path.dirname(file));
  const requests = Array.isArray(store && store.requests) ? store.requests : [];
  const normalized = requests.map((item) => ({
    id: item.id || crypto.randomUUID(),
    name: String(item.name || 'Untitled'),
    method: String(item.method || 'GET').toUpperCase(),
    path: String(item.path || '/'),
    params: item.params && typeof item.params === 'object' ? item.params : {},
    headers: item.headers && typeof item.headers === 'object' ? item.headers : {},
    exampleResponse: item.exampleResponse || null,
  }));
  const payload = { requests: normalized };
  fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

module.exports = {
  debugFilePath,
  readDebugStore,
  writeDebugStore,
};
