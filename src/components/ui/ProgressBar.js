import { StyleSheet, View } from 'react-native';

import { designTokens } from '../../design/tokens';

export default function ProgressBar({
  value = 0,
  max = 1,
  height = 12,
  tone = 'primary',
  style,
}) {
  const progress = max > 0 ? Math.max(0, Math.min(value / max, 1)) : 0;
  const fillColor = tone === 'reward' ? designTokens.color.reward : designTokens.color.brand;

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }, style]}>
      <View
        style={[
          styles.fill,
          {
            backgroundColor: fillColor,
            borderRadius: height / 2,
            width: `${progress * 100}%`,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: designTokens.color.disabled,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
  },
});
