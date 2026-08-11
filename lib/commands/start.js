const { startServer } = require('../runtime/server');

async function start() {
  await startServer();
}

module.exports = { start };
