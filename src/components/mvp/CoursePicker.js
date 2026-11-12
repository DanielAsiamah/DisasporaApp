import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { colors, fonts } from '../../theme';

export default function CoursePicker({ visible, options, selectedCourseId, onSelect, onClose }) {
  const reducedMotion = useReducedMotion();
  return (
    <Modal visible={visible} animationType={reducedMotion ? 'none' : 'slide'} onRequestClose={onClose}>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <View style={styles.headingCopy}>
            <Text style={styles.eyebrow}>YOUR NEXT CONVERSATION</Text>
            <Text accessibilityRole="header" style={styles.title}>Choose a language</Text>
          </View>
          <Pressable accessibilityLabel="Close language picker" accessibilityRole="button" onPress={onClose} style={styles.close}>
            <Ionicons accessible={false} name="close" size={24} color={colors.ink} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Explore the draft courses</Text>
            <Text style={styles.noticeBody}>These lessons are awaiting native-speaker review. Pronunciation audio is still in preparation.</Text>
          </View>
          {options.map(option => {
            const selected = option.id === selectedCourseId;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityLabel={`${option.label}, ${option.statusLabel}`}
                accessibilityState={{ selected, disabled: !option.selectable }}
                disabled={!option.selectable}
                onPress={() => onSelect(option.id)}
                style={({ pressed }) => [styles.card, selected && styles.selected, !option.selectable && styles.unavailable, pressed && styles.pressed]}
              >
                <View style={styles.flagBadge}><Text accessible={false} style={styles.flag}>{option.flag}</Text></View>
                <View style={styles.courseCopy}>
                  <Text style={styles.courseName}>{option.label}</Text>
                  <Text style={styles.status}>{option.statusLabel}</Text>
                </View>
                <Ionicons accessible={false} name={selected ? 'checkmark-circle' : option.selectable ? 'chevron-forward' : 'lock-closed-outline'} size={24} color={selected ? colors.sea : colors.inkMuted} />
              </Pressable>
            );
          })}
          <Text style={styles.footer}>Each language has its own learning path and progress. Your language choice here lasts until you reload the app.</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 24, maxWidth: 640, width: '100%', alignSelf: 'center' },
  headingCopy: { flex: 1 },
  eyebrow: { color: colors.sea, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 32, lineHeight: 39, marginTop: 6, textTransform: 'uppercase' },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.paperDeep, alignItems: 'center', justifyContent: 'center' },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  notice: { backgroundColor: '#FFF3DA', padding: 16, borderRadius: 18, marginBottom: 6 },
  noticeTitle: { color: '#6E4A16', fontFamily: fonts.extraBold, fontSize: 15 },
  noticeBody: { color: '#6E4A16', fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, marginTop: 5 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, minHeight: 90, borderRadius: 22, backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.border },
  selected: { backgroundColor: colors.primaryLight, borderColor: colors.sea },
  unavailable: { backgroundColor: colors.paperDeep },
  pressed: { transform: [{ scale: 0.98 }] },
  flagBadge: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.paperDeep, alignItems: 'center', justifyContent: 'center' },
  flag: { fontSize: 28 },
  courseCopy: { flex: 1, gap: 4 },
  courseName: { color: colors.ink, fontFamily: fonts.bold, fontSize: 18 },
  status: { color: colors.inkMuted, fontFamily: fonts.medium, fontSize: 12 },
  footer: { color: colors.inkMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 10 },
});
