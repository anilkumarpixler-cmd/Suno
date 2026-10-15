import AsyncStorage from '@react-native-async-storage/async-storage';

export const SLEEP_MODE_STORAGE_KEY = '@suno_sleep_mode';

const MINUTES_PER_DAY = 24 * 60;

export type SleepModeSettings = {
  enabled: boolean;
  /** Minutes after midnight, e.g. 21:00 -> 1260. */
  startMinutes: number;
  endMinutes: number;
  /** Days the sleep window starts on, as `Date.getDay()` (0 = Sunday). */
  days: number[];
};

export const DEFAULT_SLEEP_MODE: SleepModeSettings = {
  enabled: false,
  startMinutes: 21 * 60,
  endMinutes: 7 * 60,
  // No days pre-selected: the user chooses them when turning sleep mode on.
  days: [],
};

/** Display order Mon..Sun. */
export const WEEK_DAYS = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
  { day: 0, label: 'Sun' },
] as const;

export const wrapMinutes = (minutes: number) =>
  ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;

export const formatTime = (minutes: number) => {
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(mins).padStart(2, '0')} ${hours24 < 12 ? 'AM' : 'PM'}`;
};

export const formatDays = (days: number[]) => {
  const set = new Set(days);
  if (set.size === 7) return 'Every day';
  if (set.size === 5 && [1, 2, 3, 4, 5].every((day) => set.has(day))) return 'Weekdays';
  if (set.size === 2 && set.has(0) && set.has(6)) return 'Weekends';
  return WEEK_DAYS.filter(({ day }) => set.has(day))
    .map(({ label }) => label)
    .join(', ');
};

export const isValidSleepMode = (settings: SleepModeSettings) =>
  !settings.enabled || (settings.days.length > 0 && settings.startMinutes !== settings.endMinutes);

export const isSameSleepMode = (a: SleepModeSettings, b: SleepModeSettings) =>
  a.enabled === b.enabled &&
  a.startMinutes === b.startMinutes &&
  a.endMinutes === b.endMinutes &&
  a.days.length === b.days.length &&
  a.days.every((day) => b.days.includes(day));

/** True when `date` falls inside the sleep window. Handles overnight windows (21:00 -> 07:00). */
export const isSleepTime = (settings: SleepModeSettings, date = new Date()) => {
  if (!settings.enabled || !isValidSleepMode(settings)) return false;
  const now = date.getHours() * 60 + date.getMinutes();
  const today = date.getDay();
  const { startMinutes: start, endMinutes: end, days } = settings;

  if (start < end) return days.includes(today) && now >= start && now < end;
  // Overnight: started today in the evening, or started yesterday and still before the end.
  const yesterday = (today + 6) % 7;
  return (days.includes(today) && now >= start) || (days.includes(yesterday) && now < end);
};

/**
 * Seconds until the next sleep window starts (on a selected day, within the next 24 h).
 * Null when sleep mode is off/invalid, already active, or no start comes up in that time.
 */
export const secondsUntilSleep = (settings: SleepModeSettings, date = new Date()) => {
  if (!settings.enabled || !isValidSleepMode(settings) || isSleepTime(settings, date)) return null;
  const now = date.getHours() * 60 + date.getMinutes();
  const minutesAhead = wrapMinutes(settings.startMinutes - now);
  // A start earlier in the day than now means tomorrow's start.
  const startDay = (date.getDay() + (settings.startMinutes <= now ? 1 : 0)) % 7;
  if (!settings.days.includes(startDay)) return null;
  const seconds = (minutesAhead === 0 ? MINUTES_PER_DAY : minutesAhead) * 60 - date.getSeconds();
  return seconds > 0 ? seconds : null;
};

const isMinutes = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < MINUTES_PER_DAY;

export const loadSleepMode = async (): Promise<SleepModeSettings> => {
  try {
    const raw = await AsyncStorage.getItem(SLEEP_MODE_STORAGE_KEY);
    if (!raw) return DEFAULT_SLEEP_MODE;
    const parsed: Partial<SleepModeSettings> = JSON.parse(raw);
    return {
      enabled: parsed.enabled === true,
      startMinutes: isMinutes(parsed.startMinutes) ? parsed.startMinutes : DEFAULT_SLEEP_MODE.startMinutes,
      endMinutes: isMinutes(parsed.endMinutes) ? parsed.endMinutes : DEFAULT_SLEEP_MODE.endMinutes,
      days: Array.isArray(parsed.days)
        ? parsed.days.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6)
        : DEFAULT_SLEEP_MODE.days,
    };
  } catch {
    return DEFAULT_SLEEP_MODE;
  }
};

export const saveSleepModeSettings = (settings: SleepModeSettings) =>
  AsyncStorage.setItem(SLEEP_MODE_STORAGE_KEY, JSON.stringify(settings));
