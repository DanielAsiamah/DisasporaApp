import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { firebaseConfig } from './config';

const { getFirebaseEmulatorMode } = require('./emulatorMode.cjs');
const emulator = getFirebaseEmulatorMode({
  enabled: process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS,
  isDevelopment: __DEV__,
});
const appName = emulator?.appName || '[DEFAULT]';
const existingApp = getApps().find((candidate) => candidate.name === appName);
const app = existingApp || initializeApp(emulator ? {
  ...firebaseConfig,
  projectId: emulator.projectId,
  authDomain: `${emulator.projectId}.firebaseapp.com`,
  storageBucket: `${emulator.projectId}.appspot.com`,
} : firebaseConfig, appName);

let auth;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

export const firebaseApp = app;
export const firebaseAuth = auth;
export const firebaseDb = getFirestore(app);
export const firebaseStorage = getStorage(app);

if (emulator && !existingApp) {
  connectAuthEmulator(auth, `http://${emulator.host}:${emulator.authPort}`);
  connectFirestoreEmulator(firebaseDb, emulator.host, emulator.firestorePort);
  connectStorageEmulator(firebaseStorage, emulator.host, emulator.storagePort);
}
