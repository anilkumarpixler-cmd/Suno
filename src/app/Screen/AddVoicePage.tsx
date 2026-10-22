import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingStatus,
} from 'expo-audio';
import { abandonRecordingFocus, requestRecordingFocus } from '../../../modules/suno-media-session';
import { useApp } from '@/Context/AppContext';
import { STORY_AUDIO_MODE } from '@/hooks/useStoryPlayer';
import { Header } from '@/components/Common/header';
import { borderRadius, spacing, theme, ThemeColors } from '@/Theme/Index';
import { useAppTheme, useThemedStyles } from '@/Theme/ThemeProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteVoiceRecording } from '@/storage/voiceAudio';
import {showToast} from '@/components/Common/Toast';
import { claimMedia, releaseMedia } from '@/services/activeMedia';
import { ConfirmModal } from '@/modal/confirmModal';
const LANGUAGE_OPTIONS = ['Hindi + English', 'Hindi', 'English', 'Punjabi', 'Gujarati'];
// Cloning reads the first ~10 s of clear speech: shorter clones badly, longer is never used.
const MIN_RECORDING_SECONDS = 8;
const MAX_RECORDING_SECONDS = 30;

/** Other apps' audio (a song in YouTube, Spotify…) pauses so it stays out of the recording:
 * the audio mode on iOS, a recording audio focus request on Android. */
const beginRecordingAudio = async () => {
  await setAudioModeAsync({ ...STORY_AUDIO_MODE, allowsRecording: true });
  requestRecordingFocus();
};

/** Gives the audio back and returns to the story playback mode (speaker, background). */
const endRecordingAudio = () => {
  abandonRecordingFocus();
  void setAudioModeAsync(STORY_AUDIO_MODE).catch(() => undefined);
};

/** Same name for comparing: case, outer and repeated spaces don't make a different voice. */
const nameKey = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();
const SYSTEM_VOICE_KEY = nameKey('System Voice');

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
};

export const AddVoiceScreen: React.FC = () => {
  const { voices, addVoice, setCurrentScreen, isPlaying, isPreparingAudio, pausePlayback } = useApp();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const [name, setName] = useState('');
  const key = nameKey(name);
  const nameTaken =
    key !== '' && (key === SYSTEM_VOICE_KEY || voices.some((voice) => nameKey(voice.name) === key));
  const nameError = nameTaken ? 'This name already exists. Please enter a valid voice name.' : '';
  const nameUsable = key !== '' && !nameTaken;
  const [selectedLang, setSelectedLang] = useState('Hindi + English');
  const [isLangOpen, setIsLangOpen] = useState(false);
  // Length of the saved recording, as the recorder measured it (not a JS timer).
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [isRecorded, setIsRecorded] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  // Mic denied for good: themed pop-up (light / dark) with Open Settings.
  const [micSettingsVisible, setMicSettingsVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Ref, not state: a second tap can arrive before the re-render that disables the button.
  const savingRef = useRef(false);
  // Same for Start / Retake: the button only hides once the recorder reports it is recording.
  const startingRef = useRef(false);
  const [isStarting, setIsStarting] = useState(false);

  // Ref: the recorder subscribes its status listener once, so it must not capture stale state.
  const recordingFinishedRef = useRef<(status: RecordingStatus) => void>(() => undefined);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, (status) =>
    recordingFinishedRef.current(status),
  );
  const recorderState = useAudioRecorderState(recorder);
  const player = useAudioPlayer(recordedUri ?? undefined);
  const isRecording = recorderState.isRecording;
  const elapsedSeconds = Math.min(Math.floor(recorderState.durationMillis / 1000), MAX_RECORDING_SECONDS);
  // True from record() until this recording is handled, so a manual stop and the native
  // finish event (both platforms emit one on every stop) save it only once.
  const activeRecordingRef = useRef(false);
  // Stable: a story starting stops the preview / the recording (one sound at a time).
  const stopPreviewRef = useRef<() => void>(() => undefined);
  const stopPreviewForOtherMedia = useRef(() => stopPreviewRef.current()).current;
  const stopRecordingRef = useRef<() => void>(() => undefined);
  const stopRecordingForOtherMedia = useRef(() => stopRecordingRef.current()).current;

  useEffect(() => {
    if (recordedUri) player.replace(recordedUri);
  }, [recordedUri]);

  // Leaving the screen mid-recording must not keep other apps paused.
  useEffect(
    () => () => {
      try {
        if (recorder.isRecording) void recorder.stop().catch(() => undefined);
      } catch {
        // Recorder may already be released.
      }
      endRecordingAudio();
      releaseMedia(stopPreviewForOtherMedia);
      releaseMedia(stopRecordingForOtherMedia);
    },
    [],
  );

  const stopPreview = () => {
    releaseMedia(stopPreviewForOtherMedia);
    try {
      player.pause();
      player.seekTo(0);
    } catch {
      // Preview player may already be released.
    }
    setIsPreviewing(false);
  };

  const clearRecording = async () => {
    stopPreview();
    await deleteVoiceRecording(recordedUri ?? undefined);
    setRecordedUri(null);
    setIsRecorded(false);
    setRecordedSeconds(0);
  };

  const handleStartRecording = async () => {
    if (!name.trim()) {
      Alert.alert('Enter name', 'Please enter whose voice you are recording.');
      return;
    }
    if (nameTaken) return;
    if (startingRef.current || recorder.isRecording) return;

    startingRef.current = true;
    setIsStarting(true);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        // Denied for good ("Don't allow again"): the OS no longer shows the prompt, only Settings can turn it on.
        if (!permission.canAskAgain) {
          setMicSettingsVisible(true);
          return;
        }
        Alert.alert(
          'Microphone permission required',
          'Please allow microphone access to record your voice.',
        );
        return;
      }

      // The story must not play into the microphone; Play resumes it after recording.
      if (isPlaying || isPreparingAudio) pausePlayback();
      await clearRecording();
      // Other apps' audio is paused before the mic opens, so the timer starts on a quiet room.
      await beginRecordingAudio();
      await recorder.prepareToRecordAsync();
      // The native recorder enforces the cap, so it holds while the app is in the background too.
      recorder.record({ forDuration: MAX_RECORDING_SECONDS });
      activeRecordingRef.current = true;
      // A story started from the mini player stops the recording instead of playing into it.
      claimMedia(stopRecordingForOtherMedia);
    } catch {
      endRecordingAudio();
      Alert.alert('Recording error', 'Could not start recording. Please try again.');
    } finally {
      startingRef.current = false;
      setIsStarting(false);
    }
  };

  const keepRecording = (uri: string, seconds: number) => {
    setRecordedUri(uri);
    setRecordedSeconds(seconds);
    setIsRecorded(true);
  };

  const handleStopRecording = async () => {
    if (!activeRecordingRef.current) return;
    activeRecordingRef.current = false;
    releaseMedia(stopRecordingForOtherMedia);
    // Read before stop: the recorder resets its duration to 0 once stopped.
    const seconds = recorder.getStatus().durationMillis / 1000;
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) keepRecording(uri, seconds);
    } catch {
      Alert.alert('Recording error', 'Could not save the recording.');
    } finally {
      endRecordingAudio();
    }
  };

  // The recorder stopped on its own: the 30 s cap was reached, or the system ended it.
  recordingFinishedRef.current = (status) => {
    if (!status.isFinished || !activeRecordingRef.current) return;
    activeRecordingRef.current = false;
    releaseMedia(stopRecordingForOtherMedia);
    endRecordingAudio();
    const uri = status.url ?? recorder.uri;
    if (status.hasError || !uri) {
      Alert.alert('Recording error', 'Could not save the recording.');
      return;
    }
    keepRecording(uri, MAX_RECORDING_SECONDS);
  };

  stopPreviewRef.current = stopPreview;
  stopRecordingRef.current = () => void handleStopRecording();

  const handleRetake = async () => {
    await handleStartRecording();
  };

  const handlePreview = () => {
    if (!recordedUri) {
      Alert.alert('No recording', 'Please record your voice first.');
      return;
    }

    if (isPreviewing) {
      stopPreview();
      return;
    }

    claimMedia(stopPreviewForOtherMedia);
    player.seekTo(0);
    player.play();
    setIsPreviewing(true);
  };

  const handleSave = async () => {
    // One voice per recording: further taps while it uploads are ignored.
    if (savingRef.current) return;
    if (!name.trim()) {
      Alert.alert('Enter name', 'Please enter a voice name.');
      return;
    }
    if (nameTaken) return;
    if (!recordedUri) {
      Alert.alert('Record your voice', 'Please record your voice before saving.');
      return;
    }
    if (recordedSeconds < MIN_RECORDING_SECONDS) {
      Alert.alert(
        'Recording too short',
        `Please read aloud for at least ${MIN_RECORDING_SECONDS} seconds so the voice can be cloned clearly.`,
      );
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    stopPreview();
    try {
      await addVoice(name, selectedLang.split(' + '), recordedUri);
      setCurrentScreen('Voices');
      showToast('Voice saved successfully', 'success');
    } catch (error) {
      // The recording stays on the screen, so Save can be tapped again once the server is back.
      const message = error instanceof Error ? error.message : 'Could not save this voice. Please try again.';
      showToast(message, 'error');
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header showBack onBack={() => setCurrentScreen('Voices')} title=" Add a Voice" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <View style={styles.formGroup}>
          <Text style={styles.label}>Whose voice is this?</Text>
          <TextInput
            style={[styles.input, nameError !== '' && styles.inputError]}
            placeholder="e.g. Mummy, Papa, Nani"
            placeholderTextColor={colors.placeholder}
            value={name}
            onChangeText={setName}
            accessibilityHint={nameError || undefined}
          />
          {nameError !== '' && (
            <Text style={styles.errorText} accessibilityLiveRegion="polite">
              {nameError}
            </Text>
          )}
        </View>

        <View style={[styles.formGroup, styles.langGroup]}>
          <Text style={styles.label}>Language</Text>
          <View style={styles.dropdownWrap}>
            <Pressable
              style={styles.dropdownField}
              onPress={() => setIsLangOpen((open) => !open)}
              accessibilityRole="combobox"
              accessibilityState={{ expanded: isLangOpen }}
            >
              <Text style={styles.dropdownValue}>{selectedLang}</Text>
              <Text style={styles.chevron}>{isLangOpen ? '⌃' : '⌄'}</Text>
            </Pressable>
            {isLangOpen && (
              <View style={styles.dropdownMenu}>
                {LANGUAGE_OPTIONS.map((lang) => (
                  <Pressable
                    key={lang}
                    style={[styles.option, lang === selectedLang && styles.selectedOption]}
                    onPress={() => {
                      setSelectedLang(lang);
                      setIsLangOpen(false);
                    }}
                  >
                    <Text style={styles.optionText}>{lang}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.recorderBox}>
          <View style={styles.micCircle}>
            <Text style={styles.micIcon}>🎙️</Text>
          </View>
          <Text style={styles.recTitle}>
            {isRecording ? 'Recording Voice...' : isRecorded ? 'Voice Recorded' : 'Record your voice'}
          </Text>
          <Text style={styles.recSub}>
            Read the sample story aloud clearly for 15–20 seconds in a quiet room to clone your voice tone.
          </Text>

          {isRecording && <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>}

          {!isRecording && !isRecorded && (
            <TouchableOpacity
              style={[styles.recBtn, (!nameUsable || isStarting) && styles.disabledBtn]}
              disabled={!nameUsable || isStarting}
              onPress={handleStartRecording}
            >
              <Text style={styles.recBtnText}>{isStarting ? 'Starting…' : 'Start recording'}</Text>
            </TouchableOpacity>
          )}

          {isRecording && (
            <TouchableOpacity style={[styles.recBtn, styles.stopBtn]} onPress={handleStopRecording}>
              <Text style={styles.recBtnText}>Stop recording</Text>
            </TouchableOpacity>
          )}

          {isRecorded && (
            <View style={styles.postRecRow}>
              <TouchableOpacity
                style={[styles.secondaryBtn, (isSaving || isStarting) && styles.disabledBtn]}
                disabled={isSaving || isStarting}
                onPress={handleRetake}
              >
                <Text style={styles.secondaryText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.playBtn} onPress={handlePreview}>
                <Text style={styles.playText}>{isPreviewing ? 'Pause' : '▶ Preview'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (isSaving || nameTaken) && styles.disabledBtn]}
                disabled={isSaving || nameTaken}
                onPress={handleSave}
              >
                <Text style={styles.saveText}>{isSaving ? 'Saving…' : 'Save Voice'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.privacyCard}>
          <Text style={styles.privacyTitle}>🔒 Privacy first</Text>
          <Text style={styles.privacySub}>
            Your voice data is encrypted and completely private. It is only used to generate stories for your family and can be deleted anytime.
          </Text>
        </View>
      </ScrollView>

      <ConfirmModal
        visible={micSettingsVisible}
        title="Microphone permission required"
        message="Microphone access is turned off for Suno. Turn it on in Settings to record your voice."
        cancelLabel="Not now"
        confirmLabel="Open Settings"
        confirmVariant="primary"
        onCancel={() => setMicSettingsVisible(false)}
        onConfirm={() => {
          setMicSettingsVisible(false);
          void Linking.openSettings();
        }}
      />
    </SafeAreaView>
  );
};

export default AddVoiceScreen;

const makeStyles = (colors: ThemeColors) => ({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1, overflow: 'visible' as const },
  // Extra bottom space so the privacy card clears the mini player.
  content: { padding: spacing.md, paddingBottom: 140, overflow: 'visible' as const },
  formGroup: { marginBottom: spacing.lg },
  langGroup: { zIndex: 20 },
  dropdownWrap: { position: 'relative' as const },
  label: { ...theme.typography.section, color: colors.textDark, marginBottom: 8 },
  input: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 16,
    padding: 14,
    color: colors.textDark,
    ...theme.typography.body,
  },
  inputError: { borderColor: colors.danger },
  errorText: { ...theme.typography.caption, color: colors.danger, marginTop: 6 },
  dropdownField: {
    minHeight: 52,
    borderColor: colors.borderLight,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: colors.cardBg,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  dropdownValue: { ...theme.typography.body, color: colors.textDark },
  chevron: {
    color: colors.textMuted,
    fontSize: 22,
    lineHeight: 18,
    marginTop: -5,
  },
  dropdownMenu: {
    position: 'absolute' as const,
    top: 58,
    left: 0,
    right: 0,
    zIndex: 30,
    elevation: 8,
    backgroundColor: colors.cardBg,
    borderColor: colors.borderLight,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden' as const,
  },
  option: {
    minHeight: 48,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.md,
  },
  selectedOption: { backgroundColor: colors.purpleLightBg },
  optionText: {
    ...theme.typography.body,
    color: colors.textDark,
  },
  recorderBox: {
    backgroundColor: colors.purpleLightBg,
    borderWidth: 2,
    borderStyle: 'dashed' as const,
    borderColor: colors.purpleDashed,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    alignItems: 'center' as const,
    marginBottom: spacing.lg,
  },
  micCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.cardBg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 12,
  },
  micIcon: { fontSize: 24 },
  recTitle: { ...theme.typography.cardTitle, color: colors.textDark },
  recSub: { ...theme.typography.caption, color: colors.textMuted, textAlign: 'center' as const, marginTop: 4, marginBottom: 16 },
  timerText: { ...theme.typography.hero, fontSize: 24, lineHeight: 30, color: colors.primary, marginBottom: 12 },
  recBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: borderRadius.button,
  },
  stopBtn: { backgroundColor: '#E53E3E' },
  disabledBtn: { opacity: 0.5 },
  recBtnText: { ...theme.typography.section, color: colors.onPrimary },
  postRecRow: {
    flexDirection: 'row' as const,
    width: '100%' as const,
    justifyContent: 'space-around' as const,
    alignItems: 'center' as const,
  },
  secondaryBtn: { padding: 12 },
  secondaryText: { ...theme.typography.section, color: colors.textMuted },
  playBtn: {
    backgroundColor: colors.pillBg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  playText: { ...theme.typography.section, color: colors.textDark },
  saveBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  saveText: { ...theme.typography.section, color: colors.onPrimary },
  privacyCard: { backgroundColor: colors.cardBg, padding: spacing.md, borderRadius: 16 },
  privacyTitle: { ...theme.typography.section, color: colors.textDark },
  privacySub: { ...theme.typography.caption, color: colors.textMuted, marginTop: 4 },
});
