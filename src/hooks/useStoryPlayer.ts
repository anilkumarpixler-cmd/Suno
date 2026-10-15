import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEventListener } from 'expo';
import { setAudioModeAsync, useAudioPlayer, type AudioMode, type AudioStatus } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { RootScreen, Story, Voice } from '../Types';
import {
  fetchStoryStatus,
  prepareStories,
  readStory,
  reportStoryTiming,
  type StoryItem,
  type TtsResult,
} from '../services/sunoApi';
import { showToast } from '../components/Common/Toast';
import type { DeviceMediaCommand } from '../../modules/suno-media-session';
import { useDeviceMediaSession } from './useDeviceMediaSession';
import { useLockScreenControls } from './useLockScreenControls';
import { useSleepMode } from './useSleepMode';
import {
  estimateDuration,
  languageToLocale,
  pauseSpeech,
  resumeSpeech,
  speakText,
  stopSpeech,
  WORDS_PER_SECOND,
} from '../services/storySpeech';

export const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

/** Silent mode + background playback. `doNotMix` is required for lock screen controls.
 * setAudioModeAsync replaces every field, so any other mode (recording) starts from this one. */
export const STORY_AUDIO_MODE: Partial<AudioMode> = {
  playsInSilentMode: true,
  shouldPlayInBackground: true,
  interruptionMode: 'doNotMix',
};

const SPEED_STORAGE_KEY = '@suno_playback_speed';
// Global narrator for every story; '' / missing means System Voice (device TTS).
const DEFAULT_NARRATOR_STORAGE_KEY = '@suno_default_narrator_id';

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

/** Cloned once and loaded on the GPU: only then does a story play in this narrator's voice. */
const isVoiceReady = (voice?: Voice) => Boolean(voice && (!voice.state || voice.state === 'ready'));

const storyText = (story: Story) => story.script || story.title;

const STATUS_POLL_MS = 1000;
/** A saved live story ends this close to its exact length (the player itself never ends it). */
const LIVE_END_TOLERANCE_S = 0.1;
/** While a live story is still being read, its estimated length stays this far ahead of the time. */
const LIVE_DURATION_HEADROOM_S = 2;

/** One cloned story start, timed from the tap (Date.now) until the first sound. */
type StartTiming = {
  speakId: number;
  tapAt: number;
  id: string;
  readAt: number;
  playerAt: number;
  cached: boolean;
};

/** A narrator playing as a live stream while the server is still reading the story. */
type StoryStream = {
  id: string;
  streamUrl: string;
  /** The saved file; replaces the stream on the first seek after the story is done. */
  audioUrl: string;
  done: boolean;
  /**
   * Exact length, once the server has saved the story. The live WAV can't declare its length,
   * so the player reads it as ~24 h: past this point it plays silence and never finishes.
   */
  duration?: number;
  story: Story;
  voiceId: string;
  language: string;
};

export const useStoryPlayer = ({
  stories,
  voices,
  setCurrentScreen,
  onClonedAudio,
}: UseStoryPlayerArgs) => {
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(1);
  const [playbackSource, setPlaybackSource] = useState<PlaybackSource>('idle');
  const [playbackSpeed, setPlaybackSpeedState] = useState<PlaybackSpeed>(1);
  const [isRepeat, setIsRepeat] = useState(false);
  const [defaultNarratorId, setDefaultNarratorIdState] = useState('');
  // True from the first server track until playback goes idle / falls back to device speech.
  const [hasServerSession, setHasServerSession] = useState(false);

  const player = useAudioPlayer(null, { updateInterval: 250 });
  const [playerPlaying, setPlayerPlaying] = useState(false);

  const storyRef = useRef<Story | null>(null);
  const currentTimeRef = useRef(0);
  const shouldPlayRef = useRef(false);
  const speakIdRef = useRef(0);
  const durationRef = useRef(1);
  const playbackSourceRef = useRef<PlaybackSource>('idle');
  const pendingStartRef = useRef(0);
  const awaitingPlayRef = useRef(false);
  const playbackSpeedRef = useRef<PlaybackSpeed>(1);
  // Ref, not state: a narrator change restarts speech in the same tick, before a re-render.
  const defaultNarratorIdRef = useRef('');
  const isRepeatRef = useRef(false);
  const storiesRef = useRef(stories);
  const endingRef = useRef(false);
  const hasStartedRef = useRef(false);
  const onStoryEndedRef = useRef<() => void>(() => undefined);
  // True once the TTS engine reports word boundaries for the current utterance.
  const boundarySeenRef = useRef(false);
  // Live story stream: its duration is an estimate until the server reports the real one.
  const streamRef = useRef<StoryStream | null>(null);
  // Dev only: when a playing live stream ran dry (a gap the listener hears), 0 while playing.
  const stallAtRef = useRef(0);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  // Tap -> first sound of the current cloned story; reported once, then cleared.
  const startTimingRef = useRef<StartTiming | null>(null);

  useEffect(() => {
    void setAudioModeAsync(STORY_AUDIO_MODE).catch(() => undefined);
  }, []);

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
    if (source === 'server') setHasServerSession(true);
    else if (source !== 'preparing') setHasServerSession(false);
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

  /** The global default narrator plays every story; the story's own `narratorId` is ignored. */
  const resolveNarrator = () =>
    voices.find((voice) => voice.id === defaultNarratorIdRef.current);

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

  const clearStream = () => {
    streamRef.current = null;
    setStreamingId(null);
  };

  const haltSpeech = () => {
    shouldPlayRef.current = false;
    setSource('idle');
    safePause();
    stopSpeech();
    clearStream();
  };

  /**
   * Background pre-reading in the current narrator: this story and the next playlist story
   * (already queued by the library pre-read below unless the narrator just changed; the server
   * skips stories saved or queued). A tapped story never waits behind pre-reading: the server
   * pauses it for a live stream.
   * `skipVoiceId` is the narrator this story is already being played / streamed in.
   */
  const prepareAhead = (story: Story, skipVoiceId = '') => {
    const narrator = voices.find((voice) => voice.id === defaultNarratorIdRef.current);
    if (!narrator || !canClone(narrator) || !isVoiceReady(narrator)) return;

    const list = storiesRef.current;
    const index = list.findIndex((item) => item.id === story.id);
    const next = index >= 0 && list.length > 1 ? list[(index + 1) % list.length] : undefined;
    const items: StoryItem[] = [];
    for (const target of next ? [story, next] : [story]) {
      if (target === story && narrator.id === skipVoiceId) continue;
      items.push({ text: storyText(target), language: resolveLanguage(target), voiceId: narrator.id });
    }
    prepareStories(items);
  };

  // The whole library is read in the background as soon as the narrator is ready, so a tap
  // plays the saved file at once (no first-chunk wait, no live chunks). The half-heard
  // "Continue listening" story goes first. The server skips stories already saved or queued.
  const preparedLibraryRef = useRef('');
  useEffect(() => {
    const narrator = voices.find((voice) => voice.id === defaultNarratorId);
    if (!narrator || !canClone(narrator) || !isVoiceReady(narrator) || stories.length === 0) return;
    const resume = stories.find((story) => story.progress > 1);
    const ordered = resume ? [resume, ...stories.filter((story) => story !== resume)] : stories;
    const key = `${narrator.id}:${stories.map((story) => `${story.id}/${storyText(story).length}`).join(',')}`;
    if (preparedLibraryRef.current === key) return;
    preparedLibraryRef.current = key;
    prepareStories(
      ordered.map((story) => ({ text: storyText(story), language: resolveLanguage(story), voiceId: narrator.id })),
    );
  }, [defaultNarratorId, voices, stories]);

  const speakWithDevice = (story: Story, time: number, speakId: number) => {
    setSource('device');
    const words = (story.script || story.title).trim().split(/\s+/).filter(Boolean);
    const wordIndex = Math.max(0, Math.min(Math.floor(time * (22 / 10)), words.length));
    const remaining = words.slice(wordIndex).join(' ');
    if (!remaining) {
      onStoryEndedRef.current();
      return;
    }

    boundarySeenRef.current = false;
    speakText(remaining, {
      locale: languageToLocale(resolveLanguage(story)),
      pitch: 1,
      rate: playbackSpeedRef.current,
      // Progress from the word actually spoken. Unlike the estimate interval (JS timers freeze in
      // the background), these events keep coming with the screen locked, so sleep mode and
      // the resume position stay correct.
      onBoundary: ({ charIndex }) => {
        if (speakId !== speakIdRef.current) return;
        boundarySeenRef.current = true;
        const spoken = remaining.slice(0, charIndex).split(/\s+/).filter(Boolean).length;
        // Inverse of the word index above: floor(time * WORDS_PER_SECOND) === spoken word.
        const time = (wordIndex + spoken + 0.5) / WORDS_PER_SECOND;
        if (Math.floor(time) === Math.floor(currentTimeRef.current)) currentTimeRef.current = time;
        else setTime(time);
      },
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

  const startClonedPlayback = (audioUrl: string, trackDuration: number, resumeAt: number) => {
    setSource('server');
    setAudioDuration(trackDuration);
    const start =
      resumeAt > 0.4 && resumeAt < trackDuration - 0.5 ? resumeAt : 0;
    hasStartedRef.current = false;
    stallAtRef.current = 0;
    setTime(start);
    const timing = startTimingRef.current;
    if (timing) timing.playerAt = Date.now();
    if (start === 0) {
      // Play at once: ExoPlayer starts the moment enough audio is buffered, instead of after
      // the next "loaded" status event (up to one update interval later).
      pendingStartRef.current = 0;
      awaitingPlayRef.current = false;
      player.replace(audioUrl);
      applyPlayerRate(playbackSpeedRef.current);
      safePlay();
      return;
    }
    pendingStartRef.current = start;
    awaitingPlayRef.current = true;
    // replace() loads synchronously; the status listener below seeks and plays once loaded.
    player.replace(audioUrl);
  };

  const saveClonedAudio = (story: Story, voiceId: string, language: string, result: TtsResult) => {
    if (
      story.audioUri === result.audioUrl &&
      story.clonedVoiceId === voiceId &&
      story.duration === result.duration
    ) {
      return;
    }
    onClonedAudio?.(story.id, result.audioUrl, result.duration, voiceId, language);
    if (storyRef.current?.id !== story.id) return;
    storyRef.current = {
      ...storyRef.current,
      audioUri: result.audioUrl,
      clonedVoiceId: voiceId,
      clonedLanguage: language,
      duration: result.duration,
    };
  };

  const playClonedAudio = async (story: Story, voice: Voice, resumeAt: number, speakId: number) => {
    try {
      const language = resolveLanguage(story);
      // The server answers from its cache at once, or starts a stream that plays after the
      // first sentence, using the narrator's saved voice profile (no re-cloning).
      const started = await readStory(storyText(story), language, voice.id);
      if (speakId !== speakIdRef.current || !shouldPlayRef.current) return;
      const timing = startTimingRef.current;
      if (timing?.speakId === speakId) {
        timing.id = started.id;
        timing.readAt = Date.now();
        timing.cached = started.ready;
      }

      // Not saved yet: play it live at once, chunk by chunk as it is generated. A live stream
      // can't start mid-story, so a half-heard story starts over instead of waiting for the
      // whole story (once saved, resume plays from the saved position).
      if (!started.ready) {
        if (resumeAt > 1) showToast('Starting from the beginning: this story is still being prepared.');
        streamRef.current = {
          id: started.id,
          streamUrl: started.streamUrl,
          audioUrl: started.audioUrl,
          done: false,
          story,
          voiceId: voice.id,
          language,
        };
        setStreamingId(started.id);
        startClonedPlayback(started.streamUrl, started.estimatedDuration, 0);
        return;
      }

      saveClonedAudio(story, voice.id, language, started);
      startClonedPlayback(started.audioUrl, started.duration, resumeAt);
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
    clearStream();

    const narrator = resolveNarrator();
    if (!narrator) {
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

    // Not cloned (or not loaded on the GPU) yet: the story never waits for cloning.
    if (!isVoiceReady(narrator)) {
      showToast(
        narrator.state === 'error'
          ? `${narrator.name}'s voice could not be prepared. Playing in System Voice.`
          : `${narrator.name}'s voice is still being prepared. Playing in System Voice.`,
      );
      setAudioDuration(estimateDuration(story.script || story.title));
      speakWithDevice(story, time, speakId);
      return;
    }

    startTimingRef.current = { speakId, tapAt: Date.now(), id: '', readAt: 0, playerAt: 0, cached: false };
    setSource('preparing');
    setTime(0);
    void playClonedAudio(story, narrator, time, speakId);
  };

  const playStory = (
    story: Story,
    autoPlay = true,
    openPlayer = true,
    forceStartFromBeginning = false,
  ) => {
    const isSame = storyRef.current?.id === story.id;
    if (isSame && openPlayer && playbackSourceRef.current !== 'idle') {
      setCurrentScreen('NowPlaying');
      return;
    }
    if (autoPlay && blockedBySleepMode()) return;

    endingRef.current = false;
    const estimated = estimateDuration(story.script || story.title);
    setAudioDuration(story.duration || estimated);
    const saved = Math.min(story.progress || 0, estimated);
    // A finished story (progress at its end) replays from the start instead of speaking its last words.
    const finished = saved >= (story.duration || estimated) - 1;
    const startTime = forceStartFromBeginning || finished ? 0 : saved;
    if (__DEV__) {
      console.log('[PLAYLIST] forceStartFromBeginning:', forceStartFromBeginning);
      console.log('[PLAYLIST] startTime:', startTime);
    }
    storyRef.current = story;
    setActiveStory(story);
    setTime(startTime);
    if (openPlayer) setCurrentScreen('NowPlaying');

    if (!autoPlay) {
      haltSpeech();
      setIsPlaying(false);
      prepareAhead(story);
      return;
    }

    shouldPlayRef.current = true;
    setIsPlaying(true);
    speakRemaining(story, startTime);
    prepareAhead(story, defaultNarratorIdRef.current);
  };

  const togglePlayPause = async () => {
    if (!activeStory || playbackSourceRef.current === 'preparing') return;

    // Ref, not state: lock-screen / notification commands can arrive before a re-render.
    if (shouldPlayRef.current) {
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

    if (blockedBySleepMode()) return;
    shouldPlayRef.current = true;
    setIsPlaying(true);

    if (playbackSourceRef.current === 'server') {
      const ended = currentTimeRef.current >= durationRef.current - 0.25;
      if (ended && streamRef.current) {
        seekTo(0);
        return;
      }
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

    if (playbackSourceRef.current === 'idle' && canClone(resolveNarrator())) {
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
    const stream = playbackSourceRef.current === 'server' ? streamRef.current : null;
    if (stream && !stream.done && nextTime > 0.5) {
      showToast('Seeking will work when the voice is ready');
      return;
    }
    setTime(nextTime);

    if (stream) {
      // A live stream can't seek: back to 0 replays it from the start; once the story is saved
      // that file takes over (one track, exact duration) and seeks normally from then on.
      shouldPlayRef.current = true;
      setIsPlaying(true);
      if (stream.done) clearStream();
      startClonedPlayback(stream.done ? stream.audioUrl : stream.streamUrl, durationRef.current, nextTime);
      return;
    }

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
    if (__DEV__) console.log('[PLAYLIST] Story finished:', current.title);
    const index = list.findIndex((story) => story.id === current.id);
    const nextIndex = index + 1;

    if (nextIndex >= list.length) {
      // Don't stop the current story if Story 1 can't start.
      if (blockedBySleepMode()) return false;
      if (__DEV__) {
        console.log('[PLAYLIST] Playlist END');
        console.log('[PLAYLIST] Stopping old playback');
        console.log('[PLAYLIST] Resetting playback state');
      }
      resetPlaylistState();
      if (__DEV__) console.log('[PLAYLIST] Starting Story 1 from 0');
      playStory(list[0], true, openPlayer, true);
      return true;
    }

    // The next story plays in full, not from the progress saved in the last cycle.
    playStory(list[nextIndex], true, openPlayer, true);
    return true;
  };

  const playPreviousStory = (openPlayer = true) => {
    if (!activeStory || stories.length === 0 || blockedBySleepMode()) return;

    if (currentTimeRef.current > 3 && playbackSourceRef.current !== 'preparing') {
      shouldPlayRef.current = true;
      setIsPlaying(true);
      setTime(0);
      if (playbackSourceRef.current === 'server' && streamRef.current) {
        seekTo(0);
        return;
      }
      if (playbackSourceRef.current === 'server') {
        void player.seekTo(0);
        safePlay();
        return;
      }
      speakRemaining(activeStory, 0);
      return;
    }

    const index = stories.findIndex((story) => story.id === activeStory.id);
    playStory(stories[(index - 1 + stories.length) % stories.length], true, openPlayer);
  };

  const restartSpeech = (story: Story) => {
    if (blockedBySleepMode()) return;
    endingRef.current = false;
    hasStartedRef.current = false;
    setActiveStory(story);
    storyRef.current = story;
    shouldPlayRef.current = true;
    setIsPlaying(true);
    setTime(0);
    speakRemaining(story, 0);
  };

  /** Playlist wrap: kill the last story's TTS / audio and lifecycle guards before Story 1 starts. */
  const resetPlaylistState = () => {
    speakIdRef.current += 1; // stale onDone / onBoundary / clone callbacks become no-ops
    stopSpeech();
    safePause();
    pendingStartRef.current = 0;
    awaitingPlayRef.current = false;
    hasStartedRef.current = false;
    endingRef.current = false;
    boundarySeenRef.current = false;
    // Source stays as is: speakRemaining sets the new one in the same tick, and going idle here
    // would drop the narrator lock screen card while Story 1 prepares.
    setTime(0);
  };

  /** Pause from any state (also while a cloned voice is preparing); Play resumes as usual. */
  const pausePlayback = () => {
    speakIdRef.current += 1; // cancels pending TTS / clone callbacks
    shouldPlayRef.current = false;
    setIsPlaying(false);
    if (playbackSourceRef.current === 'server') {
      safePause();
      return;
    }
    stopSpeech();
    if (playbackSourceRef.current === 'preparing') setSource('idle');
  };

  const sleep = useSleepMode({ isPlaying, currentTime, onSleep: pausePlayback });

  /** Inside the sleep window stories don't start; tells the user why. */
  const blockedBySleepMode = () => {
    if (!sleep.isSleepTimeNow()) return false;
    showToast(`Sleep mode is on until ${sleep.sleepUntilLabel()}`);
    return true;
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

      // Sleep mode: no repeat / auto-next inside the sleep window, fall through to the stop below.
      const sleepNow = sleep.isSleepTimeNow();

      if (!sleepNow && shouldPlayRef.current && isRepeatRef.current && storyRef.current) {
        const story = storyRef.current;
        setTime(0);
        endingRef.current = false;
        restartSpeech(story);
        return;
      }

      if (!sleepNow && shouldPlayRef.current && playNextStory(false)) return;
      shouldPlayRef.current = false;
      setIsPlaying(false);
      safePause();
      stopSpeech();
      setSource('idle');
      endingRef.current = false;
    };
  });

  const toggleRepeat = () => {
    setIsRepeat((prev) => {
      const next = !prev;
      isRepeatRef.current = next;
      return next;
    });
  };

  // Player status is handled in the native event, not mirrored through effects: copying it into
  // state from effects on every 250 ms tick tripped React's nested-update limit at story end.
  useEventListener(player, 'playbackStatusUpdate', (status: AudioStatus) => {
    setPlayerPlaying(status.playing);
    if (playbackSourceRef.current !== 'server') return;

    // First sound of a cloned story: report tap -> sound once (the server logs the whole chain).
    const timing = startTimingRef.current;
    if (timing && status.playing && status.currentTime > 0) {
      startTimingRef.current = null;
      if (timing.speakId === speakIdRef.current && timing.id && timing.playerAt) {
        const firstSoundMs = Date.now() - timing.tapAt;
        if (__DEV__) console.log(`[timing] tap -> first sound ${firstSoundMs} ms (cached=${timing.cached})`);
        reportStoryTiming(timing.id, {
          readResponseMs: timing.readAt - timing.tapAt,
          playerStartMs: timing.playerAt - timing.tapAt,
          firstSoundMs,
          cached: timing.cached,
        });
      }
    }

    // A new track starts (and seeks to its resume point) once it reports loaded.
    if (awaitingPlayRef.current) {
      const loaded =
        status.isLoaded || (typeof status.duration === 'number' && status.duration > 0);
      if (!shouldPlayRef.current || !loaded) return;
      awaitingPlayRef.current = false;
      const start = pendingStartRef.current;
      pendingStartRef.current = 0;
      applyPlayerRate(playbackSpeedRef.current);
      if (start > 0.4) {
        void player.seekTo(start).then(() => safePlay()).catch(() => safePlay());
        return;
      }
      safePlay();
      return;
    }

    // Ignore the previous track's finished status until the new one has started
    // (its end time and didJustFinish would otherwise end the new track at once).
    if (status.didJustFinish && !hasStartedRef.current) return;
    const stream = streamRef.current;
    if (typeof status.currentTime === 'number') {
      // A saved live story's time stops at its exact length (the player runs on in silence).
      const time =
        stream?.duration !== undefined ? Math.min(status.currentTime, stream.duration) : status.currentTime;
      setTime(time);
      if (time > 0.15) hasStartedRef.current = true;
      // Still being read: the estimated length grows ahead of the time instead of being passed.
      if (stream && stream.duration === undefined && time > durationRef.current - 1) {
        setAudioDuration(time + LIVE_DURATION_HEADROOM_S);
      }
    }
    // Not at the end of a saved live story, where the player always waits for more audio.
    const atLiveEnd = stream?.duration !== undefined && currentTimeRef.current >= stream.duration - 1;
    if (__DEV__ && stream && hasStartedRef.current && shouldPlayRef.current && !atLiveEnd) {
      if (status.isBuffering && !stallAtRef.current) {
        stallAtRef.current = Date.now();
        console.log(`[timing] live stream stalled at ${currentTimeRef.current.toFixed(1)}s`);
      } else if (!status.isBuffering && stallAtRef.current) {
        console.log(`[timing] live stream resumed after ${Date.now() - stallAtRef.current} ms`);
        stallAtRef.current = 0;
      }
    }
    // A live stream has no usable duration: keep the estimate until the server reports it.
    if (typeof status.duration === 'number' && status.duration > 0 && !stream) {
      setAudioDuration(status.duration);
    }

    // The player never reports the end of a live story (see StoryStream.duration): its end is
    // the saved length, or a stall just before it.
    const liveEnded =
      stream?.duration !== undefined &&
      hasStartedRef.current &&
      (currentTimeRef.current >= stream.duration - LIVE_END_TOLERANCE_S ||
        (status.isBuffering === true && currentTimeRef.current >= stream.duration - 1));
    if (status.didJustFinish || liveEnded) {
      hasStartedRef.current = false;
      onStoryEndedRef.current();
    }
  });

  // Live stream: poll until the story is saved, then switch to its exact duration.
  useEffect(() => {
    if (!streamingId) return;
    let cancelled = false;
    const check = async () => {
      const stream = streamRef.current;
      if (!stream || stream.id !== streamingId || stream.done) return;
      try {
        const result = await fetchStoryStatus(stream.id);
        if (cancelled || streamRef.current !== stream || !result.done) return;
        stream.done = true;
        if (result.error === null) {
          stream.audioUrl = result.audioUrl;
          stream.duration = result.duration;
          setAudioDuration(result.duration);
          saveClonedAudio(stream.story, stream.voiceId, stream.language, result);
          return;
        }
        // The story broke off midway: carry on in System Voice from here.
        showToast(result.error);
        if (!shouldPlayRef.current || storyRef.current?.id !== stream.story.id) return;
        const speakId = ++speakIdRef.current;
        safePause();
        clearStream();
        setAudioDuration(estimateDuration(storyText(stream.story)));
        speakWithDevice(stream.story, currentTimeRef.current, speakId);
      } catch {
        // PC briefly unreachable: try again on the next tick.
      }
    };
    const interval = setInterval(() => void check(), STATUS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [streamingId]);

  // iOS native media card: stays up while the next story is prepared after a server track,
  // so auto-next / previous update it in place instead of dropping it. Android: see below.
  useLockScreenControls(player, {
    active:
      Boolean(activeStory) &&
      (playbackSource === 'server' || (playbackSource === 'preparing' && hasServerSession)),
    story: activeStory,
    narratorName: activeStory ? resolveNarrator()?.name : undefined,
  });

  /** Buttons on the Android card, headset keys, audio focus and headphone unplug. */
  const handleDeviceMediaCommand = (command: DeviceMediaCommand) => {
    const source = playbackSourceRef.current;
    if (source === 'idle') return;
    // The card holds focus for System Voice and while a narrator story prepares; expo-audio
    // handles it once the narrator track plays. Another app taking focus while the story
    // prepares pauses it, so Suno doesn't interrupt that app when its first chunk is ready.
    const isFocusCommand =
      'reason' in command &&
      (command.reason === 'focusLoss' || command.reason === 'transient' || command.reason === 'focusGain');
    if (isFocusCommand && source !== 'device' && source !== 'preparing') return;

    switch (command.action) {
      case 'play':
        if (!shouldPlayRef.current) void togglePlayPause();
        return;
      case 'pause':
        if (source === 'preparing') pausePlayback();
        else if (shouldPlayRef.current) void togglePlayPause();
        return;
      case 'seekTo':
        seekTo(command.positionMs / 1000);
        return;
      case 'skip':
        skipTime(command.offsetSec);
        return;
      // From the card / headset: switch story without navigating the app.
      case 'next':
        playNextStory(false);
        return;
      case 'previous':
        playPreviousStory(false);
        return;
      case 'stop':
        pausePlayback();
        haltSpeech();
        return;
    }
  };

  // Android card for every source: a native MediaSession that only mirrors state. It starts on
  // Play (app in foreground) and stays up while a cloned voice prepares, so it never has to
  // start a foreground service from the background (Android 12+ rejects that).
  useDeviceMediaSession({
    active: Boolean(activeStory) && playbackSource !== 'idle',
    story: activeStory,
    narratorName: activeStory ? resolveNarrator()?.name : undefined,
    isPlaying:
      playbackSource === 'server'
        ? playerPlaying
        : (playbackSource === 'device' || playbackSource === 'preparing') && isPlaying,
    currentTime,
    duration,
    speed: playbackSpeed,
    // Other apps pause from the tap on, not only once the first chunk is ready.
    manageAudioFocus: playbackSource === 'device' || playbackSource === 'preparing',
    onCommand: handleDeviceMediaCommand,
  });

  useEffect(() => {
    if (playbackSource !== 'device' || !isPlaying || !activeStory) return;

    const total = storyDuration(activeStory);
    const interval = setInterval(() => {
      // Real word boundaries drive progress when the engine sends them; onDone ends the story.
      if (endingRef.current || boundarySeenRef.current) return;
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
    AsyncStorage.getItem(DEFAULT_NARRATOR_STORAGE_KEY)
      .then((value) => {
        if (!isMounted || !value) return;
        defaultNarratorIdRef.current = value;
        setDefaultNarratorIdState(value);
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Sets the global narrator ('' = System Voice) used by every story, and persists it.
   * - `restart` (Now Playing picker): replays the current story in the new voice right away.
   * - `switch`: a playing story switches voice; a paused one uses it on the next Play.
   * - `none`: only stores it (the caller starts a story itself).
   */
  const setDefaultNarrator = (
    voiceId: string,
    mode: 'restart' | 'switch' | 'none' = 'switch',
  ) => {
    const changed = voiceId !== defaultNarratorIdRef.current;
    defaultNarratorIdRef.current = voiceId;
    setDefaultNarratorIdState(voiceId);
    void AsyncStorage.setItem(DEFAULT_NARRATOR_STORAGE_KEY, voiceId).catch(() => undefined);

    const story = storyRef.current;
    if (!story || mode === 'none') return;
    if (mode === 'restart') {
      // Same narrator picked again while it already plays / starts: keep going.
      if (!changed && playbackSourceRef.current !== 'idle' && shouldPlayRef.current) return;
      restartSpeech(story);
      prepareAhead(story, voiceId);
      return;
    }
    if (!changed || playbackSourceRef.current === 'idle') return;
    if (shouldPlayRef.current) {
      restartSpeech(story);
      return;
    }
    // Paused: drop the old voice's track / utterance so Play starts in the new voice.
    speakIdRef.current += 1;
    haltSpeech();
    setTime(0);
  };

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
    isRepeat,
    toggleRepeat,
    playStory,
    togglePlayPause,
    pausePlayback,
    seekTo,
    skipTime,
    playNextStory,
    playPreviousStory,
    restartSpeech,
    defaultNarratorId,
    setDefaultNarrator,
    sleepMode: sleep.sleepMode,
    saveSleepMode: sleep.saveSleepMode,
  };
};
