const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

test('Swahili has a static 39-image Metro registry with no Patois fallback', () => {
  const source = read('src/data/swahiliImageRegistry.js');
  const requires = [...source.matchAll(/require\(['"]\.\.\/\.\.\/assets\/images\/vocab\/swahili\/([^'"]+\.png)['"]\)/g)];

  assert.equal(requires.length, 39);
  assert.equal(new Set(requires.map((match) => match[1])).size, 39);
  assert.doesNotMatch(source, /jamaican-patois/);
});

test('lesson modal resolves images and approved audio independently for the selected course', () => {
  const source = read('src/components/mvp/PatoisLessonModal.js');

  assert.match(source, /courseId\s*=\s*['"]jamaican-patois['"]/);
  assert.match(source, /buildCourseTopicExercises\(runtimeCourseId/);
  assert.match(source, /getCourseImageRegistry\(runtimeCourseId\)/);
  assert.match(source, /canAccessRuntimeCourse\(requestedCourse, previewCourseId\)/);
  assert.match(source, /getCourseProductionAudioRegistry\(runtimeCourseId\)/);
  assert.match(source, /hasApprovedCourseAudio\(runtimeCourseId,\s*conceptId\)/);
  assert.match(source, /useControlledLessonAudio\(\{\s*phraseRegistry\s*\}\)/);
  assert.doesNotMatch(source, /vocabulary:\s*JAMAICAN_PATOIS_VOCABULARY/);
});

test('Swahili production-audio registry agrees exactly with its candidate lifecycle state', () => {
  const courseAudioRegistry = read('src/audio/courseProductionAudioRegistry.js');
  const swahiliAudioRegistry = read('src/audio/swahiliProductionAudioRegistry.js');
  const { GENERATED_CURRICULUM } = require('../src/data/generatedCurriculum.cjs');
  const swahili = GENERATED_CURRICULUM.courses.find(({ id }) => id === 'swahili');
  const staticMp3Requires = [
    ...swahiliAudioRegistry.matchAll(
      /require\(['"]\.\.\/\.\.\/assets\/audio\/swahili\/([^'"]+\.mp3)['"]\)/g
    ),
  ];

  assert.match(courseAudioRegistry, /SWAHILI_PRODUCTION_AUDIO_REGISTRY/);
  assert.match(courseAudioRegistry, /swahili:\s*SWAHILI_PRODUCTION_AUDIO_REGISTRY/);
  if (swahili.availability === 'published') {
    assert.equal(staticMp3Requires.length, 39);
    assert.equal(new Set(staticMp3Requires.map((match) => match[1])).size, 39);
  } else {
    assert.equal(swahili.availability, 'backlog');
    assert.match(swahiliAudioRegistry, /Object\.freeze\(\{\}\)/);
    assert.equal(staticMp3Requires.length, 0);
  }
});

test('home shell selects course topics, hero and flag without publishing Swahili', () => {
  const source = read('src/screens/MvpHomeScreen.js');

  assert.match(source, /getCoursePresentation\(storageCourseId\)/);
  assert.match(source, /courseId\s*===\s*storageCourseId/);
  assert.match(source, /courseConfig\.flag/);
  assert.match(source, /courseId=\{storageCourseId\}/);
  assert.match(source, /const\s+topics\s*=\s*useMemo\([\s\S]*GENERATED_CURRICULUM\.topics/);
});

test('Swahili preview hero matches the workbook projection and is a valid landscape PNG', () => {
  const { getCoursePresentationMetadata } = require('../src/data/coursePresentationContract.cjs');
  const projectPath = getCoursePresentationMetadata('swahili').heroAsset;
  const heroPath = path.resolve(ROOT, ...projectPath.split('/'));
  const { GENERATED_CURRICULUM } = require('../src/data/generatedCurriculum.cjs');
  const chapter = GENERATED_CURRICULUM.chapters.find(({ courseId }) => courseId === 'swahili');

  assert.ok(chapter, 'generated workbook projection must contain the Swahili chapter');
  assert.equal(projectPath, chapter.heroAsset);
  assert.equal(fs.existsSync(heroPath), true, `${projectPath} must exist`);

  const png = fs.readFileSync(heroPath);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  assert.equal(png[24], 8, 'hero must use 8-bit channels');
  assert.ok([2, 6].includes(png[25]), 'hero must be RGB or RGBA');
  assert.ok(width >= 600 && height >= 240 && width > height, `expected landscape hero, found ${width}x${height}`);
});

test('Swahili phone preview remains opt-in until an exact verified release exists', () => {
  const source = read('App.js');
  const { getCourseById } = require('../src/data/courseCatalog.cjs');
  const { GENERATED_CURRICULUM } = require('../src/data/generatedCurriculum.cjs');
  const { hasVerifiedCourseRelease } = require('../src/data/verifiedCourseReleases.cjs');

  assert.match(source, /EXPO_PUBLIC_PREVIEW_COURSE_ID/);
  assert.match(source, /EXPO_PUBLIC_ENABLE_UNRELEASED_COURSE_PREVIEW/);
  assert.match(source, /resolveDeveloperPreviewCourseId/);
  assert.match(source, /courseId=\{previewCourseId\s*\|\|\s*selectedCourse\}/);
  assert.match(source, /previewCourseId=\{previewCourseId\}/);
  const swahili = getCourseById('swahili');
  const verified = hasVerifiedCourseRelease(
    'swahili',
    GENERATED_CURRICULUM.meta.courseContentSha256.swahili
  );
  const expectedPublished = (
    GENERATED_CURRICULUM.courses.find(({ id }) => id === 'swahili').availability === 'published'
    && verified
  );
  assert.equal(swahili.available, expectedPublished);
  assert.equal(swahili.published, expectedPublished);
});
