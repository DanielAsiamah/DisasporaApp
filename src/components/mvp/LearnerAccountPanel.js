import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../theme';

const { getAccountProgressNotice, signOutAndReturn } = require('./accountPanelModel.cjs');

export default function LearnerAccountPanel({ user, profile, saveStatus, signOut, onSignedOut, onClose }) {
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
  notice: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: '#526C85', marginVertical: 8 },
  error: { fontFamily: fonts.bold, fontSize: 14, color: '#B83248' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  primary: { flexGrow: 1, minHeight: 48, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#0B245B' },
  primaryText: { fontFamily: fonts.extraBold, color: '#FFFFFF', fontSize: 15 },
  secondary: { flexGrow: 1, minHeight: 48, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#EAF8FF' },
  secondaryText: { fontFamily: fonts.extraBold, color: '#0B245B', fontSize: 15 },
  pending: { opacity: 0.6 },
});
