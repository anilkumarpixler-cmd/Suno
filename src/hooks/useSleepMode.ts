import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { showToast } from '../components/Common/Toast';
import {
  DEFAULT_SLEEP_MODE,
  formatTime,
  isSleepTime,
  loadSleepMode,
  saveSleepModeSettings,
  secondsUntilSleep,
  SleepModeSettings,
} from '../services/sleepMode';

// Foreground re-check while playing, so the pause lands within this long of the start time.
const FOREGROUND_CHECK_MS = 30_000;
// Heads-up toast this long before sleep mode starts, checked this often while the app is open.
const WARNING_LEAD_SECONDS = 5 * 60;
const WARNING_CHECK_MS = 10_000;

type UseSleepModeArgs = {
  isPlaying: boolean;
  /** Playback progress; changes while playing, which re-checks the schedule. */
  currentTime: number;
  /** Pauses playback when the sleep window starts. */
  onSleep: () => void;
};

/**
 * Sleep mode: on the chosen days, between the start and end time, stories pause and won't start.
 *
 * JS timers are frozen while the app is backgrounded / the screen is locked, so the schedule is
 * also checked on every playback progress update, which keeps arriving from native events
 * (expo-audio status, expo-speech word boundaries).
 */
export const useSleepMode = ({ isPlaying, currentTime, onSleep }: UseSleepModeArgs) => {
  const [sleepMode, setSleepModeState] = useState<SleepModeSettings>(DEFAULT_SLEEP_MODE);

  const sleepModeRef = useRef(sleepMode);
  const isPlayingRef = useRef(isPlaying);
  const onSleepRef = useRef(onSleep);
  useEffect(() => {
    sleepModeRef.current = sleepMode;
    isPlayingRef.current = isPlaying;
    onSleepRef.current = onSleep;
  });

  useEffect(() => {
    let isMounted = true;
    void loadSleepMode().then((settings) => {
      if (!isMounted) return;
      sleepModeRef.current = settings;
      setSleepModeState(settings);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const saveSleepMode = async (settings: SleepModeSettings) => {
    await saveSleepModeSettings(settings);
    sleepModeRef.current = settings;
    setSleepModeState(settings);
  };

  const isSleepTimeNow = () => isSleepTime(sleepModeRef.current);

  const sleepUntilLabel = () => formatTime(sleepModeRef.current.endMinutes);

  /** Pauses playback if it is running inside the sleep window. */
  const enforce = () => {
    if (!isPlayingRef.current || !isSleepTimeNow()) return;
    onSleepRef.current();
    showToast(`Sleep mode: stories paused until ${sleepUntilLabel()}`);
  };

  // Progress updates (also in the background), play state and settings changes.
  useEffect(() => {
    if (!sleepMode.enabled || !isPlaying) return;
    enforce();
    const interval = setInterval(enforce, FOREGROUND_CHECK_MS);
    return () => clearInterval(interval);
  }, [sleepMode, isPlaying, currentTime]);

  // 5-minute heads-up, once per upcoming start. Runs on a JS timer, i.e. only while the app is
  // open, which is also the only time a toast can be seen.
  const lastWarnedStartRef = useRef<number | null>(null);
  const warnIfSleepSoon = () => {
    const seconds = secondsUntilSleep(sleepModeRef.current);
    if (seconds === null || seconds > WARNING_LEAD_SECONDS) return;
    // Identify this start by its (minute-rounded) timestamp so it is announced only once.
    const startsAt = Math.round((Date.now() + seconds * 1000) / 60_000);
    if (lastWarnedStartRef.current === startsAt) return;
    lastWarnedStartRef.current = startsAt;
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    showToast(
      `Sleep mode starts in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} (${formatTime(
        sleepModeRef.current.startMinutes,
      )}). Stories will pause.`,
    );
  };

  useEffect(() => {
    if (!sleepMode.enabled) return;
    warnIfSleepSoon();
    const interval = setInterval(warnIfSleepSoon, WARNING_CHECK_MS);
    return () => clearInterval(interval);
  }, [sleepMode]);

  // Returning to the app: pause if the sleep window started, or warn if it is about to.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      enforce();
      warnIfSleepSoon();
    });
    return () => subscription.remove();
  }, []);

  return { sleepMode, saveSleepMode, isSleepTimeNow, sleepUntilLabel };
};
