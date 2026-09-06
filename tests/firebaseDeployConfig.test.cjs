const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function runChecker(cwd) {
  return execFileSync(
    process.execPath,
    [path.join(__dirname, '..', 'scripts', 'check-firebase-deploy-config.js')],
    { cwd, encoding: 'utf8' }
  );
}

test('Firebase deploy config maps Firestore rules and indexes for repeatable XP-ledger rules deploys', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'diaspora-firebase-config-'));
  fs.writeFileSync(path.join(root, 'firestore.rules'), 'rules_version = "2";\n');
  fs.writeFileSync(path.join(root, 'firestore.indexes.json'), '{"indexes":[],"fieldOverrides":[]}\n');
  fs.writeFileSync(path.join(root, 'firebase.json'), JSON.stringify({
    firestore: {
      rules: 'firestore.rules',
      indexes: 'firestore.indexes.json',
    },
  }));

  assert.equal(runChecker(root), 'Firebase deploy config verified.\n');
});

test('Firebase deploy config check fails closed when Firestore rules are not mapped', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'diaspora-missing-firestore-config-'));
  fs.writeFileSync(path.join(root, 'firestore.rules'), 'rules_version = "2";\n');
  fs.writeFileSync(path.join(root, 'firestore.indexes.json'), '{"indexes":[],"fieldOverrides":[]}\n');
  fs.writeFileSync(path.join(root, 'firebase.json'), '{}');

  assert.throws(
    () => runChecker(root),
    /firebase\.json must map firestore\.rules to firestore\.rules/
  );
});
