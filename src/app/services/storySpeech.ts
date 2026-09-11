import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { Category, Story, StoryLanguage } from '../Types';

export const WORDS_PER_CHUNK = 22;
export const SECONDS_PER_CHUNK = 10;
export const WORDS_PER_SECOND = WORDS_PER_CHUNK / SECONDS_PER_CHUNK;

export const splitScriptIntoChunks = (script: string): string[] => {
  const words = script.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const chunks: string[] = [];
  for (let index = 0; index < words.length; index += WORDS_PER_CHUNK) {
    chunks.push(words.slice(index, index + WORDS_PER_CHUNK).join(' '));
  }
  return chunks;
};

export const estimateDuration = (script: string): number => {
  const words = script.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_SECOND));
};

export const getRemainingScript = (script: string, time: number): string => {
  const words = script.trim().split(/\s+/).filter(Boolean);
  const wordIndex = Math.max(0, Math.min(Math.floor(time * WORDS_PER_SECOND), words.length));
  return words.slice(wordIndex).join(' ');
};

export const languageToLocale = (language?: string): string => {
  const value = (language || 'English').toLowerCase();
  if (value.includes('hindi') || value === 'hi') return 'hi-IN';
  return 'en-IN';
};

export const pitchForVoice = (voiceId: string): number => {
  const pitches = [0.9, 1, 1.08, 1.15];
  const hash = voiceId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return pitches[hash % pitches.length];
};

export const getFallbackScript = (
  childName: string,
  storyType: string,
  language: StoryLanguage,
): string => {
  if (language === 'Hindi') {
    return `${childName} की ${storyType} की एक छोटी सी कहानी। सोने से पहले एक प्यारी सी बात।`;
  }
  if (language === 'Hinglish') {
    return `${childName} ki ${storyType} story. A soft bedtime tale for a good night.`;
  }
  return `${childName}'s ${storyType} about a bedtime adventure.`;
};

export const mapStoryTypeToCategory = (storyType: string): Category => {
  const value = storyType.toLowerCase();
  if (value.includes('animal')) return 'Animals';
  if (value.includes('learn')) return 'Learning';
  if (value.includes('bedtime')) return 'Bedtime';
  return 'Adventure';
};

export const normalizeStory = (story: Story): Story => {
  const script = story.script || story.description || story.title;
  return {
    ...story,
    script,
    language: story.language || 'English',
    duration: story.duration || estimateDuration(script),
  };
};

export const stopSpeech = () => Speech.stop();

export const pauseSpeech = async () => {
  if (Platform.OS !== 'android' && Speech.pause) {
    try {
      await Speech.pause();
      return 'paused' as const;
    } catch {
      await Speech.stop();
      return 'stopped' as const;
    }
  }

  await Speech.stop();
  return 'stopped' as const;
};

export const resumeSpeech = async () => {
  if (Platform.OS !== 'android' && Speech.resume) {
    try {
      await Speech.resume();
      return 'resumed' as const;
    } catch {
      return 'restart' as const;
    }
  }

  return 'restart' as const;
};

type SpeakOptions = {
  locale: string;
  pitch: number;
  onDone?: () => void;
};

export const speakText = (text: string, { locale, pitch, onDone }: SpeakOptions) => {
  Speech.speak(text, {
    language: locale,
    pitch,
    rate: 0.95,
    onDone,
  });
};
