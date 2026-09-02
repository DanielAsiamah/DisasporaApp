#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  buildPhoneVerificationReport,
  createPhoneVerificationReportPath,
} = require('./lib/phone-verification-report.cjs');

function readGitValue(args, fallback = 'unknown') {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function formatLocalTimestamp(date = new Date()) {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absolute = Math.abs(offsetMinutes);
  const offset = `${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')} UTC${offset}`;
}

function getExportMetadataSummary(metadataPath) {
  if (!fs.existsSync(metadataPath)) return '';
  const stats = fs.statSync(metadataPath);
  return `${metadataPath} (${stats.size} bytes, ${formatLocalTimestamp(stats.mtime)})`;
}

function readOption(name) {
  const prefix = `--${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : '';
}

const templatePath = path.join(process.cwd(), 'docs/handoff/phone-verification-template.md');
const template = fs.readFileSync(templatePath, 'utf8');
const commit = readGitValue(['rev-parse', 'HEAD']);
const metadata = {
  appRuntime: readOption('runtime') || 'development build or Expo Go compatible with SDK 54',
  branch: readGitValue(['branch', '--show-current']),
  commit,
  date: formatLocalTimestamp(),
  device: readOption('device'),
  expoCommand: readOption('expo-command') || 'npx expo start --lan --clear',
  exportMetadata: getExportMetadataSummary('outputs/verify-transfer/metadata.json'),
  iosVersion: readOption('ios-version'),
  localUrl: readOption('local-url') || 'http://localhost:8081',
  tester: readOption('tester'),
};
const outputPath = createPhoneVerificationReportPath({ commit, date: metadata.date });
const report = buildPhoneVerificationReport({ template, metadata });

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, report);
console.log(`Phone verification report scaffolded: ${outputPath}`);
