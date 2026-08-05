const { getCoursePresentationMetadata } = require('./coursePresentationContract.cjs');

const COURSE_HERO_SOURCES = Object.freeze({
  'jamaican-patois': require('../../assets/images/chapters/jamaican-patois-greetings.png'),
  swahili: require('../../assets/images/chapters/swahili-greetings.png'),
  wolof: require('../../assets/images/chapters/wolof-greetings.png'),
  'haitian-creole': require('../../assets/images/chapters/haitian-creole-greetings.png'),
  'sudanese-arabic': require('../../assets/images/chapters/sudanese-arabic-greetings.png'),
  nobiin: require('../../assets/images/chapters/nobiin-greetings.png'),
});

export function getCoursePresentation(courseId) {
  const metadata = getCoursePresentationMetadata(courseId);
  if (!metadata || !Object.prototype.hasOwnProperty.call(COURSE_HERO_SOURCES, courseId)) {
    return null;
  }
  return Object.freeze({
    ...metadata,
    hero: COURSE_HERO_SOURCES[courseId],
  });
}
