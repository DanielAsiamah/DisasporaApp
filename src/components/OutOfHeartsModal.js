import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useReducedMotion } from '../hooks/useReducedMotion';
import { colors, fonts, radius, spacing } from '../theme';
import HeartsBar from './HeartsBar';
import PrimaryButton from './PrimaryButton';

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
  const reducedMotion = useReducedMotion();
  const cardProgress = useRef(new Animated.Value(0)).current;
  const heartProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      cardProgress.setValue(0);
      heartProgress.setValue(0);
      return undefined;
    }
    if (reducedMotion) {
      cardProgress.setValue(1);
      heartProgress.setValue(1);
      return undefined;
    }

    const animation = Animated.parallel([
      Animated.timing(cardProgress, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(90),
        Animated.spring(heartProgress, {
          bounciness: 9,
          speed: 13,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]),
    ]);
    animation.start();
    return () => animation.stop();
  }, [cardProgress, heartProgress, reducedMotion, visible]);

  if (embedded && !visible) return null;

  function handleRefill() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onRefill?.();
  }

  const content = (
    <ScrollView
      bounces={false}
      contentContainerStyle={styles.overlayContent}
      showsVerticalScrollIndicator={false}
      style={[styles.overlay, embedded && styles.embeddedOverlay]}
    >
      <Animated.View
        accessibilityViewIsModal
        style={[
          styles.card,
          {
            opacity: cardProgress,
            transform: [{
              translateY: cardProgress.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }),
            }],
          },
        ]}
      >
        <View style={styles.kickerRow}>
          <View style={styles.kickerRule} />
          <Text style={styles.kicker}>TAKE A BREATH</Text>
          <View style={styles.kickerRule} />
        </View>
        <Animated.View
          style={[
            styles.heartOrb,
            {
              transform: [{
                scale: heartProgress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.72, 1.08, 1] }),
              }],
            },
          ]}
        >
          <Ionicons accessible={false} color={colors.heart} name="heart" size={44} />
        </Animated.View>
        <Text accessibilityRole="header" style={styles.title}>Your hearts need a refill</Text>
        <Text style={styles.body}>
          Mistakes are part of learning. Your next heart returns in{' '}
          <Text style={styles.countdown}>{formatCountdown(timeUntilNextHeartMs)}</Text>.
        </Text>

        <View accessible accessibilityLabel="0 of 5 hearts remaining" style={styles.balanceCard}>
          <View style={styles.balanceCopy}>
            <Text style={styles.balanceLabel}>YOUR BALANCE</Text>
            <Text style={styles.balanceValue}>5 fresh tries</Text>
          </View>
          <HeartsBar hearts={0} maxHearts={5} />
        </View>

        <PrimaryButton label="Refill hearts" onPress={handleRefill} />
        <Pressable
          accessibilityLabel="Close out of hearts message"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClose}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
        >
          <Text style={styles.secondaryText}>Pause for now</Text>
        </Pressable>

        <Text style={styles.note}>Beta refill · No charge during early access</Text>
      </Animated.View>
    </ScrollView>
  );

  return embedded ? content : (
    <Modal animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={onClose} transparent visible={visible}>
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(29, 41, 37, 0.56)',
    flex: 1,
  },
  overlayContent: {
    alignItems: 'center',
    flexGrow: 1,
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
    flexShrink: 0,
    backgroundColor: colors.paper,
    borderColor: colors.ink,
    borderRadius: radius.xl,
    borderWidth: 2,
    maxWidth: 380,
    padding: spacing.lg,
    width: '100%',
  },
  kickerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  kickerRule: {
    backgroundColor: colors.mango,
    height: 3,
    width: 24,
  },
  kicker: {
    color: colors.inkMuted,
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1.3,
  },
  heartOrb: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#FFE2DF',
    borderRadius: 42,
    height: 84,
    justifyContent: 'center',
    marginTop: spacing.md,
    width: 84,
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.display,
    fontSize: 32,
    lineHeight: 38,
    marginTop: spacing.md,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  body: {
    color: colors.inkMuted,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 23,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  countdown: {
    color: colors.sea,
    fontFamily: fonts.bold,
  },
  balanceCard: {
    alignItems: 'center',
    backgroundColor: colors.paperDeep,
    borderRadius: radius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    padding: 14,
  },
  balanceCopy: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  balanceLabel: {
    color: colors.inkMuted,
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 1.1,
  },
  balanceValue: {
    color: colors.ink,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    marginTop: 3,
  },
  secondaryButton: {
    alignItems: 'center',
    marginTop: spacing.sm,
    minHeight: 42,
    paddingVertical: spacing.sm,
  },
  secondaryButtonPressed: {
    opacity: 0.55,
  },
  secondaryText: {
    color: colors.ink,
    fontFamily: fonts.semiBold,
    fontSize: 15,
    textDecorationLine: 'underline',
  },
  note: {
    color: colors.textLight,
    fontFamily: fonts.regular,
    fontSize: 11,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
