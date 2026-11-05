const assert = require('node:assert/strict');
const test = require('node:test');
const { GUIDE_NAMES, getPromptGuideName, getGuideMotionSpec } = require('../src/lessonExperience/lessonGuidePresentation.cjs');

test('lesson cast starts with its workbook guide then visits each original guide without duplicates', () => {
  for (const lead of GUIDE_NAMES) {
    const cast = GUIDE_NAMES.map((_, index) => getPromptGuideName(lead, index));
    assert.equal(cast[0], lead);
    assert.deepEqual(new Set(cast), new Set(GUIDE_NAMES));
    assert.equal(getPromptGuideName(lead, GUIDE_NAMES.length), lead);
    assert.ok(cast.includes('Ayo'));
    assert.ok(cast.includes('Safiya'));
    assert.ok(cast.includes('Nneka'));
    assert.ok(cast.includes('Chidi'));
  }
  assert.equal(getPromptGuideName('missing', 0), 'Kai');
  assert.equal(getPromptGuideName('Kai', -1), 'Kai');
});

test('guide reactions are finite, settle at rest, and are distinct from idle breathing', () => {
  const idle = getGuideMotionSpec('idle', false);
  assert.equal(idle.loop, true);
  const prompt = getGuideMotionSpec('prompt', false);
  assert.equal(prompt.loop, true);
  assert.notDeepEqual(prompt, idle);
  for (const tone of ['celebrate', 'encourage', 'recover']) {
    const reaction = getGuideMotionSpec(tone, false);
    assert.equal(reaction.loop, false);
    assert.ok(reaction.duration > 0 && reaction.duration < 1000);
    assert.equal(reaction.translateY.at(-1), 0);
    assert.equal(reaction.scale.at(-1), 1);
    assert.equal(reaction.rotate.at(-1), '0deg');
    assert.equal(reaction.translateX.at(-1), 0);
    assert.notDeepEqual(reaction, idle);
    for (const frames of [reaction.translateX, reaction.translateY, reaction.scale, reaction.rotate]) {
      assert.equal(frames.length, reaction.inputRange.length);
    }
  }
  assert.notDeepEqual(getGuideMotionSpec('celebrate', false), getGuideMotionSpec('encourage', false));
});

test('reduced motion disables loops and all guide transforms for every state', () => {
  for (const tone of ['idle', 'prompt', 'celebrate', 'encourage', 'recover', 'unknown']) {
    const spec = getGuideMotionSpec(tone, true);
    assert.equal(spec.duration, 0);
    assert.equal(spec.loop, false);
    assert.ok(spec.translateY.every(value => value === 0));
    assert.ok(spec.translateX.every(value => value === 0));
    assert.ok(spec.scale.every(value => value === 1));
    assert.ok(spec.rotate.every(value => value === '0deg'));
  }
});
