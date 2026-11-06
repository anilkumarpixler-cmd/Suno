import AsyncStorage from '@react-native-async-storage/async-storage';

// Device only: recent searches never go to the server.
export const SEARCH_HISTORY_STORAGE_KEY = '@suno_search_history';
const MAX_SEARCH_HISTORY = 10;

/** Case and extra spaces don't matter: "  AARAV " finds "Aarav Goes to the Moon". */
export const normalize = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase();

const logStorageError = (operation: string, error: unknown) => {
  if (__DEV__) console.error(`Unable to ${operation} search history`, error);
};

export const getSearchHistory = async (): Promise<string[]> => {
  try {
    const value = await AsyncStorage.getItem(SEARCH_HISTORY_STORAGE_KEY);
    const parsed: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch (error) {
    logStorageError('read', error);
    return [];
  }
};

// History writes run one after another: a save that reads the list while a clear (or another
// save) is still writing would put the old searches back.
let writeChain: Promise<unknown> = Promise.resolve();
const queueWrite = <T>(task: () => Promise<T>): Promise<T> => {
  const run = writeChain.then(task, task);
  writeChain = run.catch(() => undefined);
  return run;
};

// Bumped by "Clear all": a save asked for before it must not write the old list back.
let clearCount = 0;

/** Newest first; searching "MOON " again moves "moon" to the top instead of adding it twice. */
export const addSearchHistory = (query: string): Promise<string[]> => {
  const askedAt = clearCount;
  return queueWrite(() => saveSearch(query, askedAt));
};

const saveSearch = async (query: string, askedAt: number): Promise<string[]> => {
  const text = query.trim().replace(/\s+/g, ' ');
  const history = await getSearchHistory();
  if (!text || askedAt !== clearCount) return history;

  const key = normalize(text);
  const next = [text, ...history.filter((item) => normalize(item) !== key)].slice(
    0,
    MAX_SEARCH_HISTORY,
  );
  try {
    await AsyncStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    logStorageError('save', error);
  }
  return next;
};

export const clearSearchHistory = (): Promise<boolean> => {
  clearCount += 1;
  return queueWrite(async () => {
    try {
      await AsyncStorage.removeItem(SEARCH_HISTORY_STORAGE_KEY);
      return true;
    } catch (error) {
      logStorageError('clear', error);
      return false;
    }
  });
};

/** Changes on every "Clear all": a save's result from before it is stale for the screen. */
export const searchHistoryClearCount = () => clearCount;
