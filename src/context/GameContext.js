import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { MAX_HEARTS } from '../theme';

const GameContext = createContext(null);

/**
 * GameProvider
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {number|null} props.profileHearts   - Hearts value from Firebase profile
 * @param {function}    props.onHeartsSync    - Called whenever hearts change, to persist to Firebase
 * @param {boolean}     props.devMode         - When true, hearts never decrease and always start full
 */
export function GameProvider({ children, profileHearts, onHeartsSync, devMode = false }) {
  const [hearts, setHearts] = useState(devMode ? MAX_HEARTS : (profileHearts ?? MAX_HEARTS));
  const [showOutOfHearts, setShowOutOfHearts] = useState(false);

  useEffect(() => {
    if (devMode) {
      // Dev accounts always have full hearts — refill immediately and sync
      setHearts(MAX_HEARTS);
      setShowOutOfHearts(false);
      onHeartsSync?.(MAX_HEARTS);
      return;
    }
    if (profileHearts != null) {
      setHearts(profileHearts);
    }
  }, [profileHearts, devMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(
    () => ({
      hearts,
      maxHearts: MAX_HEARTS,
      hasHearts: devMode ? true : hearts > 0,
      showOutOfHearts: devMode ? false : showOutOfHearts,
      devMode,
      loseHeart() {
        if (devMode) return; // infinite hearts — no deduction
        setHearts((current) => {
          const next = Math.max(current - 1, 0);
          onHeartsSync?.(next);

          if (next === 0) {
            setShowOutOfHearts(true);
          }

          return next;
        });
      },
      refillHearts() {
        setHearts(MAX_HEARTS);
        onHeartsSync?.(MAX_HEARTS);
        setShowOutOfHearts(false);
      },
      closeOutOfHearts() {
        setShowOutOfHearts(false);
      },
    }),
    [hearts, showOutOfHearts, onHeartsSync, devMode]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
}
