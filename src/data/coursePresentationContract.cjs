const COURSE_PRESENTATIONS = Object.freeze({
  'jamaican-patois': Object.freeze({
    flag: '\u{1F1EF}\u{1F1F2}',
    heroAsset: 'assets/images/chapters/jamaican-patois-greetings.png',
  }),
  swahili: Object.freeze({
    flag: '\u{1F1F0}\u{1F1EA}',
    heroAsset: 'assets/images/chapters/swahili-greetings.png',
  }),
  wolof: Object.freeze({
    flag: '\u{1F1F8}\u{1F1F3}',
    heroAsset: 'assets/images/chapters/wolof-greetings.png',
  }),
  'haitian-creole': Object.freeze({
    flag: '\u{1F1ED}\u{1F1F9}',
    heroAsset: 'assets/images/chapters/haitian-creole-greetings.png',
  }),
  'sudanese-arabic': Object.freeze({
    flag: '\u{1F1F8}\u{1F1E9}',
    heroAsset: 'assets/images/chapters/sudanese-arabic-greetings.png',
  }),
});

function getCoursePresentationMetadata(courseId) {
  if (!courseId || !Object.prototype.hasOwnProperty.call(COURSE_PRESENTATIONS, courseId)) {
    return null;
  }
  return COURSE_PRESENTATIONS[courseId];
}

module.exports = {
  COURSE_PRESENTATIONS,
  getCoursePresentationMetadata,
};
