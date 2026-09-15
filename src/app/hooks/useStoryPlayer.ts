import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { RootScreen, Story, Voice } from '../Types';
import { synthesizeStory } from '../services/sunoApi';
import {
  estimateDuration,
  languageToLocale,
  pauseSpeech,
  resumeSpeech,
  speakText,
  stopSpeech,
} from '../services/storySpeech';

type PlaybackSource = 'idle' | 'preparing' | 'server' | 'device';

type UseStoryPlayerArgs = {
  stories: Story[];
  voices: Voice[];
  currentScreen: RootScreen;
  setCurrentScreen: (screen: RootScreen) => void;
};

export const useStoryPlayer = ({
  stories,
  voices,
  currentScreen,
  setCurrentScreen,
}: UseStoryPlayerArgs) => {
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(1);
  const [playbackSource, setPlaybackSource] = useState<PlaybackSource>('idle');

  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  const storyRef = useRef<Story | null>(null);
  const currentTimeRef = useRef(0);
  const shouldPlayRef = useRef(false);
  const speakIdRef = useRef(0);
  const durationRef = useRef(1);
  const playbackSourceRef = useRef<PlaybackSource>('idle');

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

  const resolveLanguage = (story: Story) => {
    const narrator = voices.find((voice) => voice.id === story.narratorId);
    return narrator?.languages[0] || story.language || 'English';
  };

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
    // speakIdRef.current += 1;
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
      haltSpeech();
      setIsPlaying(false);
      setTime(storyDuration(story));
      return;
    }

    speakText(remaining, {
      locale: languageToLocale(resolveLanguage(story)),
      pitch: 1,
      onDone: () => {
        if (speakId !== speakIdRef.current || !shouldPlayRef.current) return;
        if (storyRef.current?.id !== story.id) return;
        shouldPlayRef.current = false;
        setIsPlaying(false);
        setTime(storyDuration(story));
      },
    });
  };

  const playServerAudio = async (story: Story, resumeAt: number, speakId: number) => {
    try {
      const result = await synthesizeStory(story.script || story.title, resolveLanguage(story));
      if (speakId !== speakIdRef.current || !shouldPlayRef.current) return;

      setSource('server');
      setAudioDuration(result.duration);
      const start =
        resumeAt > 0.4 && resumeAt < result.duration - 0.5
          ? resumeAt
          : 0;
      setTime(start);
      player.replace(result.audioUrl);
      if (start > 0.4) {
        try {
          await player.seekTo(start);
        } catch {
          // ignore
        }
      }
      if (shouldPlayRef.current && speakId === speakIdRef.current) safePlay();
    } catch {
      if (speakId !== speakIdRef.current) return;
      setAudioDuration(estimateDuration(story.script || story.title));
      speakWithDevice(story, resumeAt, speakId);
    }
  };

  const speakRemaining = (story: Story, time: number) => {
    const speakId = ++speakIdRef.current;
    storyRef.current = story;
    setSource('preparing');
    setTime(0);
    stopSpeech();
    safePause();
    void playServerAudio(story, time, speakId);
  };

  const playStory = (story: Story, autoPlay = true) => {
    const estimated = estimateDuration(story.script || story.title);
    setAudioDuration(story.duration || estimated);
    const startTime = Math.min(story.progress || 0, estimated);
    storyRef.current = story;
    setActiveStory(story);
    setTime(0);
    setCurrentScreen('NowPlaying');

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

  const playNextStory = () => {
    if (!activeStory || stories.length === 0) return;
    const index = stories.findIndex((story) => story.id === activeStory.id);
    playStory(stories[(index + 1 + stories.length) % stories.length], true);
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
    setActiveStory(story);
    storyRef.current = story;
    if (!shouldPlayRef.current && !isPlaying) return;
    shouldPlayRef.current = true;
    setIsPlaying(true);
    speakRemaining(story, currentTimeRef.current);
  };

  useEffect(() => {
    if (playbackSource !== 'server') return;
    if (typeof status.currentTime === 'number') setTime(status.currentTime);
    if (typeof status.duration === 'number' && status.duration > 0) {
      setAudioDuration(status.duration);
    }
  }, [playbackSource, status.currentTime, status.duration]);

  useEffect(() => {
    if (playbackSource !== 'server' || !status.didJustFinish) return;
    shouldPlayRef.current = false;
    setIsPlaying(false);
    setTime(durationRef.current);
  }, [playbackSource, status.didJustFinish]);

  useEffect(() => {
    if (playbackSource !== 'device' || !isPlaying || !activeStory) return;

    const total = storyDuration(activeStory);
    const interval = setInterval(() => {
      const nextTime = currentTimeRef.current + 1;
      if (nextTime >= total) {
        haltSpeech();
        setIsPlaying(false);
        setTime(total);
        return;
      }
      setTime(nextTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [playbackSource, isPlaying, activeStory]);

  useEffect(() => {
    if (currentScreen === 'NowPlaying') return;
    haltSpeech();
    setIsPlaying(false);
  }, [currentScreen]);

  useEffect(() => () => {
    haltSpeech();
  }, []);

  return {
    activeStory,
    setActiveStory,
    isPlaying,
    isPreparingAudio: playbackSource === 'preparing',
    currentTime,
    duration,
    playStory,
    togglePlayPause,
    seekTo,
    skipTime,
    playNextStory,
    playPreviousStory,
    restartSpeech,
  };
};
