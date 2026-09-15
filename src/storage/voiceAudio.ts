import {
  EncodingType,
  cacheDirectory,
  copyAsync,
  deleteAsync,
  getInfoAsync,
  readAsStringAsync,
} from 'expo-file-system/legacy';

export const deleteVoiceRecording = async (uri?: string) => {
  if (!uri) return;
  try {
    const info = await getInfoAsync(uri);
    if (info.exists) await deleteAsync(uri, { idempotent: true });
  } catch {
    // File may already be gone.
  }
};

const asFileUri = (uri: string) => {
  if (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('ph://')) {
    return uri;
  }
  return `file://${uri}`;
};

export const readRecordingBase64 = async (uri: string): Promise<{ base64: string; filename: string }> => {
  const source = asFileUri(uri);
  const dest = `${cacheDirectory}voice-upload-${Date.now()}.m4a`;
  try {
    await copyAsync({ from: source, to: dest });
  } catch {
    const base64 = await readAsStringAsync(source, { encoding: EncodingType.Base64 });
    if (!base64) throw new Error('Could not read the recording file.');
    return { base64, filename: 'recording.m4a' };
  }
  const base64 = await readAsStringAsync(dest, { encoding: EncodingType.Base64 });
  await deleteAsync(dest, { idempotent: true });
  if (!base64) throw new Error('Could not read the recording file.');
  return { base64, filename: 'recording.m4a' };
};
