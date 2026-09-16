import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../Context/AppContext';
import { Header } from '../components/Common/header';
import { theme } from '../Theme/Index';
import { SafeAreaView } from 'react-native-safe-area-context';

interface NarratorCardProps {
  avatar: string;
  name: string;
  languages: string;
}

export const NarratorCard: React.FC<NarratorCardProps> = ({ avatar, name, languages }) => (
  <View style={styles.narratorCard}>
    <View style={styles.narratorAvatarCircle}>
      <Text style={styles.avatar}>{avatar}</Text>
    </View>
    <View style={styles.narratorDetails}>
      <Text style={styles.narratorName}>{name}</Text>
      <Text style={styles.languages}>{languages}</Text>
    </View>
    <View style={styles.selectedIndicator} accessibilityLabel={`${name} selected`}>
      <Text style={styles.check}>✓</Text>
    </View>
  </View>
);

export const NowPlayingScreen: React.FC = () => {
  const {
    activeStory,
    isPlaying,
    isPreparingAudio,
    currentTime,
    togglePlayPause,
    seekTo,
    skipTime,
    playNextStory,
    playPreviousStory,
    toggleFavorite,
    voices,
    duration: trackDuration,
    setCurrentScreen,
    openNarratorPicker,
  } = useApp();
  const [barWidth, setBarWidth] = useState(1);

  if (!activeStory) return null;

  const narrator = voices.find((v) => v.id === activeStory.narratorId);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };
  const duration = Math.max(1, trackDuration || activeStory.duration || 1);
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <SafeAreaView style={styles.container}>
      <Header
        showBack
        onBack={() => setCurrentScreen('Home')}
        title=" Now Playing"
        rightElement={
          <TouchableOpacity onPress={() => toggleFavorite(activeStory.id)}>
            <Text style={styles.heart}>{activeStory.isFavorite ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Main Player Box */}
        <View style={styles.playerCard}>
          <LinearGradient colors={theme.gradients.playerArt} style={styles.artBox}>
            <Text style={styles.artEmoji}>{activeStory.artwork}</Text>
          </LinearGradient>

          <Text style={styles.title}>{activeStory.title}</Text>
          <Text style={styles.subtitle}>
            {activeStory.category} • {duration < 60 ? `${duration}s` : `${Math.round(duration / 60)} min`}
          </Text>

          {/* Slider Bar */}
          <TouchableOpacity
            style={styles.sliderBg}
            activeOpacity={1}
            onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
            onPress={(e) => {
              if (barWidth <= 0) return;
              seekTo((e.nativeEvent.locationX / barWidth) * duration);
            }}
          >
            <View style={[styles.sliderFill, { width: `${Math.min(100, Math.max(0, progressPct))}%` }]} />
          </TouchableOpacity>

          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>

          <View style={styles.controlsRow}>
            <TouchableOpacity onPress={playPreviousStory} accessibilityLabel="Previous story">
              <Text style={styles.ctrlIcon}>⏮</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => skipTime(-10)}>
              <Text style={styles.ctrlIcon}>⏪</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mainPlayBtn} onPress={togglePlayPause} disabled={isPreparingAudio}>
              <Text style={styles.mainPlayIcon}>{isPreparingAudio ? '…' : isPlaying ? '⏸' : '▶'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => skipTime(10)}>
              <Text style={styles.ctrlIcon}>⏩</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={playNextStory} accessibilityLabel="Next story">
              <Text style={styles.ctrlIcon}>⏭</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Narrator Section */}
        <View style={styles.narratorSection}>
          <Text style={styles.narratorHeader}>Narrated by</Text>
          <NarratorCard
            avatar={narrator?.avatar || '👤'}
            name={narrator?.name || 'System Voice'}
            languages={(narrator?.languages || []).join(' · ') || 'Device speech'}
          />
          <TouchableOpacity
            style={styles.changeNarratorButton}
            onPress={() => openNarratorPicker(activeStory.id)}
            accessibilityRole="button"
            accessibilityLabel="Change narrator">
            <Text style={styles.changeNarratorText}> Change narrator</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default NowPlayingScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md },
  heart: { fontSize: 22 },
  playerCard: {
    backgroundColor: theme.colors.playerBg,
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.lg,
    alignItems: 'center',
    overflow: 'hidden',
  },
  artBox: {
    width: 180,
    height: 180,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  artEmoji: { fontSize: 80 },
  title: { ...theme.typography.hero, fontSize: 24, lineHeight: 30, color: '#FFFFFF', textAlign: 'center' },
  subtitle: { ...theme.typography.body, color: '#A0AEC0', marginTop: 4, marginBottom: theme.spacing.md },
  sliderBg: { width: '100%', height: 6, backgroundColor: '#32324D', borderRadius: 3, overflow: 'hidden' },
  sliderFill: { height: '100%', backgroundColor: theme.colors.primary },
  timeRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  timeText: { ...theme.typography.caption, color: '#A0AEC0' },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '80%' },
  ctrlIcon: { fontSize: 22, color: '#FFFFFF' },
  mainPlayBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainPlayIcon: { color: '#FFFFFF', fontSize: 24 },
  narratorSection: { marginTop: theme.spacing.lg },
  narratorHeader: { ...theme.typography.section, color: theme.colors.textDark, marginBottom: theme.spacing.sm },
  narratorCard: {
    backgroundColor: theme.colors.cardBg,
    borderColor: theme.colors.borderLight,
    borderRadius: 20,
    borderWidth: 1,
    height: 90,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  narratorAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F1E9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  avatar: { fontSize: 27 },
  narratorDetails: { flex: 1 },
  narratorName: { ...theme.typography.cardTitle, color: theme.colors.textDark },
  languages: { ...theme.typography.body, color: '#746C88', marginTop: 4 },
  selectedIndicator: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#36B37E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  changeNarratorButton: {
    height: 50,
    marginTop: 12,
    borderColor: theme.colors.borderLight,
    borderRadius: 15,
    borderWidth: 1,
    backgroundColor: theme.colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeNarratorText: { ...theme.typography.section, color: theme.colors.textDark },
});
