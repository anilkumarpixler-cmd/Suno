import AsyncStorage from '@react-native-async-storage/async-storage';

// No login yet: the server keeps each phone's voices under this random id (X-Device-Id header).
const DEVICE_ID_STORAGE_KEY = '@suno_device_id';

const newDeviceId = () =>
  `${Date.now().toString(16)}${Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0'),
  ).join('')}`;

let deviceIdPromise: Promise<string> | null = null;

/** Made once on first launch and kept; the first call's promise is shared, so it is never made twice. */
export const getDeviceId = () => {
  deviceIdPromise ??= (async () => {
    const saved = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY).catch(() => null);
    if (saved) return saved;
    const id = newDeviceId();
    await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, id).catch(() => undefined);
    return id;
  })();
  return deviceIdPromise;
};

/** `headers` plus this phone's X-Device-Id, which the server's voice routes require. */
export const withDeviceId = async (headers?: Record<string, string>) => ({
  ...headers,
  'X-Device-Id': await getDeviceId(),
});
