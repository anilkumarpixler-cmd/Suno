import {
  copyAsync,
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
} from 'expo-file-system/legacy';

const voicesDirectory = () => `${documentDirectory}voices/`;

const extensionFor = (uri: string) => {
  const match = uri.split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
  return match?.[1] || 'm4a';
};

export const persistVoiceRecording = async (sourceUri: string, voiceId: string): Promise<string> => {
  const dir = voicesDirectory();
  const dirInfo = await getInfoAsync(dir);
  if (!dirInfo.exists) {
    await makeDirectoryAsync(dir, { intermediates: true });
  }

  const dest = `${dir}${voiceId}.${extensionFor(sourceUri)}`;
  const destInfo = await getInfoAsync(dest);
  if (destInfo.exists) await deleteAsync(dest, { idempotent: true });
  await copyAsync({ from: sourceUri, to: dest });
  return dest;
};

export const deleteVoiceRecording = async (uri?: string) => {
  if (!uri) return;
  try {
    const info = await getInfoAsync(uri);
    if (info.exists) await deleteAsync(uri, { idempotent: true });
  } catch {
    // File may already be gone.
  }
};
