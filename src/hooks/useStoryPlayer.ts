import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { RootScreen, Story, Voice } from '../Types';
import { synthesizeStory } from '../services/sunoApi';
import { showToast } from '../components/Common/Toast';
import {
  estimateDuration,
  languageToLocale,
  pauseSpeech,
  resumeSpeech,
  speakText,
  stopSpeech,
} from '../services/storySpeech';

export const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

const SPEED_STORAGE_KEY = '@suno_playback_speed';

const parseSpeed = (value: unknown): PlaybackSpeed => {
  const next = Number(value);
  return PLAYBACK_SPEEDS.includes(next as PlaybackSpeed) ? (next as PlaybackSpeed) : 1;
};

type PlaybackSource = 'idle' | 'preparing' | 'server' | 'device';

type UseStoryPlayerArgs = {
  stories: Story[];
  voices: Voice[];
  currentScreen: RootScreen;
  setCurrentScreen: (screen: RootScreen) => void;
  onClonedAudio?: (
    storyId: string,
    audioUrl: string,
    duration: number,
    voiceId: string,
    language: string,
  ) => void;
};

const canClone = (voice?: Voice) => Boolean(voice?.id && voice.audioUri);

export const useStoryPlayer = ({
  stories,
  voices,
  currentScreen,
  setCurrentScreen,
  onClonedAudio,
}: UseStoryPlayerArgs) => {
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(1);
  const [playbackSource, setPlaybackSource] = useState<PlaybackSource>('idle');
  const [playbackSpeed, setPlaybackSpeedState] = useState<PlaybackSpeed>(1);

  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  const storyRef = useRef<Story | null>(null);
  const currentTimeRef = useRef(0);
  const shouldPlayRef = useRef(false);
  const speakIdRef = useRef(0);
  const durationRef = useRef(1);
  const playbackSourceRef = useRef<PlaybackSource>('idle');
  const pendingStartRef = useRef(0);
  const awaitingPlayRef = useRef(false);
  const playbackSpeedRef = useRef<PlaybackSpeed>(1);
  const storiesRef = useRef(stories);
  const endingRef = useRef(false);
  const hasStartedRef = useRef(false);
  const onStoryEndedRef = useRef<() => void>(() => undefined);

  const applyPlayerRate = (speed: PlaybackSpeed) => {
    try {
      player.setPlaybackRate(speed);
    } catch {
      try {
        player.playbackRate = speed;
      } catch {
        // Native player may not be ready yet.
      }
    }
  };

  const setSource = (source: PlaybackSource) => {
    playbackSourceRef.current = source;
    setPlaybackSource(source);
  };

  const setTime = (time: number) => {
    currentTimeRef.current = time;
    setCurrentTime(time);
  };

  const setAudioDuration = (value: number) => {
    const next = Math.max(1, value);
    durationRef.current = next;
    setDuration(next);
  };

  const storyDuration = (story: Story) =>
    durationRef.current > 1 ? durationRef.current : estimateDuration(story.script || story.title);

  const resolveNarrator = (story: Story) =>
    voices.find((voice) => voice.id === story.narratorId);

  const resolveLanguage = (story: Story) => story.language || 'English';

  const safePause = () => {
    try {
      player.pause();
    } catch {
      // Native player can already be released on unmount / screen change.
    }
  };

  const safePlay = () => {
    try {
      player.play();
    } catch {
      // Native player can already be released.
    }
  };

  const haltSpeech = () => {
    shouldPlayRef.current = false;
    setSource('idle');
    safePause();
    stopSpeech();
  };

  const speakWithDevice = (story: Story, time: number, speakId: number) => {
    setSource('device');
    const words = (story.script || story.title).trim().split(/\s+/).filter(Boolean);
    const wordIndex = Math.max(0, Math.min(Math.floor(time * (22 / 10)), words.length));
    const remaining = words.slice(wordIndex).join(' ');
    if (!remaining) {
      onStoryEndedRef.current();
      return;
    }

    speakText(remaining, {
      locale: languageToLocale(resolveLanguage(story)),
      pitch: 1,
      rate: playbackSpeedRef.current,
      onDone: () => {
        if (speakId !== speakIdRef.current) return;
        if (storyRef.current?.id !== story.id) return;
        if (!shouldPlayRef.current) {
          setIsPlaying(false);
          setTime(storyDuration(story));
          return;
        }
        onStoryEndedRef.current();
      },
    });
  };

  const startClonedPlayback = async (audioUrl: string, trackDuration: number, resumeAt: number) => {
    setSource('server');
    setAudioDuration(trackDuration);
    const start =
      resumeAt > 0.4 && resumeAt < trackDuration - 0.5 ? resumeAt : 0;
    pendingStartRef.current = start;
    awaitingPlayRef.current = true;
    hasStartedRef.current = false;
    setTime(start);
    player.replace(audioUrl);
  };

  const playClonedAudio = async (story: Story, voice: Voice, resumeAt: number, speakId: number) => {
    try {
      const language = resolveLanguage(story);
      const cached =
        story.audioUri &&
        story.clonedVoiceId === voice.id &&
        story.clonedLanguage === language
          ? story.audioUri
          : null;
      const result = cached
        ? { audioUrl: cached, duration: story.duration || estimateDuration(story.script || story.title), cloned: true }
        : await synthesizeStory(story.script || story.title, language, voice.id);
      if (!result.cloned) {
        showToast('Playing a stock voice — clone is unavailable');
      }
      if (speakId !== speakIdRef.current || !shouldPlayRef.current) return;

      if (!cached) {
        onClonedAudio?.(story.id, result.audioUrl, result.duration, voice.id, language);
        storyRef.current = {
          ...story,
          audioUri: result.audioUrl,
          clonedVoiceId: voice.id,
          clonedLanguage: language,
          duration: result.duration,
        };
      }

      await startClonedPlayback(result.audioUrl, result.duration, resumeAt);
    } catch (error) {
      if (speakId !== speakIdRef.current) return;
      const message = error instanceof Error ? error.message : 'Voice clone failed';
      showToast(message);
      if (!shouldPlayRef.current || storyRef.current?.id !== story.id) return;
      setAudioDuration(estimateDuration(story.script || story.title));
      speakWithDevice(story, resumeAt, speakId);
    }
  };

  const speakRemaining = (story: Story, time: number) => {
    const speakId = ++speakIdRef.current;
    storyRef.current = story;
    stopSpeech();
    safePause();

    const narrator = resolveNarrator(story);
    if (!narrator || !story.narratorId) {
      setAudioDuration(estimateDuration(story.script || story.title));
      speakWithDevice(story, time, speakId);
      return;
    }

    if (!canClone(narrator)) {
      showToast('This narrator has no recording. Record a voice, or choose System Voice.');
      setSource('idle');
      setIsPlaying(false);
      shouldPlayRef.current = false;
      return;
    }

    setSource('preparing');
    setTime(0);
    void playClonedAudio(story, narrator, time, speakId);
  };

  const playStory = (story: Story, autoPlay = true, openPlayer = true) => {
    const isSame = storyRef.current?.id === story.id;
    if (isSame && openPlayer && playbackSourceRef.current !== 'idle') {
      setCurrentScreen('NowPlaying');
      return;
    }

    endingRef.current = false;
    const estimated = estimateDuration(story.script || story.title);
    setAudioDuration(story.duration || estimated);
    const startTime = Math.min(story.progress || 0, estimated);
    storyRef.current = story;
    setActiveStory(story);
    setTime(0);
    if (openPlayer) setCurrentScreen('NowPlaying');

    if (!autoPlay) {
      haltSpeech();
      setIsPlaying(false);
      return;
    }

    shouldPlayRef.current = true;
    setIsPlaying(true);
    speakRemaining(story, startTime);
  };

  const togglePlayPause = async () => {
    if (!activeStory || playbackSourceRef.current === 'preparing') return;

    if (isPlaying) {
      shouldPlayRef.current = false;
      setIsPlaying(false);
      if (playbackSourceRef.current === 'server') {
        safePause();
        return;
      }
      const result = await pauseSpeech();
      if (result === 'stopped') speakIdRef.current += 1;
      return;
    }

    shouldPlayRef.current = true;
    setIsPlaying(true);

    if (playbackSourceRef.current === 'server') {
      const ended = currentTimeRef.current >= durationRef.current - 0.25;
      if (ended) {
        setTime(0);
        try {
          await player.seekTo(0);
        } catch {
          // ignore
        }
      }
      safePlay();
      return;
    }

    if (playbackSourceRef.current === 'idle' && canClone(resolveNarrator(activeStory))) {
      speakRemaining(activeStory, currentTimeRef.current);
      return;
    }

    const result = await resumeSpeech();
    if (result === 'resumed') return;

    const estimated = storyDuration(activeStory);
    const ended = currentTimeRef.current >= estimated;
    const resumeAt = ended ? 0 : currentTimeRef.current;
    if (ended) setTime(0);
    speakRemaining(activeStory, resumeAt);
  };

  const seekTo = (time: number) => {
    if (!activeStory || playbackSourceRef.current === 'preparing') return;

    const nextTime = Math.max(0, Math.min(time, storyDuration(activeStory)));
    setTime(nextTime);

    if (playbackSourceRef.current === 'server') {
      void player.seekTo(nextTime);
      if (shouldPlayRef.current || isPlaying) {
        shouldPlayRef.current = true;
        setIsPlaying(true);
        safePlay();
      }
      return;
    }

    if (shouldPlayRef.current || isPlaying) {
      shouldPlayRef.current = true;
      setIsPlaying(true);
      speakRemaining(activeStory, nextTime);
    }
  };

  const skipTime = (seconds: number) => {
    if (!activeStory) return;
    seekTo(currentTimeRef.current + seconds);
  };

  const playNextStory = (openPlayer = true) => {
    const list = storiesRef.current;
    const current = storyRef.current;
    if (!current || list.length === 0) return false;
    const index = list.findIndex((story) => story.id === current.id);
    playStory(list[(index + 1 + list.length) % list.length], true, openPlayer);
    return true;
  };

  const playPreviousStory = () => {
    if (!activeStory || stories.length === 0) return;

    if (currentTimeRef.current > 3 && playbackSourceRef.current !== 'preparing') {
      shouldPlayRef.current = true;
      setIsPlaying(true);
      setTime(0);
      if (playbackSourceRef.current === 'server') {
        void player.seekTo(0);
        safePlay();
        return;
      }
      speakRemaining(activeStory, 0);
      return;
    }

    const index = stories.findIndex((story) => story.id === activeStory.id);
    playStory(stories[(index - 1 + stories.length) % stories.length], true);
  };

  const restartSpeech = (story: Story) => {
    endingRef.current = false;
    hasStartedRef.current = false;
    setActiveStory(story);
    storyRef.current = story;
    shouldPlayRef.current = true;
    setIsPlaying(true);
    speakRemaining(story, 0);
  };

  useEffect(() => {
    storiesRef.current = stories;
  }, [stories]);

  useEffect(() => {
    onStoryEndedRef.current = () => {
      if (endingRef.current) return;
      if (playbackSourceRef.current === 'preparing') return;
      endingRef.current = true;
      setTime(durationRef.current);
      if (shouldPlayRef.current && playNextStory(false)) return;
      shouldPlayRef.current = false;
      setIsPlaying(false);
      safePause();
      stopSpeech();
      setSource('idle');
      endingRef.current = false;
    };
  });

  useEffect(() => {
    if (playbackSource !== 'server' || !shouldPlayRef.current || !awaitingPlayRef.current) return;
    const loaded =
      status.isLoaded || (typeof status.duration === 'number' && status.duration > 0);
    if (!loaded) return;
    awaitingPlayRef.current = false;
    const start = pendingStartRef.current;
    pendingStartRef.current = 0;
    applyPlayerRate(playbackSpeedRef.current);
    if (start > 0.4) {
      void player.seekTo(start).then(() => safePlay()).catch(() => safePlay());
      return;
    }
    safePlay();
  }, [playbackSource, status.isLoaded, status.duration]);

  useEffect(() => {
    if (playbackSource !== 'server') return;
    if (typeof status.currentTime === 'number') {
      setTime(status.currentTime);
      if (status.currentTime > 0.15) hasStartedRef.current = true;
    }
    if (typeof status.duration === 'number' && status.duration > 0) {
      setAudioDuration(status.duration);
    }
  }, [playbackSource, status.currentTime, status.duration]);

  useEffect(() => {
    if (playbackSource !== 'server' || !status.didJustFinish) return;
    if (awaitingPlayRef.current || !hasStartedRef.current) return;
    hasStartedRef.current = false;
    onStoryEndedRef.current();
  }, [playbackSource, status.didJustFinish]);

  useEffect(() => {
    if (playbackSource !== 'device' || !isPlaying || !activeStory) return;

    const total = storyDuration(activeStory);
    const interval = setInterval(() => {
      const nextTime = currentTimeRef.current + playbackSpeedRef.current;
      if (nextTime >= total) {
        onStoryEndedRef.current();
        return;
      }
      setTime(nextTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [playbackSource, isPlaying, activeStory]);

  useEffect(
    () => () => {
      haltSpeech();
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(SPEED_STORAGE_KEY)
      .then((value) => {
        if (!isMounted) return;
        const speed = parseSpeed(value);
        playbackSpeedRef.current = speed;
        setPlaybackSpeedState(speed);
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, []);

  const setPlaybackSpeed = (value: number) => {
    const speed = parseSpeed(value);
    playbackSpeedRef.current = speed;
    setPlaybackSpeedState(speed);
    void AsyncStorage.setItem(SPEED_STORAGE_KEY, String(speed));

    if (playbackSourceRef.current === 'server') {
      applyPlayerRate(speed);
      return;
    }

    if (playbackSourceRef.current === 'device' && shouldPlayRef.current && storyRef.current) {
      speakRemaining(storyRef.current, currentTimeRef.current);
    }
  };

  return {
    activeStory,
    setActiveStory,
    isPlaying,
    isPreparingAudio: playbackSource === 'preparing',
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
    restartSpeech,
  };
};
