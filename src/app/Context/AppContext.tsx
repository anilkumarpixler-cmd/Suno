import React, { createContext, useContext, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Child, CreateStoryInput, RootScreen, Story, Voice } from '../Types';
import { initialChild, initialStories, initialVoices } from '../Data/mockData';
import { useStoryPlayer } from '../hooks/useStoryPlayer';
import { estimateDuration, normalizeStory } from '../services/storySpeech';
import {
  deleteVoice as deleteStoredVoice,
  getStories,
  getVoices,
  saveStory,
  saveVoice,
  updateStory,
  updateVoice,
} from '../../storage';

type AppContextType = {
  currentScreen: RootScreen;
  setCurrentScreen: (screen: RootScreen) => void;
  child: Child;
  voices: Voice[];
  stories: Story[];
  activeStory: Story | null;
  lastPlayedStoryId: string | null;
  isPlaying: boolean;
  currentTime: number;
  playStory: (story: Story, autoPlay?: boolean) => void;
  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  skipTime: (seconds: number) => void;
  playNextStory: () => void;
  playPreviousStory: () => void;
  setDefaultVoice: (voiceId: string) => void;
  addVoice: (name: string, languages: string[], audioUri?: string) => Promise<void>;
  deleteVoice: (voiceId: string) => Promise<void>;
  toggleFavorite: (storyId: string) => void;
  changeNarrator: (storyId: string, voiceId: string) => void;
  createNewStory: (input: CreateStoryInput) => Promise<void>;
};

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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreenState] = useState<RootScreen>('Home');
  const [child] = useState<Child>(initialChild);
  const [voices, setVoices] = useState<Voice[]>(initialVoices);
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [lastPlayedStoryId, setLastPlayedStoryId] = useState<string | null>(
    initialStories.find((story) => story.progress > 0)?.id ?? null
  );

  const navigateToScreen = (screen: RootScreen) => {
    if (currentScreen === screen) return;
    setCurrentScreenState(screen);
    router.replace(screenRoutes[screen] as never);
  };

  const {
    activeStory,
    setActiveStory,
    isPlaying,
    currentTime,
    playStory,
    togglePlayPause,
    seekTo,
    skipTime,
    playNextStory,
    playPreviousStory,
    restartSpeech,
  } = useStoryPlayer({
    stories,
    voices,
    currentScreen,
    setCurrentScreen: navigateToScreen,
  });

  useEffect(() => {
    let isMounted = true;

    getStories().then((savedStories) => {
      if (!isMounted || savedStories.length === 0) return;
      setStories((currentStories) => {
        const normalized = savedStories.map((story) => normalizeStory(story));
        const savedIds = new Set(normalized.map((story) => story.id));
        return [...normalized, ...currentStories.filter((story) => !savedIds.has(story.id))];
      });
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

  useEffect(() => {
    if (activeStory) setLastPlayedStoryId(activeStory.id);
  }, [activeStory?.id]);

  useEffect(() => {
    if (!activeStory) return;
    const storyId = activeStory.id;
    const time = currentTime;
    setStories((prev) =>
      prev.map((item) => (item.id === storyId && item.progress !== time ? { ...item, progress: time } : item))
    );
    const timeout = setTimeout(() => {
      void updateStory(storyId, { progress: time });
    }, 800);
    return () => clearTimeout(timeout);
  }, [currentTime, activeStory?.id]);

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

  const addVoice = async (name: string, languages: string[], audioUri?: string) => {
    const newVoice: Voice = {
      id: `v_${Date.now()}`,
      name: name.trim(),
      languages,
      status: 'Ready',
      isDefault: false,
      avatar: '👤',
      audioUri,
    };
    if (await saveVoice(newVoice)) setVoices((prev) => [...prev, newVoice]);
  };

  const deleteVoice = async (voiceId: string) => {
    if (await deleteStoredVoice(voiceId)) {
      setVoices((prev) => prev.filter((voice) => voice.id !== voiceId));
    }
  };

  const toggleFavorite = (storyId: string) => {
    const story = stories.find((item) => item.id === storyId);
    if (story) void updateStory(storyId, { isFavorite: !story.isFavorite });
    setStories((prev) =>
      prev.map((item) => (item.id === storyId ? { ...item, isFavorite: !item.isFavorite } : item))
    );
    setActiveStory((currentStory) =>
      currentStory?.id === storyId
        ? { ...currentStory, isFavorite: !currentStory.isFavorite }
        : currentStory
    );
  };

  const changeNarrator = (storyId: string, voiceId: string) => {
    const current =
      activeStory?.id === storyId
        ? activeStory
        : stories.find((story) => story.id === storyId);
    if (!current) return;

    const nextStory = { ...current, narratorId: voiceId };
    void updateStory(storyId, { narratorId: voiceId });
    setStories((currentStories) =>
      currentStories.map((story) => (story.id === storyId ? nextStory : story))
    );
    setActiveStory((currentStory) =>
      currentStory?.id === storyId ? nextStory : currentStory
    );
    restartSpeech(nextStory);
  };

  const createNewStory = async (input: CreateStoryInput) => {
    const script = input.script.trim();
    const newStory: Story = {
      id: `s_${Date.now()}`,
      title: input.title.trim(),
      description: script.slice(0, 80),
      category: input.category,
      duration: estimateDuration(script),
      narratorId: input.narratorId,
      artwork: '📖',
      progress: 0,
      isFavorite: false,
      script,
      language: input.language,
    };

    const saved = await saveStory(newStory);
    if (!saved) return;

    setStories((currentStories) => [newStory, ...currentStories]);
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
        lastPlayedStoryId,
        isPlaying,
        currentTime,
        playStory,
        togglePlayPause,
        seekTo,
        skipTime,
        playNextStory,
        playPreviousStory,
        setDefaultVoice,
        addVoice,
        deleteVoice,
        toggleFavorite,
        changeNarrator,
        createNewStory,
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
