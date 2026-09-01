'use strict';

const { isConfiguredPublicEnvValue } = require('../../src/config/publicEnv.cjs');

const REQUIRED_PUBLIC_ENV_NAMES = Object.freeze([
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
]);

function parseDotenvContent(content = '') {
  const entries = {};
  for (const rawLine of String(content).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;
    const name = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    if (!name) continue;
    entries[name] = rawValue.replace(/^(['"])(.*)\1$/, '$2');
  }
  return entries;
}

function classifyPublicEnvValue(value) {
  if (typeof value !== 'string' || !value.trim()) return 'missing';
  return isConfiguredPublicEnvValue(value) ? 'configured' : 'placeholder';
}

function checkPublicEnvValues(values = {}) {
  const configuredNames = [];
  const missingNames = [];
  const placeholderNames = [];

  for (const name of REQUIRED_PUBLIC_ENV_NAMES) {
    const status = classifyPublicEnvValue(values[name]);
    if (status === 'configured') configuredNames.push(name);
    if (status === 'missing') missingNames.push(name);
    if (status === 'placeholder') placeholderNames.push(name);
  }

  return {
    configuredNames,
    missingNames,
    ok: missingNames.length === 0 && placeholderNames.length === 0,
    placeholderNames,
  };
}

function formatNameList(names) {
  return names.length > 0 ? names.join(', ') : 'none';
}

function summarizePublicEnvCheck(result) {
  const lines = [
    result.ok
      ? 'Public env check passed: all required Expo public config names are set.'
      : 'Public env check failed: replace missing or placeholder values before auth/device verification.',
    `Configured names: ${formatNameList(result.configuredNames)}`,
    `Missing names: ${formatNameList(result.missingNames)}`,
    `Placeholder names: ${formatNameList(result.placeholderNames)}`,
  ];
  return lines.join('\n');
}

module.exports = {
  REQUIRED_PUBLIC_ENV_NAMES,
  checkPublicEnvValues,
  parseDotenvContent,
  summarizePublicEnvCheck,
};
