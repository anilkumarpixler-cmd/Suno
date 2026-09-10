import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../Context/AppContext';
import { theme } from '../Theme/Index';
import { showToast } from '../components/Common/Toast';

type Voice = {
  id: string;
  name: string;
  language: string;
  status: string;
  avatar: string;
  isDefault: boolean;
};

interface VoiceCardProps {
  voice: Voice;
  onSetDefault: (voiceId: string) => void;
  onPreviewVoice: (voice: Voice) => void;
  onVoiceSettings: (voice: Voice) => void;
}

const VoiceCard: React.FC<VoiceCardProps> = ({
  voice,
  onSetDefault,
  onPreviewVoice,
  onVoiceSettings,
}) => (
  <View style={styles.voiceCard}>
    <View style={styles.voiceTopRow}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarEmoji}>{voice.avatar}</Text>
      </View>
      <View style={styles.voiceDetails}>
        <Text style={styles.voiceName}>{voice.name}</Text>
        <Text style={styles.metaText}>
          {voice.language} · {voice.isDefault ? 'Default' : voice.status}
        </Text>
      </View>
      {voice.isDefault && (
        <View style={styles.defaultStatus} accessibilityLabel="Current default voice">
          <Text style={styles.checkMark}>✓</Text>
        </View>
      )}
    </View>

    {voice.isDefault ? (
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
          onPress={() => onVoiceSettings(voice)}
          accessibilityRole="button"
          accessibilityLabel={`${voice.name} settings`}>
          <Text style={styles.settingsIcon}>⚙</Text>
        </Pressable>
      </View>
    ) : (
      <Pressable
        style={styles.defaultButton}
        onPress={() => onSetDefault(voice.id)}
        accessibilityRole="button">
        <Text style={styles.defaultButtonText}> Set as default</Text>
      </Pressable>
    )}
  </View>
);

const toVoiceViewModel = (voice: {
  id: string;
  name: string;
  languages: string[];
  status: string;
  avatar: string;
  isDefault: boolean;
}): Voice => ({
  id: voice.id,
  name: voice.name,
  language: voice.languages.join(' & '),
  status: voice.name === 'Papa' ? '98% ready' : voice.status,
  avatar: voice.name === 'Mummy' ? '👩' : voice.name === 'Papa' ? '👨' : voice.name === 'Nani' ? '👵' : voice.avatar,
  isDefault: voice.isDefault,
});

export const FamilyVoicesScreen: React.FC = () => {
  const { voices, setDefaultVoice, setCurrentScreen } = useApp();
  const voiceCards = voices.map(toVoiceViewModel);

  const handleSetDefault = (voiceId: string) => {
    const voice = voices.find((item) => item.id === voiceId);
    if (!voice || voice.isDefault) return;

    setDefaultVoice(voiceId);
  showToast(`${voice.name} is now your default narrator`);
  };

  const handlePreviewVoice = (voice: Voice) => {
    console.log(`Previewing ${voice.name}`);
  };

  const handleVoiceSettings = (voice: Voice) => {
    console.log(`Opening settings for ${voice.name}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => setCurrentScreen('Home')}
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

        {voiceCards.map((voice) => (
          <VoiceCard
            key={voice.id}
            voice={voice}
            onSetDefault={handleSetDefault}
            onPreviewVoice={handlePreviewVoice}
            onVoiceSettings={handleVoiceSettings}
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
    fontSize: 18,
    fontWeight: '700',
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
    fontSize: 27,
    lineHeight: 31,
    fontWeight: '800',
    marginBottom: 11,
  },
  heroDescription: { color: theme.colors.textMuted, fontSize: 16, lineHeight: 23 },
  sectionTitle: {
    color: theme.colors.textDark,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700',
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
  voiceName: { color: theme.colors.textDark, fontSize: 16, fontWeight: '700' },
  metaText: { color: '#747899', fontSize: 13, marginTop: 4 },
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
  settingsIcon: { color: theme.colors.textDark, fontSize: 21 },
  actionText: { color: theme.colors.textDark, fontSize: 14, fontWeight: '700' },
  defaultButton: {
    minHeight: 51,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  defaultButtonText: { color: theme.colors.textDark, fontSize: 14, fontWeight: '700' },
  addVoiceButton: {
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  addVoiceButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
