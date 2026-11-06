import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Child, CreateStoryInput, RootScreen, Story, StoryLanguage, Voice } from '../Types';
import { storyLanguage } from '../Data/albums';
import { useStoryPlayer } from '../hooks/useStoryPlayer';
import { SleepModeSettings } from '../services/sleepMode';
import {
  createStoryOnServer,
  deleteVoiceOnServer,
  fetchStories,
  fetchVoices,
  setDefaultVoiceOnServer,
  uploadVoice,
} from '../services/sunoApi';
import {
  getDeletedStoryIds,
  getStoryChanges,
  markStoryDeleted,
  updateStory,
} from '../storage';

type AppContextType = {
  currentScreen: RootScreen;
  setCurrentScreen: (screen: RootScreen) => void;
  child: Child;
  voices: Voice[];
  /** Voice list from the server: still loading, loaded, or the server couldn't be reached. */
  voicesStatus: VoicesStatus;
  /** Loads the voice list again. */
  refreshVoices: () => Promise<void>;
  /** Story list from the server: still loading, loaded, or the server couldn't be reached. */
  storiesStatus: VoicesStatus;
  /** Loads the server's stories again. */
  refreshStories: () => Promise<void>;
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
  /** Plays in the all-stories order: leaves the album, if one was playing. */
  playStory: (story: Story, autoPlay?: boolean) => void;
  /** Album being played: Next, Previous and auto-next stay in its language. null = all stories. */
  activeAlbum: StoryLanguage | null;
  playFromAlbum: (language: StoryLanguage, story: Story) => void;
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
  /** The narrator actually heard; undefined = System Voice (also when the default fell back). */
  playingNarrator: Voice | undefined;
  setDefaultVoice: (voiceId: string) => void;
  addVoice: (name: string, languages: string[], audioUri?: string) => Promise<void>;
  deleteVoice: (voiceId: string) => Promise<void>;
  toggleFavorite: (storyId: string) => void;
  /** Removes the story for good (built-in ones too); stops it first if it is playing. */
  deleteStory: (storyId: string) => void;
  /** Now Playing picker: makes the voice the default and replays the current story in it. */
  selectNarrator: (voiceId: string) => void;
  narratorPickerStoryId: string | null;
  openNarratorPicker: (storyId: string) => void;
  createNewStory: (input: CreateStoryInput) => Promise<void>;
};

export type VoicesStatus = 'loading' | 'ready' | 'offline';

const AppContext = createContext<AppContextType | undefined>(undefined);

const VOICE_POLL_MS = 2000;
const RECONNECT_POLL_MS = 5000;
// Server back after being offline: the loader shows this long before the lists appear.
const RECONNECT_LOADING_MS = 2000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Saved changes minus play / pause time: older builds stored it, and a restart starts from 0. */
const withoutProgress = (changes?: Partial<Story>): Partial<Story> => {
  if (!changes) return {};
  const { progress: _progress, progressDuration: _progressDuration, ...rest } = changes;
  return rest;
};

const screenRoutes: Record<RootScreen, string> = {
  Home: '/',
  Search: '/Screen/SearchPage',
  Voices: '/Screen/VoicePage',
  Create: '/Screen/CreateStoryPage',
  Profile: '/Screen/ProfilePage',
  NowPlaying: '/Screen/NowPlay',
  AddVoice: '/Screen/AddVoicePage',
  Favorites: '/Screen/FavoritesPage',
  Albums: '/Screen/AlbumsPage',
  SleepTimer: '/Screen/SleepTimerPage',
  Appearance: '/Screen/AppearancePage',
  GenerationLoader: '/Screen/CreateStoryPage',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreenState] = useState<RootScreen>('Home');
  // Only the server's real voices: no demo voices, also not while loading or offline.
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voicesStatus, setVoicesStatus] = useState<VoicesStatus>('loading');
  // No demo stories and no stories saved on this device: the server's stories only.
  const [stories, setStories] = useState<Story[]>([]);
  // 'loading' until the first server reply, so Home doesn't say "No stories yet" while it waits.
  const [storiesStatus, setStoriesStatus] = useState<VoicesStatus>('loading');
  const [lastPlayedStoryId, setLastPlayedStoryId] = useState<string | null>(null);
  // The server has no child profile: the child of the newest created story (stories are newest first).
  const childStory = stories.find((story) => story.childName);
  const child: Child = {
    id: 'child',
    name: childStory?.childName ?? '',
    avatar: '🧒',
    age: childStory?.age,
  };
  const [narratorPickerStoryId, setNarratorPickerStoryId] = useState<string | null>(null);
  // Story fields changed in memory, so the startup load doesn't overwrite them with older saved values.
  const touchedFieldsRef = useRef(new Map<string, Set<keyof Story>>());
  const markTouched = (storyId: string, fields: (keyof Story)[]) => {
    const touched = touchedFieldsRef.current.get(storyId) ?? new Set<keyof Story>();
    fields.forEach((field) => touched.add(field));
    touchedFieldsRef.current.set(storyId, touched);
  };
  /** Fields changed in memory since launch, taken from the in-memory copy of the story. */
  const localEdits = (live?: Story): Partial<Story> => {
    const fields = live && touchedFieldsRef.current.get(live.id);
    if (!live || !fields) return {};
    return Object.fromEntries([...fields].map((field) => [field, live[field]]));
  };

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

  const [activeAlbum, setActiveAlbum] = useState<StoryLanguage | null>(null);
  // The player's playlist: next / previous / auto-next and the next-story prefetch walk this list.
  const queue = activeAlbum
    ? stories.filter((story) => storyLanguage(story) === activeAlbum)
    : stories;

  useEffect(() => {
    // Its last story was deleted: back to all stories.
    if (activeAlbum && queue.length === 0) setActiveAlbum(null);
  }, [activeAlbum, queue.length]);

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
    playingNarrator,
    playbackSpeed,
    setPlaybackSpeed,
    sleepMode,
    saveSleepMode,
    isRepeat,
    toggleRepeat,
  } = useStoryPlayer({
    stories: queue,
    voices,
    currentScreen,
    setCurrentScreen: navigateToScreen,
    onClonedAudio: (storyId, audioUrl, duration, voiceId, language) => {
      const saved = {
        audioUri: audioUrl,
        duration,
        clonedVoiceId: voiceId,
        clonedLanguage: language,
      };
      // Progress is in memory only: a restart starts every story from 0.
      const updates = { ...saved, progress: 0 };
      markTouched(storyId, Object.keys(updates) as (keyof Story)[]);
      void updateStory(storyId, saved);
      setStories((currentStories) =>
        currentStories.map((story) => (story.id === storyId ? { ...story, ...updates } : story))
      );
      setActiveStory((currentStory) =>
        currentStory?.id === storyId ? { ...currentStory, ...updates } : currentStory
      );
    },
    onSystemVoiceDuration: (storyId, systemVoiceDuration) => {
      markTouched(storyId, ['systemVoiceDuration']);
      void updateStory(storyId, { systemVoiceDuration });
      setStories((currentStories) =>
        currentStories.map((story) => (story.id === storyId ? { ...story, systemVoiceDuration } : story))
      );
      setActiveStory((currentStory) =>
        currentStory?.id === storyId ? { ...currentStory, systemVoiceDuration } : currentStory
      );
    },
  });

  // The server's list is the truth, even when empty. Offline keeps what is shown (nothing on the
  // first load) and tries again on app foreground, on opening Voices, and every few seconds.
  const refreshingVoicesRef = useRef(false);
  // Refs: the mount effect, the poll and AppState call refreshes made on an earlier render.
  const voicesStatusRef = useRef(voicesStatus);
  voicesStatusRef.current = voicesStatus;
  const storiesStatusRef = useRef(storiesStatus);
  storiesStatusRef.current = storiesStatus;

  const refreshVoices = async () => {
    if (refreshingVoicesRef.current) return;
    refreshingVoicesRef.current = true;
    const wasOffline = voicesStatusRef.current === 'offline';
    try {
      const serverVoices = await fetchVoices();
      if (wasOffline) {
        setVoicesStatus('loading');
        await wait(RECONNECT_LOADING_MS);
      }
      setVoices(serverVoices);
      setVoicesStatus('ready');
    } catch {
      setVoicesStatus('offline');
    } finally {
      refreshingVoicesRef.current = false;
    }
  };

  // Created stories live on the server; favorite, progress and delete stay on this device, by id.
  // Offline keeps what is shown and tries again on app foreground and every few seconds.
  const refreshingStoriesRef = useRef(false);
  // Bumped when the user deletes or creates a story; a refresh that started before then is stale.
  const storiesVersionRef = useRef(0);
  const refreshStories = async () => {
    if (refreshingStoriesRef.current) return;
    refreshingStoriesRef.current = true;
    const wasOffline = storiesStatusRef.current === 'offline';
    const startVersion = storiesVersionRef.current;
    let stale = false;
    try {
      const [serverStories, deletedIds, changes] = await Promise.all([
        fetchStories(),
        getDeletedStoryIds(),
        getStoryChanges(),
      ]);
      if (wasOffline) {
        setStoriesStatus('loading');
        await wait(RECONNECT_LOADING_MS);
      }
      // The list changed while this refresh waited: its data would undo that change, so fetch again.
      if (storiesVersionRef.current !== startVersion) {
        stale = true;
        return;
      }
      const deleted = new Set(deletedIds);
      // Only the server's list, in its order: stories saved on this device are not shown.
      setStories((currentStories) => {
        const liveStories = new Map(currentStories.map((story) => [story.id, story]));
        return serverStories
          .filter((story) => !deleted.has(story.id))
          .map((story) => ({
            ...story,
            ...withoutProgress(changes[story.id]),
            ...localEdits(liveStories.get(story.id)),
            id: story.id,
          }));
      });
      setStoriesStatus('ready');
    } catch {
      setStoriesStatus('offline');
    } finally {
      refreshingStoriesRef.current = false;
      if (stale) void refreshStories();
    }
  };

  useEffect(() => {
    void refreshVoices();
    void refreshStories();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshVoices();
        void refreshStories();
      }
    });
    return () => subscription.remove();
  }, []);

  // Server unreachable: keep trying, so the lists come back on their own once it is up again.
  const isOffline = voicesStatus === 'offline' || storiesStatus === 'offline';
  useEffect(() => {
    if (!isOffline) return;
    const interval = setInterval(() => {
      if (AppState.currentState !== 'active') return;
      if (voicesStatus === 'offline') void refreshVoices();
      if (storiesStatus === 'offline') void refreshStories();
    }, RECONNECT_POLL_MS);
    return () => clearInterval(interval);
  }, [isOffline, voicesStatus, storiesStatus]);

  useEffect(() => {
    if (currentScreen === 'Voices') void refreshVoices();
  }, [currentScreen]);

  // A narrator is being cloned on the server: refresh until it is ready (or failed).
  const voicesPreparing = voices.some(
    (voice) => voice.state !== undefined && voice.state !== 'ready' && voice.state !== 'error',
  );
  useEffect(() => {
    if (!voicesPreparing) return;
    const interval = setInterval(() => {
      fetchVoices()
        .then((remote) => setVoices(remote))
        .catch(() => undefined);
    }, VOICE_POLL_MS);
    return () => clearInterval(interval);
  }, [voicesPreparing]);

  useEffect(() => {
    if (activeStory) setLastPlayedStoryId(activeStory.id);
  }, [activeStory?.id]);

  // Progress stays in memory only (resume within this session); a refresh / restart starts at 0.
  useEffect(() => {
    if (!activeStory || isPreparingAudio) return;
    const storyId = activeStory.id;
    const time = currentTime;
    // The playing voice's length: progress is on its timeline (each voice reads at its own pace).
    const length = duration;
    // Same list when nothing changed, so React skips the re-render.
    setStories((prev) => {
      const index = prev.findIndex((item) => item.id === storyId);
      if (index < 0) return prev;
      const story = prev[index];
      if (story.progress === time && story.progressDuration === length) return prev;
      markTouched(storyId, ['progress', 'progressDuration']);
      const next = [...prev];
      next[index] = { ...story, progress: time, progressDuration: length };
      return next;
    });
  }, [currentTime, duration, activeStory?.id, isPreparingAudio]);

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

  const deleteVoice = async (voiceId: string) => {
    await deleteVoiceOnServer(voiceId);
    setVoices((prev) => prev.filter((item) => item.id !== voiceId));
    if (voiceId === defaultNarratorId) setDefaultNarrator('');
  };

  const toggleFavorite = (storyId: string) =>{
    const story = stories.find((item) => item.id === storyId);
    if (!story) return;
    const newFavoriteStatus = !story.isFavorite;
    markTouched(storyId, ['isFavorite']);
    void updateStory(storyId, { isFavorite: newFavoriteStatus });
    setStories((prev) =>
      prev.map((item) => (item.id === storyId ? { ...item, isFavorite: newFavoriteStatus } : item))
    );
    setActiveStory((currentStory) =>
      currentStory?.id === storyId
        ? { ...currentStory, isFavorite: newFavoriteStatus }
        : currentStory
    );
  }
  
  const deleteStory = (storyId: string) => {
    if (activeStory?.id === storyId) {
      pausePlayback();
      setActiveStory(null);
    }
    storiesVersionRef.current += 1;
    setStories((prev) => prev.filter((item) => item.id !== storyId));
    setLastPlayedStoryId((id) => (id === storyId ? null : id));
    void markStoryDeleted(storyId);
  };

  const createNewStory = async (input: CreateStoryInput) => {
    const title = input.title.trim();
    const script = input.script.trim();
    if (!title) throw new Error('Story title is required');
    if (!script) throw new Error('Story text is required');

    // Saved on the server only: offline, the error message reaches the form's toast.
    const newStory = await createStoryOnServer({
      ...input,
      title,
      script,
      childName: input.childName.trim(),
    });

    storiesVersionRef.current += 1;
    // A refresh may already have brought this story in from the server: keep one copy.
    setStories((currentStories) => [
      newStory,
      ...currentStories.filter((story) => story.id !== newStory.id),
    ]);
    // The narrator picked in the form is an explicit choice: it becomes the global default.
    // 'none': playStory below starts the new story, so the old one must not restart first.
    if (input.narratorId !== defaultNarratorId) {
      setDefaultNarrator(input.narratorId, 'none');
      syncDefaultVoice(input.narratorId);
    }
    setActiveAlbum(null);
    playStory(newStory, true);
  };

  const playInAllStories = (story: Story, autoPlay?: boolean) => {
    setActiveAlbum(null);
    playStory(story, autoPlay);
  };

  const playFromAlbum = (language: StoryLanguage, story: Story) => {
    setActiveAlbum(language);
    playStory(story, true);
  };

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        setCurrentScreen: navigateToScreen,
        child,
        voices,
        voicesStatus,
        refreshVoices,
        storiesStatus,
        refreshStories,
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
        playStory: playInAllStories,
        activeAlbum,
        playFromAlbum,
        togglePlayPause,
        pausePlayback,
        seekTo,
        skipTime,
        playNextStory,
        playPreviousStory,
        defaultNarratorId,
        defaultNarrator,
        playingNarrator,
        setDefaultVoice,
        addVoice,
        deleteVoice,
        toggleFavorite,
        deleteStory,
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
