const assert = require('node:assert/strict');
const test = require('node:test');

let guideModel = {};
try {
  guideModel = require('../src/components/regionalGuideModel');
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
}

test('maps each diaspora region to its intended original guide artwork', () => {
  assert.equal(typeof guideModel.getRegionalGuide, 'function');
  assert.equal(guideModel.getRegionalGuide('africa').imageKey, 'amara');
  assert.equal(guideModel.getRegionalGuide('caribbean').imageKey, 'kai');
  assert.equal(guideModel.getRegionalGuide('americas').imageKey, 'sol');
});

test('falls back to Kai for an unknown or missing region', () => {
  assert.equal(typeof guideModel.getRegionalGuide, 'function');
  assert.equal(guideModel.getRegionalGuide('unknown').id, 'caribbean');
  assert.equal(guideModel.getRegionalGuide().id, 'caribbean');
});

test('keeps accessible names and regional greetings with each guide', () => {
  assert.equal(typeof guideModel.getRegionalGuide, 'function');
  for (const region of ['africa', 'caribbean', 'americas']) {
    const guide = guideModel.getRegionalGuide(region);
    assert.ok(guide.name.length > 0);
    assert.ok(guide.region.length > 0);
    assert.ok(guide.greeting.length > 0);
  }
});
