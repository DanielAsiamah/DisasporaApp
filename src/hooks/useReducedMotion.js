import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion(initialValue = false) {
  const [reducedMotion, setReducedMotion] = useState(initialValue);

  useEffect(() => {
    let mounted = true;
    let preferenceChanged = false;
    const handlePreferenceChange = (enabled) => {
      preferenceChanged = true;
      if (mounted) setReducedMotion(enabled);
    };
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
