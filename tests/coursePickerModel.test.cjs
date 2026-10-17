const assert = require('node:assert/strict');
const test = require('node:test');
const { COURSE_CATALOG } = require('../src/data/courseCatalog.cjs');
const { buildCoursePickerOptions } = require('../src/lessonExperience/coursePickerModel.cjs');

test('the opted-in development picker offers only courses with implemented draft lessons', () => {
  const options = buildCoursePickerOptions(COURSE_CATALOG, { isDevelopment: true, previewOptIn: true });
  assert.deepEqual(options.filter(option => option.selectable).map(option => option.id), [
    'jamaican-patois', 'swahili', 'wolof', 'haitian-creole', 'sudanese-arabic',
  ]);
  assert.deepEqual(options.filter(option => !option.selectable).map(option => option.id), [
    'nobiin', 'igbo', 'belizean-kriol', 'aave',
  ]);
  assert.equal(options.find(option => option.id === 'swahili').previewCourseId, 'swahili');
  assert.equal(options.find(option => option.id === 'swahili').statusLabel, 'Draft lessons');
  assert.equal(options.find(option => option.id === 'nobiin').statusLabel, 'Content in preparation');
  assert.equal(options.find(option => option.id === 'jamaican-patois').previewCourseId, null);
});

test('release builds and ordinary development sessions cannot select unfinished courses', () => {
  for (const settings of [{}, { isDevelopment: true }, { isDevelopment: false, previewOptIn: true }]) {
    const options = buildCoursePickerOptions(COURSE_CATALOG, settings);
    assert.deepEqual(options.filter(option => option.selectable).map(option => option.id), ['jamaican-patois']);
    assert.ok(options.every(option => option.previewCourseId === null));
  }
});

test('verified published courses are selectable without a developer preview capability', () => {
  const options = buildCoursePickerOptions([
    { id: 'swahili', label: 'Swahili', published: true, available: true },
  ]);
  assert.equal(options[0].selectable, true);
  assert.equal(options[0].statusLabel, 'Ready to learn');
  assert.equal(options[0].previewCourseId, null);
});
