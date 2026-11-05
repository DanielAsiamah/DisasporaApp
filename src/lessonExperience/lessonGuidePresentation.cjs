'use strict';

const GUIDE_NAMES = Object.freeze(['Kai', 'Nia', 'Kofi', 'Amara', 'Sol', 'Ayo', 'Safiya', 'Nneka', 'Chidi']);

function getPromptGuideName(topicGuide, index = 0) {
  const lead = GUIDE_NAMES.includes(topicGuide) ? topicGuide : 'Kai';
  const cast = [lead, ...GUIDE_NAMES.filter(name => name !== lead)];
  const position = Number.isSafeInteger(index) && index >= 0 ? index : 0;
  return cast[position % cast.length];
}

const STILL = {
  duration: 0, loop: false, inputRange: [0, 1],
  translateX: [0, 0], translateY: [0, 0], scale: [1, 1], rotate: ['0deg', '0deg'],
  auraOpacity: [0, 0], auraScale: [1, 1], particleOpacity: [0, 0], particleY: [0, 0],
};
const MOTIONS = {
  idle: {
    duration: 3600, loop: true, inputRange: [0, 0.5, 1],
    translateX: [0, 0, 0], translateY: [0, -4, 0], scale: [1, 1.012, 1], rotate: ['0deg', '0deg', '0deg'],
    auraOpacity: [0.08, 0.16, 0.08], auraScale: [0.98, 1.04, 0.98],
    particleOpacity: [0, 0, 0], particleY: [0, 0, 0],
  },
  prompt: {
    duration: 2800, loop: true, inputRange: [0, 0.35, 0.7, 1],
    translateX: [0, 2, -1, 0], translateY: [0, -6, -3, 0],
    scale: [1, 1.025, 1.012, 1], rotate: ['0deg', '1.5deg', '-0.5deg', '0deg'],
    auraOpacity: [0.08, 0.2, 0.14, 0.08], auraScale: [0.98, 1.05, 1.02, 0.98],
    particleOpacity: [0.2, 0.7, 0.35, 0.2], particleY: [2, -7, -3, 2],
  },
  celebrate: {
    duration: 780, loop: false, inputRange: [0, 0.3, 0.55, 0.75, 1],
    translateX: [0, -2, 2, -1, 0], translateY: [0, -12, 0, -5, 0], scale: [1, 1.08, 0.98, 1.03, 1],
    rotate: ['0deg', '-6deg', '3deg', '-2deg', '0deg'],
    auraOpacity: [0, 0.78, 0.32, 0.18, 0], auraScale: [0.82, 1.14, 1.08, 1.03, 1],
    particleOpacity: [0, 1, 0.8, 0.38, 0], particleY: [8, -16, -25, -31, -34],
  },
  encourage: {
    duration: 600, loop: false, inputRange: [0, 0.3, 0.65, 1],
    translateX: [0, 1, -1, 0], translateY: [0, -2, -1, 0], scale: [1, 1.02, 1.01, 1],
    rotate: ['0deg', '3deg', '-2deg', '0deg'],
    auraOpacity: [0, 0.48, 0.24, 0], auraScale: [0.9, 1.08, 1.03, 1],
    particleOpacity: [0, 0.82, 0.45, 0], particleY: [5, -8, -14, -18],
  },
  recover: {
    duration: 650, loop: false, inputRange: [0, 0.18, 0.36, 0.54, 0.72, 1],
    translateX: [0, -8, 7, -5, 3, 0], translateY: [0, 0, 0, -1, -2, 0],
    scale: [1, 0.985, 0.99, 1, 1.01, 1],
    rotate: ['0deg', '-3deg', '3deg', '-2deg', '1deg', '0deg'],
    auraOpacity: [0, 0.34, 0.2, 0.28, 0.12, 0], auraScale: [0.94, 1.04, 1.01, 1.03, 1.01, 1],
    particleOpacity: [0, 0.7, 0.4, 0.6, 0.25, 0], particleY: [2, -2, -5, -8, -11, -14],
  },
};

const DECOR = Object.freeze({
  idle: Object.freeze({ accentColor: '#1CB0F6', particleCount: 0 }),
  prompt: Object.freeze({ accentColor: '#1CB0F6', particleCount: 1 }),
  celebrate: Object.freeze({ accentColor: '#FFB936', particleCount: 3 }),
  encourage: Object.freeze({ accentColor: '#22B65D', particleCount: 2 }),
  recover: Object.freeze({ accentColor: '#FF6B74', particleCount: 2 }),
});

function getGuideMotionSpec(tone = 'idle', reducedMotion = false) {
  return reducedMotion ? STILL : MOTIONS[tone] || MOTIONS.idle;
}

function getGuideDecorSpec(tone = 'idle') {
  return DECOR[tone] || DECOR.idle;
}

module.exports = { GUIDE_NAMES, getGuideDecorSpec, getPromptGuideName, getGuideMotionSpec };
