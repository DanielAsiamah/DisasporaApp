const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('obsolete generators cannot recreate retired lesson data or registries', () => {
  const retiredPaths = [
    'scripts/build-content.js',
    'scripts/build-firestore-content-seed.js',
    'scripts/build-image-registry.js',
    'scripts/generate-audio.js',
    'scripts/rebuild-workbook.mjs',
    'scripts/upload-firestore-content.js',
    'src/data/generatedAudioRegistry.js',
    'src/services/importers/excelImporter.js',
    'src/data/json/languages.json',
    'src/data/json/units.json',
    'src/data/json/vocabulary.json',
    'src/data/json/lessons.json',
    'assets/audio/manifest.json',
    'assets/audio/README.md',
    'assets/audio/igbo/.gitkeep',
    'assets/audio/swahili/.gitkeep',
  ];

  for (const relativePath of retiredPaths) {
    assert.equal(
      fs.existsSync(path.join(root, relativePath)),
      false,
      `${relativePath} must not remain able to restore legacy content`
    );
  }
});

test('package commands expose only the canonical curriculum and controlled audition paths', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const retiredCommands = [
    'audio:dry-run',
    'audio:dry-run:interactive',
    'content:firestore-seed',
    'content:upload-firestore',
    'images:registry',
  ];

  for (const command of retiredCommands) {
    assert.equal(pkg.scripts[command], undefined, `${command} must be removed`);
  }

  assert.equal(pkg.scripts['content:build'], 'node scripts/generate-runtime-curriculum.mjs');
  assert.equal(pkg.scripts['audio:patois-audition:dry-run'], 'node scripts/generate-patois-audition.js');
  assert.equal(pkg.scripts['audio:swahili-audition:dry-run'], 'node scripts/prepare-course-audition.js --course swahili');
  assert.equal(pkg.scripts['audio:swahili-audition:generate'], 'node scripts/generate-patois-audition.js --course swahili --generate --max-credits 250');
  assert.equal(pkg.dependencies?.['firebase-admin'], undefined);
  assert.equal(pkg.devDependencies?.['firebase-admin'], undefined);
});

test('generated previews and workbook inspection output are excluded from Git', () => {
  const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');

  assert.match(gitignore, /^\/tmp\/$/m);
  assert.match(gitignore, /^\/remotion-preview\/$/m);
  assert.match(gitignore, /^\*\.inspect\.ndjson$/m);
});
