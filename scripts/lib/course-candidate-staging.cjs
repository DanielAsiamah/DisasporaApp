const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { hashText } = require('../../src/audio/patoisAudioManifest.cjs');
const { auditMp3Buffer } = require('./audit-mp3.cjs');

function text(value) {
  return String(value ?? '').trim();
}

function cloneData(data = {}) {
  return {
    courses: (data.courses || []).map((row) => ({ ...row })),
    course_vocabulary: (data.course_vocabulary || []).map((row) => ({ ...row })),
    chapters: (data.chapters || []).map((row) => ({ ...row })),
    topics: (data.topics || []).map((row) => ({ ...row })),
    lesson_steps: (data.lesson_steps || []).map((row) => ({ ...row })),
  };
}

function buildCourseCandidateStagingPlan({
  courseId,
  data,
  targetManifest,
  targetRoleId,
  targetVoiceId,
  targetModelId,
  targetOutputFormat,
  hasVerifiedRelease = false,
} = {}) {
  const errors = [];
  const source = cloneData(data);
  const normalizedCourseId = text(courseId);
  const normalizedRoleId = text(targetRoleId);
  const normalizedVoiceId = text(targetVoiceId);
  const normalizedModelId = text(targetModelId);
  const normalizedOutputFormat = text(targetOutputFormat);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedCourseId)) {
    errors.push('Candidate staging requires a valid course ID.');
  }
  if (!normalizedRoleId) errors.push('Candidate staging requires an approved target-language voice role.');
  if (!normalizedVoiceId) errors.push('Candidate staging requires an exact approved voice ID.');
  if (!normalizedModelId) errors.push('Candidate staging requires an approved model ID.');
  if (!normalizedOutputFormat) errors.push('Candidate staging requires an approved output format.');
  if (hasVerifiedRelease) errors.push(`${normalizedCourseId} already has a verified release.`);

  const courses = source.courses.filter((row) => text(row.course_id) === normalizedCourseId);
  const vocabulary = source.course_vocabulary.filter((row) => text(row.course_id) === normalizedCourseId);
  const chapters = source.chapters.filter((row) => text(row.course_id) === normalizedCourseId);
  const topics = source.topics.filter((row) => text(row.course_id) === normalizedCourseId);
  const lessonSteps = source.lesson_steps.filter((row) => text(row.course_id) === normalizedCourseId);
  const conceptIds = new Set(vocabulary.map((row) => text(row.concept_id)));
  const vocabularyByConcept = new Map(
    vocabulary.map((row) => [text(row.concept_id), row])
  );
  if (courses.length !== 1) errors.push(`${normalizedCourseId} requires exactly one course row.`);
  if (vocabulary.length !== 39 || conceptIds.size !== 39) {
    errors.push(`${normalizedCourseId} requires exactly 39 unique vocabulary rows.`);
  }
  const approvedVocabulary = vocabulary.filter((row) => text(row.review_status).toLowerCase() === 'approved');
  if (approvedVocabulary.length !== 39) {
    errors.push(`${normalizedCourseId} requires 39 approved vocabulary rows; found ${approvedVocabulary.length}.`);
  }
  if (topics.length !== 9 || new Set(topics.map((row) => text(row.topic_id))).size !== 9) {
    errors.push(`${normalizedCourseId} requires exactly nine unique topics.`);
  }
  if (
    chapters.length !== 1
    || Number(chapters[0]?.topic_count) !== 9
    || Number(chapters[0]?.word_count) !== 39
  ) {
    errors.push(`${normalizedCourseId} requires one 9-topic, 39-word chapter.`);
  }
  const topicIds = new Set(topics.map((row) => text(row.topic_id)));
  const stepTopicIds = new Set(lessonSteps.map((row) => text(row.topic_id)));
  if (!lessonSteps.length || [...topicIds].some((topicId) => !stepTopicIds.has(topicId))) {
    errors.push(`${normalizedCourseId} requires lesson steps for every topic.`);
  }

  const manifestEntries = Array.isArray(targetManifest?.entries) ? targetManifest.entries : [];
  const manifestConceptIds = new Set(manifestEntries.map((entry) => text(entry.conceptId)));
  if (
    targetManifest?.courseId !== normalizedCourseId
    || targetManifest?.roleId !== normalizedRoleId
  ) {
    errors.push('Target audio manifest course or role does not match the staging request.');
  }
  if (targetManifest?.voiceId !== normalizedVoiceId) {
    errors.push('Target audio manifest does not use the exact approved voice ID.');
  }
  if (targetManifest?.modelId !== normalizedModelId) {
    errors.push('Target audio manifest does not use the approved model ID.');
  }
  if (targetManifest?.outputFormat !== normalizedOutputFormat) {
    errors.push('Target audio manifest does not use the approved output format.');
  }
  if (manifestEntries.length !== 39 || manifestConceptIds.size !== 39) {
    errors.push(`${normalizedCourseId} requires exactly 39 target audio entries.`);
  }
  const entriesByConcept = new Map(manifestEntries.map((entry) => [text(entry.conceptId), entry]));
  for (const conceptId of conceptIds) {
    const entry = entriesByConcept.get(conceptId);
    if (!entry) {
      errors.push(`Target audio manifest is missing ${conceptId}.`);
      continue;
    }
    const expectedPath = `assets/audio/${normalizedCourseId}/${conceptId}.mp3`;
    if (text(entry.filename).replace(/\\/g, '/') !== expectedPath) {
      errors.push(`Target audio ${conceptId} must use ${expectedPath}.`);
    }
    const expectedText = text(vocabularyByConcept.get(conceptId)?.localized_form);
    if (entry.text !== expectedText || entry.textHash !== hashText(expectedText)) {
      errors.push(`Target audio ${conceptId} is stale for the approved wording.`);
    }
    if (entry.voiceId !== normalizedVoiceId) {
      errors.push(`Target audio ${conceptId} does not use the exact approved voice ID.`);
    }
    if (entry.voiceRole !== normalizedRoleId) errors.push(`Target audio ${conceptId} uses the wrong voice role.`);
    if (entry.modelId !== normalizedModelId) {
      errors.push(`Target audio ${conceptId} does not use the approved model ID.`);
    }
    if (entry.outputFormat !== normalizedOutputFormat) {
      errors.push(`Target audio ${conceptId} does not use the approved output format.`);
    }
    if (!text(entry.requestId)) errors.push(`Target audio ${conceptId} has no request ID.`);
    if (!/^[a-f0-9]{64}$/i.test(text(entry.fileSha256))) {
      errors.push(`Target audio ${conceptId} has no valid file SHA-256.`);
    }
    if (!Number.isInteger(entry.characterCost) || entry.characterCost < 0) {
      errors.push(`Target audio ${conceptId} has no valid character cost.`);
    }
    if (entry.status !== 'approved-for-learning') errors.push(`Target audio ${conceptId} is not approved for learning.`);
  }
  for (const conceptId of manifestConceptIds) {
    if (!conceptIds.has(conceptId)) errors.push(`Target audio manifest contains unknown concept ${conceptId}.`);
  }

  const summary = Object.freeze({
    vocabulary: vocabulary.length,
    topics: topics.length,
    lessonSteps: lessonSteps.length,
    targetAudio: manifestEntries.length,
  });
  if (errors.length) {
    return Object.freeze({
      ready: false,
      courseId: normalizedCourseId,
      errors: Object.freeze(errors),
      summary,
      data: source,
    });
  }

  const staged = cloneData(source);
  staged.courses = staged.courses.map((row) => (
    text(row.course_id) === normalizedCourseId ? { ...row, availability: 'published' } : row
  ));
  staged.course_vocabulary = staged.course_vocabulary.map((row) => {
    if (text(row.course_id) !== normalizedCourseId) return row;
    const conceptId = text(row.concept_id);
    return {
      ...row,
      audio_path: `assets/audio/${normalizedCourseId}/${conceptId}.mp3`,
      voice_cast: normalizedRoleId,
      publication_state: 'published',
    };
  });
  staged.chapters = staged.chapters.map((row) => (
    text(row.course_id) === normalizedCourseId ? { ...row, publication_state: 'published' } : row
  ));
  staged.lesson_steps = staged.lesson_steps.map((row) => (
    text(row.course_id) === normalizedCourseId
      ? { ...row, voice_cast: normalizedRoleId, publication_state: 'published' }
      : row
  ));
  return Object.freeze({
    ready: true,
    courseId: normalizedCourseId,
    errors: Object.freeze([]),
    summary,
    data: staged,
  });
}

function serializeCourseProductionAudioRegistry({ courseId, exportName, entries } = {}) {
  const normalizedCourseId = text(courseId);
  const normalizedExportName = text(exportName);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedCourseId)) {
    throw new Error('Production audio registry requires a valid course ID.');
  }
  if (!/^[A-Z][A-Z0-9_]*$/.test(normalizedExportName)) {
    throw new Error('Production audio registry requires a valid export name.');
  }
  const normalizedEntries = [...(entries || [])]
    .map((entry) => ({
      conceptId: text(entry.conceptId),
      filename: text(entry.filename).replace(/\\/g, '/'),
    }))
    .sort((left, right) => left.conceptId.localeCompare(right.conceptId));
  if (
    normalizedEntries.length !== 39
    || new Set(normalizedEntries.map((entry) => entry.conceptId)).size !== 39
  ) {
    throw new Error(`${normalizedCourseId} production audio registry requires 39 unique entries.`);
  }
  const lines = normalizedEntries.map(({ conceptId, filename }) => {
    const expectedPath = `assets/audio/${normalizedCourseId}/${conceptId}.mp3`;
    if (filename !== expectedPath) {
      throw new Error(`Production audio ${conceptId} must use ${expectedPath}.`);
    }
    return `  ${JSON.stringify(conceptId)}: require(${JSON.stringify(`../../${filename}`)}),`;
  });
  return `// Generated only from an approved, provenance-checked target audio manifest.\n`
    + `export const ${normalizedExportName} = Object.freeze({\n${lines.join('\n')}\n});\n`;
}

function validateTargetAudioFiles(entries, {
  projectRoot,
  existsSync = fs.existsSync,
  readFileSync = fs.readFileSync,
  validateAudio = (buffer, label) => auditMp3Buffer(buffer, { label }).failures,
} = {}) {
  const errors = [];
  const root = path.resolve(projectRoot || '.');
  for (const entry of entries || []) {
    const relativePath = text(entry.filename).replace(/\\/g, '/');
    const absolutePath = path.resolve(root, relativePath);
    const relativeToRoot = path.relative(root, absolutePath);
    const isInsideRoot = relativeToRoot
      && !relativeToRoot.startsWith(`..${path.sep}`)
      && relativeToRoot !== '..'
      && !path.isAbsolute(relativeToRoot);
    if (!isInsideRoot || !existsSync(absolutePath)) {
      errors.push(`Target audio file is missing: ${relativePath || '(blank)'}.`);
      continue;
    }
    const audioBytes = readFileSync(absolutePath);
    const digest = crypto.createHash('sha256').update(audioBytes).digest('hex');
    if (!entry.fileSha256 || digest !== entry.fileSha256) {
      errors.push(`Target audio file SHA-256 does not match its manifest: ${relativePath}.`);
    }
    for (const failure of validateAudio(audioBytes, relativePath) || []) {
      errors.push(`Target audio file failed MP3 validation: ${failure.message || failure}`);
    }
  }
  return errors;
}

module.exports = {
  buildCourseCandidateStagingPlan,
  serializeCourseProductionAudioRegistry,
  validateTargetAudioFiles,
};
