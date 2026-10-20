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
// Heads-up toasts this long before sleep mode starts (5 min, then 3 min later), ascending.
const WARNING_LEADS_SECONDS = [2 * 60, 5 * 60];
// How often the countdown is checked while the app is open; each toast lands within this.
const WARNING_CHECK_MS = 5_000;
// A start toast is only shown for a start that was counted down to, within this many minutes.
const START_TOAST_WINDOW_MINUTES = 2;

/** Sleep mode toasts sit at the top and stay longer than the usual ones. */
export const showSleepToast = (message: string) =>
  showToast(message, 'info', { position: 'top', durationMs: 5000, icon: 'moon' });

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

  // The next start being counted down to (minute timestamp) and the smallest lead announced for it.
  const upcomingRef = useRef<{ startsAt: number; lead: number } | null>(null);

  /** Pauses playback if it is running inside the sleep window. */
  const enforce = () => {
    if (!isPlayingRef.current || !isSleepTimeNow()) return;
    onSleepRef.current();
    // This toast doubles as the start announcement.
    upcomingRef.current = null;
    showSleepToast(`Sleep mode: stories paused until ${sleepUntilLabel()}`);
  };

  // Progress updates (also in the background), play state and settings changes.
  useEffect(() => {
    if (!sleepMode.enabled || !isPlaying) return;
    enforce();
    const interval = setInterval(enforce, FOREGROUND_CHECK_MS);
    return () => clearInterval(interval);
  }, [sleepMode, isPlaying, currentTime]);

  // Heads-ups at 5 and 2 minutes before, then one at the start; each once per upcoming start.
  // Runs on a JS timer, i.e. only while the app is open, which is also the only time a toast can
  // be seen.
  const announceSleep = () => {
    const upcoming = upcomingRef.current;
    if (isSleepTimeNow()) {
      if (!upcoming) return;
      upcomingRef.current = null;
      // Not when coming back long after the start: that start was never announced on time.
      const minutesSinceStart = Date.now() / 60_000 - upcoming.startsAt;
      if (Math.abs(minutesSinceStart) > START_TOAST_WINDOW_MINUTES) return;
      if (isPlayingRef.current) enforce();
      else showSleepToast(`Sleep mode is on. Stories are paused until ${sleepUntilLabel()}.`);
      return;
    }

    const seconds = secondsUntilSleep(sleepModeRef.current);
    if (seconds === null) return;
    const lead = WARNING_LEADS_SECONDS.find((l) => seconds <= l);
    if (lead === undefined) return;
    // Identify this start by its (minute-rounded) timestamp so each lead is announced only once.
    const startsAt = Math.round((Date.now() + seconds * 1000) / 60_000);
    if (upcoming?.startsAt === startsAt && upcoming.lead <= lead) return;
    upcomingRef.current = { startsAt, lead };
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    showSleepToast(
      `Sleep mode starts in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} (${formatTime(
        sleepModeRef.current.startMinutes,
      )}). Stories will pause.`,
    );
  };

  useEffect(() => {
    if (!sleepMode.enabled) return;
    announceSleep();
    const interval = setInterval(announceSleep, WARNING_CHECK_MS);
    return () => clearInterval(interval);
  }, [sleepMode]);

  // Returning to the app: pause if the sleep window started, or warn if it is about to.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      enforce();
      announceSleep();
    });
    return () => subscription.remove();
  }, []);

  return { sleepMode, saveSleepMode, isSleepTimeNow, sleepUntilLabel };
};
