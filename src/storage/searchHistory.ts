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

/** Newest first; searching "MOON " again moves "moon" to the top instead of adding it twice. */
export const addSearchHistory = async (query: string): Promise<string[]> => {
  const text = query.trim().replace(/\s+/g, ' ');
  const history = await getSearchHistory();
  if (!text) return history;

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

export const clearSearchHistory = async (): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(SEARCH_HISTORY_STORAGE_KEY);
    return true;
  } catch (error) {
    logStorageError('clear', error);
    return false;
  }
};
