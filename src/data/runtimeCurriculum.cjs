'use strict';

const { GENERATED_CURRICULUM } = require('./generatedCurriculum.cjs');
const { GENERATED_MASTER_PREVIEW } = require('./generatedMasterPreview.cjs');

// Course access is still checked by the runtime preview/publication policy.
function getRuntimeCurriculum(courseId) {
  return GENERATED_MASTER_PREVIEW.courses.some(course => course.id === courseId)
    ? GENERATED_MASTER_PREVIEW
    : GENERATED_CURRICULUM;
}

module.exports = { getRuntimeCurriculum };
