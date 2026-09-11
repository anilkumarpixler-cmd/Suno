import { useEffect, useRef, useState } from 'react';
import { RootScreen, Story, Voice } from '../Types';
import {
  estimateDuration,
  getRemainingScript,
  languageToLocale,
  pauseSpeech,
  pitchForVoice,
  resumeSpeech,
  speakText,
  stopSpeech,
} from '../services/storySpeech';

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

  const storyRef = useRef<Story | null>(null);
  const currentTimeRef = useRef(0);
  const shouldPlayRef = useRef(false);
  const speakIdRef = useRef(0);
  const pausedWithNativePause = useRef(false);

  const setTime = (time: number) => {
    currentTimeRef.current = time;
    setCurrentTime(time);
  };

  const storyDuration = (story: Story) => estimateDuration(story.script || story.title);

  const resolveLocale = (story: Story) => {
    const narrator = voices.find((voice) => voice.id === story.narratorId);
    return languageToLocale(narrator?.languages[0] || story.language);
  };

  const haltSpeech = () => {
    speakIdRef.current += 1;
    shouldPlayRef.current = false;
    pausedWithNativePause.current = false;
    stopSpeech();
  };

  const speakRemaining = (story: Story, time: number) => {
    const remaining = getRemainingScript(story.script || story.title, time);
    if (!remaining) {
      haltSpeech();
      setIsPlaying(false);
      setTime(storyDuration(story));
      return;
    }

    const speakId = ++speakIdRef.current;
    storyRef.current = story;
    pausedWithNativePause.current = false;
    stopSpeech();

    speakText(remaining, {
      locale: resolveLocale(story),
      pitch: pitchForVoice(story.narratorId),
      onDone: () => {
        if (speakId !== speakIdRef.current || !shouldPlayRef.current) return;
        if (storyRef.current?.id !== story.id) return;
        shouldPlayRef.current = false;
        setIsPlaying(false);
        setTime(storyDuration(story));
      },
    });
  };

  const playStory = (story: Story, autoPlay = true) => {
    const startTime = Math.min(story.progress || 0, storyDuration(story));
    storyRef.current = story;
    setActiveStory(story);
    setTime(startTime);
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
    if (!activeStory) return;

    if (isPlaying) {
      shouldPlayRef.current = false;
      setIsPlaying(false);
      const result = await pauseSpeech();
      pausedWithNativePause.current = result === 'paused';
      if (result === 'stopped') speakIdRef.current += 1;
      return;
    }

    shouldPlayRef.current = true;
    setIsPlaying(true);

    if (pausedWithNativePause.current) {
      const result = await resumeSpeech();
      if (result === 'resumed') return;
    }

    const duration = storyDuration(activeStory);
    const ended = currentTimeRef.current >= duration;
    const resumeAt = ended ? 0 : currentTimeRef.current;
    if (ended) setTime(0);
    speakRemaining(activeStory, resumeAt);
  };

  const seekTo = (time: number) => {
    if (!activeStory) return;

    const nextTime = Math.max(0, Math.min(time, storyDuration(activeStory)));
    pausedWithNativePause.current = false;
    setTime(nextTime);

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

    if (currentTimeRef.current > 3) {
      shouldPlayRef.current = true;
      setIsPlaying(true);
      setTime(0);
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
    if (!isPlaying || !activeStory) return;

    const duration = storyDuration(activeStory);
    const interval = setInterval(() => {
      const nextTime = currentTimeRef.current + 1;
      if (nextTime >= duration) {
        haltSpeech();
        setIsPlaying(false);
        setTime(duration);
        return;
      }
      setTime(nextTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, activeStory]);

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
    currentTime,
    playStory,
    togglePlayPause,
    seekTo,
    skipTime,
    playNextStory,
    playPreviousStory,
    restartSpeech,
  };
};
