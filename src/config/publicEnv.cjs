'use strict';

function normalizePublicEnvValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isConfiguredPublicEnvValue(value) {
  const normalized = normalizePublicEnvValue(value);
  if (!normalized) return false;
  if (/^<[^>]+>$/.test(normalized)) return false;
  return !normalized.toLowerCase().includes('your_');
}

function requireConfiguredPublicEnv(name, value) {
  if (!isConfiguredPublicEnvValue(value)) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env and add the real client value from the Diaspora project console.`
    );
  }
  return normalizePublicEnvValue(value);
}

function getOptionalConfiguredPublicEnv(value) {
  return isConfiguredPublicEnvValue(value) ? normalizePublicEnvValue(value) : undefined;
}

function isGoogleSignInConfigured({ platformOS, webClientId, iosClientId } = {}) {
  if (!isConfiguredPublicEnvValue(webClientId)) return false;
  if (platformOS === 'ios') return isConfiguredPublicEnvValue(iosClientId);
  return true;
}

module.exports = {
  getOptionalConfiguredPublicEnv,
  isGoogleSignInConfigured,
  isConfiguredPublicEnvValue,
  requireConfiguredPublicEnv,
};
