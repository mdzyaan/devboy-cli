const { newRoute } = require('./lib/commands/new-route');
const { start } = require('./lib/commands/start');
const { deploy } = require('./lib/commands/deploy');
const { doctor } = require('./lib/commands/doctor');
const { studio } = require('./lib/commands/studio');
const { newJob } = require('./lib/commands/new-job');
const { applyIntegrations } = require('./lib/commands/apply-integrations');
const { loadCatalog } = require('./lib/catalog');

function showCatalog() {
  const catalog = loadCatalog();
  console.log(JSON.stringify(catalog, null, 2));
}

module.exports = {
  newRoute,
  start,
  deploy,
  doctor,
  studio,
  newJob,
  applyIntegrations,
  showCatalog,
  loadCatalog,
};
