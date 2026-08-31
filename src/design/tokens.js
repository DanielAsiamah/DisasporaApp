import { colors, fonts, radius, shadows, spacing, type, ui } from '../theme';

export const designTokens = {
  color: {
    brand: colors.primary,
    brandPressed: colors.primaryDark,
    reward: colors.accent,
    info: colors.blue,
    danger: colors.error,
    success: colors.success,
    canvas: '#F7FCF9',
    canvasWarm: '#FFF7EE',
    ink: '#102018',
    inkMuted: '#66756C',
    surface: '#FFFFFF',
    surfaceRaised: '#FDF8F5',
    surfaceDark: colors.surface,
    border: '#E1EEE8',
    borderDark: colors.border,
    disabled: '#DCEAE4',
  },
  dark: {
    canvas: colors.splash,
    surface: colors.surface,
    surfaceRaised: colors.surfaceMuted,
    ink: colors.text,
    inkMuted: colors.textMuted,
    border: colors.border,
  },
  font: fonts,
  radius,
  shadow: shadows,
  space: spacing,
  text: {
    ...type,
    hero: 34,
    micro: 10,
  },
  layout: ui,
  motion: {
    fast: 140,
    normal: 220,
    slow: 420,
    feedbackSoundCooldownMs: 500,
  },
};

export const lessonNodeState = {
  active: {
    size: 68,
    fill: designTokens.color.info,
    ring: designTokens.color.reward,
  },
  completed: {
    size: 60,
    fill: '#8B6914',
    ring: null,
  },
  locked: {
    size: 60,
    fill: '#1E1E1E',
    ring: null,
  },
  bonus: {
    size: 64,
    fill: designTokens.color.reward,
    ring: null,
  },
  trophy: {
    size: 64,
    fill: colors.purple,
    ring: null,
  },
};
