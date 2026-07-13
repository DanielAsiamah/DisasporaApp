const REGIONAL_GUIDES = {
  africa: {
    id: 'africa',
    name: 'Amara',
    region: 'Africa',
    imageKey: 'amara',
    accessory: '🌍',
    colorToken: 'africaGold',
    greeting: 'Welcome — your roots have a voice.',
  },
  caribbean: {
    id: 'caribbean',
    name: 'Kai',
    region: 'Caribbean',
    imageKey: 'kai',
    accessory: '🌺',
    colorToken: 'caribbeanBright',
    greeting: 'Every phrase carries a little sunshine.',
  },
  americas: {
    id: 'americas',
    name: 'Sol',
    region: 'The Americas',
    imageKey: 'sol',
    accessory: '☀️',
    colorToken: 'coral',
    greeting: 'Let’s connect language, family, and home.',
  },
};

function getRegionalGuide(region) {
  return REGIONAL_GUIDES[region] || REGIONAL_GUIDES.caribbean;
}

module.exports = {
  REGIONAL_GUIDES,
  getRegionalGuide,
};
