const path = require('path');

function cliRoot() {
  return process.env.DEVBOY_CLI_ROOT || path.join(__dirname, '..', '..');
}

function projectCwd() {
  return process.env.DEVBOY_PROJECT_CWD || process.cwd();
}

function loadCli(modulePath) {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  return require(path.join(cliRoot(), modulePath));
}

module.exports = { cliRoot, projectCwd, loadCli };
