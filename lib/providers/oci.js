const id = 'oci';

async function validateCredentials() {
  return {
    ok: false,
    message: 'OCI compute provider is not implemented yet. Use AWS for v1.',
  };
}

async function deploy() {
  return {
    ok: false,
    error: 'OCI deploy is not implemented yet. Select compute.provider = "aws" in devboy.config.js.',
  };
}

async function destroy() {
  return { ok: false, error: 'OCI destroy is not implemented yet.' };
}

module.exports = { id, validateCredentials, deploy, destroy };
