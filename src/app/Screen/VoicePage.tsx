import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/Context/AppContext';
import { spacing, theme, ThemeColors } from '@/Theme/Index';
import { useAppTheme, useThemedStyles } from '@/Theme/ThemeProvider';
import { showToast } from '@/components/Common/Toast';
import { Voice } from '@/Types';
import { useAudioPlayer } from 'expo-audio';
import { PreviewModal } from '@/modal/previewModal';

interface VoiceCardProps {
  voice: Voice;
  isSelected: boolean;
  onSetDefault: (voiceId: string) => void;
  onUseForStory: (voiceId: string) => void;
  onPreviewVoice: (voice: Voice) => void;
  onDeleteVoice: (voiceId: string) => void;
}

const VoiceCard: React.FC<VoiceCardProps> = ({
  voice,
  isSelected,
  onSetDefault,
  onPreviewVoice,
  onDeleteVoice,
}) => {
  const styles = useThemedStyles(makeStyles);
  return (
  <View style={styles.voiceCard}>
    <View style={styles.voiceTopRow}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarEmoji}>{voice.avatar}</Text>
      </View>
      <View style={styles.voiceDetails}>
        <Text style={styles.voiceName}>{voice.name}</Text>
        <Text style={styles.metaText}>
          {voice.languages.join(' · ')} · {isSelected ? 'Default' : voice.status}
        </Text>
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
      <Pressable
        style={styles.actionButton}
        onPress={() => onSetDefault(voice.id)}
        accessibilityRole="button"
        accessibilityLabel={`Set ${voice.name} as default`}>
        <Text style={styles.actionText}>Default</Text>
      </Pressable>
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
    stories,
    activeStory,
    setDefaultVoice,
    setCurrentScreen,
    deleteVoice,
    narratorPickerStoryId,
    changeNarrator,
  } = useApp();
  const { gradients } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const isPicker = Boolean(narratorPickerStoryId);
  const selectedVoiceId = isPicker
    ? stories.find((story) => story.id === narratorPickerStoryId)?.narratorId ||
      (activeStory?.id === narratorPickerStoryId ? activeStory.narratorId : undefined)
    : voices.find((voice) => voice.isDefault)?.id;
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const player = useAudioPlayer(previewUri ?? undefined);

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

    if (!voice.isDefault) setDefaultVoice(voiceId);

    if (narratorPickerStoryId) {
      changeNarrator(narratorPickerStoryId, voiceId);
      showToast(`${voice.name} is now narrating`);
      setCurrentScreen('NowPlaying');
      return;
    }

    if (voice.isDefault) return;
    showToast(`${voice.name} is now your default narrator`);
  };

  const handleUseForStory = (voiceId: string) => {
    if (!activeStory) {
      setCurrentScreen('Home');
      return;
    }
    if (activeStory.narratorId === voiceId) {
      setCurrentScreen('NowPlaying');
      return;
    }
    const voice = voices.find((item) => item.id === voiceId);
    changeNarrator(activeStory.id, voiceId);
    showToast(`${voice?.name || 'Narrator'} is narrating this story`);
    setCurrentScreen('NowPlaying');
  };

  const handleBack = () => {
    setCurrentScreen(isPicker && activeStory ? 'NowPlaying' : 'Home');
  };

  const handlePreviewVoice = (voice: Voice) => {
    if (!voice.audioUri) {
      Alert.alert('No recording', 'This voice does not have a recording.');
      return;
    }
    setPreviewUri(voice.audioUri);
  };

  const handlePlayPreview = () => {
    if (!previewUri) return;
    player.seekTo(0);
    player.play();
  };

  const handleStopPreview = () => {
    player.pause();
    player.seekTo(0);
  };

  const handleDeleteVoice = (voiceId: string) => {
    const voice = voices.find((item) => item.id === voiceId);
    Alert.alert('Delete voice', `Remove ${voice?.name ?? 'this voice'}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (previewUri && voice?.audioUri === previewUri) setPreviewUri(null);
          void deleteVoice(voiceId);
        },
      },
    ]);
  };

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
        <Text style={styles.headerTitle}>{isPicker ? 'Choose narrator' : 'Family Voices'}</Text>
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
            setPreviewUri={(uri: string | null) => {
              if (!uri) handleStopPreview();
              setPreviewUri(uri);
            }}
            handlePlayPreview={handlePlayPreview}
            handleStopPreview={handleStopPreview}
          />

        {isPicker && (
          <Pressable
            style={styles.voiceCard}
            onPress={() => {
              if (!narratorPickerStoryId) return;
              changeNarrator(narratorPickerStoryId, '');
              showToast('Using system voice');
              setCurrentScreen('NowPlaying');
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
        )}

        {(isPicker ? voices.filter((voice) => Boolean(voice.audioUri)) : voices).map((voice) => (
          <VoiceCard
            key={voice.id}
            voice={voice}
            isSelected={voice.id === selectedVoiceId}
            onSetDefault={handleSetDefault}
            onUseForStory={handleUseForStory}
            onPreviewVoice={handlePreviewVoice}
            onDeleteVoice={handleDeleteVoice}
          />
        ))}

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
  content: { paddingHorizontal: 19, paddingTop: 28, paddingBottom: 28 },
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
