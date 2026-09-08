import React, { createContext, useContext, useState, useEffect } from 'react';
import { Story, Voice, Child, RootScreen } from '../Types';
import { initialChild, initialStories, initialVoices } from '../Data/mockData';

interface AppContextType {
  currentScreen: RootScreen;
  setCurrentScreen: (screen: RootScreen) => void;
  child: Child;
  voices: Voice[];
  stories: Story[];
  activeStory: Story | null;
  isPlaying: boolean;
  currentTime: number;
  playStory: (story: Story, startFromBeginning?: boolean) => void;
  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  skipTime: (seconds: number) => void;
  setDefaultVoice: (voiceId: string) => void;
  addVoice: (name: string, languages: string[]) => void;
  toggleFavorite: (storyId: string) => void;
  changeNarrator: (storyId: string, narratorId: string) => void;
  createNewStory: (title: string, category: any, durationMinutes: number) => void;
  pendingStoryPrompt: { prompt: string; category: string; duration: number } | null;
  setPendingStoryPrompt: (val: any) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<RootScreen>('Home');
  const [child] = useState<Child>(initialChild);
  const [voices, setVoices] = useState<Voice[]>(initialVoices);
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [activeStory, setActiveStory] = useState<Story | null>(initialStories[0]);
  
  // Audio playback controls
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(120);
  const [pendingStoryPrompt, setPendingStoryPrompt] = useState<any>(null);

  // Playback Timer Simulation
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying && activeStory) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= activeStory.duration) {
            setIsPlaying(false);
            return activeStory.duration;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, activeStory]);

  const playStory = (story: Story, startFromBeginning = false) => {
    setActiveStory(story);
    setCurrentTime(startFromBeginning ? 0 : story.progress);
    setIsPlaying(true);
    setCurrentScreen('NowPlaying');
  };

  const togglePlayPause = () => {
    setIsPlaying((prev) => !prev);
  };

  const seekTo = (time: number) => {
    if (activeStory) {
      const clamped = Math.max(0, Math.min(time, activeStory.duration));
      setCurrentTime(clamped);
    }
  };

  const skipTime = (seconds: number) => {
    seekTo(currentTime + seconds);
  };

  const setDefaultVoice = (voiceId: string) => {
    setVoices((prev) =>
      prev.map((v) => ({ ...v, isDefault: v.id === voiceId }))
    );
  };

  const addVoice = (name: string, languages: string[]) => {
    const newVoice: Voice = {
      id: `v_${Date.now()}`,
      name,
      languages,
      status: 'Ready',
      isDefault: false,
      avatar: '🎙️',
    };
    setVoices((prev) => [...prev, newVoice]);
  };

  const toggleFavorite = (storyId: string) => {
    setStories((prev) =>
      prev.map((s) => (s.id === storyId ? { ...s, isFavorite: !s.isFavorite } : s))
    );
    if (activeStory && activeStory.id === storyId) {
      setActiveStory((prev) => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
    }
  };

  const changeNarrator = (storyId: string, narratorId: string) => {
    setStories((prev) =>
      prev.map((s) => (s.id === storyId ? { ...s, narratorId } : s))
    );
    if (activeStory && activeStory.id === storyId) {
      setActiveStory((prev) => prev ? { ...prev, narratorId } : null);
    }
  };

  const createNewStory = (title: string, category: any, durationMinutes: number) => {
    const defaultVoice = voices.find((v) => v.isDefault) || voices[0];
    const newStory: Story = {
      id: `s_${Date.now()}`,
      title: title || `${child.name}'s New Adventure`,
      description: 'A custom magical tale generated just for you.',
      category: category || 'Adventure',
      duration: durationMinutes * 60,
      narratorId: defaultVoice.id,
      artwork: '✨',
      progress: 0,
      isFavorite: false,
    };
    setStories((prev) => [newStory, ...prev]);
    playStory(newStory, true);
  };

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        setCurrentScreen,
        child,
        voices,
        stories,
        activeStory,
        isPlaying,
        currentTime,
        playStory,
        togglePlayPause,
        seekTo,
        skipTime,
        setDefaultVoice,
        addVoice,
        toggleFavorite,
        changeNarrator,
        createNewStory,
        pendingStoryPrompt,
        setPendingStoryPrompt,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};