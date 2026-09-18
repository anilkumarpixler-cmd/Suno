import React, { createContext, useContext, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Child, CreateStoryInput, RootScreen, Story, Voice } from '../Types';
import { initialChild, initialStories, initialVoices } from '../Data/mockData';
import { useStoryPlayer } from '../hooks/useStoryPlayer';
import { estimateDuration, normalizeStory } from '../services/storySpeech';
import {
  deleteVoiceOnServer,
  fetchVoices,
  setDefaultVoiceOnServer,
  uploadVoice,
} from '../services/sunoApi';
import { getStories, saveStory, updateStory } from '../storage';

type AppContextType = {
  currentScreen: RootScreen;
  setCurrentScreen: (screen: RootScreen) => void;
  child: Child;
  voices: Voice[];
  stories: Story[];
  activeStory: Story | null;
  lastPlayedStoryId: string | null;
  isPlaying: boolean;
  isPreparingAudio: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
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
  narratorPickerStoryId: string | null;
  openNarratorPicker: (storyId: string) => void;
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
  const [narratorPickerStoryId, setNarratorPickerStoryId] = useState<string | null>(null);

  const navigateToScreen = (screen: RootScreen) => {
    if (screen !== 'Voices' && screen !== 'AddVoice') {
      setNarratorPickerStoryId(null);
    }
    if (currentScreen === screen) return;
    setCurrentScreenState(screen);
    router.replace(screenRoutes[screen] as never);
  };

  const openNarratorPicker = (storyId: string) => {
    setNarratorPickerStoryId(storyId);
    navigateToScreen('Voices');
  };

  const {
    activeStory,
    setActiveStory,
    isPlaying,
    isPreparingAudio,
    currentTime,
    duration,
    playStory,
    togglePlayPause,
    seekTo,
    skipTime,
    playNextStory,
    playPreviousStory,
    restartSpeech,
    playbackSpeed,
    setPlaybackSpeed,
  } = useStoryPlayer({
    stories,
    voices,
    currentScreen,
    setCurrentScreen: navigateToScreen,
    onClonedAudio: (storyId, audioUrl, duration, voiceId, language) => {
      const updates = {
        audioUri: audioUrl,
        duration,
        clonedVoiceId: voiceId,
        clonedLanguage: language,
        progress: 0,
      };
      void updateStory(storyId, updates);
      setStories((currentStories) =>
        currentStories.map((story) => (story.id === storyId ? { ...story, ...updates } : story))
      );
      setActiveStory((currentStory) =>
        currentStory?.id === storyId ? { ...currentStory, ...updates } : currentStory
      );
    },
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

    fetchVoices()
      .then((remote) => {
        if (isMounted && remote.length > 0) setVoices(remote);
      })
      .catch(() => {
        if (isMounted) setVoices(initialVoices);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (activeStory) setLastPlayedStoryId(activeStory.id);
  }, [activeStory?.id]);

  useEffect(() => {
    if (!activeStory || isPreparingAudio) return;
    const storyId = activeStory.id;
    const time = currentTime;
    setStories((prev) =>
      prev.map((item) => (item.id === storyId && item.progress !== time ? { ...item, progress: time } : item))
    );
    const timeout = setTimeout(() => {
      void updateStory(storyId, { progress: time });
    }, 800);
    return () => clearTimeout(timeout);
  }, [currentTime, activeStory?.id, isPreparingAudio]);

  const setDefaultVoice = (voiceId: string) => {
    void setDefaultVoiceOnServer(voiceId).catch(() => undefined);
    setVoices((prev) =>
      prev.map((voice) => ({ ...voice, isDefault: voice.id === voiceId }))
    );
  };

  const addVoice = async (name: string, languages: string[], audioUri?: string) => {
    if (!audioUri) throw new Error('Unable to save recording');
    const created = await uploadVoice(name.trim(), languages, audioUri);
    setVoices((prev) => [...prev.filter((voice) => voice.id !== created.id), created]);
  };

  const deleteVoice = async (voiceId: string) => {
    await deleteVoiceOnServer(voiceId);
    setVoices((prev) => prev.filter((item) => item.id !== voiceId));
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

    const nextStory = {
      ...current,
      narratorId: voiceId,
      audioUri: undefined,
      clonedVoiceId: undefined,
      clonedLanguage: undefined,
      progress: 0,
    };
    void updateStory(storyId, {
      narratorId: voiceId,
      audioUri: undefined,
      clonedVoiceId: undefined,
      clonedLanguage: undefined,
      progress: 0,
    });
    setStories((currentStories) =>
      currentStories.map((story) => (story.id === storyId ? nextStory : story))
    );
    setActiveStory((currentStory) =>
      currentStory?.id === storyId ? nextStory : currentStory
    );
    restartSpeech(nextStory);
  };

  const createNewStory = async (input: CreateStoryInput) => {
    const title = input.title.trim();
    const script = input.script.trim();
    if (!title) throw new Error('Story title is required');
    if (!script) throw new Error('Story text is required');

    const newStory: Story = {
      id: `s_${Date.now()}`,
      title,
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
    if (!saved) throw new Error('Could not save story');

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
        isPreparingAudio,
        currentTime,
        duration,
        playbackSpeed,
        setPlaybackSpeed,
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
        narratorPickerStoryId,
        openNarratorPicker,
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
