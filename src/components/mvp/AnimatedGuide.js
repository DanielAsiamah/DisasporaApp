import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { guideArt } from '../../data/guideArtRegistry';

const { getGuideMotionSpec } = require('../../lessonExperience/lessonGuidePresentation.cjs');

export default function AnimatedGuide({ name = 'Kai', tone = 'idle', reducedMotion, style, accessible = true, testID }) {
  const motion = useRef(new Animated.Value(0)).current;
  const spec = getGuideMotionSpec(tone, reducedMotion);
  useEffect(() => {
    motion.setValue(0);
    if (!spec.duration) return undefined;
    const sequence = Animated.timing(motion, {
      toValue: 1, duration: spec.duration, easing: Easing.inOut(Easing.sin),
      useNativeDriver: true, isInteraction: false,
    });
    const animation = spec.loop ? Animated.loop(sequence) : sequence;
    animation.start();
    return () => animation.stop();
  }, [motion, name, spec]);

  const interpolate = outputRange => motion.interpolate({ inputRange: spec.inputRange, outputRange });
  return (
    <Animated.Image
      accessible={accessible}
      accessibilityLabel={`${name} guide`}
      testID={testID}
      resizeMode="contain"
      source={guideArt[name] || guideArt.Kai}
      style={[style, {
        transform: [
          { translateY: interpolate(spec.translateY) },
          { scale: interpolate(spec.scale) },
          { rotate: interpolate(spec.rotate) },
        ],
      }]}
    />
  );
}
