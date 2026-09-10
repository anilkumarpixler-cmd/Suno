import AsyncStorage from '@react-native-async-storage/async-storage';
import { Story } from '../app/Types';

export const STORIES_STORAGE_KEY = '@suno_stories';

const logStorageError = (operation: string, error: unknown) => {
  if (__DEV__) console.error(`Unable to ${operation} stories`, error);
};

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

export const saveStory = async (story: Story): Promise<boolean> => {
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
};

export const getStoryById = async (id: string): Promise<Story | null> => {
  const stories = await getStories();
  return stories.find((story) => story.id === id) || null;
};

export const updateStory = async (id: string, updates: Partial<Story>): Promise<boolean> => {
  try {
    const stories = await readStories();
    if (!stories) return false;

    const updatedStories = stories.map((story) => (
      story.id === id ? { ...story, ...updates, id } : story
    ));
    await AsyncStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(updatedStories));
    return true;
  } catch (error) {
    logStorageError('update', error);
    return false;
  }
};

export const deleteStory = async (id: string): Promise<boolean> => {
  try {
    const stories = await readStories();
    if (!stories) return false;

    await AsyncStorage.setItem(
      STORIES_STORAGE_KEY,
      JSON.stringify(stories.filter((story) => story.id !== id)),
    );
    return true;
  } catch (error) {
    logStorageError('delete', error);
    return false;
  }
};
export const clearStories = async (): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(STORIES_STORAGE_KEY);
    return true;
  } catch (error) {
    logStorageError('clear', error);
    return false;
  }
};
