const { GENERATED_CURRICULUM } = require('../data/generatedCurriculum.cjs');

const LESSON_EXERCISE_TYPES = Object.freeze({
  TRANSLATE_CHOICE: 'translate-choice',
  MATCH_PAIRS: 'match-pairs',
  SENTENCE_BUILD: 'sentence-build',
  WORD_TRAY: 'word-tray',
  LISTEN_CHOICE: 'listen-choice',
});

const DEFAULT_CONCEPTS = GENERATED_CURRICULUM.concepts;
const DEFAULT_VOCABULARY = GENERATED_CURRICULUM.courseVocabulary.filter(({ courseId }) => courseId === 'jamaican-patois');
const DEFAULT_STEPS = GENERATED_CURRICULUM.lessonSteps;

function stableHash(value) {
  return String(value).split('').reduce((hash, character) => (
    (Math.imul(hash ^ character.charCodeAt(0), 16777619)) >>> 0
  ), 2166136261);
}

function stableShuffle(values, seed) {
  const items = [...values];
  let state = stableHash(seed);
  for (let index = items.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function tokenizeAnswer(answer) {
  return String(answer || '')
    .replace(/[.,!?;:…]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildChoices(answer, distractors, seed) {
  return stableShuffle(
    [answer, ...unique(distractors).filter((value) => value !== answer).slice(0, 3)],
    `${seed}-choices`
  );
}

function buildWordBank(answer, distractors, seed) {
  const answerTokens = tokenizeAnswer(answer);
  const answerKeys = new Set(answerTokens.map((token) => token.toLowerCase()));
  const extras = unique(distractors.flatMap(tokenizeAnswer))
    .filter((token) => !answerKeys.has(token.toLowerCase()))
    .slice(0, Math.max(2, 7 - answerTokens.length));
  return stableShuffle([...answerTokens, ...extras], `${seed}-bank`);
}

function createMatchExercise(step, conceptById, vocabularyById) {
  const pairs = step.conceptRefs.map((conceptId) => ({
    conceptId,
    localized: vocabularyById.get(conceptId)?.localized,
    meaning: conceptById.get(conceptId)?.meaning,
  })).filter(({ localized, meaning }) => localized && meaning);
  return {
    id: step.id,
    sourceStepId: step.id,
    type: LESSON_EXERCISE_TYPES.MATCH_PAIRS,
    title: 'Match each phrase',
    prompt: step.prompt,
    answer: '__matched__',
    primary: step.primary,
    pairs,
    leftItems: stableShuffle(pairs.map((pair) => ({
      id: `left-${pair.conceptId}`,
      pairId: pair.conceptId,
      value: pair.localized,
    })), `${step.id}-left`),
    rightItems: stableShuffle(pairs.map((pair) => ({
      id: `right-${pair.conceptId}`,
      pairId: pair.conceptId,
      value: pair.meaning,
    })), `${step.id}-right`),
  };
}

function createChoiceExercise(step, row, type, prompt = step.prompt) {
  return {
    id: step.id,
    sourceStepId: step.id,
    type,
    title: type === LESSON_EXERCISE_TYPES.LISTEN_CHOICE ? 'Listen and choose' : 'Choose the correct answer',
    prompt,
    answer: step.answer,
    choices: buildChoices(step.answer, step.distractors, step.id),
    conceptId: step.conceptId,
    imageConceptId: step.conceptId,
    primary: step.primary,
    pronunciation: row?.pronunciation,
    voiceId: row?.voiceId || step.voiceId,
    audioPath: row?.audio,
  };
}

function createExercise(step, conceptById, vocabularyById, hasAudio, courseDisplayName = 'Jamaican Patois') {
  if (step.exerciseType === 'match-pairs') return createMatchExercise(step, conceptById, vocabularyById);

  const row = vocabularyById.get(step.conceptId);
  const common = {
    id: step.id,
    sourceStepId: step.id,
    conceptId: step.conceptId,
    imageConceptId: step.conceptId,
    primary: step.primary,
    pronunciation: row?.pronunciation,
    voiceId: row?.voiceId || step.voiceId,
    audioPath: row?.audio,
  };

  if (step.exerciseType === 'sentence-build-target') {
    return {
      ...common,
      type: LESSON_EXERCISE_TYPES.SENTENCE_BUILD,
      title: `Build the ${courseDisplayName} phrase`,
      prompt: step.prompt,
      answer: step.answer,
      answerTokens: tokenizeAnswer(step.answer),
      wordBank: buildWordBank(step.answer, step.distractors, step.id),
    };
  }

  if (step.exerciseType === 'word-tray-meaning') {
    return {
      ...common,
      type: LESSON_EXERCISE_TYPES.WORD_TRAY,
      title: 'Build the English meaning',
      prompt: step.prompt,
      answer: step.answer,
      answerTokens: tokenizeAnswer(step.answer),
      wordBank: buildWordBank(step.answer, step.distractors, step.id),
    };
  }

  if (step.exerciseType === 'listen-choice') {
    if (hasAudio(step.conceptId, row)) {
      return createChoiceExercise(step, row, LESSON_EXERCISE_TYPES.LISTEN_CHOICE);
    }
    const localized = row?.localized || conceptById.get(step.conceptId)?.meaning || '';
    return createChoiceExercise(
      step,
      row,
      LESSON_EXERCISE_TYPES.TRANSLATE_CHOICE,
      `What does "${localized}" mean?`
    );
  }

  return createChoiceExercise(step, row, LESSON_EXERCISE_TYPES.TRANSLATE_CHOICE);
}

function localizedDistractors(conceptIds, vocabularyById, excludedId, seed) {
  return stableShuffle(
    conceptIds
      .filter((conceptId) => conceptId !== excludedId)
      .map((conceptId) => vocabularyById.get(conceptId)?.localized)
      .filter(Boolean),
    `${seed}-localized-distractors`
  ).slice(0, 3);
}

function meaningDistractors(conceptIds, conceptById, excludedId, seed) {
  return stableShuffle(
    conceptIds
      .filter((conceptId) => conceptId !== excludedId)
      .map((conceptId) => conceptById.get(conceptId)?.meaning)
      .filter(Boolean),
    `${seed}-meaning-distractors`
  ).slice(0, 3);
}

function materializeCourseStep(template, {
  conceptById,
  courseDisplayName,
  courseId,
  topicConceptIds,
  vocabularyById,
}) {
  if (template.courseId === courseId) return template;

  const concept = conceptById.get(template.conceptId);
  const row = vocabularyById.get(template.conceptId);
  const meaning = concept?.meaning || template.answer;
  const localized = row?.localized || '';
  const usesTargetAnswer = ['sentence-build-target', 'translate-to-target'].includes(template.exerciseType);
  const distractors = usesTargetAnswer
    ? localizedDistractors(topicConceptIds, vocabularyById, template.conceptId, template.id)
    : meaningDistractors(topicConceptIds, conceptById, template.conceptId, template.id);
  let prompt = template.prompt;
  if (template.exerciseType === 'translate-to-meaning') prompt = `What does "${localized}" mean?`;
  if (template.exerciseType === 'sentence-build-target') prompt = `Build the ${courseDisplayName} phrase for "${meaning}".`;
  if (template.exerciseType === 'match-pairs') prompt = `Match each ${courseDisplayName} phrase to its English meaning.`;
  if (template.exerciseType === 'word-tray-meaning') prompt = `Build the English meaning of "${localized}".`;
  if (template.exerciseType === 'translate-to-target') prompt = `Choose the ${courseDisplayName} for "${meaning}".`;

  return {
    ...template,
    courseId,
    id: template.id.replace(/^jamaican-patois-/, `${courseId}-`),
    prompt,
    answer: template.exerciseType === 'match-pairs' ? '__matched__' : usesTargetAnswer ? localized : meaning,
    distractors: template.exerciseType === 'match-pairs' ? [] : distractors,
    voiceId: '',
    publicationState: 'unavailable',
  };
}

function materializeCourseLessonSteps(courseId, {
  concepts = DEFAULT_CONCEPTS,
  vocabulary = GENERATED_CURRICULUM.courseVocabulary.filter((row) => row.courseId === courseId),
  lessonSteps = DEFAULT_STEPS,
} = {}) {
  const conceptById = new Map(concepts.map((concept) => [concept.id, concept]));
  const vocabularyById = new Map(vocabulary.map((row) => [row.conceptId, row]));
  const courseDisplayName = GENERATED_CURRICULUM.courses.find((course) => course.id === courseId)?.displayName || courseId;
  const courseSteps = lessonSteps.filter((step) => step.courseId === courseId);
  const templateSteps = courseSteps.length
    ? courseSteps
    : lessonSteps.filter((step) => step.courseId === 'jamaican-patois');
  const conceptIdsByTopic = new Map();

  for (const step of templateSteps) {
    const ids = conceptIdsByTopic.get(step.topicId) || [];
    conceptIdsByTopic.set(step.topicId, unique([...ids, ...(step.conceptRefs || [])]));
  }

  return templateSteps.map((step) => materializeCourseStep(step, {
    conceptById,
    courseDisplayName,
    courseId,
    topicConceptIds: conceptIdsByTopic.get(step.topicId) || [],
    vocabularyById,
  }));
}

function buildCourseTopicExercises(courseId, topicId, {
  concepts = DEFAULT_CONCEPTS,
  vocabulary = GENERATED_CURRICULUM.courseVocabulary.filter((row) => row.courseId === courseId),
  lessonSteps = DEFAULT_STEPS,
  hasAudio = () => false,
} = {}) {
  const conceptById = new Map(concepts.map((concept) => [concept.id, concept]));
  const vocabularyById = new Map(vocabulary.map((row) => [row.conceptId, row]));
  const courseDisplayName = GENERATED_CURRICULUM.courses.find((course) => course.id === courseId)?.displayName || courseId;
  return materializeCourseLessonSteps(courseId, { concepts, vocabulary, lessonSteps })
    .filter((step) => step.topicId === topicId)
    .sort((left, right) => left.order - right.order)
    .map((step) => createExercise(step, conceptById, vocabularyById, hasAudio, courseDisplayName));
}

function buildPatoisTopicExercises(topicId, options = {}) {
  return buildCourseTopicExercises('jamaican-patois', topicId, {
    concepts: options.concepts || DEFAULT_CONCEPTS,
    vocabulary: options.vocabulary || DEFAULT_VOCABULARY,
    lessonSteps: options.lessonSteps || DEFAULT_STEPS,
    hasAudio: options.hasAudio || (() => false),
  });
}

module.exports = {
  LESSON_EXERCISE_TYPES,
  buildCourseTopicExercises,
  buildPatoisTopicExercises,
  materializeCourseLessonSteps,
  tokenizeAnswer,
};
