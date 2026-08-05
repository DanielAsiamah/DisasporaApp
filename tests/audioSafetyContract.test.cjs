const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(filename) : [filename];
  });
}

test('mobile source contains no ElevenLabs API credential or runtime endpoint', () => {
  const sourceFiles = listFiles(path.join(root, 'src'));
  const combined = sourceFiles.map((filename) => fs.readFileSync(filename, 'utf8')).join('\n');
  assert.doesNotMatch(combined, /EXPO_PUBLIC_ELEVENLABS|ELEVENLABS_API_KEY|api\.elevenlabs\.io/i);
});

test('the paid audition package command never grants spend approval by itself', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.match(pkg.scripts['audio:patois-audition:generate'], /--generate/);
  assert.doesNotMatch(pkg.scripts['audio:patois-audition:generate'], /--approve-spend/);
  assert.match(pkg.scripts['audio:swahili-audition:generate'], /--course swahili/);
  assert.match(pkg.scripts['audio:swahili-audition:generate'], /--generate/);
  assert.doesNotMatch(pkg.scripts['audio:swahili-audition:generate'], /--approve-spend/);
  assert.equal(pkg.scripts['audio:generate'], undefined);
  assert.equal(pkg.scripts['audio:generate:interactive'], undefined);
});

test('the Swahili preparation command is structurally unable to spend credits', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const scriptPath = path.join(root, 'scripts', 'prepare-course-audition.js');

  assert.equal(
    pkg.scripts['audio:swahili-audition:dry-run'],
    'node scripts/prepare-course-audition.js --course swahili'
  );
  assert.equal(fs.existsSync(scriptPath), true, 'the zero-spend preparation script must exist');
  const source = fs.readFileSync(scriptPath, 'utf8');
  assert.doesNotMatch(source, /api\.elevenlabs\.io|\bfetch\s*\(|--generate|--approve-spend/i);
});

test('the development audition script supports two private accounts and requires rotated keys', () => {
  const source = fs.readFileSync(path.join(root, 'scripts/generate-patois-audition.js'), 'utf8');
  assert.match(source, /ELEVENLABS_API_KEY_SECONDARY/);
  assert.match(source, /--account/);
  assert.match(source, /ELEVENLABS_KEYS_ROTATED/);
  assert.match(source, /--course/);
  assert.match(source, /target-swahili-yna/);
  assert.match(source, /if \(!options\.approved\)[\s\S]+before any ElevenLabs request/);
});

test('the paid audition path validates native approval before any ElevenLabs request', () => {
  const source = fs.readFileSync(path.join(root, 'scripts/generate-patois-audition.js'), 'utf8');
  const approvalGate = source.indexOf('validateVocabularyForGeneration(config.vocabulary)');
  const firstNetworkAction = source.indexOf('resolveAndValidateCast(audition.entries');

  assert.ok(approvalGate >= 0, 'paid generation must validate the vocabulary review state');
  assert.ok(firstNetworkAction > approvalGate, 'native approval must be checked before an ElevenLabs request');
});

test('the rebuild test command includes every controlled-audio contract', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  for (const filename of [
    'lessonAudioPolicy.test.cjs',
    'lessonAudioController.test.cjs',
    'lessonAudioEventGate.test.cjs',
    'controlledLessonAudioRuntime.test.cjs',
    'audioManifestContract.test.cjs',
    'voiceRoleContract.test.cjs',
    'courseVoicePlan.test.cjs',
    'narratorAudioManifest.test.cjs',
    'audioSafetyContract.test.cjs',
  ]) {
    assert.match(pkg.scripts['test:rebuild-contracts'], new RegExp(filename.replace('.', '\\.')));
  }

  assert.match(pkg.scripts['test:lesson-audio'], /courseVoicePlan\.test\.cjs/);
  assert.match(pkg.scripts['test:lesson-audio'], /narratorAudioManifest\.test\.cjs/);
});

test('unapproved legacy phrase audio is absent from the mobile bundle', () => {
  assert.equal(
    fs.existsSync(path.join(root, 'assets', 'audio', 'patois')),
    false,
    'retired Patois MP3s must not remain as an accidental fallback'
  );

  const productionRegistry = fs.readFileSync(
    path.join(root, 'src', 'audio', 'patoisProductionAudioRegistry.js'),
    'utf8'
  );
  assert.match(
    productionRegistry,
    /PATOIS_PRODUCTION_AUDIO_REGISTRY\s*=\s*Object\.freeze\(\{\}\)/,
    'production phrase registry stays empty until the user approves generation and native review'
  );
  assert.match(productionRegistry, /assets\/sounds\/wrong\.mp3/);
});
