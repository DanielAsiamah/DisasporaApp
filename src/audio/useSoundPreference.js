import { useEffect, useRef, useState } from 'react';

const { getSoundEffectsEnabled, saveSoundPreference } = require('./soundPreference.cjs');

export function useSoundPreference({ savedValue, save }) {
  const [sessionChoice, setSessionChoice] = useState(null);
  const saving = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function setEnabled(enabled) {
    // Keep writes ordered while Firestore waits for an acknowledgement, including offline.
    if (saving.current) return;
    saving.current = true;
    try {
      await saveSoundPreference({
        enabled,
        save,
        onChange: next => { if (mounted.current) setSessionChoice(next); },
      });
    } finally {
      saving.current = false;
    }
  }

  return {
    ...(sessionChoice || { enabled: getSoundEffectsEnabled(savedValue), status: 'idle' }),
    setEnabled,
  };
}
