import AsyncStorage from '@react-native-async-storage/async-storage';
import { Voice } from '../app/Types';

export const VOICES_STORAGE_KEY = '@suno_family_voices';

const logVoiceStorageError = (operation: string, error: unknown) => {
  if (__DEV__) console.error(`Unable to ${operation} family voices`, error);
};

export const getVoices = async (): Promise<Voice[]> => {
  try {
    const value = await AsyncStorage.getItem(VOICES_STORAGE_KEY);
    if (!value) return [];

    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as Voice[]) : [];
  } catch (error) {
    logVoiceStorageError('read', error);
    return [];
  }
};

export const saveVoice = async (voice: Voice): Promise<boolean> => {
  try {
    const voices = await getVoices();
    await AsyncStorage.setItem(VOICES_STORAGE_KEY, JSON.stringify([...voices, voice]));
    return true;
  } catch (error) {
    logVoiceStorageError('save', error);
    return false;
  }
};

export const updateVoice = async (id: string, updates: Partial<Voice>): Promise<boolean> => {
  try {
    const voices = await getVoices();
    const updatedVoices = voices.map((voice) => (
      voice.id === id ? { ...voice, ...updates, id } : voice
    ));
    await AsyncStorage.setItem(VOICES_STORAGE_KEY, JSON.stringify(updatedVoices));
    return true;
  } catch (error) {
    logVoiceStorageError('update', error);
    return false;
  }
};

export const deleteVoice = async (id: string): Promise<boolean> => {
  try {
    const voices = await getVoices();
    await AsyncStorage.setItem(
      VOICES_STORAGE_KEY,
      JSON.stringify(voices.filter((voice) => voice.id !== id)),
    );
    return true;
  } catch (error) {
    logVoiceStorageError('delete', error);
    return false;
  }
};