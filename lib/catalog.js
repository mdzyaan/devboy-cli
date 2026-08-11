const path = require('path');
const fs = require('fs-extra');

function loadCatalog() {
  const file = path.join(__dirname, '..', 'catalog', 'integrations.json');
  return fs.readJsonSync(file);
}

module.exports = { loadCatalog };
