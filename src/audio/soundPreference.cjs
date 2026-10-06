'use strict';

function getSoundEffectsEnabled(value) {
  return value !== false;
}

async function saveSoundPreference({ enabled, save, onChange }) {
  if (typeof enabled !== 'boolean') throw new TypeError('Sound effects preference must be a boolean.');
  onChange({ enabled, status: 'saving' });
  try {
    await save({ soundEffectsEnabled: enabled });
    onChange({ enabled, status: 'saved' });
    return true;
  } catch {
    onChange({ enabled, status: 'error' });
    return false;
  }
}

module.exports = { getSoundEffectsEnabled, saveSoundPreference };
