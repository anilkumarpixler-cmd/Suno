import { requireOptionalNativeModule, type NativeModule } from 'expo';
import type { EventSubscription } from 'expo-modules-core';

export type DeviceMediaState = {
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  positionMs: number;
  speed: number;
  playing: boolean;
  /** False while expo-audio plays the narrator track (it holds audio focus itself). */
  manageAudioFocus: boolean;
};

export type DeviceMediaCommandReason = 'focusLoss' | 'transient' | 'focusGain' | 'noisy' | 'taskRemoved';

export type DeviceMediaCommand =
  | { action: 'play' | 'pause' | 'stop'; reason?: DeviceMediaCommandReason }
  | { action: 'next' | 'previous' }  | { action: 'seekTo'; positionMs: number }
  | { action: 'skip'; offsetSec: number };

type SunoMediaSessionEvents = {
  onCommand: (command: DeviceMediaCommand) => void;
};

declare class SunoMediaSessionModule extends NativeModule<SunoMediaSessionEvents> {
  setState(state: DeviceMediaState): void;
  stop(): void;
  requestRecordingFocus(): boolean;
  abandonRecordingFocus(): void;
}

// Android only. Missing on iOS, web, Expo Go and dev clients built before this module existed.
const nativeModule = requireOptionalNativeModule<SunoMediaSessionModule>('SunoMediaSession');

export const isDeviceMediaSessionAvailable = nativeModule != null;

/** Shows / updates the story media card (notification + lock screen). */
export const setDeviceMediaSession = (state: DeviceMediaState) => {
  nativeModule?.setState(state);
};

/** Removes the card and stops the foreground service. */
export const stopDeviceMediaSession = () => {
  nativeModule?.stop();
};

// `?.()` on the method too: a dev build from before these functions has the module without them.

/** Pauses other apps' audio while a narrator is recorded, so it stays out of the mic. */
export const requestRecordingFocus = () => {
  nativeModule?.requestRecordingFocus?.();
};

/** Gives the audio back after recording; other apps' players may resume. */
export const abandonRecordingFocus = () => {
  nativeModule?.abandonRecordingFocus?.();
};

export const addDeviceMediaSessionListener = (
  listener: (command: DeviceMediaCommand) => void,
): EventSubscription | null => nativeModule?.addListener('onCommand', listener) ?? null;
