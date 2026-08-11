const neon = require('./neon');
const mongodbAtlas = require('./mongodb-atlas');

const adapters = {
  neon,
  'mongodb-atlas': mongodbAtlas,
  none: {
    id: 'none',
    envKeys: [],
    doctor: async () => ({ ok: true, message: 'Database disabled' }),
    scaffold: () => ({ routes: [], dependencies: {} }),
  },
};

function getDbIntegration(providerId) {
  return adapters[providerId] || null;
}

module.exports = { getDbIntegration, adapters };
