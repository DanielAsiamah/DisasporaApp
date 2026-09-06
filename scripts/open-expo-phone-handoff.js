#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { buildExpoPhoneHandoffHtml, readLastOption } = require('./lib/expo-phone-handoff.cjs');

function readOption(name) {
  return readLastOption(process.argv.slice(2), name);
}

const outputPath = path.join(process.cwd(), 'outputs', 'phone-handoff', 'expo-go.html');
const html = buildExpoPhoneHandoffHtml({
  tunnelUrl: readOption('tunnel-url'),
  lanUrl: readOption('lan-url'),
  webUrl: readOption('web-url'),
  generatedAt: new Date().toLocaleString(),
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html);
console.log(outputPath);

if (process.platform === 'darwin') {
  execFileSync('open', [outputPath], { stdio: 'ignore' });
}
