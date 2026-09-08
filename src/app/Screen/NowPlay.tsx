import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../Context/AppContext';
import { Header } from '../components/Common/header';
import { theme } from '../Theme/Index';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    changeNarrator,
    setCurrentScreen,
  } = useApp();

  const [showNarratorPicker, setShowNarratorPicker] = useState(false);

  if (!activeStory) return null;

  const narrator = voices.find((v) => v.id === activeStory.narratorId) || voices[0];

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
        title="Now Playing"
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

          {/* Controls */}
          <View style={styles.controlsRow}>
            <TouchableOpacity onPress={() => seekTo(0)}>
              <Text style={styles.ctrlIcon}>⏮</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => skipTime(-10)}>
              <Text style={styles.ctrlIcon}>⏪</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mainPlayBtn} onPress={togglePlayPause}>
              <Text style={styles.mainPlayIcon}>{isPlaying ? '⏸' : '▶'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => skipTime(10)}>
              <Text style={styles.ctrlIcon}>⏩</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => seekTo(activeStory.duration)}>
              <Text style={styles.ctrlIcon}>⏭</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Narrator Section */}
        <View style={styles.narratorSection}>
          <Text style={styles.narratorHeader}>Narrated by</Text>
          <View style={styles.narratorCard}>
            <Text style={styles.avatar}>{narrator.avatar}</Text>
            <View style={styles.narratorDetails}>
              <View style={styles.nameRow}>
                <Text style={styles.narratorName}>{narrator.name}</Text>
                <Text style={styles.check}> M</Text>
              </View>
              <Text style={styles.languages}>{narrator.languages.join(' • ')}</Text>
            </View>
            <TouchableOpacity
              style={styles.changeBtn}
              onPress={() => setShowNarratorPicker(!showNarratorPicker)}
            >
              <Text style={styles.changeBtnText}>Change</Text>
            </TouchableOpacity>
          </View>

          {/* Dropdown / Inline Selector */}
          {showNarratorPicker && (
            <View style={styles.pickerBox}>
              {voices.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={styles.pickerOption}
                  onPress={() => {
                    changeNarrator(activeStory.id, v.id);
                    setShowNarratorPicker(false);
                  }}
                >
                  <Text style={styles.pickerText}>{v.avatar} {v.name}</Text>
                  {v.id === narrator.id && <Text style={styles.selectedCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

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
  narratorHeader: { fontSize: 14, fontWeight: '700', color: theme.colors.textMuted, marginBottom: theme.spacing.xs },
  narratorCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: { fontSize: 32, marginRight: theme.spacing.sm },
  narratorDetails: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  narratorName: { fontSize: 16, fontWeight: '700', color: theme.colors.textDark },
  check: { color: theme.colors.success, fontWeight: 'bold' },
  languages: { fontSize: 12, color: theme.colors.textMuted },
  changeBtn: { backgroundColor: '#F0EEFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  changeBtnText: { color: theme.colors.primary, fontWeight: '700', fontSize: 12 },
  pickerBox: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pickerText: { fontSize: 14, fontWeight: '600' },
  selectedCheck: { color: theme.colors.success, fontWeight: 'bold' },
});