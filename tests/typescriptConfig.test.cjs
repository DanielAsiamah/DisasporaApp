const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'tsconfig.json'), 'utf8'));

test('TypeScript checks app source without parsing generated or unrelated worktrees', () => {
  assert.deepEqual(config.include, ['App.js', 'index.js', 'src/**/*']);
  assert.ok(config.exclude.includes('outputs'));
  assert.ok(config.exclude.includes('journalism'));
  assert.ok(config.exclude.includes('node_modules'));
});
