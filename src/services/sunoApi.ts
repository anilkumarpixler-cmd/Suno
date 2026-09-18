import { Voice } from '../Types';
import { readRecordingBase64 } from '../storage/voiceAudio';
import { API_BASE_URL } from './apiConfig';

type VoiceDto = {
  id: string;
  name: string;
  languages?: string[];
  status?: Voice['status'];
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
  cloned: boolean;
};

const toVoice = (item: VoiceDto): Voice => ({
  id: item.id,
  name: item.name,
  languages: item.languages || ['English'],
  status: item.status || 'Ready',
  isDefault: item.isDefault ?? item.is_default ?? false,
  avatar: item.avatar || '👤',
  audioUri: item.audioUri || item.audio_url,
});

const readError = async (response: Response) => {
  try {
    const data = await response.json();
    if (typeof data.detail === 'string') return data.detail;
    return data.message || response.statusText;
  } catch {
    return response.statusText;
  }
};

const apiFetch = async (path: string, init?: RequestInit) => {
  try {
    return await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new Error(`Cannot reach ${API_BASE_URL}. Is suno-tts running on port 8002? Allow the port in Windows Firewall.`);
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
    throw new Error(`Cannot reach ${API_BASE_URL}. Start suno-tts on port 8002 and allow it in Windows Firewall.`);
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
    throw new Error('Upload failed after reaching the server. Try a shorter recording, or allow port 8002 in Windows Firewall.');
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

// export const convertStory = async (
//   text: string,
//   language: string,
//   voiceId: string,
// ): Promise<TtsResult> => {
//   const response = await apiFetch('/v1/convert', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({
//       text,
//       language,
//       voice_id: voiceId,
//     }),
//   });
//   if (!response.ok) throw new Error(await readError(response));
//   const data = await response.json();
//   const audioUrl = typeof data.audio_url === 'string' ? data.audio_url : '';
//   if (!audioUrl) throw new Error('Clone did not return audio.');
export const synthesizeStory = async (
  text: string,
  language: string,
  voiceId?: string,
): Promise<TtsResult> => {
  // #region agent log
  fetch('http://127.0.0.1:7423/ingest/e02efffa-4b4a-4b28-89cc-c96cc76989ba',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'98a9d4'},body:JSON.stringify({sessionId:'98a9d4',hypothesisId:'E',location:'sunoApi.ts:synthesizeStory',message:'app tts request',data:{voiceId:voiceId||'',language,textLen:text.length,apiBase:API_BASE_URL},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  const response = await apiFetch('/v1/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language, voice_id: voiceId || undefined }),
  });
  if (!response.ok) throw new Error(await readError(response));
  const data = await response.json();
  const audioUrl = typeof data.audio_url === 'string' ? data.audio_url : '';
  if (!audioUrl) throw new Error('TTS did not return audio.');

  return {
    id: String(data.id || ''),
    audioUrl,
    duration: Number(data.duration) || 1,
    cloned: Boolean(data.cloned),
  };
};
