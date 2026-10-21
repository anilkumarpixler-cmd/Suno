import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { Linking, PermissionsAndroid, Platform } from 'react-native';

// Set once we've shown the "open Settings" pop-up, so a permanent deny doesn't nag every launch.
const SETTINGS_PROMPTED_KEY = '@suno_notif_settings_prompted';

/** Android 13+ (API 33) needs POST_NOTIFICATIONS at runtime; older Android and iOS don't. */
const needsRuntimePermission = () => Platform.OS === 'android' && Number(Platform.Version) >= 33;

/** Themed pop-up to show: only after a permanent deny, pointing to Settings. */
export type NotificationPrompt = 'settings' | null;

/**
 * Asks for notification permission on app start (Android 13+), so the media playback
 * notification can show. Only Android's own dialog asks (one prompt; a Suno pop-up before it
 * made users allow twice). If the user chose "Don't ask again", the caller shows a themed
 * Settings pop-up once, from the returned `prompt`.
 */
export const useNotificationPermission = () => {
  const [prompt, setPrompt] = useState<NotificationPrompt>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (!needsRuntimePermission()) return;
    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;

    const run = async () => {
      try {
        if (await PermissionsAndroid.check(permission)) return;
        // Known permanent deny (Settings pop-up already shown): don't ask again on every launch.
        if (await AsyncStorage.getItem(SETTINGS_PROMPTED_KEY)) return;

        // No rationale argument: no extra dialog before Android's own.
        const result = await PermissionsAndroid.request(permission);
        if (!mountedRef.current || result !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return;

        // Permanently denied: the system dialog won't show again, so point to Settings (once).
        await AsyncStorage.setItem(SETTINGS_PROMPTED_KEY, '1');
        if (mountedRef.current) setPrompt('settings');
      } catch {
        // Permission APIs can fail on unusual devices; playback still works without it.
      }
    };

    void run();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const openSettings = () => {
    setPrompt(null);
    void Linking.openSettings();
  };

  const dismiss = () => setPrompt(null);

  return { prompt, openSettings, dismiss };
};
