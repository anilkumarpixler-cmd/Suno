export type Category = 'All' | 'Bedtime' | 'Animals' | 'Adventure' | 'Learning';

export interface Child {
  id: string;
  name: string;
  avatar: string;
}

export interface Voice {
  id: string;
  name: string;
  languages: string[];
  status: 'Ready' | 'Processing' | 'Incomplete';
  isDefault: boolean;
  avatar: string;
}

export interface Story {
  id: string;
  title: string;
  description: string;
  category: Category;
  duration: number; // in seconds
  narratorId: string;
  artwork: string;
  audioUri?: string;
  progress: number; // in seconds
  isFavorite?: boolean;
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
  | 'GenerationLoader'
  | 'EditProfile'
  | 'Language'
  | 'SleepTimer'
  | 'PrivacyData';