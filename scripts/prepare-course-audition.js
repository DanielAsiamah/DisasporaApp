const fs = require('node:fs');
const path = require('node:path');

const { GENERATED_CURRICULUM } = require('../src/data/generatedCurriculum.cjs');
const {
  buildCourseAudioManifest,
  createCourseAuditionPlan,
} = require('../src/audio/patoisAudioManifest.cjs');

const COURSE_CONFIGS = Object.freeze({
  swahili: Object.freeze({ defaultVoiceRole: 'target-swahili-yna' }),
});

function parseCourse(argv) {
  const courseIndex = argv.indexOf('--course');
  const courseId = courseIndex >= 0 ? argv[courseIndex + 1] : '';
  if (!COURSE_CONFIGS[courseId]) {
    throw new Error(`--course must name a supported zero-spend audition: ${Object.keys(COURSE_CONFIGS).join(', ')}`);
  }
  return courseId;
}

function main() {
  const courseId = parseCourse(process.argv.slice(2));
  const config = COURSE_CONFIGS[courseId];
  const vocabulary = GENERATED_CURRICULUM.courseVocabulary.filter((row) => row.courseId === courseId);
  const manifest = buildCourseAudioManifest({
    courseId,
    vocabulary,
    defaultVoiceRole: config.defaultVoiceRole,
  });
  const audition = createCourseAuditionPlan(manifest);
  const outputPath = path.join(__dirname, '..', 'outputs', 'audio', `${courseId}-manifest.planned.json`);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Planned manifest: ${path.relative(path.join(__dirname, '..'), outputPath)}`);
  console.log(`Audition: ${audition.entries.length} phrases, estimated ${audition.estimatedCredits} credits, hard cap ${audition.maxCredits}`);
  for (const entry of audition.entries) {
    console.log(`[planned] ${entry.conceptId} (${entry.voiceRole}) -> ${entry.filename}`);
  }
  console.log('Dry run complete: this preparation script has no network or generation capability, so zero credits were spent.');
}

try {
  main();
} catch (error) {
  console.error(`Course audition preparation failed: ${error.message}`);
  process.exitCode = 1;
}
