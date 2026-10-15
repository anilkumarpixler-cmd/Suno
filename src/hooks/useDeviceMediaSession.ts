import { useEffect, useRef } from 'react';
import {
  addDeviceMediaSessionListener,
  DeviceMediaCommand,
  setDeviceMediaSession,
  stopDeviceMediaSession,
} from '../../modules/suno-media-session';
import { Story } from '../Types';

const ALBUM_TITLE = 'Suno Stories';
// Position drift (seconds) from the native extrapolation before the card is resynced.
const RESYNC_THRESHOLD = 1.5;

type UseDeviceMediaSessionArgs = {
  /** True while a story is playing, paused or preparing (Android card stays up across sources). */
  active: boolean;
  story: Story | null;
  narratorName?: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  /** True for System Voice; false while expo-audio plays the narrator track and owns focus. */
  manageAudioFocus: boolean;
  onCommand: (command: DeviceMediaCommand) => void;
};

type LastSync = { key: string; position: number; at: number; playing: boolean; speed: number };

/**
 * Native media card (notification + lock screen) for Android story playback: System Voice
 * and narrator (server) tracks.
 *
 * The native MediaSession only mirrors state and forwards button presses; audio stays in
 * expo-speech / expo-audio. iOS narrator playback uses `useLockScreenControls` instead.
 */
export const useDeviceMediaSession = ({
  active,
  story,
  narratorName,
  isPlaying,
  currentTime,
  duration,
  speed,
  manageAudioFocus,
  onCommand,
}: UseDeviceMediaSessionArgs) => {
  const onCommandRef = useRef(onCommand);
  const lastSyncRef = useRef<LastSync | null>(null);

  const title = story?.title;
  const artist = narratorName || 'System Voice';

  useEffect(() => {
    onCommandRef.current = onCommand;
  });

  useEffect(() => {
    const subscription = addDeviceMediaSessionListener((command) => onCommandRef.current(command));
    return () => subscription?.remove();
  }, []);

  // Remove the card when playback goes idle, or on unmount.
  useEffect(() => {
    if (!active) return;
    return () => {
      lastSyncRef.current = null;
      stopDeviceMediaSession();
    };
  }, [active]);

  // Push on content / play-state changes, or when progress drifts from what the card shows.
  useEffect(() => {
    if (!active || !title) return;

    const now = Date.now();
    const key = `${title}|${artist}|${isPlaying}|${duration}|${speed}|${manageAudioFocus}`;
    const last = lastSyncRef.current;
    if (last?.key === key) {
      const elapsed = last.playing ? ((now - last.at) / 1000) * last.speed : 0;
      if (Math.abs(currentTime - (last.position + elapsed)) < RESYNC_THRESHOLD) return;
    }

    setDeviceMediaSession({
      title,
      artist,
      album: ALBUM_TITLE,
      durationMs: Math.round(duration * 1000),
      positionMs: Math.round(Math.min(currentTime, duration) * 1000),
      speed,
      playing: isPlaying,
      manageAudioFocus,
    });
    lastSyncRef.current = { key, position: currentTime, at: now, playing: isPlaying, speed };
  }, [active, title, artist, isPlaying, currentTime, duration, speed, manageAudioFocus]);
};
