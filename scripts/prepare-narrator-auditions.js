const fs = require('node:fs');
const path = require('node:path');

const { buildAllNarratorAuditionManifests } = require('../src/audio/narratorAudioManifest.cjs');

const projectRoot = path.resolve(__dirname, '..');
const outputPath = path.join(projectRoot, 'outputs', 'audio', 'narrator-auditions.planned.json');

function main() {
  const manifests = buildAllNarratorAuditionManifests();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify({
    schemaVersion: 1,
    status: 'planned-native-and-voice-review-required',
    manifests,
  }, null, 2)}\n`, 'utf8');

  console.log(`Planned narrator manifest: ${path.relative(projectRoot, outputPath)}`);
  for (const manifest of Object.values(manifests)) {
    console.log(`[planned] ${manifest.roleId} (${manifest.locale}): ${manifest.entries.length} prompts, estimated ${manifest.estimatedCredits} credits`);
  }
  console.log('Dry run complete: this preparation script has no network or generation capability, so zero credits were spent.');
}

try {
  main();
} catch (error) {
  console.error(`Narrator audition preparation failed: ${error.message}`);
  process.exitCode = 1;
}
