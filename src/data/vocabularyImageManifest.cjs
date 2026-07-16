function buildVocabularyImagePath(courseId, conceptId) {
  return `assets/images/vocab/${courseId}/${conceptId}.png`;
}

function validateVocabularyImageManifest(paths, { expectedCount } = {}) {
  const errors = [];
  if (!Array.isArray(paths)) return ['Image manifest must be an array.'];
  if (Number.isInteger(expectedCount) && paths.length !== expectedCount) errors.push(`Image manifest must contain ${expectedCount} paths.`);
  if (new Set(paths).size !== paths.length) errors.push('Image manifest contains duplicate paths.');
  for (const path of paths) {
    if (!/^assets\/images\/vocab\/[a-z0-9-]+\/[a-z0-9-]+\.png$/.test(path)) errors.push(`Legacy or invalid vocabulary image path: ${path}`);
  }
  return errors;
}

module.exports = { buildVocabularyImagePath, validateVocabularyImageManifest };
