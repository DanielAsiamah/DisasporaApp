const fs = require('fs');
const path = require('path');
const vm = require('vm');

const projectRoot = path.resolve(__dirname, '..');
const generatedCoursesPath = path.join(projectRoot, 'src', 'data', 'generatedCourses.js');
const imageRoot = path.join(projectRoot, 'assets', 'images', 'vocab');
const outputPath = path.join(projectRoot, 'outputs', 'firestore-content-seed.json');

const STEP_TYPES = {
  INTRO_CUTSCENE: 'intro_cutscene',
  VOCABULARY_CARD: 'vocabulary_card',
  AUDIO_LISTEN: 'audio_listen',
  MULTIPLE_CHOICE: 'multiple_choice',
  MATCH_PAIRS: 'match_pairs',
  BUILD_SENTENCE: 'build_sentence',
  IMAGE_CHOICE: 'image_choice',
  WRONG_ANSWER_FEEDBACK: 'wrong_answer_feedback',
  LESSON_COMPLETE: 'lesson_complete',
};

function loadGeneratedCourses() {
  const source = fs.readFileSync(generatedCoursesPath, 'utf8')
    .replace('export const coursesData =', 'const coursesData =');
  const sandbox = {};

  vm.runInNewContext(`${source}\nresult = coursesData;`, sandbox);
  return sandbox.result;
}

function cleanCourseDoc(courseId, course) {
  const { units, ...courseDoc } = course;
  return {
    id: courseId,
    status: course.status || 'published',
    ...courseDoc,
  };
}

function cleanUnitDoc(courseId, unit) {
  const { lessons, ...unitDoc } = unit;
  return {
    ...unitDoc,
    courseId,
    lessonCount: (lessons || []).filter((lesson) => lesson.type !== 'chest').length,
  };
}

function cleanImageName(value) {
  return String(value ?? '').trim().split(/[\\/]/).pop();
}

function hasVocabImageSource(imageKey, category) {
  const filename = cleanImageName(imageKey);
  if (!filename) return false;

  const exactPath = path.join(imageRoot, String(category || '').toLowerCase(), filename);
  if (fs.existsSync(exactPath)) return true;

  const categories = fs.existsSync(imageRoot)
    ? fs.readdirSync(imageRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory())
    : [];

  return categories.some((entry) => fs.existsSync(path.join(imageRoot, entry.name, filename)));
}

function wordsFromAnswer(answer = '') {
  return String(answer)
    .replace(/[?!.,/]/g, '')
    .split(/\s+/)
    .filter(Boolean);
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function choiceSet(answer, alternatives) {
  return uniqueValues([answer, ...alternatives]).slice(0, 4);
}

function wordBank(answer, alternatives) {
  const answerWords = wordsFromAnswer(answer);
  const answerKeys = answerWords.map((word) => word.toLowerCase());
  const extras = alternatives
    .flatMap(wordsFromAnswer)
    .filter((word) => !answerKeys.includes(word.toLowerCase()));

  return [...answerWords, ...uniqueValues(extras).slice(0, Math.max(2, 7 - answerWords.length))];
}

function getSourcePool(lesson, phrasePool = []) {
  const seen = new Set();
  const usablePool = [...(lesson?.items || []), ...phrasePool].filter((item) => {
    if (item?.type === 'chest' || !item?.phrase || !item?.meaning) return false;
    const key = item.id || `${item.phrase}|${item.meaning}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return usablePool.length ? usablePool : [lesson].filter(Boolean);
}

function stripTeachingItem(item) {
  return {
    id: item.id || null,
    phrase: item.phrase || null,
    meaning: item.meaning || null,
    note: item.note || null,
    audioKey: item.audioKey || null,
    imageKey: item.imageKey || null,
    category: item.category || null,
  };
}

function createTeachingItems(lesson, phrasePool = []) {
  if (lesson?.items?.length) {
    return lesson.items.slice(0, 3).map(stripTeachingItem);
  }

  const sourcePool = getSourcePool(lesson, phrasePool);
  const startIndex = Math.max(0, sourcePool.findIndex((item) => item.id === lesson.id));

  return [0, 1, 2]
    .map((offset) => sourcePool[(startIndex + offset) % sourcePool.length])
    .filter(Boolean)
    .map(stripTeachingItem);
}

function pronunciationFromNote(note) {
  return String(note || '').replace(/^Pronounced:\s*/i, '').trim();
}

function createImageChoiceStep(target, sourcePool = [], order) {
  if (!target?.imageKey || !hasVocabImageSource(target.imageKey, target.category)) return null;

  const candidates = sourcePool
    .filter((item) => item?.meaning && item?.imageKey && hasVocabImageSource(item.imageKey, item.category));
  const sameCategory = candidates.filter((item) => item.category === target.category);
  const choicePool = sameCategory.length >= 4 ? sameCategory : candidates;
  const otherChoices = choicePool.filter((item) => item.id !== target.id);

  if (otherChoices.length < 3) return null;

  return {
    id: `image-choice-${target.id}`,
    order,
    type: STEP_TYPES.IMAGE_CHOICE,
    title: 'Select the correct image',
    prompt: target.phrase,
    answer: target.meaning,
    imageChoices: [target, ...otherChoices.slice(0, 3)].map((item) => ({
      value: item.meaning,
      imageKey: item.imageKey,
      category: item.category,
    })),
    audioKey: target.audioKey,
    note: target.note,
    wrongFeedback: createWrongFeedback(target.meaning),
  };
}

function createFirstAvailableImageChoiceStep(sourcePool = [], startIndex, order) {
  for (let offset = 0; offset < sourcePool.length; offset += 1) {
    const item = sourcePool[(startIndex + offset) % sourcePool.length];
    const step = createImageChoiceStep(item, sourcePool, order);
    if (step) return step;
  }

  return null;
}

function createMatchPairsStep(sourcePool = [], startIndex, order) {
  const pairs = [...sourcePool.slice(startIndex), ...sourcePool.slice(0, startIndex)]
    .filter((item, index, items) => (
      item?.phrase
      && item?.meaning
      && items.findIndex((candidate) => candidate.id === item.id) === index
    ))
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      left: item.phrase,
      right: item.meaning,
      audioKey: item.audioKey,
    }));

  if (pairs.length < 3) return null;

  return {
    id: `match-pairs-${sourcePool[startIndex]?.id || order}`,
    order,
    type: STEP_TYPES.MATCH_PAIRS,
    title: 'Match each phrase',
    prompt: 'Tap a phrase, then its meaning',
    answer: '__matched__',
    pairs,
    leftItems: pairs.map((pair) => ({ id: pair.id, value: pair.left, pairId: pair.id, audioKey: pair.audioKey })),
    rightItems: pairs.map((pair) => ({ id: `${pair.id}-meaning`, value: pair.right, pairId: pair.id })),
  };
}

function createWrongFeedback(correctAnswer) {
  return {
    type: STEP_TYPES.WRONG_ANSWER_FEEDBACK,
    variant: 'coach',
    eyebrow: 'Tutor correction',
    title: 'Good miss. Now you know.',
    body: `The correct answer is "${correctAnswer}". Mistakes help your brain notice the difference next time.`,
  };
}

function createCorrectCutscene(item, languageId, order) {
  const phrase = item?.phrase || 'this phrase';
  const meaning = item?.meaning || 'the meaning';

  return {
    id: `correct-cutscene-${item?.id || order}`,
    type: STEP_TYPES.VOCABULARY_CARD,
    variant: 'vocab',
    eyebrow: 'Phrase check',
    phrase,
    pronunciation: pronunciationFromNote(item?.note) || 'Listen and repeat',
    body: `${phrase} means "${meaning}". Try saying it once before the next challenge.`,
    audioKey: item?.audioKey || null,
    languageId,
  };
}

function createLessonSteps(courseId, lesson, phrasePool = []) {
  const sourcePool = getSourcePool(lesson, phrasePool);
  const teachingItems = createTeachingItems(lesson, phrasePool);
  const lessonTargets = lesson?.items?.length ? lesson.items : sourcePool;
  const startIndex = Math.max(0, sourcePool.findIndex((item) => item.id === lessonTargets[0]?.id));
  const pick = (offset) => lessonTargets[offset % lessonTargets.length] || lesson;
  const meanings = sourcePool.map((item) => item.meaning);
  const phrases = sourcePool.map((item) => item.phrase);
  const first = pick(0);
  const second = pick(1);
  const third = pick(2);
  const fourth = pick(3);
  let order = 0;
  const practiceSteps = [
    {
      id: `meaning-choice-${first.id}`,
      order: order += 1,
      type: STEP_TYPES.MULTIPLE_CHOICE,
      title: 'Choose the correct meaning',
      prompt: first.phrase,
      answer: first.meaning,
      choices: choiceSet(first.meaning, meanings.filter((value) => value !== first.meaning)),
      audioKey: first.audioKey,
      note: first.note,
      correctCutscene: createCorrectCutscene(first, courseId, order),
      wrongFeedback: createWrongFeedback(first.meaning),
    },
    createFirstAvailableImageChoiceStep(sourcePool, startIndex, order += 1),
    createMatchPairsStep(lessonTargets, 0, order += 1),
    {
      id: `reverse-choice-${second.id}`,
      order: order += 1,
      type: STEP_TYPES.MULTIPLE_CHOICE,
      title: `How do you say "${second.meaning}"?`,
      prompt: second.meaning,
      answer: second.phrase,
      choices: choiceSet(second.phrase, phrases.filter((value) => value !== second.phrase)),
      note: second.note,
      wrongFeedback: createWrongFeedback(second.phrase),
    },
    third?.audioKey ? {
      id: `listen-choice-${third.id}`,
      order: order += 1,
      type: STEP_TYPES.AUDIO_LISTEN,
      title: 'Listen and choose the meaning',
      prompt: 'Tap the speaker to hear the phrase',
      answer: third.meaning,
      choices: choiceSet(third.meaning, meanings.filter((value) => value !== third.meaning)),
      audioKey: third.audioKey,
      audioLabel: 'Play the phrase',
      note: third.note,
      wrongFeedback: {
        type: STEP_TYPES.WRONG_ANSWER_FEEDBACK,
        variant: 'fact',
        title: 'Listening tip',
        body: `If you cannot listen right now, use the small arrow under the speaker to reveal the phrase. The correct answer is "${third.meaning}".`,
      },
    } : null,
    {
      id: `build-meaning-${fourth.id}`,
      order: order += 1,
      type: STEP_TYPES.BUILD_SENTENCE,
      title: 'Build the English meaning',
      prompt: fourth.phrase,
      answer: fourth.meaning,
      wordBank: wordBank(fourth.meaning, meanings),
      audioKey: fourth.audioKey,
      note: fourth.note,
      wrongFeedback: createWrongFeedback(fourth.meaning),
    },
    {
      id: `build-phrase-${first.id}`,
      order: order += 1,
      type: STEP_TYPES.BUILD_SENTENCE,
      title: `Build the ${courseId === 'patois' ? 'Patois' : 'language'} phrase`,
      prompt: first.meaning,
      answer: first.phrase,
      wordBank: wordBank(first.phrase, phrases),
      note: first.note,
      wrongFeedback: createWrongFeedback(first.phrase),
    },
  ].filter(Boolean);

  return [
    {
      id: 'lesson-intro',
      order: 0,
      type: STEP_TYPES.INTRO_CUTSCENE,
      topic: lesson?.title || lesson?.meaning,
      items: teachingItems,
    },
    ...teachingItems.map((item, index) => ({
      id: `vocabulary-card-${index}`,
      order: index + 0.1,
      type: STEP_TYPES.VOCABULARY_CARD,
      phrase: item.phrase,
      meaning: item.meaning,
      note: item.note,
      audioKey: item.audioKey,
      sourceItem: item,
    })),
    ...practiceSteps,
    {
      id: 'lesson-complete',
      order: 999,
      type: STEP_TYPES.LESSON_COMPLETE,
    },
  ];
}

function cleanLessonDoc(courseId, unit, lesson, phrasePool) {
  const { items, ...lessonFields } = lesson;
  const lessonDoc = {
    ...lessonFields,
    courseId,
    unitId: unit.id,
    unitTitle: unit.description || unit.title || null,
  };

  if (lesson.type !== 'chest' && lesson.type !== 'trophy') {
    lessonDoc.steps = createLessonSteps(courseId, lesson, phrasePool);
  }

  return lessonDoc;
}

function buildSeed(coursesData) {
  const seed = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    collections: {
      languages: {},
    },
  };

  Object.entries(coursesData).forEach(([courseId, course]) => {
    const courseDoc = cleanCourseDoc(courseId, course);
    const units = {};

    (course.units || []).forEach((unit) => {
      const lessons = {};

      const vocabularyById = new Map((unit.vocabulary || []).map((item) => [item.id, item]));
      const phrasePool = unit.vocabulary || [];

      (unit.lessons || []).forEach((rawLesson) => {
        const lesson = {
          ...rawLesson,
          items: rawLesson.items?.length
            ? rawLesson.items
            : (rawLesson.itemIds || []).map((id) => vocabularyById.get(id)).filter(Boolean),
        };
        lessons[lesson.id] = cleanLessonDoc(courseId, unit, lesson, phrasePool);
      });

      units[unit.id] = {
        ...cleanUnitDoc(courseId, unit),
        lessons,
      };
    });

    seed.collections.languages[courseId] = {
      ...courseDoc,
      units,
    };
  });

  return seed;
}

function main() {
  const coursesData = loadGeneratedCourses();
  const seed = buildSeed(coursesData);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(seed, null, 2));

  const languageCount = Object.keys(seed.collections.languages).length;
  console.log(`Generated Firestore content seed for ${languageCount} language(s): ${outputPath}`);
}

main();
