const id = 'azure';

async function validateCredentials() {
  return {
    ok: false,
    message: 'Azure compute provider is not implemented yet. Use AWS for v1.',
  };
}

async function deploy() {
  return {
    ok: false,
    error: 'Azure deploy is not implemented yet. Select compute.provider = "aws" in devboy.config.js.',
  };
}

async function destroy() {
  return { ok: false, error: 'Azure destroy is not implemented yet.' };
}

module.exports = { id, validateCredentials, deploy, destroy };
