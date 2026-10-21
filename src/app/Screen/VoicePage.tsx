import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/Context/AppContext';
import { spacing, theme, ThemeColors } from '@/Theme/Index';
import { useAppTheme, useThemedStyles } from '@/Theme/ThemeProvider';
import { showToast } from '@/components/Common/Toast';
import { Voice } from '@/Types';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { ConfirmModal } from '@/modal/confirmModal';
import { PreviewModal } from '@/modal/previewModal';
import { claimMedia, releaseMedia } from '@/services/activeMedia';

interface VoiceCardProps {
  voice: Voice;
  isSelected: boolean;
  onSetDefault: (voiceId: string) => void;
  onPreviewVoice: (voice: Voice) => void;
  onDeleteVoice: (voiceId: string) => void;
}

/** Ready only once the voice is cloned and loaded on the GPU, not when the recording is saved. */
const voiceStateLabel = (voice: Voice) => {
  if (!voice.state) return voice.status;
  if (voice.state === 'ready') return '🟢 Voice ready';
  if (voice.state === 'error') return '🔴 Voice failed';
  return '🟡 Preparing voice…';
};

const VoiceCard: React.FC<VoiceCardProps> = ({
  voice,
  isSelected,
  onSetDefault,
  onPreviewVoice,
  onDeleteVoice,
}) => {
  const styles = useThemedStyles(makeStyles);
  const failed = voice.state === 'error';
  return (
  <View style={styles.voiceCard}>
    <View style={styles.voiceTopRow}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarEmoji}>{voice.avatar}</Text>
      </View>
      <View style={styles.voiceDetails}>
        <Text style={styles.voiceName}>{voice.name}</Text>
        <Text style={styles.metaText}>
          {voice.languages.join(' · ')} · {isSelected ? 'Default · ' : ''}
          {voiceStateLabel(voice)}
        </Text>
        {failed && voice.stateError ? (
          <Text style={styles.metaText} numberOfLines={2}>
            {voice.stateError}
          </Text>
        ) : null}
      </View>
      {isSelected && (
        <View style={styles.defaultStatus} accessibilityLabel={`${voice.name} selected`}>
          <Text style={styles.checkMark}>✓</Text>
        </View>
      )}
    </View>

    <View style={styles.actionRow}>
      <Pressable
        style={styles.actionButton}
        onPress={() => onPreviewVoice(voice)}
        accessibilityRole="button"
        accessibilityLabel={`Preview ${voice.name}`}>
        <Text style={styles.playIcon}>▶</Text>
        <Text style={styles.actionText}>Preview</Text>
      </Pressable>
      {/* A failed voice can only be deleted and recorded again (the server has no retry). */}
      {!failed && (
        <Pressable
          style={styles.actionButton}
          onPress={() => onSetDefault(voice.id)}
          accessibilityRole="button"
          accessibilityLabel={`Set ${voice.name} as default`}>
          <Text style={styles.actionText}>Default</Text>
        </Pressable>
      )}
      <Pressable
        style={styles.actionButton}
        onPress={() => onDeleteVoice(voice.id)}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${voice.name}`}>
        <Text style={styles.actionText}>Delete</Text>
      </Pressable>
    </View>
  </View>
  );
};

export const FamilyVoicesScreen: React.FC = () => {
  const {
    voices,
    voicesStatus,
    refreshVoices,
    defaultNarratorId,
    setDefaultVoice,
    setCurrentScreen,
    deleteVoice,
    narratorPickerStoryId,
    selectNarrator,
  } = useApp();
  const { gradients } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const isPicker = Boolean(narratorPickerStoryId);
  // One global narrator plays every story, in the picker and on the Voices tab alike.
  const selectedVoiceId = defaultNarratorId || undefined;
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const player = useAudioPlayer(previewUri ?? undefined);
  const status = useAudioPlayerStatus(player);
  // Kept after the pop-up closes, so its text doesn't flip to "this voice" while it fades out.
  const [deleteName, setDeleteName] = useState('');

  useEffect(() => {
    if (previewUri) player.replace(previewUri);
    else {
      player.pause();
      player.seekTo(0);
    }
  }, [previewUri]);

  const handleSetDefault = (voiceId: string) => {
    const voice = voices.find((item) => item.id === voiceId);
    if (!voice) return;

    if (isPicker) {
      selectNarrator(voiceId);
      showToast(`${voice.name} is now narrating`, 'success');
      setCurrentScreen('NowPlaying');
      return;
    }

    if (voiceId === defaultNarratorId) return;
    setDefaultVoice(voiceId);
    showToast(`${voice.name} is now your default narrator`, 'success');
  };

  const handlePreviewVoice = (voice: Voice) => {
    if (!voice.audioUri) {
      Alert.alert('No recording', 'This voice does not have a recording.');
      return;
    }
    setPreviewUri(voice.audioUri);
  };

  // Stable: a story starting stops the preview (one sound at a time).
  const stopPreviewRef = useRef<() => void>(() => undefined);
  const stopPreviewForOtherMedia = useRef(() => stopPreviewRef.current()).current;
  useEffect(() => () => releaseMedia(stopPreviewForOtherMedia), []);

  const handlePlayPreview = () => {
    if (!previewUri) return;
    claimMedia(stopPreviewForOtherMedia);
    player.seekTo(0);
    player.play();
  };

  const handleStopPreview = () => {
    releaseMedia(stopPreviewForOtherMedia);
    player.pause();
    player.seekTo(0);
  };
  stopPreviewRef.current = handleStopPreview;

  // Voices whose delete request is running: hidden from the list so Delete can't be sent twice.
  // Ref for the guard (a second tap can arrive before the re-render), state for the list.
  const deletingIdsRef = useRef<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);

  const setDeleting = (voiceId: string, deleting: boolean) => {
    const next = deleting
      ? [...deletingIdsRef.current, voiceId]
      : deletingIdsRef.current.filter((id) => id !== voiceId);
    deletingIdsRef.current = next;
    setDeletingIds(next);
  };

  const handleDeleteVoice = (voiceId: string) => {
    if (deletingIdsRef.current.includes(voiceId)) return;
    setDeleteName(voices.find((item) => item.id === voiceId)?.name ?? 'this voice');
    setPendingDeleteId(voiceId);
  };

  const handleCancelDelete = () => {
    setPendingDeleteId(null);
  };

  const handleConfirmDelete = () => {
    const voiceId = pendingDeleteId;
    const voice = voices.find((item) => item.id === voiceId);
    setPendingDeleteId(null);
    if (!voiceId || deletingIdsRef.current.includes(voiceId)) return;
    // Hidden at once; the toast follows the server's answer. A failed delete shows the card again.
    setDeleting(voiceId, true);
    deleteVoice(voiceId)
      .then(() => {
        if (previewUri && voice?.audioUri === previewUri) setPreviewUri(null);
        showToast(`${voice?.name ?? 'Voice'} deleted successfully`, 'success');
      })
      .catch((error) =>
        showToast(error instanceof Error ? error.message : 'Could not delete the voice', 'error'),
      )
      .finally(() => setDeleting(voiceId, false));
  };

  const visibleVoices = voices.filter((voice) => !deletingIds.includes(voice.id));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => setCurrentScreen(isPicker ? 'NowPlaying' : 'Home')}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Family Voices</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => setCurrentScreen('AddVoice')}
          accessibilityRole="button"
          accessibilityLabel="Add a family voice">
          <Text style={styles.addIcon}>+</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}>
          <Text style={styles.heroTitle}>{'Your family, in every\nstory.'}</Text>
          <Text style={styles.heroDescription}>
            {'Record voices once and use them to\nnarrate stories whenever you want.'}
          </Text>
        </LinearGradient>

        <Text style={styles.sectionTitle}>{isPicker ? 'Choose narrator' : 'Your voices'}</Text>

        
          <PreviewModal
            visible={previewUri !== null}
            previewUri={previewUri}
            isPlaying={status.playing}
            setPreviewUri={(uri: string | null) => {
              if (!uri) handleStopPreview();
              setPreviewUri(uri);
            }}
            handlePlayPreview={handlePlayPreview}
            handleStopPreview={handleStopPreview}
          />

          <ConfirmModal
            visible={pendingDeleteId !== null}
            title="Delete voice"
            message={`Remove ${deleteName}? This cannot be undone.`}
            onCancel={handleCancelDelete}
            onConfirm={handleConfirmDelete}
          />

        {/* Always first: the device voice is the default narrator until a family voice is chosen. */}
        <Pressable
          style={styles.voiceCard}
          onPress={() => {
            if (isPicker) {
              selectNarrator('');
              showToast('Using system voice', 'success');
              setCurrentScreen('NowPlaying');
              return;
            }
            if (!selectedVoiceId) return;
            setDefaultVoice('');
            showToast('System Voice is now your default narrator', 'success');
          }}
          accessibilityRole="button"
          accessibilityLabel="Use system voice">
          <View style={styles.voiceTopRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarEmoji}>🔊</Text>
            </View>
            <View style={styles.voiceDetails}>
              <Text style={styles.voiceName}>System Voice</Text>
              <Text style={styles.metaText}>Device speech · no cloning</Text>
            </View>
            {!selectedVoiceId && (
              <View style={styles.defaultStatus} accessibilityLabel="System Voice selected">
                <Text style={styles.checkMark}>✓</Text>
              </View>
            )}
          </View>
        </Pressable>

        {(isPicker
          ? visibleVoices.filter((voice) => Boolean(voice.audioUri))
          : visibleVoices
        ).map((voice) => (
          <VoiceCard
            key={voice.id}
            voice={voice}
            isSelected={voice.id === selectedVoiceId}
            onSetDefault={handleSetDefault}
            onPreviewVoice={handlePreviewVoice}
            onDeleteVoice={handleDeleteVoice}
          />
        ))}

        {visibleVoices.length === 0 && (
          <View style={styles.voiceCard}>
            {voicesStatus === 'offline' ? (
              <>
                <Text style={styles.voiceName}>Server not connected</Text>
                <Text style={styles.metaText}>Your family voices will appear once it's back.</Text>
                <Pressable
                  style={[styles.actionButton, styles.emptyRetry]}
                  onPress={() => void refreshVoices()}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading voices">
                  <Text style={styles.actionText}>Retry</Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.metaText}>
                {voicesStatus === 'loading' ? 'Loading voices…' : 'No voices yet. Tap + to record one.'}
              </Text>
            )}
          </View>
        )}

        <Pressable
          style={styles.addVoiceButton}
          onPress={() => setCurrentScreen('AddVoice')}
          accessibilityRole="button"
          accessibilityLabel="Add family voice">
          <Text style={styles.addVoiceButtonText}>+ Add family voice</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

export const VoicesScreen = FamilyVoicesScreen;

export default VoicesScreen;

const makeStyles = (colors: ThemeColors) => ({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 60,
    paddingHorizontal: 20,
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: 'flex-start' as const,
    justifyContent: 'center' as const,
    zIndex: 1,
  },
  backIcon: {
    color: colors.textDark,
    fontSize: 34,
    fontWeight: '300' as const,
    lineHeight: 36,
  },
  headerTitle: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    textAlign: 'center' as const,
    color: colors.textDark,
    ...theme.typography.cardTitle,
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.cardBg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: colors.borderLight,
    zIndex: 1,
  },
  addIcon: {
    color: colors.textDark,
    fontSize: 27,
    fontWeight: '400' as const,
    lineHeight: 28,
  },
  // Extra bottom space so the last button clears the mini player.
  content: { paddingHorizontal: 19, paddingTop: 28, paddingBottom: 140 },
  heroCard: {
    height: 170,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 23,
  },
  heroTitle: {
    color: colors.textDark,
    ...theme.typography.hero,
    marginBottom: 11,
  },
  heroDescription: { ...theme.typography.body, color: colors.textMuted },
  sectionTitle: {
    color: colors.textDark,
    ...theme.typography.section,
    marginTop: 30,
    marginBottom: 14,
    marginLeft: 13,
  },
  voiceCard: {
    backgroundColor: colors.cardBg,
    borderColor: colors.borderLight,
    borderRadius: 21,
    borderWidth: 1,
    padding: 18,
    marginBottom: 13,
  },
  voiceTopRow: { minHeight: 52, flexDirection: 'row' as const, alignItems: 'center' as const },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.purpleLightBg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 14,
  },
  avatarEmoji: { fontSize: 28 },
  voiceDetails: { flex: 1 },
  voiceName: { ...theme.typography.cardTitle, color: colors.textDark },
  metaText: { ...theme.typography.body, color: colors.textMuted, marginTop: 4 },
  defaultStatus: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.success,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  checkMark: { color: colors.onPrimary, fontSize: 16, fontWeight: '800' as const },
  actionRow: { flexDirection: 'row' as const, gap: spacing.sm, marginTop: 18 },
  actionButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.cardBg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    gap: 8,
  },
  playIcon: { color: colors.textDark, fontSize: 13 },
  actionText: { ...theme.typography.section, color: colors.textDark },
  emptyRetry: { flex: 0, marginTop: 14 },
  addVoiceButton: {
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 2,
  },
  addVoiceButtonText: { ...theme.typography.section, color: colors.onPrimary },
});
