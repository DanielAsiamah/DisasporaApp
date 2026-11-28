#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { buildExpoPhoneHandoffHtml, readLastOption, resolvePhoneHandoffUrls } = require('./lib/expo-phone-handoff.cjs');

function readOption(name) {
  return readLastOption(process.argv.slice(2), name);
}

async function openPhoneHandoff() {
  const urls = await resolvePhoneHandoffUrls({
    tunnelUrl: readOption('tunnel-url'),
    lanUrl: readOption('lan-url'),
    webUrl: readOption('web-url'),
  });
  const outputPath = path.join(process.cwd(), 'outputs', 'phone-handoff', 'expo-go.html');
  const html = buildExpoPhoneHandoffHtml({ ...urls, generatedAt: new Date().toLocaleString() });
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html);
  console.log(outputPath);

  if (process.platform === 'darwin') {
    execFileSync('open', [outputPath], { stdio: 'ignore' });
  }
}

openPhoneHandoff().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
