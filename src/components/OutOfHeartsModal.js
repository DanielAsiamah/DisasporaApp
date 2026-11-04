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
  embedded = false,
  visible,
  onClose,
  onRefill,
  timeUntilNextHeartMs,
}) {
  if (embedded && !visible) return null;

  const content = (
      <View style={[styles.overlay, embedded && styles.embeddedOverlay]}>
        <View accessibilityViewIsModal style={styles.card}>
          <Text style={styles.emoji}>💔</Text>
          <Text accessibilityRole="header" style={styles.title}>Out of hearts</Text>
          <Text style={styles.body}>
            Your next heart returns in{' '}
            <Text style={styles.countdown}>{formatCountdown(timeUntilNextHeartMs)}</Text>.
            {' '}Refill now or take a quick break.
          </Text>

          <PrimaryButton label="Refill hearts" onPress={onRefill} />
          <Pressable accessibilityLabel="Close out of hearts message" accessibilityRole="button" onPress={onClose} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Maybe later</Text>
          </Pressable>

          <Text style={styles.note}>Beta refill · No charge during early access</Text>
        </View>
      </View>
  );

  return embedded ? content : (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      {content}
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
  embeddedOverlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 20,
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
