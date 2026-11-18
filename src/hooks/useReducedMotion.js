import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

export function useReducedMotion(initialValue = false) {
  const [reducedMotion, setReducedMotion] = useState(initialValue);

  useEffect(() => {
    let mounted = true;
    let preferenceChanged = false;
    const handlePreferenceChange = (enabled) => {
      preferenceChanged = true;
      if (mounted) setReducedMotion(enabled);
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handleMediaChange = (event) => handlePreferenceChange(event.matches);
      handlePreferenceChange(mediaQuery.matches);
      mediaQuery.addEventListener('change', handleMediaChange);
      return () => {
        mounted = false;
        mediaQuery.removeEventListener('change', handleMediaChange);
      };
    }

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      handlePreferenceChange
    );
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted && !preferenceChanged) setReducedMotion(enabled);
      })
      .catch(() => {
        if (mounted && !preferenceChanged) setReducedMotion(false);
      });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reducedMotion;
}
