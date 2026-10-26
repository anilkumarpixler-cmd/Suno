import { requireOptionalNativeModule, type NativeModule } from 'expo';

export type RenderedSpeech = { uri: string; duration: number };

declare class SunoSpeechRenderModule extends NativeModule {
  renderSpeech(parts: string[], locale: string): Promise<RenderedSpeech>;
  prefetchSpeech(parts: string[], locale: string): void;
  cancelSpeechRender(): void;
}

// Android only. Missing on iOS, web, Expo Go and dev clients built before this module existed.
const nativeModule = requireOptionalNativeModule<SunoSpeechRenderModule>('SunoSpeechRender');

/** System Voice can be written to a file and played by Suno's player (Android). */
export const isSpeechRenderAvailable = nativeModule != null;

/** The default TTS writes `parts` (the story, in the engine's input-size slices) to one cached
 * WAV. Rejects when cancelled or when the voice is missing; `null` without the module. */
export const renderSpeech = (parts: string[], locale: string): Promise<RenderedSpeech | null> =>
  nativeModule ? nativeModule.renderSpeech(parts, locale) : Promise.resolve(null);

/** Writes the next story ahead, so it starts without waiting. */
export const prefetchSpeech = (parts: string[], locale: string) => {
  nativeModule?.prefetchSpeech(parts, locale);
};

export const cancelSpeechRender = () => {
  nativeModule?.cancelSpeechRender();
};
