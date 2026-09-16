import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../Context/AppContext';
import { theme } from '../Theme/Index';
import { showToast } from '../components/Common/Toast';
import { Voice } from '../Types';
import { useAudioPlayer } from 'expo-audio';
import { PreviewModal } from '../modal/previewModal';

interface VoiceCardProps {
  voice: Voice;
  isSelected: boolean;
  onSetDefault: (voiceId: string) => void;
  onPreviewVoice: (voice: Voice) => void;
  onDeleteVoice: (voiceId: string) => void;
}

const VoiceCard: React.FC<VoiceCardProps> = ({
  voice,
  isSelected,
  onSetDefault,
  onPreviewVoice,
  onDeleteVoice,
}) => (
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
        <Text>Delete</Text>
      </Pressable>
    </View>
  </View>
);

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
          colors={theme.gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}>
          <Text style={styles.heroTitle}>{'Your family, in every\nstory.'}</Text>
          <Text style={styles.heroDescription}>
            {'Record voices once and use them to\nnarrate stories whenever you want.'}
          </Text>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Your voices</Text>

        
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

        {voices.map((voice) => (
          <VoiceCard
            key={voice.id}
            voice={voice}
            isSelected={voice.id === selectedVoiceId}
            onSetDefault={handleSetDefault}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    height: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 1,
  },
  backIcon: {
    color: theme.colors.textDark,
    fontSize: 34,
    fontWeight: '300',
    lineHeight: 36,
  },
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: theme.colors.textDark,
    ...theme.typography.cardTitle,
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    zIndex: 1,
  },
  addIcon: {
    color: theme.colors.textDark,
    fontSize: 27,
    fontWeight: '400',
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
    color: theme.colors.textDark,
    ...theme.typography.hero,
    marginBottom: 11,
  },
  heroDescription: { ...theme.typography.body, color: theme.colors.textMuted },
  sectionTitle: {
    color: theme.colors.textDark,
    ...theme.typography.section,
    marginTop: 30,
    marginBottom: 14,
    marginLeft: 13,
  },
  voiceCard: {
    backgroundColor: theme.colors.cardBg,
    borderColor: '#E8DED8',
    borderRadius: 21,
    borderWidth: 1,
    padding: 18,
    marginBottom: 13,
  },
  voiceTopRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center' },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.purpleLightBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarEmoji: { fontSize: 28 },
  voiceDetails: { flex: 1 },
  voiceName: { ...theme.typography.cardTitle, color: theme.colors.textDark },
  metaText: { ...theme.typography.body, color: '#747899', marginTop: 4 },
  defaultStatus: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: 18 },
  actionButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  playIcon: { color: theme.colors.textDark, fontSize: 13 },
  actionText: { ...theme.typography.section, color: theme.colors.textDark },
  addVoiceButton: {
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  addVoiceButtonText: { ...theme.typography.section, color: '#FFFFFF' },
});
