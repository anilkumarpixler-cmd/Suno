import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEventListener } from 'expo';
import {
  setAudioModeAsync,
  setIsAudioActiveAsync,
  useAudioPlayer,
  type AudioMode,
  type AudioStatus,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { RootScreen, Story, Voice } from '../Types';
import { cancelStoryPlay, prefetchStory, readStory, waitStoryAudio } from '../services/sunoApi';
import { showToast } from '../components/Common/Toast';
import { claimMedia, releaseMedia } from '../services/activeMedia';
import type { DeviceMediaCommand } from '../../modules/suno-media-session';
import { useDeviceMediaSession } from './useDeviceMediaSession';
import { useLockScreenControls } from './useLockScreenControls';
import { showSleepToast, useSleepMode } from './useSleepMode';
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
// Statuses this soon after a JS play() / pause() may still show the old state.
const NATIVE_SETTLE_MS = 1000;

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

/** A finished story shows its full time (e.g. 0:13 / 0:13) this long before repeat / auto-next. */
const END_HOLD_MS = 800;

/** A narrator track whose real length the player has not reported yet (saved once it does). */
type PendingSave = {
  story: Story;
  audioUrl: string;
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
  // Pending repeat / auto-next while the finished story's end time is on screen.
  const endHoldRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasStartedRef = useRef(false);
  const onStoryEndedRef = useRef<() => void>(() => undefined);
  // True once the TTS engine reports word boundaries for the current utterance.
  const boundarySeenRef = useRef(false);
  // The narrator story the server is reading right now (cancelled when no longer wanted).
  const playIdRef = useRef('');
  const pendingSaveRef = useRef<PendingSave | null>(null);
  // Last play() / pause() from JS: statuses right after it may still show the old state.
  const lastJsCommandAtRef = useRef(0);
  // Re-reads the native player once that window ends: expo-audio sends one status for a native
  // pause (another app took focus) and none after, so a skipped one would leave JS "playing".
  const nativeResyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Where a narrator story resumes while its voice prepares (the clock shows 0 meanwhile).
  const preparingFromRef = useRef(0);
  const pausePlaybackRef = useRef<() => void>(() => undefined);
  // Stable: another sound in Suno (voice preview, recording) starting pauses the story.
  const stopStoryForOtherMedia = useRef(() => pausePlaybackRef.current()).current;

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

  const clearNativeResync = () => {
    if (!nativeResyncRef.current) return;
    clearTimeout(nativeResyncRef.current);
    nativeResyncRef.current = null;
  };

  const safePause = () => {
    clearNativeResync();
    lastJsCommandAtRef.current = Date.now();
    try {
      player.pause();
    } catch {
      // Native player can already be released on unmount / screen change.
    }
  };

  const safePlay = () => {
    clearNativeResync();
    lastJsCommandAtRef.current = Date.now();
    try {
      player.play();
    } catch {
      // Native player can already be released.
    }
  };

  /** Android: expo-audio only asks for audio focus when its flag says it has none, and that flag
   * can be left set after another app took the audio. Dropping it first makes play() ask again,
   * so Suno holds the audio and the next app that plays pauses it. Only for a paused or new
   * track: it pauses every playing player. */
  const playWithFreshFocus = async () => {
    if (Platform.OS === 'android') {
      try {
        await setIsAudioActiveAsync(false);
        await setIsAudioActiveAsync(true);
      } catch {
        // Keep playing even if the native call fails.
      }
      // The user may have paused while this ran.
      if (!shouldPlayRef.current) return;
    }
    safePlay();
  };

  /** Stops the server reading a narrator story this app no longer waits for. */
  const cancelServerRead = () => {
    if (!playIdRef.current) return;
    cancelStoryPlay(playIdRef.current);
    playIdRef.current = '';
  };

  /** Any user action during the end hold replaces the pending repeat / auto-next. */
  const cancelEndHold = () => {
    if (!endHoldRef.current) return;
    clearTimeout(endHoldRef.current);
    endHoldRef.current = null;
    endingRef.current = false;
  };

  const haltSpeech = () => {
    cancelEndHold();
    shouldPlayRef.current = false;
    if (playbackSourceRef.current === 'preparing') cancelServerRead();
    setSource('idle');
    safePause();
    stopSpeech();
  };

  /**
   * Background start of the next playlist story in the current narrator, so it is ready sooner.
   * The server only reads the first part ahead, and drops it when another story starts.
   */
  const prepareAhead = (story: Story) => {
    const narrator = voices.find((voice) => voice.id === defaultNarratorIdRef.current);
    if (!narrator || !canClone(narrator) || !isVoiceReady(narrator)) return;

    const list = storiesRef.current;
    const index = list.findIndex((item) => item.id === story.id);
    if (index < 0 || list.length < 2) return;
    const next = list[(index + 1) % list.length];
    prefetchStory({ text: storyText(next), language: resolveLanguage(next), voiceId: narrator.id });
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

    boundarySeenRef.current = false;
    // iOS: only player.play() activates the doNotMix session; without it other apps keep playing.
    if (Platform.OS === 'ios') void setIsAudioActiveAsync(true).catch(() => undefined);
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

  const startClonedPlayback = (
    audioUrl: string,
    trackDuration: number,
    resumeAt: number,
    durationKnown: boolean,
  ) => {
    setSource('server');
    setAudioDuration(trackDuration);
    // An estimated length (word count) is shorter than a slow cloned voice: a resume point past
    // it is checked against the real length once the track loads (status listener), not dropped.
    const start =
      resumeAt > 0.4 && (!durationKnown || resumeAt < trackDuration - 0.5) ? resumeAt : 0;
    hasStartedRef.current = false;
    setTime(start);
    if (start === 0) {
      // Play at once: ExoPlayer starts the moment enough audio is buffered, instead of after
      // the next "loaded" status event (up to one update interval later).
      pendingStartRef.current = 0;
      awaitingPlayRef.current = false;
      player.replace(audioUrl);
      applyPlayerRate(playbackSpeedRef.current);
      void playWithFreshFocus();
      return;
    }
    pendingStartRef.current = start;
    awaitingPlayRef.current = true;
    // replace() loads synchronously; the status listener below seeks and plays once loaded.
    player.replace(audioUrl);
  };

  /** The narrator file did not load or play (404, network): continue in System Voice. */
  const handleTrackError = (message: string) => {
    const resumeAt = awaitingPlayRef.current ? pendingStartRef.current : currentTimeRef.current;
    awaitingPlayRef.current = false;
    pendingStartRef.current = 0;
    // A broken URL is never saved as the story's cloned audio.
    pendingSaveRef.current = null;
    hasStartedRef.current = false;
    safePause();
    const story = storyRef.current;
    // Paused already: the next Play tries the narrator again.
    if (!story || !shouldPlayRef.current) {
      setSource('idle');
      return;
    }
    if (__DEV__) console.warn('Narrator track failed:', message);
    showToast('Narrator audio could not play. Playing in System Voice.', 'error');
    setAudioDuration(estimateDuration(story.script || story.title));
    speakWithDevice(story, resumeAt, speakIdRef.current);
  };

  /** Called with the player's real length of a narrator track (the server reports none). */
  const saveClonedAudio = (save: PendingSave, duration: number) => {
    const { story, audioUrl, voiceId, language } = save;
    if (
      story.audioUri === audioUrl &&
      story.clonedVoiceId === voiceId &&
      story.duration === duration
    ) {
      return;
    }
    onClonedAudio?.(story.id, audioUrl, duration, voiceId, language);
    if (storyRef.current?.id !== story.id) return;
    storyRef.current = {
      ...storyRef.current,
      audioUri: audioUrl,
      clonedVoiceId: voiceId,
      clonedLanguage: language,
      duration,
    };
  };

  const playClonedAudio = async (story: Story, voice: Voice, resumeAt: number, speakId: number) => {
    const isCurrent = () => speakId === speakIdRef.current && shouldPlayRef.current;
    try {
      const language = resolveLanguage(story);
      const playId = `${Date.now()}-${speakId}`;
      playIdRef.current = playId;
      // The saved file at once, or the server starts reading the story in the narrator's voice.
      const started = await readStory(storyText(story), language, voice.id, playId);
      if (!isCurrent() || started.kind === 'cancelled') return;

      // One continuous file only: wait until the whole story is read, then play it.
      if (started.kind === 'pending') {
        for (;;) {
          const result = await waitStoryAudio(started.key);
          if (!isCurrent()) return;
          if (result.status === 'ready') break;
          if (result.status === 'failed') throw new Error(result.detail);
        }
      }
      if (playIdRef.current === playId) playIdRef.current = '';

      // Only now: the server makes the next story's prefetch before this story's own chunks.
      prepareAhead(story);
      // The length is known once the player loads the file; until then the saved or estimated one.
      const known = story.clonedVoiceId === voice.id && story.duration ? story.duration : 0;
      pendingSaveRef.current = { story, audioUrl: started.audioUrl, voiceId: voice.id, language };
      startClonedPlayback(
        started.audioUrl,
        known || estimateDuration(storyText(story)),
        resumeAt,
        known > 0,
      );
    } catch (error) {
      if (speakId !== speakIdRef.current) return;
      const message = error instanceof Error ? error.message : 'Voice clone failed';
      showToast(message, 'error');
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
    cancelServerRead();
    pendingSaveRef.current = null;

    const narrator = resolveNarrator();
    if (!narrator) {
      setAudioDuration(estimateDuration(story.script || story.title));
      speakWithDevice(story, time, speakId);
      return;
    }

    if (!canClone(narrator)) {
      showToast('This narrator has no recording. Record a voice, or choose System Voice.', 'error');
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
        narrator.state === 'error' ? 'error' : 'info',
      );
      setAudioDuration(estimateDuration(story.script || story.title));
      speakWithDevice(story, time, speakId);
      return;
    }

    setSource('preparing');
    // The clock shows 0 while preparing; a pause in that time goes back to here (pausePlayback).
    preparingFromRef.current = time;
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

    cancelEndHold();
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
  };

  /** Ref, not state: lock-screen / notification commands can arrive before a re-render. A
   * narrator track asks the native player once settled: another app may have paused it. */
  const isStoryPlaying = () => {
    if (!shouldPlayRef.current) return false;
    if (playbackSourceRef.current !== 'server' || awaitingPlayRef.current) return true;
    if (Date.now() - lastJsCommandAtRef.current <= NATIVE_SETTLE_MS) return true;
    try {
      return player.playing || player.isBuffering;
    } catch {
      return true;
    }
  };

  const togglePlayPause = async () => {
    if (!activeStory || playbackSourceRef.current === 'preparing') return;
    cancelEndHold();

    if (isStoryPlaying()) {
      shouldPlayRef.current = false;
      setIsPlaying(false);
      if (playbackSourceRef.current === 'server') {
        safePause();
        return;
      }
      // Android stops speech (it can't pause): drop this utterance first, or an engine that reports
      // the stop as "done" moves the clock to the end and the next Play restarts the story.
      if (Platform.OS === 'android') speakIdRef.current += 1;
      const result = await pauseSpeech();
      if (result === 'stopped' && Platform.OS !== 'android') speakIdRef.current += 1;
      return;
    }

    if (blockedBySleepMode()) return;
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
      void playWithFreshFocus();
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
    cancelEndHold();

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
    cancelEndHold();

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
    playStory(stories[(index - 1 + stories.length) % stories.length], true, openPlayer);
  };

  const restartSpeech = (story: Story) => {
    if (blockedBySleepMode()) return;
    cancelEndHold();
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
    cancelEndHold();
    speakIdRef.current += 1; // cancels pending TTS / clone callbacks
    shouldPlayRef.current = false;
    setIsPlaying(false);
    if (playbackSourceRef.current === 'server') {
      safePause();
      return;
    }
    stopSpeech();
    if (playbackSourceRef.current === 'preparing') {
      cancelServerRead();
      // Saved progress and the next Play continue from where the story was, not from 0.
      setTime(preparingFromRef.current);
      setSource('idle');
    }
  };

  pausePlaybackRef.current = pausePlayback;

  // One place for every way a story starts (Play, auto-next, repeat, card, headset).
  useEffect(() => {
    if (isPlaying) claimMedia(stopStoryForOtherMedia);
    else releaseMedia(stopStoryForOtherMedia);
  }, [isPlaying]);

  const sleep = useSleepMode({ isPlaying, currentTime, onSleep: pausePlayback });

  /** Inside the sleep window stories don't start; tells the user why. */
  const blockedBySleepMode = () => {
    if (!sleep.isSleepTimeNow()) return false;
    showSleepToast(`Sleep mode is on until ${sleep.sleepUntilLabel()}`);
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

      const finish = () => {
        endHoldRef.current = null;
        // Sleep mode: no repeat / auto-next inside the sleep window (checked when the hold ends,
        // it may have started during it), fall through to the stop below.
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

      // The end time above is drawn before repeat / auto-next resets it to 0 (in the same tick it
      // never showed: the clock stopped one second short). In the background nobody sees the
      // clock and JS timers can freeze, so the next story starts at once.
      if (shouldPlayRef.current && AppState.currentState === 'active') {
        endHoldRef.current = setTimeout(finish, END_HOLD_MS);
        return;
      }
      finish();
    };
  });

  const toggleRepeat = () => {
    setIsRepeat((prev) => {
      const next = !prev;
      isRepeatRef.current = next;
      return next;
    });
  };

  const syncWithNativePlayer = (nativePlaying: boolean) => {
    if (!nativePlaying && shouldPlayRef.current && hasStartedRef.current) {
      shouldPlayRef.current = false;
      setIsPlaying(false);
    } else if (nativePlaying && !shouldPlayRef.current) {
      shouldPlayRef.current = true;
      setIsPlaying(true);
    }
  };

  // Player status is handled in the native event, not mirrored through effects: copying it into
  // state from effects on every 250 ms tick tripped React's nested-update limit at story end.
  useEventListener(player, 'playbackStatusUpdate', (status: AudioStatus) => {
    // Android's error status carries only `error` (no playing / time / duration fields).
    if (status.error) {
      if (playbackSourceRef.current === 'server') handleTrackError(status.error);
      return;
    }
    if (playbackSourceRef.current !== 'server') return;

    // Native pause / resume JS didn't ask for: another app took audio focus (or gave it back),
    // or the iOS lock screen / a call. The buttons follow, and Play takes the focus back.
    if (
      status.isLoaded &&
      !status.isBuffering &&
      !status.didJustFinish &&
      !awaitingPlayRef.current
    ) {
      const sinceCommand = Date.now() - lastJsCommandAtRef.current;
      if (sinceCommand > NATIVE_SETTLE_MS) {
        syncWithNativePlayer(status.playing);
      } else {
        // Too close to our own play / pause to trust: check the player once it has settled.
        clearNativeResync();
        nativeResyncRef.current = setTimeout(() => {
          nativeResyncRef.current = null;
          if (playbackSourceRef.current !== 'server' || awaitingPlayRef.current) return;
          try {
            if (player.isLoaded && !player.isBuffering) syncWithNativePlayer(player.playing);
          } catch {
            // Native player can already be released.
          }
        }, NATIVE_SETTLE_MS - sinceCommand + 50);
      }
    }

    // A new track starts (and seeks to its resume point) once it reports loaded.
    if (awaitingPlayRef.current) {
      const loaded =
        status.isLoaded || (typeof status.duration === 'number' && status.duration > 0);
      if (!shouldPlayRef.current || !loaded) return;
      awaitingPlayRef.current = false;
      let start = pendingStartRef.current;
      pendingStartRef.current = 0;
      applyPlayerRate(playbackSpeedRef.current);
      // Paused at the very end of the real track: the story had finished, so it starts over.
      if (typeof status.duration === 'number' && status.duration > 0 && start >= status.duration - 0.5) {
        start = 0;
        setTime(0);
      }
      if (start > 0.4) {
        void player
          .seekTo(start)
          .catch(() => undefined)
          .then(() => playWithFreshFocus());
        return;
      }
      void playWithFreshFocus();
      return;
    }

    // Ignore the previous track's finished status until the new one has started
    // (its end time and didJustFinish would otherwise end the new track at once).
    if (status.didJustFinish && !hasStartedRef.current) return;
    if (typeof status.currentTime === 'number') {
      setTime(status.currentTime);
      if (status.currentTime > 0.15) hasStartedRef.current = true;
    }
    // The server reports no length: the player's is the real one, saved with the story once.
    if (typeof status.duration === 'number' && status.duration > 0) {
      setAudioDuration(status.duration);
      const save = pendingSaveRef.current;
      if (save) {
        pendingSaveRef.current = null;
        saveClonedAudio(save, status.duration);
      }
    }

    if (status.didJustFinish) {
      hasStartedRef.current = false;
      onStoryEndedRef.current();
    }
  });


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
        if (!isStoryPlaying()) void togglePlayPause();
        return;
      case 'pause':
        if (source === 'preparing') pausePlayback();
        else if (isStoryPlaying()) void togglePlayPause();
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
    // The play intent, as on the in-app buttons: not the native player's flag, which drops on
    // every buffer and between stories (the card flickered). Native pauses (another app took
    // the audio) still reach it through the status sync below.
    isPlaying: playbackSource !== 'idle' && isPlaying,
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
      clearNativeResync();
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
