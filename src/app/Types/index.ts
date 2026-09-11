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

export interface Voice {
  id: string;
  name: string;
  languages: string[];
  // status:string;
  status: 'Ready' | 'Processing' | 'Incomplete';
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
  artwork: string;
  audioUri?: string;
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
  | 'GenerationLoader';