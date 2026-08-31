import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, StyleSheet, View } from 'react-native';

import { designTokens } from '../../design/tokens';

export default function ScreenScaffold({
  children,
  mode = 'light',
  footer,
  style,
  contentStyle,
}) {
  const isDark = mode === 'dark';

  return (
    <View style={[styles.root, isDark && styles.darkRoot, style]}>
      <LinearGradient
        colors={isDark ? ['#140F0C', '#0B1E14'] : ['#F7FCF9', '#FFF7EE']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe}>
        <View style={[styles.content, contentStyle]}>{children}</View>
        {footer ? <View style={[styles.footer, isDark && styles.darkFooter]}>{footer}</View> : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: designTokens.color.canvas,
    flex: 1,
  },
  darkRoot: {
    backgroundColor: designTokens.dark.canvas,
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: designTokens.space.md,
  },
  footer: {
    backgroundColor: 'rgba(247,252,249,0.96)',
    borderTopColor: designTokens.color.border,
    borderTopWidth: 1,
    padding: designTokens.space.md,
  },
  darkFooter: {
    backgroundColor: 'rgba(20,15,12,0.96)',
    borderTopColor: designTokens.dark.border,
  },
});
