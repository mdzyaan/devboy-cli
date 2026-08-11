const fs = require('fs-extra');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

// Scoped (@scope/name) or unscoped npm package names only
const PACKAGE_NAME_RE = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i;
const VERSION_RE = /^[a-zA-Z0-9._+\-<>|=~\s^]+$/;

function validatePackageName(name) {
  if (!name || typeof name !== 'string') return 'Package name is required';
  const trimmed = name.trim();
  if (trimmed.length > 214) return 'Package name too long';
  if (/[;|&`$\\]/.test(trimmed)) return 'Invalid characters in package name';
  if (!PACKAGE_NAME_RE.test(trimmed)) return 'Invalid npm package name';
  return null;
}

function validateVersion(version) {
  if (version == null || version === '') return null;
  if (typeof version !== 'string') return 'Invalid version';
  const trimmed = version.trim();
  if (trimmed.length > 64) return 'Version too long';
  if (/[;|&`$\\]/.test(trimmed)) return 'Invalid characters in version';
  if (!VERSION_RE.test(trimmed)) return 'Invalid version';
  return null;
}

function readPackageJson(projectCwd) {
  const pkgPath = path.join(projectCwd, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return { name: path.basename(projectCwd), version: '1.0.0', dependencies: {}, devDependencies: {} };
  }
  return fs.readJsonSync(pkgPath);
}

function listDependencies(projectCwd) {
  const pkg = readPackageJson(projectCwd);
  return {
    dependencies: pkg.dependencies || {},
    devDependencies: pkg.devDependencies || {},
  };
}

async function searchNpm(query, size = 20) {
  const q = String(query || '').trim();
  if (!q) return { objects: [] };
  const url = new URL('https://registry.npmjs.org/-/v1/search');
  url.searchParams.set('text', q);
  url.searchParams.set('size', String(Math.min(Math.max(size, 1), 50)));
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`npm search failed (${res.status})`);
  }
  const data = await res.json();
  const objects = (data.objects || []).map((obj) => {
    const p = obj.package || {};
    return {
      name: p.name,
      description: p.description || '',
      version: p.version || 'latest',
      links: p.links || {},
    };
  });
  return { objects };
}

async function runNpm(projectCwd, args) {
  const { stdout, stderr } = await execFileAsync('npm', args, {
    cwd: projectCwd,
    env: { ...process.env, npm_config_yes: 'true' },
    maxBuffer: 10 * 1024 * 1024,
    timeout: 5 * 60 * 1000,
  });
  return `${stdout || ''}${stderr || ''}`.trim();
}

async function installPackage(projectCwd, name, version) {
  const nameErr = validatePackageName(name);
  if (nameErr) throw new Error(nameErr);
  const verErr = validateVersion(version);
  if (verErr) throw new Error(verErr);

  const spec = version && String(version).trim() ? `${name.trim()}@${String(version).trim()}` : name.trim();
  const log = await runNpm(projectCwd, ['install', spec, '--save']);
  return {
    log,
    ...listDependencies(projectCwd),
  };
}

async function removePackage(projectCwd, name) {
  const nameErr = validatePackageName(name);
  if (nameErr) throw new Error(nameErr);
  const log = await runNpm(projectCwd, ['uninstall', name.trim()]);
  return {
    log,
    ...listDependencies(projectCwd),
  };
}

module.exports = {
  validatePackageName,
  validateVersion,
  listDependencies,
  searchNpm,
  installPackage,
  removePackage,
};
