const { GENERATED_CURRICULUM } = require('./generatedCurriculum.cjs');

const CONCEPTS = GENERATED_CURRICULUM.concepts;
const COURSE_CATALOG = GENERATED_CURRICULUM.courses;
const TOPICS = GENERATED_CURRICULUM.topics.filter(({ courseId }) => courseId === 'jamaican-patois');

function normalizeLocalized(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();
}

function validateCourseVocabulary(rows) {
  const errors = [];
  if (!Array.isArray(rows) || rows.length !== CONCEPTS.length) {
    errors.push(`Published course must contain exactly ${CONCEPTS.length} entries.`);
  }
  if (!Array.isArray(rows)) return errors;

  const conceptIds = rows.map((row) => row.conceptId).filter(Boolean);
  if (new Set(conceptIds).size !== conceptIds.length) errors.push('Published course contains a duplicate concept ID.');
  const expected = new Set(CONCEPTS.map((concept) => concept.id));
  const missing = [...expected].filter((id) => !conceptIds.includes(id));
  if (missing.length) errors.push(`Missing concepts: ${missing.join(', ')}`);

  const localizedForms = rows.map((row) => normalizeLocalized(row.localized)).filter(Boolean);
  if (new Set(localizedForms).size !== localizedForms.length) errors.push('Published course contains a duplicate localized answer.');

  for (const row of rows) {
    if (!row.localized) errors.push(`Missing localized form for ${row.conceptId || 'unknown concept'}.`);
    if (!row.image) errors.push(`Missing image for ${row.conceptId || 'unknown concept'}.`);
    if (!row.audio) errors.push(`Missing audio for ${row.conceptId || 'unknown concept'}.`);
  }
  return errors;
}

module.exports = { CONCEPTS, COURSE_CATALOG, TOPICS, validateCourseVocabulary };
