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

export type TtsResult = {
  id: string;
  audioUrl: string;
  duration: number;
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

  try {
    await fetch(`${API_BASE_URL}/health`);
  } catch {
    throw new Error(SERVER_NOT_CONNECTED);
  }

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
    throw new Error('Upload failed. Try a shorter recording.');
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

/** Clones the narrator again from its saved recording (after a failed enroll), in the background. */
export const reenrollVoice = async (voiceId: string): Promise<Voice> => {
  const response = await apiFetch(`/v1/voices/${voiceId}/enroll`, { method: 'POST' });
  if (!response.ok) throw new Error(await readError(response));
  return toVoice((await response.json()) as VoiceDto);
};

export type StoryItem = {
  text: string;
  language: string;
  voiceId: string;
};

export type StoryRead =
  | ({ ready: true } & TtsResult)
  | {
      ready: false;
      id: string;
      /** One continuous live WAV (16-bit PCM); sound starts after the first sentence. */
      streamUrl: string;
      /** The saved file, available once the story has been read in full. */
      audioUrl: string;
      estimatedDuration: number;
    };

export type StoryStatus =
  | { done: false }
  | { done: true; error: string }
  | ({ done: true; error: null } & TtsResult);

/**
 * Story in an enrolled narrator's voice: the cached file when it exists (instant),
 * otherwise a live stream. The narrator's recording is never sent again.
 */
export const readStory = async (
  text: string,
  language: string,
  voiceId: string,
): Promise<StoryRead> => {
  const response = await apiFetch('/v1/story/read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language, voice_id: voiceId }),
  });
  if (!response.ok) throw new Error(await readError(response));
  const data = await response.json();
  const id = String(data.id || '');
  const audioUrl = typeof data.audio_url === 'string' ? data.audio_url : '';
  if (!audioUrl) throw new Error('Story did not return audio.');
  if (data.ready) return { ready: true, id, audioUrl, duration: Number(data.duration) || 1 };
  const streamUrl = typeof data.stream_url === 'string' ? data.stream_url : '';
  if (!streamUrl) throw new Error('Story did not return a stream.');
  return {
    ready: false,
    id,
    streamUrl,
    audioUrl,
    estimatedDuration: Number(data.estimated_duration) || 1,
  };
};

export const fetchStoryStatus = async (id: string): Promise<StoryStatus> => {
  const response = await apiFetch(`/v1/story/${id}/status`);
  if (!response.ok) throw new Error(await readError(response));
  const data = await response.json();
  if (!data.done) return { done: false };
  if (data.error) return { done: true, error: shortError(String(data.error)) };
  return {
    done: true,
    error: null,
    id,
    audioUrl: String(data.audio_url || ''),
    duration: Number(data.duration) || 1,
  };
};

/** One story start as the app saw it, in ms since the tap: the server logs the whole chain. */
export type StoryTiming = {
  readResponseMs: number;
  playerStartMs: number;
  firstSoundMs: number;
  cached: boolean;
};

/** Best effort, never throws: feeds the server's `[timing] SUMMARY` log line. */
export const reportStoryTiming = (id: string, timing: StoryTiming) => {
  void fetch(`${API_BASE_URL}/v1/story/${id}/timing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      read_response_ms: timing.readResponseMs,
      player_start_ms: timing.playerStartMs,
      first_sound_ms: timing.firstSoundMs,
      cached: timing.cached,
    }),
  }).catch(() => undefined);
};

/** Background pre-reading so a later narrator pick plays at once. Best effort, never throws. */
export const prepareStories = (items: StoryItem[]) => {
  if (items.length === 0) return;
  void fetch(`${API_BASE_URL}/v1/story/prepare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: items.map((item) => ({ text: item.text, language: item.language, voice_id: item.voiceId })),
    }),
  }).catch(() => undefined);
};
