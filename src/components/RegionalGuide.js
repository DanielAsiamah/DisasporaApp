import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius } from '../theme';

export const REGIONAL_GUIDES = {
  africa: {
    id: 'africa',
    name: 'Amara',
    region: 'Africa',
    emoji: '👩🏿‍🦱',
    accessory: '🌍',
    color: colors.africaGold,
    greeting: 'Welcome — your roots have a voice.',
  },
  caribbean: {
    id: 'caribbean',
    name: 'Kai',
    region: 'Caribbean',
    emoji: '🧑🏾‍🦱',
    accessory: '🌺',
    color: colors.caribbeanBright,
    greeting: 'Every phrase carries a little sunshine.',
  },
  americas: {
    id: 'americas',
    name: 'Sol',
    region: 'The Americas',
    emoji: '👩🏽‍🦱',
    accessory: '☀️',
    color: colors.coral,
    greeting: 'Let’s connect language, family, and home.',
  },
};

export default function RegionalGuide({ region = 'caribbean', size = 'medium', showLabel = false }) {
  const guide = REGIONAL_GUIDES[region] || REGIONAL_GUIDES.caribbean;
  const dimension = size === 'large' ? 116 : size === 'small' ? 58 : 82;
  const emojiSize = size === 'large' ? 62 : size === 'small' ? 31 : 44;

  return (
    <View style={styles.wrapper}>
      <View
        accessibilityLabel={`${guide.name}, ${guide.region} guide`}
        style={[
          styles.avatar,
          {
            borderColor: guide.color,
            height: dimension,
            width: dimension,
          },
        ]}
      >
        <Text style={{ fontSize: emojiSize }}>{guide.emoji}</Text>
        <View style={[styles.accessory, { backgroundColor: guide.color }]}>
          <Text style={styles.accessoryText}>{guide.accessory}</Text>
        </View>
      </View>
      {showLabel ? (
        <View style={styles.labelRow}>
          <Text style={[styles.name, { color: guide.color }]}>{guide.name}</Text>
          <Text style={styles.region}>{guide.region}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: 8 },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderCurve: 'continuous',
    borderRadius: radius.xl,
    borderWidth: 3,
    justifyContent: 'center',
    position: 'relative',
  },
  accessory: {
    alignItems: 'center',
    borderRadius: radius.pill,
    bottom: -7,
    height: 30,
    justifyContent: 'center',
    position: 'absolute',
    right: -7,
    width: 30,
  },
  accessoryText: { fontSize: 16 },
  labelRow: { alignItems: 'center' },
  name: { fontFamily: fonts.extraBold, fontSize: 14 },
  region: { color: colors.textMuted, fontFamily: fonts.semiBold, fontSize: 11 },
});
