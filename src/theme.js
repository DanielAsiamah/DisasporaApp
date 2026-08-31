export const MAX_HEARTS = 5;

export const colors = {
  // Core dark blue palette (consistent dark mode)
  splash: '#131F24', // Deep dark blue
  splashWarm: '#1A2C35', // Slightly lighter dark blue
  splashGreen: '#0F1E26', // Forest dark blue-green
  
  // Theme highlights
  africaGold: '#F4B942', // Radiant gold
  africaWarm: '#E76F51', // Terracotta clay orange
  caribbeanGreen: '#58CC02', // Duolingo-style bright green
  caribbeanBright: '#58CC02', // Bright green
  
  // Interface Surfaces (Dark Blue Mode)
  skyTop: '#131F24', // Dark blue top gradient
  skyBottom: '#0D161A', // Deepest dark blue bottom
  grass: '#58CC02',
  grassDark: '#4CAD02',
  
  primary: '#58CC02', // Bright green (Duolingo-style)
  primaryDark: '#4CAD02',
  primaryLight: 'rgba(88, 204, 2, 0.15)', // transparent green tint
  accent: '#F4B942', // Gold
  accentDark: '#CFA034',
  coral: '#FF4B4B', // Bright red for errors/hearts
  purple: '#CE82FF',
  blue: '#1CB0F6',
  
  // Dark Blue Typography & Elements
  surface: '#1A2C35', // Dark blue card surface
  surfaceLight: '#213A45', // Lighter blue surface for cards
  surfaceMuted: '#1E3340', // Mid dark blue surface
  text: '#FFFFFF', // Pure white text
  textDark: '#FFFFFF', // White text on dark backgrounds
  textOnDark: '#FFFFFF', 
  textMuted: '#89A6B5', // Muted blue-grey text
  textLight: '#5E8090', // Dimmer blue-grey text
  border: '#2A4050', // Dark blue border
  borderLight: '#3A5565', // Lighter border for cards
  locked: '#1E3340', // Disabled button dark blue
  
  success: '#58CC02',
  successBg: 'rgba(88, 204, 2, 0.12)',
  error: '#FF4B4B',
  errorBg: 'rgba(255, 75, 75, 0.15)',
  heart: '#FF4B81',
  heartEmpty: '#2A4050',
  shadow: 'rgba(0, 0, 0, 0.5)',
  
  // Monetization/Premium
  premium: '#CE82FF',
  premiumBg: 'rgba(206, 130, 255, 0.12)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const type = {
  caption: 12,
  body: 14,
  bodyLarge: 16,
  heading: 20,
  title: 24,
  display: 28,
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const shadows = {
  soft: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  card: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 5,
  },
};

export const ui = {
  screenPadding: spacing.md,
  bottomTabHeight: 74,
  cardPadding: spacing.md,
  compactCardPadding: 12,
  buttonHeight: 52,
};

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
  black: 'PlusJakartaSans_800ExtraBold',
};

export const game = {
  maxHearts: MAX_HEARTS,
};
