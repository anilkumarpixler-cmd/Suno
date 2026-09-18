import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '@/Context/AppContext';
import { Header } from '@/components/Common/header';
import { borderRadius, spacing, theme, ThemeColors } from '@/Theme/Index';
import { useAppTheme, useThemedStyles } from '@/Theme/ThemeProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PLAYBACK_SPEEDS } from '@/hooks/useStoryPlayer';

interface NarratorCardProps {
  avatar: string;
  name: string;
  languages: string;
}

export const NarratorCard: React.FC<NarratorCardProps> = ({ avatar, name, languages }) => {
  const styles = useThemedStyles(makeStyles);
  return (
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
};

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
    playbackSpeed,
    setPlaybackSpeed,
  } = useApp();
  const { gradients } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const [barWidth, setBarWidth] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);

  if (!activeStory) return null;

  const narrator = voices.find((v) => v.id === activeStory.narratorId);
  const speedLabel = `${playbackSpeed}x`;

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
          <TouchableOpacity
            style={styles.speedIconBtn}
            onPress={() => setSpeedOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel={`Playback speed ${speedLabel}`}>
            <Text style={styles.speedIconMark}>⏱</Text>
            <Text style={styles.speedIconLabel}>{speedLabel}</Text>
          </TouchableOpacity>

          {speedOpen ? (
            <View style={styles.speedMenu}>
              {PLAYBACK_SPEEDS.map((speed) => {
                const selected = playbackSpeed === speed;
                return (
                  <TouchableOpacity
                    key={speed}
                    style={[styles.speedOption, selected && styles.speedOptionSelected]}
                    onPress={() => {
                      setPlaybackSpeed(speed);
                      setSpeedOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${speed}x`}>
                    <Text style={[styles.speedOptionText, selected && styles.speedOptionTextSelected]}>
                      {speed}x
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          <LinearGradient colors={gradients.playerArt} style={styles.artBox}>
            <Text style={styles.artEmoji}>{activeStory.artwork}</Text>
          </LinearGradient>

          <Text style={styles.title}>{activeStory.title}</Text>
          <Text style={styles.subtitle}>
            {isPreparingAudio
              ? `Cloning ${narrator?.name || 'narrator'}…`
              : narrator
                ? `${activeStory.category} • ${narrator.name}`
                : `${activeStory.category} • System Voice`}
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
            languages={
              isPreparingAudio
                ? 'Cloning voice'
                : narrator
                  ? (narrator.languages || []).join(' · ') || 'Cloned voice'
                  : 'Device speech'
            }
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

const makeStyles = (colors: ThemeColors) => ({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  heart: { fontSize: 22 },
  playerCard: {
    backgroundColor: colors.playerBg,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    paddingTop: 48,
    alignItems: 'center' as const,
    overflow: 'hidden' as const,
    position: 'relative' as const,
  },
  artBox: {
    width: 180,
    height: 180,
    borderRadius: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: spacing.md,
  },
  artEmoji: { fontSize: 80 },
  title: { ...theme.typography.hero, fontSize: 24, lineHeight: 30, color: colors.playerText, textAlign: 'center' as const },
  subtitle: { ...theme.typography.body, color: colors.playerMuted, marginTop: 4, marginBottom: spacing.md },
  sliderBg: { width: '100%' as const, height: 6, backgroundColor: colors.sliderTrack, borderRadius: 3, overflow: 'hidden' as const },
  sliderFill: { height: '100%' as const, backgroundColor: colors.primary },
  timeRow: {
    width: '100%' as const,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  timeText: { ...theme.typography.caption, color: colors.playerMuted },
  controlsRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, width: '80%' as const },
  ctrlIcon: { fontSize: 22, color: colors.playerText },
  mainPlayBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  mainPlayIcon: { color: colors.onPrimary, fontSize: 24 },
  speedIconBtn: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    zIndex: 3,
    minWidth: 64,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4A4A68',
    backgroundColor: '#2A2A44',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 4,
  },
  speedIconMark: { fontSize: 13, color: colors.playerText },
  speedIconLabel: { ...theme.typography.caption, color: colors.playerText, fontWeight: '700' as const },
  speedMenu: {
    position: 'absolute' as const,
    top: 48,
    right: 12,
    zIndex: 4,
    width: 72,
    padding: 6,
    borderRadius: 14,
    backgroundColor: '#2A2A44',
    borderWidth: 1,
    borderColor: '#4A4A68',
    gap: 4,
  },
  speedOption: {
    height: 30,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  speedOptionSelected: {
    backgroundColor: colors.primary,
  },
  speedOptionText: { ...theme.typography.caption, color: colors.playerMuted, fontWeight: '700' as const },
  speedOptionTextSelected: { color: colors.onPrimary },
  narratorSection: { marginTop: spacing.lg },
  narratorHeader: { ...theme.typography.section, color: colors.textDark, marginBottom: spacing.sm },
  narratorCard: {
    backgroundColor: colors.cardBg,
    borderColor: colors.borderLight,
    borderRadius: 20,
    borderWidth: 1,
    height: 90,
    padding: spacing.md,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  narratorAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.purpleLightBg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: spacing.sm,
  },
  avatar: { fontSize: 27 },
  narratorDetails: { flex: 1 },
  narratorName: { ...theme.typography.cardTitle, color: colors.textDark },
  languages: { ...theme.typography.body, color: colors.textMuted, marginTop: 4 },
  selectedIndicator: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.success,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  check: { color: colors.onPrimary, fontSize: 16, fontWeight: '800' as const },
  changeNarratorButton: {
    height: 50,
    marginTop: 12,
    borderColor: colors.borderLight,
    borderRadius: 15,
    borderWidth: 1,
    backgroundColor: colors.cardBg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  changeNarratorText: { ...theme.typography.section, color: colors.textDark },
});
