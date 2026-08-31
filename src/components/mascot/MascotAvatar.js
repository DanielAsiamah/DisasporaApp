import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { radius } from '../../theme';

// Map languages to beautiful, iconic heritage mascot emojis
const EMOJIS = {
  patois: '🦜',       // Kojo the Parrot
  jamaican: '🦜',
  belizean: '🦜',
  gullah: '🦅',       // Eagle
  aave: '🦅',
  swahili: '🦁',      // Lion
  igbo: '🐆',         // Leopard
  yoruba: '🐆',
  wolof: '🐘',        // Elephant
  haitian: '🦩',       // Flamingo
  nouchi: '🦩',
  sudanese: '🐪',     // Camel
  nubian: '🐪',
};

// Map languages to theme accessory backdrops
const ACCESSORY_BG = {
  patois: '#FCD116',   // Gold
  belizean: '#1CB0F6', // Blue
  swahili: '#009E49',  // Green
  haitian: '#CE1126',  // Red
  Default: '#7B61A8',  // Purple
};

export default function MascotAvatar({
  languageId = 'patois',
  mood = 'idle',
  state,
  size = 1,
  style,
}) {
  const currentMood = mood || state || 'idle';
  const cleanId = (languageId || '').toLowerCase().replace(/^(en|fr|ar)-/, '');
  const emoji = EMOJIS[cleanId] || EMOJIS.patois;
  const bgColor = ACCESSORY_BG[cleanId] || ACCESSORY_BG.Default;

  // Animation values
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Reset animations
    bounceAnim.setValue(0);
    rotationAnim.setValue(0);
    scaleAnim.setValue(1);

    let activeAnimation = null;

    if (currentMood === 'happy' || currentMood === 'excited') {
      // Bounce and slight spin
      activeAnimation = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(bounceAnim, { toValue: -15, duration: 250, useNativeDriver: true }),
            Animated.timing(rotationAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(bounceAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(rotationAnim, { toValue: -1, duration: 200, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(bounceAnim, { toValue: -8, duration: 150, useNativeDriver: true }),
            Animated.timing(rotationAnim, { toValue: 0.5, duration: 150, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(bounceAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
            Animated.timing(rotationAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
          ]),
          Animated.delay(800),
        ])
      );
    } else if (currentMood === 'speaking') {
      // Fast talking wobble (tilt back and forth)
      activeAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(rotationAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(rotationAnim, { toValue: -1, duration: 100, useNativeDriver: true }),
        ])
      );
    } else if (currentMood === 'thinking') {
      // Slow back and forth rotation + slight scale pulse
      activeAnimation = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(rotationAnim, { toValue: 0.5, duration: 600, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1.05, duration: 600, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(rotationAnim, { toValue: -0.5, duration: 600, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 0.98, duration: 600, useNativeDriver: true }),
          ]),
        ])
      );
    } else if (currentMood === 'sad') {
      // Droop downwards (scale down slightly and slide down)
      activeAnimation = Animated.timing(bounceAnim, {
        toValue: 8,
        duration: 500,
        useNativeDriver: true,
      });
    } else {
      // Idle: gentle breathing scale pulse
      activeAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.03, duration: 1000, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 0.97, duration: 1000, useNativeDriver: true }),
        ])
      );
    }

    activeAnimation.start();

    return () => {
      if (activeAnimation) activeAnimation.stop();
    };
  }, [currentMood]);

  // Interpolate rotation angle
  const spin = rotationAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-12deg', '12deg'],
  });

  return (
    <View style={[styles.scaleBox, { transform: [{ scale: size }] }, style]}>
      {/* Background shadow */}
      <View style={styles.shadow} />

      {/* Animated Mascot Body */}
      <Animated.View
        style={[
          styles.mascotContainer,
          {
            backgroundColor: bgColor,
            transform: [
              { translateY: bounceAnim },
              { rotate: spin },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <Text style={styles.emojiText}>{emoji}</Text>
        {/* Cute cheek blushes */}
        {currentMood !== 'sad' && (
          <View style={styles.blushes}>
            <View style={styles.blush} />
            <View style={styles.blush} />
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scaleBox: {
    alignItems: 'center',
    height: 160,
    justifyContent: 'flex-end',
    width: 140,
  },
  shadow: {
    backgroundColor: 'rgba(16, 24, 32, 0.14)',
    borderRadius: radius.pill,
    bottom: 3,
    height: 14,
    position: 'absolute',
    width: 80,
  },
  mascotContainer: {
    alignItems: 'center',
    borderRadius: 60,
    borderColor: '#FFF',
    borderWidth: 4,
    height: 120,
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    width: 120,
  },
  emojiText: {
    fontSize: 70,
  },
  blushes: {
    bottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: 22,
    position: 'absolute',
    right: 0,
  },
  blush: {
    backgroundColor: '#FF8A8A',
    borderRadius: 6,
    height: 12,
    opacity: 0.6,
    width: 12,
  },
});
