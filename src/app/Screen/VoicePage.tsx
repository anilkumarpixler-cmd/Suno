import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/app-text';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../Context/AppContext';
import { theme } from '../Theme/Index';
import { SafeAreaView } from 'react-native-safe-area-context';

export const VoicesScreen: React.FC = () => {
  const { voices, setDefaultVoice, setCurrentScreen } = useApp();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pageHeader}>
        <TouchableOpacity
          accessibilityLabel="Go back"
          accessibilityRole="button"
          style={styles.backBtn}
          onPress={() => setCurrentScreen('Home')}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text variant="title" style={styles.pageTitle}>Family Voices</Text>
        <TouchableOpacity
          accessibilityLabel="Add a family voice"
          accessibilityRole="button"
          style={styles.addBtn}
          onPress={() => setCurrentScreen('AddVoice')}
        >
          <Text style={styles.addIcon}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient colors={theme.gradients.hero} style={styles.hero}>
          <Text style={styles.heroTitle}>Your family, in every story.</Text>
          <Text style={styles.heroSub}>
            Record voices once and use them to narrate stories whenever you want.
          </Text>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Your voices</Text>

        {voices.map((voice) => (
          <View key={voice.id} style={styles.voiceCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarEmoji}>{voice.avatar}</Text>
            </View>

            <View style={styles.details}>
              <Text style={styles.name}>{voice.name}</Text>
              <Text style={styles.meta}>
                {voice.languages.join(' & ')} • {voice.status}
              </Text>
            </View>

            {voice.isDefault ? (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultText}>Default ✓</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.setDefaultBtn}
                onPress={() => setDefaultVoice(voice.id)}
              >
                <Text style={styles.setDefaultText}>Set default</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        <TouchableOpacity
          accessibilityLabel="Create a family voice"
          accessibilityRole="button"
          style={styles.createVoiceButton}
          onPress={() => setCurrentScreen('AddVoice')}
        >
          <Text style={styles.createVoiceText}>+ Add Family Voice</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  pageHeader: {
    height: 60,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: theme.colors.textDark,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 1,
  },
  backIcon: {
    fontSize: 24,
    color: theme.colors.textDark,
    fontWeight: '600',
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  createVoiceButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.button,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  createVoiceText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  hero: {
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  heroTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.textDark },
  heroSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: theme.spacing.md },
  voiceCard: {
    backgroundColor: '#FFF',
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF0F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  avatarEmoji: { fontSize: 24 },
  details: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: theme.colors.textDark },
  meta: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  defaultBadge: { backgroundColor: '#E6FFFA', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  defaultText: { color: theme.colors.success, fontSize: 12, fontWeight: '700' },
  setDefaultBtn: { backgroundColor: '#F0EEFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  setDefaultText: { color: theme.colors.primary, fontSize: 12, fontWeight: '700' },
});