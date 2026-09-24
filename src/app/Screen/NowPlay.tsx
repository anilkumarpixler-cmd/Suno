import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '@/Context/AppContext';
import { Header } from '@/components/Common/header';
import { showToast } from '@/components/Common/Toast';
import { spacing, theme, ThemeColors } from '@/Theme/Index';
import { useAppTheme, useThemedStyles } from '@/Theme/ThemeProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PLAYBACK_SPEEDS } from '@/hooks/useStoryPlayer';
import { NarratorCard } from '@/components/Common/NarratorCard';

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
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
    isRepeat,
    toggleRepeat,
  } = useApp();
  const { gradients, colors } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const barWidthRef = useRef(1);
  const durationRef = useRef(1);
  const seekToRef = useRef(seekTo);
  seekToRef.current = seekTo;

  const duration = Math.max(1, trackDuration || activeStory?.duration || 1);
  durationRef.current = duration;

  const scrubberPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const width = barWidthRef.current;
          if (width <= 0) return;
          seekToRef.current(
            Math.max(0, Math.min(1, event.nativeEvent.locationX / width)) * durationRef.current,
          );
        },
        onPanResponderMove: (event) => {
          const width = barWidthRef.current;
          if (width <= 0) return;
          seekToRef.current(
            Math.max(0, Math.min(1, event.nativeEvent.locationX / width)) * durationRef.current,
          );
        },
      }),
    [],
  );

  if (!activeStory) return null;

  const narrator = voices.find((v) => v.id === activeStory.narratorId);
  const speedLabel = `${playbackSpeed}x`;
  const progressPct = Math.min(100, Math.max(0, (currentTime / duration) * 100));

  const onSliderLayout = (event: LayoutChangeEvent) => {
    barWidthRef.current = event.nativeEvent.layout.width;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        showBack
        onBack={() => setCurrentScreen('Home')}
        title="Now Playing"
        rightElement={
          <View style={styles.menuWrap}>
            <TouchableOpacity
              style={styles.moreBtn}
              onPress={() => setMenuOpen((open) => !open)}
              accessibilityRole="button"
              accessibilityLabel="More options"
              accessibilityState={{ expanded: menuOpen }}>
              <MaterialIcons name="more-vert" size={24} color={colors.textDark} />
            </TouchableOpacity>
            {menuOpen ? (
              <View style={styles.menu}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuOpen(false);
                    setCurrentScreen('Favorites');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Favorites">
                  <MaterialIcons name="favorite" size={18} color={colors.primary} />
                  <Text style={styles.menuItemText}>Favorites</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => setMenuOpen(false)}>
        <View style={styles.playerCard}>
          <TouchableOpacity
            style={styles.heartBtn}
            onPress={() => {
              const nextFavorite = !activeStory.isFavorite;
              toggleFavorite(activeStory.id);
              showToast(nextFavorite ? 'Added to favorites' : 'Removed from favorites');
            }}
            accessibilityRole="button"
            accessibilityLabel={
              activeStory.isFavorite ? 'Remove from favorites' : 'Add to favorites'
            }>
            <MaterialIcons
              name={activeStory.isFavorite ? 'favorite' : 'favorite-border'}
              size={24}
              color={activeStory.isFavorite ? '#FF4D6D' : colors.playerText}
            />
          </TouchableOpacity>

          <LinearGradient colors={gradients.playerArt} style={styles.artBox}>
            <Text style={styles.artEmoji}>{activeStory.artwork}</Text>
          </LinearGradient>

          <Text style={styles.title} numberOfLines={2}>
            {activeStory.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {isPreparingAudio
              ? `Cloning ${narrator?.name || 'narrator'}…`
              : narrator
                ? `${activeStory.category} · ${narrator.name}`
                : `${activeStory.category} · System Voice`}
          </Text>

          <View
            style={styles.sliderHit}
            onLayout={onSliderLayout}
            {...scrubberPan.panHandlers}>
            <View style={styles.sliderBg}>
              <View style={[styles.sliderFill, { width: `${progressPct}%` }]} />
              <View style={[styles.sliderThumb, { left: `${progressPct}%` }]} />
            </View>
          </View>

          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>

          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={styles.ctrlBtn}
              onPress={toggleRepeat}
              accessibilityRole="button"
              accessibilityState={{ selected: isRepeat }}
              accessibilityLabel={isRepeat ? 'Repeat on' : 'Repeat off'}>
              <MaterialIcons
                name={isRepeat ? 'repeat-one' : 'repeat'}
                size={26}
                color={isRepeat ? colors.primary : colors.playerMuted}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctrlBtn}
              onPress={playPreviousStory}
              accessibilityLabel="Previous story">
              <Text style={styles.ctrlIcon}>⏮</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctrlBtn}
              onPress={() => skipTime(-10)}
              accessibilityLabel="Rewind 10 seconds">
              <MaterialIcons name="replay-10" size={28} color={colors.playerText} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mainPlayBtn, isPreparingAudio && styles.mainPlayBtnDisabled]}
              onPress={togglePlayPause}
              disabled={isPreparingAudio}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}>
              {isPreparingAudio ? (
                <MaterialIcons name="more-horiz" size={32} color={colors.onPrimary} />
              ) : (
                <MaterialIcons
                  name={isPlaying ? 'pause' : 'play-arrow'}
                  size={36}
                  color={colors.onPrimary}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctrlBtn}
              onPress={() => skipTime(10)}
              accessibilityLabel="Forward 10 seconds">
              <MaterialIcons name="forward-10" size={28} color={colors.playerText} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctrlBtn}
              onPress={playNextStory}
              accessibilityLabel="Next story">
              <Text style={styles.ctrlIcon}>⏭</Text>
            </TouchableOpacity>
            <View style={styles.speedWrap}>
              <TouchableOpacity
                style={styles.ctrlBtn}
                onPress={() => setSpeedOpen((open) => !open)}
                accessibilityRole="button"
                accessibilityLabel={`Playback speed ${speedLabel}`}>
                <MaterialIcons name="speed" size={26} color={colors.playerText} />
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
                        <Text
                          style={[
                            styles.speedOptionText,
                            selected && styles.speedOptionTextSelected,
                          ]}>
                          {speed}x
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </View>
          </View>
        </View>

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
            <Text style={styles.changeNarratorText}>Change narrator</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default NowPlayingScreen;

const makeStyles = (colors: ThemeColors) => ({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  menuWrap: {
    position: 'relative' as const,
    zIndex: 20,
  },
  moreBtn: {
    width: 40,
    height: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  menu: {
    position: 'absolute' as const,
    top: 44,
    right: 0,
    minWidth: 150,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    zIndex: 30,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuItemText: { ...theme.typography.body, color: colors.textDark, fontWeight: '600' as const },
  playerCard: {
    backgroundColor: colors.playerBg,
    borderRadius: 28,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: 'center' as const,
    overflow: 'visible' as const,
    position: 'relative' as const,
  },
  heartBtn: {
    position: 'absolute' as const,
    top: spacing.sm,
    right: spacing.sm,
    width: 40,
    height: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    zIndex: 2,
  },
  artBox: {
    width: 220,
    height: 220,
    borderRadius: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: spacing.lg,
  },
  artEmoji: { fontSize: 96 },

  title: {
    ...theme.typography.hero,
    fontSize: 26,
    lineHeight: 32,
    color: colors.playerText,
    textAlign: 'center' as const,
    paddingHorizontal: spacing.sm,
  },
  subtitle: {
    ...theme.typography.body,
    color: colors.playerMuted,
    marginTop: 6,
    marginBottom: spacing.lg,
    textAlign: 'center' as const,
  },
  sliderHit: {
    width: '100%' as const,
    height: 28,
    justifyContent: 'center' as const,
  },
  sliderBg: {
    width: '100%' as const,
    height: 8,
    backgroundColor: colors.sliderTrack,
    borderRadius: 4,
    overflow: 'visible' as const,
    justifyContent: 'center' as const,
  },
  sliderFill: {
    height: '100%' as const,
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  sliderThumb: {
    position: 'absolute' as const,
    width: 16,
    height: 16,
    marginLeft: -8,
    borderRadius: 8,
    backgroundColor: colors.onPrimary,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  timeRow: {
    width: '100%' as const,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: spacing.md,
  },
  timeText: { ...theme.typography.caption, color: colors.playerMuted, fontWeight: '600' as const },
  controlsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    width: '100%' as const,
    paddingHorizontal: spacing.xs,
  },
  ctrlBtn: {
    width: 44,
    height: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  ctrlIcon: { fontSize: 22, color: colors.playerText },
  mainPlayBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  mainPlayBtnDisabled: { opacity: 0.6 },
  speedWrap: {
    position: 'relative' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  speedMenu: {
    position: 'absolute' as const,
    bottom: 48,
    right: -4,
    zIndex: 4,
    width: 64,
    padding: 6,
    borderRadius: 14,
    backgroundColor: colors.playerBg,
    borderWidth: 1,
    borderColor: colors.sliderTrack,
    gap: 4,
  },
  speedOption: {
    height: 34,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  speedOptionSelected: { backgroundColor: colors.primary },
  speedOptionText: {
    ...theme.typography.caption,
    fontSize: 13,
    color: colors.playerMuted,
    fontWeight: '700' as const,
  },
  speedOptionTextSelected: { color: colors.onPrimary },
  narratorSection: { marginTop: spacing.lg },
  narratorHeader: {
    ...theme.typography.section,
    color: colors.textDark,
    marginBottom: spacing.sm,
  },
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
