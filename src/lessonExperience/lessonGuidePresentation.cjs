'use strict';

const GUIDE_NAMES = Object.freeze(['Kai', 'Nia', 'Kofi', 'Amara', 'Sol', 'Ayo', 'Safiya']);

function getPromptGuideName(topicGuide, index = 0) {
  const lead = GUIDE_NAMES.includes(topicGuide) ? topicGuide : 'Kai';
  const cast = [lead, ...GUIDE_NAMES.filter(name => name !== lead)];
  const position = Number.isSafeInteger(index) && index >= 0 ? index : 0;
  return cast[position % cast.length];
}

const STILL = {
  duration: 0, loop: false, inputRange: [0, 1],
  translateY: [0, 0], scale: [1, 1], rotate: ['0deg', '0deg'],
};
const MOTIONS = {
  idle: {
    duration: 3600, loop: true, inputRange: [0, 0.5, 1],
    translateY: [0, -4, 0], scale: [1, 1.012, 1], rotate: ['0deg', '0deg', '0deg'],
  },
  celebrate: {
    duration: 780, loop: false, inputRange: [0, 0.3, 0.55, 0.75, 1],
    translateY: [0, -12, 0, -5, 0], scale: [1, 1.08, 0.98, 1.03, 1],
    rotate: ['0deg', '-6deg', '3deg', '-2deg', '0deg'],
  },
  encourage: {
    duration: 600, loop: false, inputRange: [0, 0.3, 0.65, 1],
    translateY: [0, -2, -1, 0], scale: [1, 1.02, 1.01, 1],
    rotate: ['0deg', '3deg', '-2deg', '0deg'],
  },
};

function getGuideMotionSpec(tone = 'idle', reducedMotion = false) {
  return reducedMotion ? STILL : MOTIONS[tone] || MOTIONS.idle;
}

module.exports = { GUIDE_NAMES, getPromptGuideName, getGuideMotionSpec };
