import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';

// Set once we've shown the "open Settings" alert, so a permanent deny doesn't nag every launch.
const SETTINGS_PROMPTED_KEY = '@suno_notif_settings_prompted';

/** Android 13+ (API 33) needs POST_NOTIFICATIONS at runtime; older Android and iOS don't. */
const needsRuntimePermission = () => Platform.OS === 'android' && Number(Platform.Version) >= 33;

/**
 * Asks for notification permission once on app start (Android 13+), so the media
 * playback notification can show. If the user chose "Don't ask again", shows a one-time
 * alert that opens the app's system Settings.
 */
export const useNotificationPermission = () => {
  useEffect(() => {
    if (!needsRuntimePermission()) return;
    let isMounted = true;
    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;

    const run = async () => {
      try {
        if (await PermissionsAndroid.check(permission)) return;

        const result = await PermissionsAndroid.request(permission, {
          title: 'Allow notifications',
          message: 'Suno Stories shows playback controls in the notification panel and lock screen.',
          buttonPositive: 'Allow',
          buttonNegative: 'Not now',
        });
        if (!isMounted || result !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return;

        // Permanently denied: the system popup won't show again, so point to Settings (once).
        if (await AsyncStorage.getItem(SETTINGS_PROMPTED_KEY)) return;
        await AsyncStorage.setItem(SETTINGS_PROMPTED_KEY, '1');
        if (!isMounted) return;

        Alert.alert(
          'Notifications are off',
          'To see story controls on the lock screen and notification panel, turn on notifications in Settings.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => void Linking.openSettings() },
          ],
        );
      } catch {
        // Permission APIs can fail on unusual devices; playback still works without it.
      }
    };

    void run();
    return () => {
      isMounted = false;
    };
  }, []);
};
