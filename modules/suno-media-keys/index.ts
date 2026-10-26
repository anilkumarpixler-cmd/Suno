import { requireOptionalNativeModule, type NativeModule } from 'expo';
import type { EventSubscription } from 'expo-modules-core';

export type MediaKey = 'play' | 'pause' | 'playPause' | 'next' | 'previous';

type SunoMediaKeysEvents = {
  onKey: (event: { key: MediaKey }) => void;
};

declare class SunoMediaKeysModule extends NativeModule<SunoMediaKeysEvents> {
  setEnabled(enabled: boolean): void;
}

// Android only. Missing on iOS, web, Expo Go and dev clients built before this module existed.
const nativeModule = requireOptionalNativeModule<SunoMediaKeysModule>('SunoMediaKeys');

/** Wired headphone keys reach Suno while it is on screen (other apps keep them otherwise). */
export const setMediaKeysEnabled = (enabled: boolean) => {
  nativeModule?.setEnabled(enabled);
};

export const addMediaKeyListener = (
  listener: (key: MediaKey) => void,
): EventSubscription | null =>
  nativeModule?.addListener('onKey', (event) => listener(event.key)) ?? null;
