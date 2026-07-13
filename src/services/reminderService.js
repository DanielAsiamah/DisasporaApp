import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { parseReminderTime } from './reminderTime';

export { formatReminderTime, parseReminderTime } from './reminderTime';

const REMINDER_STORAGE_KEY = 'diaspora:daily-reminder:v1';
const CHANNEL_ID = 'daily-practice';

async function getNotifications() {
  if (Platform.OS === 'web') return null;
  return import('expo-notifications');
}

async function ensureAndroidChannel(Notifications) {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Daily practice reminders',
    description: 'A gentle reminder to continue your Diaspora language path.',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180],
    lightColor: '#1FBE56',
  });
}

function permissionGranted(status) {
  return Boolean(status?.granted || status?.status === 'granted');
}

async function readStoredReminder() {
  const raw = await AsyncStorage.getItem(REMINDER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    await AsyncStorage.removeItem(REMINDER_STORAGE_KEY);
    return null;
  }
}

export async function configureNotificationHandler() {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function getDailyReminderStatus() {
  const Notifications = await getNotifications();
  if (!Notifications) return { supported: false, enabled: false, permission: 'unsupported' };

  const [permissions, stored, scheduled] = await Promise.all([
    Notifications.getPermissionsAsync(),
    readStoredReminder(),
    Notifications.getAllScheduledNotificationsAsync(),
  ]);
  const active = stored?.identifier
    ? scheduled.some((item) => item.identifier === stored.identifier)
    : scheduled.some((item) => item.content?.data?.type === 'daily-practice');

  return {
    supported: true,
    enabled: active,
    permission: permissions.status,
    granted: permissionGranted(permissions),
    time: stored?.time || null,
    identifier: stored?.identifier || null,
  };
}

export async function cancelDailyReminder() {
  const Notifications = await getNotifications();
  if (!Notifications) return { supported: false, enabled: false };

  const stored = await readStoredReminder();
  if (stored?.identifier) {
    await Notifications.cancelScheduledNotificationAsync(stored.identifier).catch(() => {});
  } else {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((item) => item.content?.data?.type === 'daily-practice')
        .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier))
    );
  }
  await AsyncStorage.removeItem(REMINDER_STORAGE_KEY);
  return { supported: true, enabled: false };
}

export async function scheduleDailyReminder({ time = '19:00', preferredName = '', requestPermission = true } = {}) {
  const Notifications = await getNotifications();
  if (!Notifications) return { supported: false, enabled: false, reason: 'unsupported' };

  await ensureAndroidChannel(Notifications);
  let permissions = await Notifications.getPermissionsAsync();
  if (!permissionGranted(permissions) && requestPermission) {
    permissions = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true },
    });
  }
  if (!permissionGranted(permissions)) {
    return { supported: true, enabled: false, reason: 'permission-denied', permission: permissions.status };
  }

  await cancelDailyReminder();
  const parsed = parseReminderTime(time);
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: preferredName ? `${preferredName}, your language path is waiting` : 'Your language path is waiting',
      body: 'Take a few minutes to keep your phrases fresh and your streak moving.',
      sound: true,
      data: { type: 'daily-practice', destination: 'path' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: parsed.hour,
      minute: parsed.minute,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
  });

  await AsyncStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify({ identifier, time: parsed.value }));
  return { supported: true, enabled: true, identifier, time: parsed.value, permission: permissions.status };
}
