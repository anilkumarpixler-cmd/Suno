import { isRunningInExpoGo } from 'expo';
import { Asset } from 'expo-asset';
import type { AudioMetadata, AudioPlayer } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Story } from '../Types';

const ALBUM_TITLE = 'Suno Stories';
const DEFAULT_ARTWORK = require('../../assets/images/new icon.png');
// Expo Go has no expo-audio playback service; binding fails and logs errors on every story.
// A dev build made before `enableBackgroundPlayback` was added fails the same way: rebuild it.
// Android uses `useDeviceMediaSession` instead: expo-audio's service calls startForeground() again
// on every play event, which Android 12+ rejects while the app is in the background.
const LOCK_SCREEN_SUPPORTED = Platform.OS === 'ios' && !isRunningInExpoGo();

type UseLockScreenControlsArgs = {
  /** True while the native player should own the lock screen / notification media card. */
  active: boolean;
  story: Story | null;
  narratorName?: string;
};

/** Resolves the bundled app icon to a URI the native media session can load. */
const useDefaultArtworkUri = () => {
  const [uri, setUri] = useState<string | undefined>();

  useEffect(() => {
    let isMounted = true;
    const asset = Asset.fromModule(DEFAULT_ARTWORK);
    asset
      .downloadAsync()
      .then(() => {
        if (isMounted) setUri(asset.localUri ?? asset.uri);
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, []);

  return uri;
};

/**
 * Shows the iOS lock screen media card for narrator (server) playback.
 *
 * The card is registered once per playback session. Story changes (auto-next / previous),
 * narrator changes and late-resolved artwork go through `updateLockScreenMetadata`, so the
 * card updates in place instead of disappearing between stories.
 */
export const useLockScreenControls = (
  player: AudioPlayer,
  { active, story, narratorName }: UseLockScreenControlsArgs,
) => {
  const defaultArtworkUri = useDefaultArtworkUri();
  const isRegisteredRef = useRef(false);
  const metadataRef = useRef<AudioMetadata | undefined>(undefined);

  const title = story?.title;
  const artist = narratorName || 'System Voice';
  const artworkUrl = story?.artworkUrl || defaultArtworkUri;

  // Keep the latest metadata for the registration effect (declared first so it runs first).
  useEffect(() => {
    metadataRef.current = title
      ? { title, artist, albumTitle: ALBUM_TITLE, artworkUrl }
      : undefined;
  }, [title, artist, artworkUrl]);

  // Register while active; clear when playback stops / goes idle, or on unmount.
  // Android, and System Voice (device TTS) playback, use `useDeviceMediaSession` instead.
  useEffect(() => {
    if (!active || !LOCK_SCREEN_SUPPORTED) return;
    try {
      player.setActiveForLockScreen(true, metadataRef.current, {
        showSeekBackward: true,
        showSeekForward: true,
      });
      isRegisteredRef.current = true;
    } catch {
      // Native player may already be released.
    }

    return () => {
      isRegisteredRef.current = false;
      try {
        player.clearLockScreenControls();
      } catch {
        // Native player may already be released.
      }
    };
  }, [active, player]);

  // Update the card in place when the story, narrator or artwork changes.
  useEffect(() => {
    if (!active || !LOCK_SCREEN_SUPPORTED || !isRegisteredRef.current || !metadataRef.current) return;
    try {
      player.updateLockScreenMetadata(metadataRef.current);
    } catch {
      // Native player may already be released.
    }
  }, [active, player, title, artist, artworkUrl]);
};
