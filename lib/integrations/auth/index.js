const clerk = require('./clerk');

const adapters = {
  clerk,
  none: {
    id: 'none',
    envKeys: [],
    doctor: async () => ({ ok: true, message: 'Auth disabled' }),
    scaffold: () => ({ routes: [], dependencies: {} }),
  },
};

function getAuthIntegration(providerId) {
  return adapters[providerId] || null;
}

module.exports = { getAuthIntegration, adapters };
