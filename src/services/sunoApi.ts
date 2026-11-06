import { CreateStoryInput, Story, StoryLanguage, Voice } from '../Types';
import { readRecordingBase64 } from '../storage/voiceAudio';
import { API_BASE_URL } from './apiConfig';
import { withDeviceId } from './deviceId';
import { categoryArtwork, estimateDuration, mapStoryTypeToCategory } from './storySpeech';

type VoiceDto = {
  id: string;
  name: string;
  languages?: string[];
  status?: Voice['status'];
  state?: Voice['state'];
  state_error?: string | null;
  isDefault?: boolean;
  is_default?: boolean;
  avatar?: string;
  audioUri?: string;
  audio_url?: string;
};

const GPU_NOT_CONNECTED = 'GPU not connected';
const SERVER_NOT_CONNECTED = 'Server not connected';

/** The phone could not reach the PC server (not a GPU or story error). */
export const isServerNotConnected = (message: string) => message === SERVER_NOT_CONNECTED;

/** A server message as one short line for the user: no URLs or setup hints. */
const shortError = (message: string) => {
  if (/gpu|colab|kaggle|tunnel|notebook|cuda/i.test(message)) return GPU_NOT_CONNECTED;
  return message.replace(/\s*\(?https?:\/\/\S+\)?/gi, '').trim() || SERVER_NOT_CONNECTED;
};

const toVoice = (item: VoiceDto): Voice => ({
  id: item.id,
  name: item.name,
  languages: item.languages || ['English'],
  status: item.status || 'Ready',
  state: item.state,
  stateError: item.state_error ? shortError(item.state_error) : undefined,
  isDefault: item.isDefault ?? item.is_default ?? false,
  avatar: item.avatar || '👤',
  audioUri: item.audioUri || item.audio_url,
});

const readError = async (response: Response) => {
  try {
    const data = await response.json();
    if (typeof data.detail === 'string') return shortError(data.detail);
    return shortError(data.message || response.statusText);
  } catch {
    return shortError(response.statusText);
  }
};

const apiFetch = async (path: string, init?: RequestInit) => {
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: await withDeviceId(init?.headers as Record<string, string> | undefined),
    });
  } catch {
    throw new Error(SERVER_NOT_CONNECTED);
  }
};

export const fetchVoices = async (): Promise<Voice[]> => {
  const response = await apiFetch('/v1/voices');
  if (!response.ok) throw new Error(await readError(response));
  const data: unknown = await response.json();
  return Array.isArray(data) ? data.map((item) => toVoice(item as VoiceDto)) : [];
};

export const uploadVoice = async (
  name: string,
  languages: string[],
  audioUri: string,
): Promise<Voice> => {
  const { base64, filename } = await readRecordingBase64(audioUri);

  // Offline, or a tunnel answering with its own error page: the server isn't there.
  const health = await apiFetch('/health');
  if (!health.ok) throw new Error(SERVER_NOT_CONNECTED);

  // apiFetch turns only a lost connection into "Server not connected"; the server's own message,
  // e.g. "… failed: …", reaches the toast.
  const response = await apiFetch('/v1/voices/json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      languages,
      audio_base64: base64,
      filename,
    }),
  });
  if (!response.ok) throw new Error(await readError(response));
  return toVoice((await response.json()) as VoiceDto);
};

export const setDefaultVoiceOnServer = async (voiceId: string): Promise<Voice> => {
  const response = await apiFetch(`/v1/voices/${voiceId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_default: true }),
  });
  if (!response.ok) throw new Error(await readError(response));
  return toVoice((await response.json()) as VoiceDto);
};

export const deleteVoiceOnServer = async (voiceId: string): Promise<void> => {
  const response = await apiFetch(`/v1/voices/${voiceId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(await readError(response));
};

type StoryDto = {
  id: number;
  child_name: string;
  age: number | null;
  language: string;
  title: string;
  content: string;
  story_type: string | null;
  narrator_id: string | null;
  status: string;
  audio_url: string | null;
  duration_seconds: number | null;
  created_at: string;
};

const STORY_LANGUAGES: StoryLanguage[] = ['Hindi', 'English', 'Hinglish'];

/** Server ids get a prefix, so they never match a built-in (`s1`) or older local (`s_…`) story id. */
export const SERVER_STORY_PREFIX = 'srv_';

const toStory = (item: StoryDto): Story => {
  // The server keeps no icon: it follows the story type, so saved stories get it on every load.
  const category = mapStoryTypeToCategory(item.story_type ?? '');
  return {
    id: `${SERVER_STORY_PREFIX}${item.id}`,
    title: item.title,
    description: item.content.slice(0, 80),
    category,
    duration: item.duration_seconds ?? estimateDuration(item.content),
    narratorId: item.narrator_id ?? '',
    artwork: categoryArtwork(category),
    progress: 0,
    isFavorite: false,
    script: item.content,
    language: STORY_LANGUAGES.find((language) => language === item.language) ?? 'English',
    childName: item.child_name || undefined,
    age: item.age ?? undefined,
  };
};

// The server runs with redirect_slashes=False: the trailing slash is required.
export const fetchStories = async (): Promise<Story[]> => {
  const response = await apiFetch('/api/stories/');
  if (!response.ok) throw new Error(await readError(response));
  const data: unknown = await response.json();
  return Array.isArray(data) ? data.map((item) => toStory(item as StoryDto)) : [];
};

export const createStoryOnServer = async (input: CreateStoryInput): Promise<Story> => {
  const response = await apiFetch('/api/stories/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      child_name: input.childName,
      age: input.age ?? null,
      language: input.language,
      title: input.title,
      content: input.script,
      story_type: input.storyType,
      narrator_id: input.narratorId || null,
    }),
  });
  if (!response.ok) throw new Error(await readError(response));
  return toStory((await response.json()) as StoryDto);
};

export type StoryItem = {
  text: string;
  language: string;
  voiceId: string;
};

/**
 * A story start: `ready` is the saved file (instant). `streaming` is being read on the GPU one
 * chunk at a time: chunk 0 is ready now, the others once `waitStoryChunk` reports them, and the
 * whole file will be at `audioUrl`. `pending` is the same read without chunk info (its whole file
 * once `waitStoryAudio` reports ready). `cancelled` means the play was stopped before the server
 * started it.
 */
export type StoryRead =
  | { kind: 'ready'; key: string; audioUrl: string }
  | {
      kind: 'streaming';
      key: string;
      audioUrl: string;
      chunkUrls: string[];
      /** Words in each chunk, to place a resume point and estimate the chunks not read yet. */
      chunkWords: number[];
    }
  | { kind: 'pending'; key: string; audioUrl: string }
  | { kind: 'cancelled' };

export type StoryAudioStatus = { status: 'ready' | 'pending' } | { status: 'failed'; detail: string };

/** Story in an enrolled narrator's voice. `playId` lets `cancelStoryPlay` stop its reading. */
export const readStory = async (
  text: string,
  language: string,
  voiceId: string,
  playId: string,
): Promise<StoryRead> => {
  const response = await apiFetch('/v1/tts/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language, voice_id: voiceId, play_id: playId }),
  });
  if (!response.ok) throw new Error(await readError(response));
  const data = await response.json();
  if (data.cancelled) return { kind: 'cancelled' };
  const key = String(data.story_key || '');
  if (data.cached && typeof data.audio_url === 'string') {
    return { kind: 'ready', key, audioUrl: data.audio_url };
  }
  const chunkCount = Number(data.chunk_count) || 0;
  if (
    data.streaming &&
    typeof data.final_audio_url === 'string' &&
    typeof data.first_chunk_url === 'string' &&
    chunkCount > 0
  ) {
    // Chunk URLs on the same base the server gave chunk 0.
    const firstChunkUrl: string = data.first_chunk_url;
    const chunkUrls = Array.from({ length: chunkCount }, (_, index) =>
      firstChunkUrl.replace(/\/chunk\/0$/, `/chunk/${index}`),
    );
    const words: unknown[] = Array.isArray(data.chunk_words) ? data.chunk_words : [];
    return {
      kind: 'streaming',
      key,
      audioUrl: data.final_audio_url,
      chunkUrls,
      chunkWords: chunkUrls.map((_, index) => Math.max(1, Number(words[index]) || 1)),
    };
  }
  if (data.streaming && typeof data.final_audio_url === 'string') {
    return { kind: 'pending', key, audioUrl: data.final_audio_url };
  }
  throw new Error('Story has no text to read.');
};

/** Waits (up to 25 s, server side) for the story's whole file. */
export const waitStoryAudio = (key: string) => waitStoryFile(`/v1/tts/stream/${key}/final/wait`);

/** Waits (up to 25 s, server side) for one chunk of a story being read. */
export const waitStoryChunk = (key: string, index: number) =>
  waitStoryFile(`/v1/tts/stream/${key}/chunk/${index}/wait`);

const waitStoryFile = async (path: string): Promise<StoryAudioStatus> => {
  const response = await apiFetch(`${path}?timeout=25`);
  if (!response.ok) throw new Error(await readError(response));
  const data = await response.json();
  if (data.status === 'failed') {
    return { status: 'failed', detail: shortError(String(data.detail || 'Story could not be read')) };
  }
  return { status: data.status === 'ready' ? 'ready' : 'pending' };
};

/** Stops reading a story nobody listens to any more. Best effort, never throws. */
export const cancelStoryPlay = (playId: string) => {
  void apiFetch(`/v1/tts/stream/play/${encodeURIComponent(playId)}`, {
    method: 'DELETE',
  }).catch(() => undefined);
};

/** Background start of a story's reading, so it is ready sooner. Best effort, never throws. */
export const prefetchStory = (item: StoryItem) => {
  void apiFetch('/v1/tts/stream/prefetch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: item.text, language: item.language, voice_id: item.voiceId }),
  }).catch(() => undefined);
};
