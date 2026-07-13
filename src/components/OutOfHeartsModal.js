import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import PrimaryButton from './PrimaryButton';
import { colors, fonts, radius, spacing } from '../theme';

function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil((milliseconds || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function OutOfHeartsModal({
  visible,
  onClose,
  onRefill,
  timeUntilNextHeartMs,
}) {
  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.emoji}>💔</Text>
          <Text style={styles.title}>Out of hearts</Text>
          <Text style={styles.body}>
            Your next heart returns in{' '}
            <Text style={styles.countdown}>{formatCountdown(timeUntilNextHeartMs)}</Text>.
            {' '}Refill now or take a quick break.
          </Text>

          <PrimaryButton label="Refill hearts" onPress={onRefill} />
          <Pressable onPress={onClose} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Maybe later</Text>
          </Pressable>

          <Text style={styles.note}>Payments coming later · Free refill for now while testing</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(10, 20, 36, 0.72)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    maxWidth: 360,
    padding: spacing.lg,
    width: '100%',
  },
  emoji: {
    fontSize: 42,
    textAlign: 'center',
  },
  title: {
    color: colors.textDark,
    fontFamily: fonts.extraBold,
    fontSize: 24,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  body: {
    color: colors.textMuted,
    fontFamily: fonts.semiBold,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  countdown: {
    color: colors.primary,
    fontFamily: fonts.extraBold,
  },
  secondaryButton: {
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
  },
  secondaryText: {
    color: colors.textMuted,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  note: {
    color: colors.textLight,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
