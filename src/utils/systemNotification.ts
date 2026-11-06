import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Show the notification even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureReady(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // Channel setup is best-effort: if it fails, Expo falls back to its default channel.
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Hously CRM',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    } catch {
      // ignore
    }
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function sendSystemNotification(title: string, body: string, data?: Record<string, unknown>) {
  let step = 'permission';
  try {
    if (!(await ensureReady())) return;
    step = 'schedule';
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: true },
      trigger: null,
    });
  } catch (e) {
    throw new Error(`Notification failed at ${step}: ${e instanceof Error ? e.message : String(e)}`);
  }
}