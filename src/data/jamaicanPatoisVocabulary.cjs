const { GENERATED_CURRICULUM } = require('./generatedCurriculum.cjs');

const JAMAICAN_PATOIS_VOCABULARY = Object.freeze(
  GENERATED_CURRICULUM.courseVocabulary.filter(({ courseId }) => courseId === 'jamaican-patois')
);

module.exports = { JAMAICAN_PATOIS_VOCABULARY };
