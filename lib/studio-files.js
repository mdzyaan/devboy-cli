const fs = require('fs-extra');
const path = require('path');

const MAX_FILE_BYTES = 1024 * 1024;
const BLOCKED_NAMES = new Set([
  'node_modules',
  '.git',
  '.next',
  'devboy-state.json',
  '.DS_Store',
]);
const BLOCKED_PREFIXES = ['.env'];
const ROOT_FILES = new Set([
  'devboy.config.js',
  'index.js',
  'package.json',
  'README.md',
  'lambda.js',
]);
const ALLOWED_TOP_DIRS = new Set(['api', 'lib', 'models']);

function isBlockedName(name) {
  if (BLOCKED_NAMES.has(name)) return true;
  if (BLOCKED_PREFIXES.some((p) => name === p || name.startsWith(`${p}.`) || name.startsWith(`${p}-`))) {
    return true;
  }
  if (name.startsWith('.env')) return true;
  return false;
}

function resolveSafePath(projectCwd, relativePath) {
  if (!relativePath || typeof relativePath !== 'string') {
    throw new Error('path is required');
  }
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (normalized.includes('\0')) throw new Error('Invalid path');
  const segments = normalized.split('/').filter(Boolean);
  if (segments.some((s) => s === '..')) throw new Error('Path traversal is not allowed');
  if (segments.some((s) => isBlockedName(s))) throw new Error('Path is blocked');

  const abs = path.resolve(projectCwd, ...segments);
  const root = path.resolve(projectCwd);
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw new Error('Path escapes project root');
  }

  // Only allow known top-level dirs or allowlisted root files
  if (segments.length === 0) throw new Error('Invalid path');
  const top = segments[0];
  if (segments.length === 1) {
    if (!ROOT_FILES.has(top) && !ALLOWED_TOP_DIRS.has(top)) {
      // allow other non-dot files at root for editing (e.g. custom helpers) except blocked
      if (top.startsWith('.')) throw new Error('Hidden root files are blocked');
    }
  } else if (!ALLOWED_TOP_DIRS.has(top)) {
    throw new Error(`Directory "${top}" is not editable in Studio`);
  }

  return { abs, rel: segments.join('/') };
}

function buildTree(projectCwd) {
  const root = path.resolve(projectCwd);

  function walk(absDir, relDir) {
    const entries = [];
    if (!fs.existsSync(absDir)) return entries;
    const names = fs.readdirSync(absDir).sort((a, b) => a.localeCompare(b));
    for (const name of names) {
      if (isBlockedName(name)) continue;
      const abs = path.join(absDir, name);
      const rel = relDir ? `${relDir}/${name}` : name;
      let stat;
      try {
        stat = fs.statSync(abs);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        if (!relDir && !ALLOWED_TOP_DIRS.has(name)) continue;
        entries.push({
          name,
          path: rel,
          type: 'directory',
          children: walk(abs, rel),
        });
      } else if (stat.isFile()) {
        if (!relDir && !ROOT_FILES.has(name) && name.startsWith('.')) continue;
        if (!relDir && !ROOT_FILES.has(name)) {
          // still show other root js/md/json for convenience
          if (!/\.(js|json|md|ts|mjs|cjs)$/i.test(name)) continue;
        }
        entries.push({
          name,
          path: rel,
          type: 'file',
          size: stat.size,
        });
      }
    }
    return entries;
  }

  return {
    root: path.basename(root),
    cwd: root,
    children: walk(root, ''),
  };
}

function readProjectFile(projectCwd, relativePath) {
  const { abs, rel } = resolveSafePath(projectCwd, relativePath);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    throw new Error('File not found');
  }
  const stat = fs.statSync(abs);
  if (stat.size > MAX_FILE_BYTES) {
    throw new Error(`File exceeds ${MAX_FILE_BYTES} byte limit`);
  }
  const content = fs.readFileSync(abs, 'utf8');
  return { path: rel, content, size: stat.size };
}

function writeProjectFile(projectCwd, relativePath, content) {
  if (typeof content !== 'string') throw new Error('content must be a string');
  if (Buffer.byteLength(content, 'utf8') > MAX_FILE_BYTES) {
    throw new Error(`Content exceeds ${MAX_FILE_BYTES} byte limit`);
  }
  const { abs, rel } = resolveSafePath(projectCwd, relativePath);
  fs.ensureDirSync(path.dirname(abs));
  fs.writeFileSync(abs, content, 'utf8');
  return { path: rel, size: Buffer.byteLength(content, 'utf8') };
}

module.exports = {
  MAX_FILE_BYTES,
  buildTree,
  readProjectFile,
  writeProjectFile,
  resolveSafePath,
};
