import { Voice } from '../Types';
import { readRecordingBase64 } from '../storage/voiceAudio';
import { API_BASE_URL } from './apiConfig';

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
    return await fetch(`${API_BASE_URL}${path}`, init);
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

  try {
    const response = await fetch(`${API_BASE_URL}/v1/voices/json`, {
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
  } catch (error) {
    if (error instanceof Error && !/network|failed/i.test(error.message)) throw error;
    // Connection lost during the upload (recordings are at most 30 s, so size isn't the cause).
    throw new Error(SERVER_NOT_CONNECTED);
  }
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

export type StoryItem = {
  text: string;
  language: string;
  voiceId: string;
};

/**
 * A story start: `ready` is the saved file (instant), `pending` is being read on the GPU
 * (its whole file is at `audioUrl` once `waitStoryAudio` reports ready), `cancelled` means the
 * play was stopped before the server started it.
 */
export type StoryRead =
  | { kind: 'ready'; key: string; audioUrl: string }
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
  if (data.streaming && typeof data.final_audio_url === 'string') {
    return { kind: 'pending', key, audioUrl: data.final_audio_url };
  }
  throw new Error('Story has no text to read.');
};

/** Waits (up to 25 s, server side) for the story's whole file. */
export const waitStoryAudio = async (key: string): Promise<StoryAudioStatus> => {
  const response = await apiFetch(`/v1/tts/stream/${key}/final/wait?timeout=25`);
  if (!response.ok) throw new Error(await readError(response));
  const data = await response.json();
  if (data.status === 'failed') {
    return { status: 'failed', detail: shortError(String(data.detail || 'Story could not be read')) };
  }
  return { status: data.status === 'ready' ? 'ready' : 'pending' };
};

/** Stops reading a story nobody listens to any more. Best effort, never throws. */
export const cancelStoryPlay = (playId: string) => {
  void fetch(`${API_BASE_URL}/v1/tts/stream/play/${encodeURIComponent(playId)}`, {
    method: 'DELETE',
  }).catch(() => undefined);
};

/** Background start of a story's reading, so it is ready sooner. Best effort, never throws. */
export const prefetchStory = (item: StoryItem) => {
  void fetch(`${API_BASE_URL}/v1/tts/stream/prefetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: item.text, language: item.language, voice_id: item.voiceId }),
  }).catch(() => undefined);
};
