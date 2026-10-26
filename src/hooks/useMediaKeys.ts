import { useEffect, useRef } from 'react';
import { addMediaKeyListener, MediaKey, setMediaKeysEnabled } from '../../modules/suno-media-keys';

type UseMediaKeysArgs = {
  /** True while a story is active; otherwise headphone keys go on to other apps. */
  enabled: boolean;
  onKey: (key: MediaKey) => void;
};

/** Android wired headphone keys while Suno is on screen (play / pause, next, previous). */
export const useMediaKeys = ({ enabled, onKey }: UseMediaKeysArgs) => {
  const onKeyRef = useRef(onKey);

  useEffect(() => {
    onKeyRef.current = onKey;
  });

  useEffect(() => {
    const subscription = addMediaKeyListener((key) => onKeyRef.current(key));
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    setMediaKeysEnabled(enabled);
    return () => setMediaKeysEnabled(false);
  }, [enabled]);
};
