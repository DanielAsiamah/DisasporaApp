import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius } from '../theme';
import MascotAvatar from './mascot/MascotAvatar';

export default function MascotHero({ languageId = 'patois', mood = 'happy', compact = false }) {
  return (
    <View style={[styles.wrapper, compact && styles.wrapperCompact]}>
      <View style={styles.heroCard}>
        <MascotAvatar languageId={languageId} mood={mood} size={compact ? 0.72 : 1.05} />
        {!compact ? (
          <View style={styles.captionPill}>
            <Text style={styles.caption}>Your tutor is ready</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginVertical: 8,
    width: '100%',
  },
  wrapperCompact: {
    marginVertical: 0,
  },
  heroCard: {
    alignItems: 'center',
    borderRadius: 42,
    minHeight: 180,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingTop: 8,
    width: '100%',
  },
  captionPill: {
    backgroundColor: colors.primaryLight,
    borderColor: 'rgba(31, 190, 86, 0.24)',
    borderRadius: radius.pill,
    borderWidth: 1,
    marginBottom: 18,
    marginTop: -2,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  caption: {
    color: colors.primaryDark,
    fontFamily: fonts.black,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
