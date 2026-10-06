import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { fonts } from '../../theme';

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
          trackColor={{ false: '#A7BAC7', true: '#1F7A4D' }}
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
  card: { margin: 18, padding: 18, borderRadius: 22, backgroundColor: '#FFFFFF', borderColor: '#D7E8F4', borderWidth: 2, gap: 8 },
  title: { fontFamily: fonts.extraBold, fontSize: 20, color: '#0B245B' },
  name: { fontFamily: fonts.bold, fontSize: 16, color: '#0B245B' },
  detail: { fontFamily: fonts.medium, fontSize: 14, color: '#526C85' },
  settingRow: { alignItems: 'center', borderTopWidth: 1, borderTopColor: '#D7E8F4', flexDirection: 'row', gap: 14, marginTop: 12, paddingTop: 16 },
  settingCopy: { flex: 1, gap: 4 },
  notice: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: '#526C85', marginVertical: 8 },
  error: { fontFamily: fonts.bold, fontSize: 14, color: '#B83248' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  primary: { flexGrow: 1, minHeight: 48, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#0B245B' },
  primaryText: { fontFamily: fonts.extraBold, color: '#FFFFFF', fontSize: 15 },
  secondary: { flexGrow: 1, minHeight: 48, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#EAF8FF' },
  secondaryText: { fontFamily: fonts.extraBold, color: '#0B245B', fontSize: 15 },
  pending: { opacity: 0.6 },
});
