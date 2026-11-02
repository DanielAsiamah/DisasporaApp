'use strict';

const normalize = value => String(value || '').normalize('NFC').trim();
const meaningKey = value => normalize(value).toLowerCase();
const tokens = value => normalize(value).split(/\s+/).filter(Boolean);

function buildMasterPreview({ languages, units, lessons, vocabulary }, manifest, sourceRows) {
  if (manifest.schemaVersion !== 1 || manifest.reviewStatus !== 'needs-native-review') {
    throw new Error('Master preview requires schema 1 and pending native review.');
  }
  const byId = new Map(vocabulary.map(row => [row.content_id, row]));
  const candidates = new Map();
  for (const candidate of manifest.candidates) {
    const row = byId.get(candidate.contentId);
    if (!row) throw new Error(`Unknown master content ID: ${candidate.contentId}`);
    if (candidates.has(candidate.contentId)) throw new Error(`Duplicate candidate: ${candidate.contentId}`);
    if (meaningKey(candidate.english) !== meaningKey(row.english_source)) {
      throw new Error(`Workbook meaning mismatch: ${candidate.contentId}`);
    }
    const sourcePairExists = sourceRows.some((source, index) => (
      source.Front === candidate.sourcePrompt && source.Back === candidate.sourcePrompt
      && sourceRows[index + 1]?.Front === candidate.sourceResponse
      && sourceRows[index + 1]?.Back === candidate.sourceResponse
    ));
    const localized = normalize(candidate.localized);
    if (!sourcePairExists || !localized || ![candidate.sourcePrompt, candidate.sourceResponse]
      .some(text => normalize(text).includes(localized))) {
      throw new Error(`Translation must be traceable to the exact source pair: ${candidate.contentId}`);
    }
    candidates.set(candidate.contentId, { ...candidate, localized });
  }

  const result = { courses: [], concepts: [], courseVocabulary: [], chapters: [], topics: [], lessonSteps: [] };
  for (const language of languages) {
    const courseId = language.language_id;
    const orderedLessons = lessons.filter(row => row.language_id === courseId)
      .sort((a, b) => a.unit_number - b.unit_number || a.lesson_number - b.lesson_number);
    const ready = [];
    // Never skip an untranslated lesson to unlock a later part of the course.
    for (const lesson of orderedLessons) {
      const items = vocabulary.filter(row => row.lesson_id === lesson.lesson_id)
        .sort((a, b) => a.item_order - b.item_order);
      if (items.length < 3 || items.some(row => !candidates.has(row.content_id))) break;
      if (items.some(row => row.language_id !== courseId || row.unit_id !== lesson.unit_id)) {
        throw new Error(`Workbook lesson ownership mismatch: ${lesson.lesson_id}`);
      }
      ready.push({ lesson, items });
    }
    if (!ready.length) continue;
    result.courses.push({ id: courseId, displayName: language.language_name, baseLanguage: language.base_language,
      writingSystem: language.script, availability: 'unavailable' });
    for (const [index, { lesson, items }] of ready.entries()) {
      const topicId = lesson.lesson_id;
      result.topics.push({ courseId, id: topicId, title: lesson.lesson_title, order: index + 1,
        type: 'lesson', unlockRequirement: index, guide: index % 2 ? 'Ayo' : 'Amara', conceptCount: items.length });
      for (const row of items) {
        const candidate = candidates.get(row.content_id);
        result.concepts.push({ id: row.content_id, meaning: row.english_source, topicId, topicOrder: index + 1, order: row.item_order });
        result.courseVocabulary.push({ courseId, conceptId: row.content_id, localized: candidate.localized,
          pronunciation: '', scriptAid: '', image: '', audio: '', voiceId: '', reviewStatus: manifest.reviewStatus,
          publicationState: 'unavailable', order: row.item_order, usageNote: candidate.usageNote || '',
          source: { path: manifest.sourcePath, sha256: manifest.sourceSha256,
            prompt: candidate.sourcePrompt, response: candidate.sourceResponse } });
      }
      const steps = [];
      const add = (kind, row, prompt, answer, distractors) => steps.push({
        courseId, topicId, id: `${topicId}_${kind}_${row?.content_id || 'pairs'}`,
        order: steps.length + 1, exerciseType: kind, prompt, answer, distractors,
        conceptId: row?.content_id || null, conceptRefs: row ? [row.content_id] : items.map(item => item.content_id),
        voiceId: '', primary: true, publicationState: 'unavailable',
      });
      for (const row of items) {
        add('translate-to-meaning', row, `What does "${candidates.get(row.content_id).localized}" mean?`,
          row.english_source, items.filter(other => other !== row).map(other => other.english_source));
      }
      add('match-pairs', null, `Match each ${language.language_name} phrase to its English meaning.`, '__matched__', []);
      for (const row of items.filter(item => tokens(candidates.get(item.content_id).localized).length > 1).slice(0, 2)) {
        add('sentence-build-target', row, `Build the ${language.language_name} phrase for "${row.english_source}".`,
          candidates.get(row.content_id).localized, items.filter(other => other !== row).map(other => candidates.get(other.content_id).localized));
      }
      const meaningPhrase = items.find(item => tokens(item.english_source).length > 1);
      if (meaningPhrase) add('word-tray-meaning', meaningPhrase,
        `Build the English meaning of "${candidates.get(meaningPhrase.content_id).localized}".`,
        meaningPhrase.english_source, items.filter(other => other !== meaningPhrase).map(other => other.english_source));
      result.lessonSteps.push(...steps);
    }
    for (const unit of units.filter(row => row.language_id === courseId)) {
      const unitReady = ready.filter(({ lesson }) => lesson.unit_id === unit.unit_id);
      if (!unitReady.length) continue;
      const plannedTopicCount = orderedLessons.filter(row => row.unit_id === unit.unit_id).length;
      result.chapters.push({ courseId, id: unit.unit_id, title: unit.unit_title, heroAsset: '',
        topicCount: unitReady.length, plannedTopicCount, wordCount: unitReady.reduce((sum, row) => sum + row.items.length, 0),
        publicationState: 'unavailable',
        coverageNote: `${unitReady.length} of ${plannedTopicCount} planned lessons available as text drafts. Native review and pronunciation audio are pending.` });
    }
  }
  return result;
}

module.exports = { buildMasterPreview };
