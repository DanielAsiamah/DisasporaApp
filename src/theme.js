export const MAX_HEARTS = 5;

export const colors = {
  splash: '#18332D',
  splashWarm: '#23483E',
  splashGreen: '#102A24',
  
  // Theme highlights
  africaGold: '#F4B942', // Radiant gold
  africaWarm: '#E76F51', // Terracotta clay orange
  caribbeanGreen: '#1FBE56', // Emerald green
  caribbeanBright: '#2ECF6C', // Bright lime/green
  
  // Interface Surfaces (Cozy Theme)
  skyTop: '#1E1612', // Cocoa night sky top gradient
  skyBottom: '#140F0C', // Dark espresso night sky bottom gradient
  grass: '#1FBE56',
  grassDark: '#0B8A3C',
  
  primary: '#2D7668',
  primaryDark: '#20594F',
  primaryLight: '#E1F0EA',
  accent: '#F2B84B',
  accentDark: '#C98719',
  coral: '#E76F51',
  purple: '#CE82FF',
  blue: '#1CB0F6',
  
  // Dark Cozy Typography & Elements
  paper: '#FFF9ED',
  paperDeep: '#F4E9D4',
  ink: '#1D2925',
  inkMuted: '#65716C',
  sea: '#2D7668',
  mango: '#F2B84B',
  surface: '#FFF9ED',
  surfaceMuted: '#F4E9D4',
  text: '#1D2925',
  textDark: '#1D2925',
  textOnDark: '#FFF9ED',
  textMuted: '#65716C',
  textLight: '#8B948F',
  border: '#D8CDBA',
  locked: '#DED8CD',
  
  success: '#1FBE56',
  successBg: 'rgba(31, 190, 86, 0.12)',
  error: '#FF4B4B',
  errorBg: 'rgba(255, 75, 75, 0.15)',
  heart: '#FF4B81',
  heartEmpty: '#D9D0C3',
  shadow: 'rgba(29, 41, 37, 0.18)',
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
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_700Bold',
  black: 'Inter_700Bold',
  display: 'Anton_400Regular',
  editorial: 'DMSerifDisplay_400Regular',
};

export const game = {
  maxHearts: MAX_HEARTS,
};
