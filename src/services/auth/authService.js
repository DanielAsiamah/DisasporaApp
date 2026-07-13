import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  OAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

import { firebaseAuth } from '../../firebase/app';

export function subscribeToAuthState(listener) {
  return onAuthStateChanged(firebaseAuth, listener);
}

export async function signUpWithEmail(email, password) {
  const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
  return credential.user;
}

export async function signInWithEmail(email, password) {
  const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
  return credential.user;
}

export async function signInWithGoogleProvider() {
  const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!webClientId) throw new Error('Google sign-in is not configured yet. Add the Google OAuth client IDs to the Diaspora environment.');

  GoogleSignin.configure({ webClientId, iosClientId: iosClientId || undefined });
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = await GoogleSignin.signIn();
  const idToken = result?.data?.idToken || result?.idToken;
  if (!idToken) throw new Error('Google did not return a sign-in token.');
  const firebaseCredential = await signInWithCredential(firebaseAuth, GoogleAuthProvider.credential(idToken));
  return firebaseCredential.user;
}

export async function signInWithAppleProvider() {
  const AppleAuthentication = await import('expo-apple-authentication');
  const Crypto = await import('expo-crypto');
  const rawNonce = Crypto.randomUUID();
  const nonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    nonce,
  });
  if (!appleCredential.identityToken) throw new Error('Apple did not return a sign-in token.');
  const provider = new OAuthProvider('apple.com');
  const firebaseCredential = await signInWithCredential(firebaseAuth, provider.credential({ idToken: appleCredential.identityToken, rawNonce }));
  return {
    user: firebaseCredential.user,
    preferredName: [appleCredential.fullName?.givenName, appleCredential.fullName?.familyName].filter(Boolean).join(' '),
  };
}

export async function signOutUser() {
  await signOut(firebaseAuth);
}

export function getCurrentUser() {
  return firebaseAuth.currentUser;
}
