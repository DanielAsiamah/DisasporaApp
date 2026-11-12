import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, radius, spacing } from '../theme';

export const AUTH_PALETTE = {
  backgroundTop: colors.paper,
  backgroundBottom: colors.paper,
  brandBlue: colors.ink,
  sky: colors.sea,
  skyBorder: colors.primaryDark,
  skySoft: colors.paperDeep,
  border: colors.border,
  white: colors.paper,
  textMuted: colors.inkMuted,
  textSoft: colors.inkMuted,
  success: colors.sea,
  gold: colors.mango,
};

const GUIDE_STRIP = [
  {
    id: 'amara',
    label: 'Amara',
    note: 'Heritage-first lessons',
    source: require('../../assets/guides/amara.png'),
  },
  {
    id: 'kai',
    label: 'Kai',
    note: 'Everyday conversation',
    source: require('../../assets/guides/kai.png'),
  },
  {
    id: 'sol',
    label: 'Sol',
    note: 'Practice and progress',
    source: require('../../assets/guides/sol.png'),
  },
];

export default function AuthScreenFrame({
  onBack,
  headerLabel,
  eyebrow,
  title,
  subtitle,
  hero,
  children,
  keyboardAware = false,
  centerContent = false,
  showGuides = true,
  contentContainerStyle,
  footer,
}) {
  const body = (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        centerContent && styles.centerContent,
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {hero}
      {showGuides ? (
        <View style={styles.guideRow}>
          {GUIDE_STRIP.map((guide) => (
            <View key={guide.id} style={styles.guideCard}>
              <Image resizeMode="contain" source={guide.source} style={styles.guideImage} />
              <Text style={styles.guideName}>{guide.label}</Text>
              <Text style={styles.guideNote}>{guide.note}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.body}>{children}</View>
    </ScrollView>
  );

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={onBack ? 'Go back' : undefined}
            disabled={!onBack}
            onPress={onBack}
            style={styles.backButton}
          >
            {onBack ? <Text style={styles.backText}>‹</Text> : null}
          </Pressable>

          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>D</Text>
            </View>
            <Text style={styles.brandName}>Diaspora</Text>
          </View>

          <View style={styles.headerBadge}>
            {headerLabel ? (
              <Text numberOfLines={1} style={styles.headerBadgeText}>
                {headerLabel}
              </Text>
            ) : null}
          </View>
        </View>

        {keyboardAware ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.flex}
          >
            {body}
          </KeyboardAvoidingView>
        ) : (
          body
        )}

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: AUTH_PALETTE.backgroundBottom,
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    alignSelf: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    maxWidth: 520,
    width: '100%',
  },
  backButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  backText: {
    color: AUTH_PALETTE.brandBlue,
    fontFamily: fonts.black,
    fontSize: 30,
    lineHeight: 30,
  },
  brandRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  logoBadge: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  logoText: {
    color: AUTH_PALETTE.white,
    fontFamily: fonts.display,
    fontSize: 22,
  },
  brandName: {
    color: AUTH_PALETTE.brandBlue,
    fontFamily: fonts.display,
    fontSize: 24,
  },
  headerBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  headerBadgeText: {
    color: AUTH_PALETTE.textSoft,
    fontFamily: fonts.extraBold,
    fontSize: 10,
    letterSpacing: 0.7,
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  content: {
    alignSelf: 'center',
    flexGrow: 1,
    maxWidth: 520,
    width: '100%',
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  centerContent: {
    justifyContent: 'center',
  },
  guideRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  guideCard: {
    alignItems: 'center',
    backgroundColor: colors.paperDeep,
    borderRadius: radius.lg,
    flex: 1,
    minHeight: 128,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  guideImage: {
    height: 64,
    width: 64,
  },
  guideName: {
    color: AUTH_PALETTE.brandBlue,
    fontFamily: fonts.extraBold,
    fontSize: 13,
    marginTop: 2,
  },
  guideNote: {
    color: AUTH_PALETTE.textMuted,
    fontFamily: fonts.semiBold,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
    textAlign: 'center',
  },
  copy: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  eyebrow: {
    color: AUTH_PALETTE.sky,
    fontFamily: fonts.extraBold,
    fontSize: 12,
    letterSpacing: 0.7,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  title: {
    color: AUTH_PALETTE.brandBlue,
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 43,
    marginTop: spacing.sm,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  subtitle: {
    color: AUTH_PALETTE.textMuted,
    fontFamily: fonts.editorial,
    fontSize: 17,
    lineHeight: 25,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  body: {
    marginTop: spacing.lg,
    width: '100%',
  },
  footer: {
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
