#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { spawn } = require('node:child_process');
const {
  buildExpoStartArgs,
  prewarmExpoIosBundle,
} = require('./lib/phone-preview-prewarm.cjs');

const expoExecutable = path.join(process.cwd(), 'node_modules', '.bin', 'expo');
const child = spawn(expoExecutable, buildExpoStartArgs(process.argv.slice(2)), {
  env: {
    ...process.env,
    EXPO_PUBLIC_ENABLE_UNRELEASED_COURSE_PREVIEW: 'true',
  },
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error(`Unable to start Expo: ${error.message}`);
  process.exitCode = 1;
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('exit', (code, signal) => {
  if (signal) process.exitCode = 1;
  else process.exitCode = code ?? 0;
});

console.log('Preparing the Expo Go iOS bundle. Wait for READY TO SCAN before opening the QR code.');
prewarmExpoIosBundle()
  .then(({ runtimeVersion, bundleBytes }) => {
    const megabytes = (bundleBytes / 1_000_000).toFixed(1);
    console.log(`READY TO SCAN: ${runtimeVersion} iOS bundle warmed (${megabytes} MB).`);
  })
  .catch((error) => {
    console.warn(`Phone preview started, but automatic iOS prewarm failed: ${error.message}`);
  });
