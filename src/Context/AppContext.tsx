import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { router, usePathname } from 'expo-router';
import { Child, CreateStoryInput, RootScreen, Story, Voice } from '../Types';
import { initialChild, initialStories, initialVoices } from '../Data/mockData';
import { useStoryPlayer } from '../hooks/useStoryPlayer';
import { SleepModeSettings } from '../services/sleepMode';
import { estimateDuration, normalizeStory } from '../services/storySpeech';
import {
  deleteVoiceOnServer,
  fetchVoices,
  reenrollVoice,
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
  sleepMode: SleepModeSettings;
  saveSleepMode: (settings: SleepModeSettings) => Promise<void>;
  isRepeat: boolean;
  toggleRepeat: () => void;
  playStory: (story: Story, autoPlay?: boolean) => void;
  togglePlayPause: () => void;
  /** Pauses the story from any state (also while a cloned voice prepares); Play resumes. */
  pausePlayback: () => void;
  seekTo: (time: number) => void;
  skipTime: (seconds: number) => void;
  /** `openPlayer` (default true): also opens Now Playing. */
  playNextStory: (openPlayer?: boolean) => void;
  playPreviousStory: (openPlayer?: boolean) => void;
  /** Global narrator for every story ('' = System Voice), persisted across restarts. */
  defaultNarratorId: string;
  defaultNarrator: Voice | undefined;
  setDefaultVoice: (voiceId: string) => void;
  addVoice: (name: string, languages: string[], audioUri?: string) => Promise<void>;
  deleteVoice: (voiceId: string) => Promise<void>;
  /** Clones a narrator again from its recording after its enroll failed. */
  retryVoice: (voiceId: string) => Promise<void>;
  toggleFavorite: (storyId: string) => void;
  /** Now Playing picker: makes the voice the default and replays the current story in it. */
  selectNarrator: (voiceId: string) => void;
  narratorPickerStoryId: string | null;
  openNarratorPicker: (storyId: string) => void;
  createNewStory: (input: CreateStoryInput) => Promise<void>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const VOICE_POLL_MS = 2000;

const screenRoutes: Record<RootScreen, string> = {
  Home: '/',
  Voices: '/Screen/VoicePage',
  Create: '/Screen/CreateStoryPage',
  Profile: '/Screen/ProfilePage',
  NowPlaying: '/Screen/NowPlay',
  AddVoice: '/Screen/AddVoicePage',
  Favorites: '/Screen/FavoritesPage',
  SleepTimer: '/Screen/SleepTimerPage',
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

  const pathname = usePathname();
  const targetRouteRef = useRef(pathname);

  useEffect(() => {
    targetRouteRef.current = pathname;
  }, [pathname]);

  const navigateToScreen = (screen: RootScreen) => {
    if (screen !== 'Voices' && screen !== 'AddVoice') {
      setNarratorPickerStoryId(null);
    }
    setCurrentScreenState(screen);
    const route = screenRoutes[screen];
    // Ignore repeated presses for the route we're already on (or already navigating to).
    if (targetRouteRef.current === route) return;
    targetRouteRef.current = route;
    router.replace(route as never);
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
    pausePlayback,
    seekTo,
    skipTime,
    playNextStory,
    playPreviousStory,
    defaultNarratorId,
    setDefaultNarrator,
    playbackSpeed,
    setPlaybackSpeed,
    sleepMode,
    saveSleepMode,
    isRepeat,
    toggleRepeat,
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

  // A narrator is being cloned on the server: refresh until it is ready (or failed).
  const voicesPreparing = voices.some(
    (voice) => voice.state !== undefined && voice.state !== 'ready' && voice.state !== 'error',
  );
  useEffect(() => {
    if (!voicesPreparing) return;
    const interval = setInterval(() => {
      fetchVoices()
        .then((remote) => {
          if (remote.length > 0) setVoices(remote);
        })
        .catch(() => undefined);
    }, VOICE_POLL_MS);
    return () => clearInterval(interval);
  }, [voicesPreparing]);

  useEffect(() => {
    if (activeStory) setLastPlayedStoryId(activeStory.id);
  }, [activeStory?.id]);

  useEffect(() => {
    if (!activeStory || isPreparingAudio) return;
    const storyId = activeStory.id;
    const time = currentTime;
    // Same list when nothing changed, so React skips the re-render.
    setStories((prev) => {
      const index = prev.findIndex((item) => item.id === storyId);
      if (index < 0 || prev[index].progress === time) return prev;
      const next = [...prev];
      next[index] = { ...prev[index], progress: time };
      return next;
    });
    const timeout = setTimeout(() => {
      void updateStory(storyId, { progress: time });
    }, 800);
    return () => clearTimeout(timeout);
  }, [currentTime, activeStory?.id, isPreparingAudio]);

  const defaultNarrator = voices.find((voice) => voice.id === defaultNarratorId);

  const syncDefaultVoice = (voiceId: string) => {
    if (voiceId) void setDefaultVoiceOnServer(voiceId).catch(() => undefined);
    setVoices((prev) =>
      prev.map((voice) => ({ ...voice, isDefault: voice.id === voiceId }))
    );
  };

  const setDefaultVoice = (voiceId: string) => {
    setDefaultNarrator(voiceId);
    syncDefaultVoice(voiceId);
  };

  const selectNarrator = (voiceId: string) => {
    setDefaultNarrator(voiceId, 'restart');
    syncDefaultVoice(voiceId);
  };

  const addVoice = async (name: string, languages: string[], audioUri?: string) => {
    if (!audioUri) throw new Error('Unable to save recording');
    const created = await uploadVoice(name.trim(), languages, audioUri);
    setVoices((prev) => [...prev.filter((voice) => voice.id !== created.id), created]);
  };

  const retryVoice = async (voiceId: string) => {
    const updated = await reenrollVoice(voiceId);
    setVoices((prev) => prev.map((voice) => (voice.id === voiceId ? updated : voice)));
  };

  const deleteVoice = async (voiceId: string) => {
    await deleteVoiceOnServer(voiceId);
    setVoices((prev) => prev.filter((item) => item.id !== voiceId));
    if (voiceId === defaultNarratorId) setDefaultNarrator('');
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
    // The narrator picked in the form is an explicit choice: it becomes the global default.
    // 'none': playStory below starts the new story, so the old one must not restart first.
    if (input.narratorId !== defaultNarratorId) {
      setDefaultNarrator(input.narratorId, 'none');
      syncDefaultVoice(input.narratorId);
    }
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
        sleepMode,
        saveSleepMode,
        isRepeat,
        toggleRepeat,
        playStory,
        togglePlayPause,
        pausePlayback,
        seekTo,
        skipTime,
        playNextStory,
        playPreviousStory,
        defaultNarratorId,
        defaultNarrator,
        setDefaultVoice,
        addVoice,
        deleteVoice,
        retryVoice,
        toggleFavorite,
        selectNarrator,
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
