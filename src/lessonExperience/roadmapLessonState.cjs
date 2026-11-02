'use strict';

function getRoadmapLessonState(lesson, topics = [], progressReady = false) {
  const topic = topics.find(item => item.id === lesson.id) || null;
  if (!topic) return { topic, canOpen: false, icon: 'lock-closed-outline',
    label: lesson.status === 'translation-needed' ? 'Translation in preparation' : 'Language review pending' };
  const canOpen = progressReady && ['active', 'complete'].includes(topic.state);
  return { topic, canOpen,
    icon: !canOpen ? 'lock-closed-outline' : topic.state === 'complete' ? 'checkmark-circle-outline' : 'play-circle-outline',
    label: !progressReady ? 'Loading saved progress' : topic.state === 'complete' ? 'Completed draft lesson'
      : canOpen ? 'Play draft lesson' : 'Complete the previous lesson first' };
}

module.exports = { getRoadmapLessonState };
