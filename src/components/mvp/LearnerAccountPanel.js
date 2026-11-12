import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { colors, fonts } from '../../theme';

const { getAccountProgressNotice, signOutAndReturn } = require('./accountPanelModel.cjs');

export default function LearnerAccountPanel({ user, profile, soundPreference, saveStatus, signOut, onSignedOut, onClose }) {
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function handleSignOut() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    try {
      await signOutAndReturn({ signOut, onSignedOut });
    } catch {
      setError('Could not sign out. Please try again.');
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>Your account</Text>
      <Text style={styles.name}>{profile?.preferredName || profile?.username || 'Learner'}</Text>
      <Text style={styles.detail}>{user?.email || 'Signed-in learner'}</Text>
      <View style={styles.settingRow}>
        <View style={styles.settingCopy}>
          <Text style={styles.name}>Sound effects</Text>
          <Text style={styles.detail}>Answer feedback sounds. Pronunciation audio stays available.</Text>
        </View>
        <Switch
          accessibilityLabel="Sound effects"
          disabled={pending || soundPreference.status === 'saving'}
          onValueChange={soundPreference.setEnabled}
          trackColor={{ false: colors.border, true: colors.sea }}
          value={soundPreference.enabled}
        />
      </View>
      <Text accessibilityLiveRegion="polite" style={soundPreference.status === 'error' ? styles.error : styles.detail}>
        {soundPreference.status === 'saving' ? 'Applied for this session. Waiting for account sync; you can keep learning.'
          : soundPreference.status === 'error' ? 'Applied for this session, but not saved to your account. Retry before signing out.'
          : soundPreference.status === 'saved' ? 'Sound preference saved to your account.'
          : soundPreference.enabled ? 'Sound effects are on.' : 'Sound effects are off.'}
      </Text>
      {soundPreference.status === 'error' ? (
        <Pressable accessibilityRole="button" disabled={pending} onPress={() => soundPreference.setEnabled(soundPreference.enabled)} style={styles.secondary}>
          <Text style={styles.secondaryText}>Retry sound preference save</Text>
        </Pressable>
      ) : null}
      <Text style={styles.notice}>{getAccountProgressNotice(saveStatus)}</Text>
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close account" disabled={pending} onPress={onClose} style={styles.secondary}>
          <Text style={styles.secondaryText}>Keep learning</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Sign out" accessibilityState={{ disabled: pending, busy: pending }} disabled={pending} onPress={handleSignOut} style={[styles.primary, pending && styles.pending]}>
          <Text style={styles.primaryText}>{pending ? 'Signing out...' : 'Sign out'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { margin: 18, padding: 20, borderRadius: 22, backgroundColor: colors.paper, borderColor: colors.border, borderWidth: 1, gap: 8 },
  title: { fontFamily: fonts.display, fontSize: 30, color: colors.ink, textTransform: 'uppercase' },
  name: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  detail: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.inkMuted },
  settingRow: { alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', gap: 14, marginTop: 12, paddingTop: 16 },
  settingCopy: { flex: 1, gap: 4 },
  notice: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.inkMuted, marginVertical: 8 },
  error: { fontFamily: fonts.bold, fontSize: 14, color: '#B83248' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  primary: { flexGrow: 1, minHeight: 58, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colors.ink },
  primaryText: { fontFamily: fonts.bold, color: colors.paper, fontSize: 15 },
  secondary: { flexGrow: 1, minHeight: 58, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colors.paperDeep },
  secondaryText: { fontFamily: fonts.bold, color: colors.ink, fontSize: 15 },
  pending: { opacity: 0.6 },
});
