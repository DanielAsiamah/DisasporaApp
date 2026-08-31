import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fonts, radius, spacing } from '../theme';

export default function NameInputScreen({ onSubmitName, onBack }) {
  const [name, setName] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const inputRef = useRef(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        speed: 10,
        bounciness: 4,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-focus the input after animation
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 700);

    return () => clearTimeout(timer);
  }, [fadeAnim, slideAnim]);

  const isValid = name.trim().length >= 1;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.skyTop, colors.splash, colors.skyBottom]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <View style={styles.header}>
            {onBack ? (
              <Pressable onPress={onBack} style={styles.backButton}>
                <Text style={styles.backText}>←</Text>
              </Pressable>
            ) : (
              <View style={styles.backButton} />
            )}
          </View>

          <Animated.View
            style={[
              styles.content,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Mascot emoji placeholder */}
            <View style={styles.mascotContainer}>
              <Text style={styles.mascotEmoji}>👋</Text>
            </View>

            <Text style={styles.title}>What's your name?</Text>
            <Text style={styles.subtitle}>
              We'll use this to personalise your learning experience.
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your first name"
                placeholderTextColor={colors.textLight}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                maxLength={30}
                onSubmitEditing={() => isValid && onSubmitName(name.trim())}
              />
            </View>
          </Animated.View>

          <View style={styles.footer}>
            <Pressable
              style={[styles.continueButton, !isValid && styles.continueButtonDisabled]}
              onPress={() => isValid && onSubmitName(name.trim())}
              disabled={!isValid}
            >
              <Text style={[styles.continueText, !isValid && styles.continueTextDisabled]}>
                CONTINUE
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.splash,
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  backButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  backText: {
    color: colors.textMuted,
    fontFamily: fonts.extraBold,
    fontSize: 24,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  mascotContainer: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    width: 80,
  },
  mascotEmoji: {
    fontSize: 40,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 28,
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 23,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 2,
    color: colors.text,
    fontFamily: fonts.semiBold,
    fontSize: 18,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    textAlign: 'center',
    width: '100%',
  },
  footer: {
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  continueButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
  },
  continueButtonDisabled: {
    backgroundColor: colors.locked,
  },
  continueText: {
    color: '#FFFFFF',
    fontFamily: fonts.extraBold,
    fontSize: 15,
    letterSpacing: 1,
  },
  continueTextDisabled: {
    color: colors.textLight,
  },
});
