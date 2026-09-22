'use strict';

const LANES = [
  { id: 'english', title: 'English speakers', color: '#22B65D' },
  { id: 'french', title: 'French speakers', color: '#F4B942' },
  { id: 'arabic', title: 'Arabic speakers', color: '#1CB0F6' },
];

function availableLabel(course) {
  return course.published ? course.label : `${course.label} (preview)`;
}

function buildWelcomeCourseSummary(courses) {
  const onboardingCourses = courses.filter(course => course.onboarding);
  const available = onboardingCourses.filter(course => course.available === true);
  return {
    headline: available.length
      ? `${available.length} ${available.length === 1 ? 'course' : 'courses'} to explore`
      : 'Courses in preparation',
    description: available.length
      ? [
        `Start with ${available.map(availableLabel).join(', ')}.`,
        onboardingCourses.length > available.length ? 'More languages are in preparation.' : '',
        available.some(course => !course.published) ? 'Preview lessons still await native-speaker review.' : '',
      ].filter(Boolean).join(' ')
      : 'We are preparing African and Caribbean language courses. Lessons will open as they become ready.',
    lanes: LANES.flatMap(lane => {
      const entries = onboardingCourses.filter(course => course.baseLanguage === lane.id);
      if (!entries.length) return [];
      const ready = entries.filter(course => course.available === true);
      const pending = entries.filter(course => course.available !== true);
      return [{
        ...lane,
        caption: entries.map(course => course.label).join(' / '),
        detail: [
          ready.length ? `Explore: ${ready.map(availableLabel).join(', ')}.` : '',
          pending.length ? `In preparation: ${pending.map(course => course.label).join(', ')}.` : '',
        ].filter(Boolean).join(' '),
      }];
    }),
  };
}

module.exports = { buildWelcomeCourseSummary };
