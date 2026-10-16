export type Category = 'All' | 'Bedtime' | 'Animals' | 'Adventure' | 'Learning';

export type StoryLanguage = 'Hindi' | 'English' | 'Hinglish';

export type CreateStoryInput = {
  title: string;
  script: string;
  language: StoryLanguage;
  category: Category;
  narratorId: string;
};

export interface Child {
  id: string;
  name: string;
  avatar: string;
}

/** Server-side narrator lifecycle; only `ready` narrators read stories in their own voice. */
export type VoiceState = 'cloning' | 'saving_profile' | 'loading_gpu' | 'ready' | 'error';

export interface Voice {
  id: string;
  name: string;
  languages: string[];
  status: 'Ready' | 'Processing' | 'Incomplete';
  /** Missing on local/mock voices: treated as ready. */
  state?: VoiceState;
  stateError?: string;
  isDefault: boolean;
  avatar: string;
  audioUri?: string;
}

export interface Story {
  id: string;
  title: string;
  description: string;
  category: Category;
  duration: number; // in seconds
  narratorId: string;
  artwork: string; // emoji shown in the app UI
  artworkUrl?: string; // image URL for the lock screen / notification card (app icon if absent)
  audioUri?: string;
  clonedVoiceId?: string;
  clonedLanguage?: string;
  progress: number; // in seconds
  isFavorite?: boolean;
  script: string;
  language?: StoryLanguage;
}

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  currentStory: Story | null;
}

export type RootScreen =
  | 'Home'
  | 'Voices'
  | 'Create'
  | 'Profile'
  | 'NowPlaying'
  | 'AddVoice'
  | 'Favorites'
  | 'SleepTimer'
  | 'Appearance'
  | 'GenerationLoader';