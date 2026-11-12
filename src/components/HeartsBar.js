import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { colors } from '../theme';

export default function HeartsBar({ hearts, maxHearts }) {
  const safeMaxHearts = Number.isFinite(maxHearts) ? maxHearts : 5;
  const safeHearts = Math.max(0, Math.min(Number(hearts) || 0, safeMaxHearts));

  return (
    <View style={styles.row}>
      {Array.from({ length: safeMaxHearts }).map((_, index) => {
        const filled = index < safeHearts;

        return (
          <Ionicons
            key={index}
            accessible={false}
            color={filled ? colors.heart : colors.heartEmpty}
            name={filled ? 'heart' : 'heart-outline'}
            size={19}
            style={styles.heart}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  heart: {
    marginHorizontal: 1,
  },
});
