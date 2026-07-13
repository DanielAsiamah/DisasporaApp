import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { reconcileHearts, spendHeart, toMillis } from '../lessonEngine/hearts';
import { MAX_HEARTS } from '../theme';

const GameContext = createContext(null);
const STORAGE_PREFIX = 'diaspora:hearts:v1:';

function makeState(hearts, nextHeartAt, updatedAt, now = Date.now()) {
  const reconciled = reconcileHearts({ hearts, nextHeartAt }, now, MAX_HEARTS);
  return {
    hearts: reconciled.hearts,
    nextHeartAt: reconciled.nextHeartAt,
    updatedAt: toMillis(updatedAt) ?? 0,
  };
}

export function GameProvider({
  children,
  userId,
  profileHearts,
  profileNextHeartAt,
  profileHeartsUpdatedAt,
  onHeartsSync,
}) {
  const initialState = makeState(profileHearts ?? MAX_HEARTS, profileNextHeartAt, profileHeartsUpdatedAt);
  const [heartState, setHeartState] = useState(initialState);
  const [now, setNow] = useState(Date.now());
  const [showOutOfHearts, setShowOutOfHearts] = useState(false);
  const heartStateRef = useRef(initialState);
  const storageKey = `${STORAGE_PREFIX}${userId || 'guest'}`;

  const applyHeartState = useCallback(
    (nextState, { sync = false } = {}) => {
      const normalised = makeState(
        nextState.hearts,
        nextState.nextHeartAt,
        nextState.updatedAt || Date.now()
      );
      heartStateRef.current = normalised;
      setHeartState(normalised);
      AsyncStorage.setItem(storageKey, JSON.stringify(normalised)).catch(() => {});

      if (sync) {
        onHeartsSync?.({
          hearts: normalised.hearts,
          nextHeartAt: normalised.nextHeartAt,
          heartsUpdatedAt: normalised.updatedAt,
        });
      }
    },
    [onHeartsSync, storageKey]
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const remoteSource = profileHearts == null
        ? null
        : {
            hearts: profileHearts,
            nextHeartAt: toMillis(profileNextHeartAt),
            updatedAt: toMillis(profileHeartsUpdatedAt) ?? 0,
          };
      let cachedSource = null;

      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          cachedSource = {
            hearts: parsed.hearts,
            nextHeartAt: toMillis(parsed.nextHeartAt),
            updatedAt: toMillis(parsed.updatedAt) ?? 0,
          };
        }
      } catch {
        cachedSource = null;
      }

      if (cancelled) return;
      const cacheIsNewer = Boolean(
        cachedSource && (!remoteSource || cachedSource.updatedAt > remoteSource.updatedAt)
      );
      const chosenSource = cacheIsNewer ? cachedSource : remoteSource;
      if (chosenSource) {
        const chosen = makeState(
          chosenSource.hearts,
          chosenSource.nextHeartAt,
          chosenSource.updatedAt
        );
        const recoveredWhileAway =
          chosen.hearts !== Number(chosenSource.hearts) ||
          chosen.nextHeartAt !== chosenSource.nextHeartAt;
        applyHeartState({
          ...chosen,
          updatedAt: recoveredWhileAway ? Date.now() : chosen.updatedAt,
        }, {
          sync: Boolean(userId && (cacheIsNewer || recoveredWhileAway)),
        });
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [
    applyHeartState,
    profileHearts,
    profileHeartsUpdatedAt,
    profileNextHeartAt,
    storageKey,
    userId,
  ]);

  const reconcileNow = useCallback(() => {
    const current = heartStateRef.current;
    const currentTime = Date.now();
    const reconciled = reconcileHearts(current, currentTime, MAX_HEARTS);
    setNow(currentTime);

    if (
      reconciled.hearts !== current.hearts ||
      reconciled.nextHeartAt !== current.nextHeartAt
    ) {
      applyHeartState({ ...reconciled, updatedAt: currentTime }, { sync: true });
      if (reconciled.hearts > 0) setShowOutOfHearts(false);
    }
  }, [applyHeartState]);

  useEffect(() => {
    const interval = setInterval(reconcileNow, 1000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') reconcileNow();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [reconcileNow]);

  const loseHeart = useCallback(() => {
    const currentTime = Date.now();
    const next = spendHeart(heartStateRef.current, currentTime, MAX_HEARTS);
    applyHeartState({ ...next, updatedAt: currentTime }, { sync: true });
    if (next.hearts === 0) setShowOutOfHearts(true);
  }, [applyHeartState]);

  const refillHearts = useCallback(() => {
    applyHeartState(
      { hearts: MAX_HEARTS, nextHeartAt: null, updatedAt: Date.now() },
      { sync: true }
    );
    setShowOutOfHearts(false);
  }, [applyHeartState]);

  const closeOutOfHearts = useCallback(() => setShowOutOfHearts(false), []);

  const countdown = reconcileHearts(heartState, now, MAX_HEARTS);

  const value = useMemo(
    () => ({
      hearts: heartState.hearts,
      maxHearts: MAX_HEARTS,
      hasHearts: heartState.hearts > 0,
      timeUntilNextHeartMs: countdown.timeUntilNextHeartMs,
      showOutOfHearts,
      loseHeart,
      refillHearts,
      closeOutOfHearts,
    }),
    [
      closeOutOfHearts,
      countdown.timeUntilNextHeartMs,
      heartState.hearts,
      loseHeart,
      refillHearts,
      showOutOfHearts,
    ]
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
