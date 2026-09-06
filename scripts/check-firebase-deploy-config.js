#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`${path.basename(filePath)} must be valid JSON: ${error.message}`);
  }
}

const root = process.cwd();
const firebaseJsonPath = path.join(root, 'firebase.json');
const rulesPath = path.join(root, 'firestore.rules');
const indexesPath = path.join(root, 'firestore.indexes.json');

if (!fs.existsSync(firebaseJsonPath)) fail('firebase.json is required.');
if (!fs.existsSync(rulesPath)) fail('firestore.rules is required.');
if (!fs.existsSync(indexesPath)) fail('firestore.indexes.json is required.');

const config = readJson(firebaseJsonPath);
if (config?.firestore?.rules !== 'firestore.rules') {
  fail('firebase.json must map firestore.rules to firestore.rules.');
}
if (config?.firestore?.indexes !== 'firestore.indexes.json') {
  fail('firebase.json must map firestore.indexes.json to firestore.indexes.json.');
}

console.log('Firebase deploy config verified.');
