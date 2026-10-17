'use strict';

const { resolveDeveloperPreviewCourseId } = require('../data/courseAccessPolicy.cjs');

function buildCoursePickerOptions(courses, settings = {}) {
  return courses.map(course => {
    const publiclyAvailable = course.available === true || course.published === true;
    const previewCourseId = publiclyAvailable ? null : resolveDeveloperPreviewCourseId({
      ...settings,
      requestedCourseId: course.id,
    });
    const selectable = publiclyAvailable || previewCourseId !== null;
    return {
      id: course.id,
      label: course.label || course.displayName,
      flag: course.flag,
      selectable,
      previewCourseId,
      statusLabel: course.published === true ? 'Ready to learn'
        : selectable ? 'Draft lessons' : 'Content in preparation',
    };
  });
}

module.exports = { buildCoursePickerOptions };
