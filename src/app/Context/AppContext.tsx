import React, { createContext, useContext, useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Story, Voice, Child, RootScreen } from '../Types';
import { initialChild, initialStories, initialVoices } from '../Data/mockData';
import { getStories, saveStory, updateStory, getVoices, saveVoice, updateVoice } from '../../storage';

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
  addVoice: (name: string, languages: string[]) => Promise<void>;
  toggleFavorite: (storyId: string) => void;
  changeNarrator: (storyId: string, narratorId: string) => void;
  createNewStory: (title: string, category: any, durationMinutes: number, narratorId?: string) => Promise<void>;
  pendingStoryPrompt: { prompt: string; category: string; duration: number } | null;
  setPendingStoryPrompt: (val: any) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const screenRoutes: Record<RootScreen, string> = {
  Home: '/',
  Voices: '/Screen/VoicePage',
  Create: '/Screen/CreateStoryPage',
  Profile: '/Screen/ProfilePage',
  NowPlaying: '/Screen/NowPlay',
  AddVoice: '/Screen/AddVoicePage',
  GenerationLoader: '/Screen/CreateStoryPage',
};

const tabScreens: RootScreen[] = ['Home', 'Voices', 'Create', 'Profile'];

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

  const navigateToScreen = (screen: RootScreen) => {
    if (currentScreen === screen) return;

    setCurrentScreen(screen);
    const route = screenRoutes[screen] as never;
    if (tabScreens.includes(screen)) {
      router.replace(route);
      return;
    }
    router.push(route);
  };

  useEffect(() => {
    let isMounted = true;

    getStories().then((savedStories) => {
      if (isMounted && savedStories.length > 0) {
        setStories((currentStories) => {
          const savedIds = new Set(savedStories.map((story) => story.id));
          return [...savedStories, ...currentStories.filter((story) => !savedIds.has(story.id))];
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    getVoices().then(async (savedVoices) => {
      if (!isMounted) return;
      if (savedVoices.length > 0) {
        setVoices((currentVoices) => {
          const currentIds = new Set(currentVoices.map((voice) => voice.id));
          return [...currentVoices, ...savedVoices.filter((voice) => !currentIds.has(voice.id))];
        });
        return;
      }

      for (const voice of initialVoices) {
        await saveVoice(voice);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

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
    navigateToScreen('NowPlaying');
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
    void updateVoice(voiceId, { isDefault: true });
    setVoices((prev) =>
      prev.map((voice) => {
        const isDefault = voice.id === voiceId;
        if (voice.isDefault && !isDefault) void updateVoice(voice.id, { isDefault: false });
        return { ...voice, isDefault };
      })
    );
  };

  const addVoice = async (name: string, languages: string[]) => {
    const newVoice: Voice = {
      id: `v_${Date.now()}`,
      name,
      languages,
      status: 'Ready',
      isDefault: false,
      avatar: '👨🏽',
    };
    if (await saveVoice(newVoice)) setVoices((prev) => [...prev, newVoice]);
  };

  const toggleFavorite = (storyId: string) => {
    const story = stories.find((item) => item.id === storyId);
    if (story) void updateStory(storyId, { isFavorite: !story.isFavorite });
    setStories((prev) =>
      prev.map((s) => (s.id === storyId ? { ...s, isFavorite: !s.isFavorite } : s))
    );
    if (activeStory && activeStory.id === storyId) {
      setActiveStory((prev) => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
    }
  };

  const changeNarrator = (storyId: string, narratorId: string) => {
    void updateStory(storyId, { narratorId });
    setStories((prev) =>
      prev.map((s) => (s.id === storyId ? { ...s, narratorId } : s))
    );
    if (activeStory && activeStory.id === storyId) {
      setActiveStory((prev) => prev ? { ...prev, narratorId } : null);
    }
  };

  const createNewStory = async (title: string, category: any, durationMinutes: number, narratorId?: string) => {
    const narrator = voices.find((voice) => voice.id === narratorId)
      || voices.find((voice) => voice.isDefault)
      || voices[0];
    const newStory: Story = {
      id: `s_${Date.now()}`,
      title: title || `${child.name}'s New Adventure`,
      description: 'A custom magical tale generated just for you.',
      category: category || 'Adventure',
      duration: durationMinutes * 60,
      narratorId: narrator.id,
      artwork: '✨',
      progress: 0,
      isFavorite: false,
    };
    const saved = await saveStory(newStory);
    if (!saved) return;

    setStories((prev) => [newStory, ...prev]);
    playStory(newStory, true);
  };

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        setCurrentScreen: navigateToScreen,
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