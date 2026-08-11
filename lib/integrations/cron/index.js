const qstash = require('./qstash');

const adapters = {
  qstash,
  eventbridge: {
    id: 'eventbridge',
    envKeys: [],
    doctor: async () => ({ ok: false, message: 'EventBridge cron is not implemented yet' }),
    scaffold: () => ({ routes: [], jobs: [], dependencies: {} }),
    registerJob: async () => ({ ok: false, message: 'EventBridge not implemented' }),
  },
  none: {
    id: 'none',
    envKeys: [],
    doctor: async () => ({ ok: true, message: 'Cron disabled' }),
    scaffold: () => ({ routes: [], jobs: [], dependencies: {} }),
    registerJob: async () => ({ ok: true, message: 'No-op' }),
  },
};

function getCronIntegration(providerId) {
  return adapters[providerId] || null;
}

module.exports = { getCronIntegration, adapters };
