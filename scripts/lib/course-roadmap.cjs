'use strict';

const aliases = new Map([
  ['patois', 'jamaican-patois'], ['haitian', 'haitian-creole'],
  ['belizean', 'belizean-kriol'], ['sudanese', 'sudanese-arabic'],
]);
const key = (language, id) => JSON.stringify([language, id]);

function buildCourseRoadmap({ languages, units, lessons, vocabulary }) {
  const languageIds = new Set(languages.map((row) => row.language_id));
  const unitKeys = new Set();
  const lessonKeys = new Set();
  for (const unit of units) {
    if (!languageIds.has(unit.language_id)) throw new Error(`Unknown language: ${unit.language_id}`);
    const id = key(unit.language_id, unit.unit_id);
    if (unitKeys.has(id)) throw new Error(`Duplicate unit: ${unit.unit_id}`);
    unitKeys.add(id);
  }
  for (const lesson of lessons) {
    if (!unitKeys.has(key(lesson.language_id, lesson.unit_id))) throw new Error(`Unknown unit: ${lesson.unit_id}`);
    const id = key(lesson.language_id, lesson.lesson_id);
    if (lessonKeys.has(id)) throw new Error(`Duplicate lesson: ${lesson.lesson_id}`);
    lessonKeys.add(id);
  }
  const wordsByLesson = new Map();
  for (const word of vocabulary) {
    const id = key(word.language_id, word.lesson_id);
    if (!lessonKeys.has(id)) throw new Error(`Unknown lesson: ${word.lesson_id}`);
    if (!wordsByLesson.has(id)) wordsByLesson.set(id, []);
    wordsByLesson.get(id).push(word);
  }
  return languages.map((language) => ({
    id: aliases.get(language.language_id) || language.language_id,
    title: String(language.language_name),
    units: units.filter((unit) => unit.language_id === language.language_id)
      .sort((a, b) => Number(a.unit_number) - Number(b.unit_number))
      .map((unit) => ({
        id: unit.unit_id, number: Number(unit.unit_number), title: String(unit.unit_title),
        section: String(unit.section_title || ''), objective: String(unit.objective || ''),
        lessons: lessons.filter((lesson) => lesson.language_id === language.language_id && lesson.unit_id === unit.unit_id)
          .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number))
          .map((lesson) => {
            const words = wordsByLesson.get(key(language.language_id, lesson.lesson_id)) || [];
            const missingTranslations = words.filter((word) => !String(word.target_text || '').trim()).length;
            return {
              id: lesson.lesson_id, number: Number(lesson.lesson_number), title: String(lesson.lesson_title),
              type: String(lesson.lesson_type), xp: Number(lesson.xp_reward),
              wordCount: words.length, missingTranslations,
              status: missingTranslations || !words.length ? 'translation-needed' : 'review-needed',
            };
          }),
      })),
  }));
}

module.exports = { buildCourseRoadmap };
