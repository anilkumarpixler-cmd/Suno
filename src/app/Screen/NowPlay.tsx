import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '../components/Common/Text';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../Context/AppContext';
import { Header } from '../components/Common/header';
import { theme } from '../Theme/Index';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AudioPlayer } from '../components/Common/AudioPlayer';

interface NarratorCardProps {
  avatar: string;
}

export const NarratorCard: React.FC<NarratorCardProps> = ({ avatar }) => (
  <View style={styles.narratorCard}>
    <View style={styles.narratorAvatarCircle}>
      <Text style={styles.avatar}>{avatar}</Text>
    </View>
    <View style={styles.narratorDetails}>
      <Text style={styles.narratorName}>Mummy</Text>
      <Text style={styles.languages}>Hindi · My voice</Text>
    </View>
    <View style={styles.selectedIndicator} accessibilityLabel="Mummy selected">
      <Text style={styles.check}>✓</Text>
    </View>
  </View>
);

export const NowPlayingScreen: React.FC = () => {
  const {
    activeStory,
    isPlaying,
    currentTime,
    togglePlayPause,
    seekTo,
    skipTime,
    toggleFavorite,
    voices,
    setCurrentScreen,
  } = useApp();

  if (!activeStory) return null;

  const narrator = voices.find((v) => v.name === 'Mummy') || voices[0];

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPct = (currentTime / activeStory.duration) * 100;

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
          <Text style={styles.subtitle}>{activeStory.category} • {Math.floor(activeStory.duration / 60)} min</Text>

          {/* Slider Bar */}
          <TouchableOpacity
            style={styles.sliderBg}
            activeOpacity={1}
            onPress={(e) => {
              const clickX = e.nativeEvent.locationX;
              const newPct = clickX / 280; // approximate width
              seekTo(newPct * activeStory.duration);
            }}
          >
            <View style={[styles.sliderFill, { width: `${progressPct}%` }]} />
          </TouchableOpacity>

          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <Text style={styles.timeText}>{formatTime(activeStory.duration)}</Text>
          </View>

          <AudioPlayer
            source={activeStory.audioUri ?? null}
            isPlaying={isPlaying}
            onTogglePlay={togglePlayPause}
            onSeek={seekTo}
            onSkip={skipTime}
            onRestart={() => seekTo(0)}
            onEnd={() => seekTo(activeStory.duration)}
          />
        </View>

        {/* Narrator Section */}
        <View style={styles.narratorSection}>
          <Text style={styles.narratorHeader}>Narrated by</Text>
          <NarratorCard avatar={narrator?.avatar || '👩🏽'} />
          <TouchableOpacity
            style={styles.changeNarratorButton}
            onPress={() => setCurrentScreen('Voices')}
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
  title: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#A0AEC0', marginTop: 4, marginBottom: theme.spacing.md },
  sliderBg: { width: '100%', height: 6, backgroundColor: '#32324D', borderRadius: 3, overflow: 'hidden' },
  sliderFill: { height: '100%', backgroundColor: theme.colors.primary },
  timeRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  timeText: { fontSize: 12, color: '#A0AEC0' },
  narratorSection: { marginTop: theme.spacing.lg },
  narratorHeader: { fontSize: 19, fontWeight: '800', color: theme.colors.textDark, marginBottom: theme.spacing.sm },
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
  narratorName: { fontSize: 16, fontWeight: '700', color: theme.colors.textDark },
  languages: { fontSize: 13, color: '#746C88', marginTop: 4 },
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
  changeNarratorText: { color: theme.colors.textDark, fontSize: 16, fontWeight: '700' },
});