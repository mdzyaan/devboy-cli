const id = 'gcp';

async function validateCredentials() {
  return {
    ok: false,
    message: 'GCP compute provider is not implemented yet. Use AWS for v1.',
  };
}

async function deploy() {
  return {
    ok: false,
    error: 'GCP deploy is not implemented yet. Select compute.provider = "aws" in devboy.config.js.',
  };
}

async function destroy() {
  return { ok: false, error: 'GCP destroy is not implemented yet.' };
}

module.exports = { id, validateCredentials, deploy, destroy };
