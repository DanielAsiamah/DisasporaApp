#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  checkPublicEnvValues,
  parseDotenvContent,
  summarizePublicEnvCheck,
} = require('./lib/public-env-check.cjs');

const envPath = path.join(process.cwd(), '.env');
const fileValues = fs.existsSync(envPath)
  ? parseDotenvContent(fs.readFileSync(envPath, 'utf8'))
  : {};
const result = checkPublicEnvValues({ ...fileValues, ...process.env });

console.log(summarizePublicEnvCheck(result));
process.exitCode = result.ok ? 0 : 1;
