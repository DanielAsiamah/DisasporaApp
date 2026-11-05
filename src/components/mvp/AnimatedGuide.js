import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { guideArt } from '../../data/guideArtRegistry';

const {
  getGuideDecorSpec,
  getGuideMotionSpec,
} = require('../../lessonExperience/lessonGuidePresentation.cjs');

const PARTICLE_POSITIONS = ['18%', '50%', '80%'];

export default function AnimatedGuide({ name = 'Kai', tone = 'idle', reducedMotion, style, accessible = true, testID }) {
  const motion = useRef(new Animated.Value(0)).current;
  const spec = getGuideMotionSpec(tone, reducedMotion);
  const decor = getGuideDecorSpec(tone);
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
    <View
      accessible={accessible}
      accessibilityLabel={`${name} guide`}
      testID={testID}
      style={[styles.root, style]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.aura,
          {
            backgroundColor: decor.accentColor,
            opacity: interpolate(spec.auraOpacity),
            transform: [{ scale: interpolate(spec.auraScale) }],
          },
        ]}
      />
      {Array.from({ length: decor.particleCount }, (_, index) => (
        <Animated.View
          key={`${tone}-particle-${index}`}
          pointerEvents="none"
          style={[
            styles.particle,
            {
              backgroundColor: decor.accentColor,
              left: PARTICLE_POSITIONS[index],
              opacity: interpolate(spec.particleOpacity),
              transform: [
                { translateY: interpolate(spec.particleY.map(value => value * (1 + index * 0.16))) },
                { scale: interpolate(spec.auraScale) },
              ],
            },
          ]}
        />
      ))}
      <Animated.Image
        accessible={false}
        pointerEvents="none"
        resizeMode="contain"
        source={guideArt[name] || guideArt.Kai}
        style={[
          StyleSheet.absoluteFillObject,
          styles.image,
          {
            transform: [
              { translateX: interpolate(spec.translateX) },
              { translateY: interpolate(spec.translateY) },
              { scale: interpolate(spec.scale) },
              { rotate: interpolate(spec.rotate) },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'visible', position: 'relative' },
  aura: {
    borderRadius: 999,
    bottom: '8%',
    left: '8%',
    position: 'absolute',
    right: '8%',
    top: '8%',
  },
  image: { height: '100%', width: '100%' },
  particle: {
    borderRadius: 999,
    height: 9,
    marginLeft: -4.5,
    position: 'absolute',
    top: '18%',
    width: 9,
    zIndex: 2,
  },
});
