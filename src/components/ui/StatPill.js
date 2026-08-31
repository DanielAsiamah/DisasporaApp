import { StyleSheet, Text, View } from 'react-native';

import { designTokens } from '../../design/tokens';

export default function StatPill({ label, value, icon, compact = false, style }) {
  return (
    <View style={[styles.pill, compact && styles.compact, style]}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    backgroundColor: designTokens.dark.surface,
    borderColor: designTokens.dark.border,
    borderRadius: designTokens.radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: designTokens.space.xs,
    minHeight: 42,
    paddingHorizontal: designTokens.space.md,
  },
  compact: {
    minHeight: 34,
    paddingHorizontal: designTokens.space.sm,
  },
  icon: {
    color: designTokens.color.reward,
    fontFamily: designTokens.font.black,
    fontSize: 14,
  },
  copy: {
    minWidth: 0,
  },
  label: {
    color: designTokens.dark.inkMuted,
    fontFamily: designTokens.font.black,
    fontSize: designTokens.text.micro,
    letterSpacing: 0,
  },
  value: {
    color: designTokens.dark.ink,
    fontFamily: designTokens.font.black,
    fontSize: designTokens.text.body,
    marginTop: -1,
  },
});
