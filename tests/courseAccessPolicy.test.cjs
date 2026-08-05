const assert = require('node:assert/strict');
const test = require('node:test');

const {
  canAccessRuntimeCourse,
  deriveCourseReleaseState,
  resolveDeveloperPreviewCourseId,
} = require('../src/data/courseAccessPolicy.cjs');

test('workbook state alone never makes a course publicly published', () => {
  assert.deepEqual(
    deriveCourseReleaseState({ id: 'swahili', availability: 'preview' }),
    { available: false, published: false }
  );
  assert.deepEqual(
    deriveCourseReleaseState({ id: 'swahili', availability: 'published' }),
    { available: false, published: false }
  );
  assert.deepEqual(
    deriveCourseReleaseState(
      { id: 'swahili', availability: 'published' },
      { hasVerifiedRelease: true }
    ),
    { available: true, published: true }
  );
});

test('only the existing Jamaican Patois preview is grandfathered as accessible', () => {
  assert.deepEqual(
    deriveCourseReleaseState({ id: 'jamaican-patois', availability: 'preview' }),
    { available: true, published: false }
  );
  assert.deepEqual(
    deriveCourseReleaseState({ id: 'wolof', availability: 'preview' }),
    { available: false, published: false }
  );
});

test('developer preview requires development mode, explicit opt-in and an allowlisted course', () => {
  const request = { requestedCourseId: 'swahili', isDevelopment: true, previewOptIn: true };
  assert.equal(resolveDeveloperPreviewCourseId(request), 'swahili');
  assert.equal(resolveDeveloperPreviewCourseId({ ...request, isDevelopment: false }), null);
  assert.equal(resolveDeveloperPreviewCourseId({ ...request, previewOptIn: false }), null);
  assert.equal(resolveDeveloperPreviewCourseId({ ...request, requestedCourseId: 'wolof' }), null);
});

test('runtime access fails closed for unreleased courses without the exact preview capability', () => {
  const swahili = { id: 'swahili', available: false, published: false };
  assert.equal(canAccessRuntimeCourse(swahili), false);
  assert.equal(canAccessRuntimeCourse(swahili, 'wolof'), false);
  assert.equal(canAccessRuntimeCourse(swahili, 'swahili'), true);
  assert.equal(
    canAccessRuntimeCourse({ id: 'jamaican-patois', available: true, published: false }),
    true
  );
});
