const aws = require('./aws');
const azure = require('./azure');
const gcp = require('./gcp');
const oci = require('./oci');

const providers = { aws, azure, gcp, oci };

function getComputeProvider(id) {
  return providers[id] || null;
}

module.exports = { getComputeProvider, providers };
