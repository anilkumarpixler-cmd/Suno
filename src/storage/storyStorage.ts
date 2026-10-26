import AsyncStorage from '@react-native-async-storage/async-storage';
import { Story } from '../Types';

export const STORIES_STORAGE_KEY = '@suno_stories';
// Ids of deleted stories: the built-in stories come from mockData, not storage, and would
// otherwise come back on the next start.
const DELETED_STORIES_STORAGE_KEY = '@suno_deleted_stories';
// Changes to built-in stories (favorite, progress, cloned audio), by id. Those stories aren't in
// the saved list, so their changes are kept here and applied on top of mockData at start.
const STORY_CHANGES_STORAGE_KEY = '@suno_story_changes';

export type StoryChanges = Record<string, Partial<Story>>;

const logStorageError = (operation: string, error: unknown) => {
  if (__DEV__) console.error(`Unable to ${operation} stories`, error);
};

// Writes read the saved value, change it and write it back. Run them one at a time, or two at
// once (progress saving while toggling favorite) would lose one of the changes.
let writeQueue: Promise<unknown> = Promise.resolve();
const queueWrite = <T>(write: () => Promise<T>): Promise<T> => {
  const result = writeQueue.then(write);
  writeQueue = result.catch(() => undefined);
  return result;
};

const readStoryChanges = async (): Promise<StoryChanges | null> => {
  try {
    const value = await AsyncStorage.getItem(STORY_CHANGES_STORAGE_KEY);
    const parsed: unknown = value ? JSON.parse(value) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as StoryChanges)
      : {};
  } catch (error) {
    logStorageError('read changes of', error);
    return null;
  }
};

export const getStoryChanges = async (): Promise<StoryChanges> => (await readStoryChanges()) || {};

const readStories = async (): Promise<Story[] | null> => {
  try {
    const value = await AsyncStorage.getItem(STORIES_STORAGE_KEY);
    if (!value) return [];

    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as Story[]) : [];
  } catch (error) {
    logStorageError('read', error);
    return null;
  }
};

export const getStories = async (): Promise<Story[]> => (await readStories()) || [];

export const saveStory = (story: Story): Promise<boolean> => queueWrite(async () => {
  try {
    const stories = await readStories();
    if (!stories) return false;

    const storyToSave = {
      ...story,
      id: story.id || `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
    await AsyncStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify([storyToSave, ...stories]));
    return true;
  } catch (error) {
    logStorageError('save', error);
    return false;
  }
});

export const getStoryById = async (id: string): Promise<Story | null> => {
  const stories = await getStories();
  return stories.find((story) => story.id === id) || null;
};

export const updateStory = (id: string, updates: Partial<Story>): Promise<boolean> => queueWrite(async () => {
  try {
    const stories = await readStories();
    if (!stories) return false;

    if (stories.some((story) => story.id === id)) {
      const updatedStories = stories.map((story) => (
        story.id === id ? { ...story, ...updates, id } : story
      ));
      await AsyncStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(updatedStories));
      return true;
    }

    // A late write (progress, cloned audio) for a deleted story must not leave an entry behind.
    if ((await getDeletedStoryIds()).includes(id)) return false;

    // Built-in story: keep the change on its own.
    const changes = await readStoryChanges();
    if (!changes) return false;
    await AsyncStorage.setItem(
      STORY_CHANGES_STORAGE_KEY,
      JSON.stringify({ ...changes, [id]: { ...changes[id], ...updates } }),
    );
    return true;
  } catch (error) {
    logStorageError('update', error);
    return false;
  }
});

export const deleteStory = (id: string): Promise<boolean> => queueWrite(async () => {
  try {
    const stories = await readStories();
    if (!stories) return false;

    await AsyncStorage.setItem(
      STORIES_STORAGE_KEY,
      JSON.stringify(stories.filter((story) => story.id !== id)),
    );
    // A built-in story's saved favorite / progress / audio goes with it.
    const changes = await readStoryChanges();
    if (changes && changes[id]) {
      const rest = { ...changes };
      delete rest[id];
      await AsyncStorage.setItem(STORY_CHANGES_STORAGE_KEY, JSON.stringify(rest));
    }
    return true;
  } catch (error) {
    logStorageError('delete', error);
    return false;
  }
});

export const getDeletedStoryIds = async (): Promise<string[]> => {
  try {
    const value = await AsyncStorage.getItem(DELETED_STORIES_STORAGE_KEY);
    const parsed: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch (error) {
    logStorageError('read deleted', error);
    return [];
  }
};

export const markStoryDeleted = (id: string): Promise<boolean> => queueWrite(async () => {
  try {
    const ids = await getDeletedStoryIds();
    if (ids.includes(id)) return true;
    await AsyncStorage.setItem(DELETED_STORIES_STORAGE_KEY, JSON.stringify([...ids, id]));
    return true;
  } catch (error) {
    logStorageError('mark deleted', error);
    return false;
  }
});

export const clearStories = async (): Promise<boolean> => {
  try {
    await AsyncStorage.multiRemove([STORIES_STORAGE_KEY, STORY_CHANGES_STORAGE_KEY]);
    return true;
  } catch (error) {
    logStorageError('clear', error);
    return false;
  }
};
