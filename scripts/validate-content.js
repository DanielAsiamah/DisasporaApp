#!/usr/bin/env node

const path = require('node:path');

const { validateContent } = require('./lib/content-validator.cjs');

const projectRoot = path.resolve(__dirname, '..');
const report = validateContent({ projectRoot });

if (report.ok) {
  console.log(JSON.stringify({ status: 'valid', ...report.stats }, null, 2));
  process.exitCode = 0;
} else {
  console.error(`Content validation failed with ${report.errors.length} error(s):`);
  report.errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
}
