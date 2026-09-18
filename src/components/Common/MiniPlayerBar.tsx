import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useApp } from '../../Context/AppContext';
import { theme, ThemeColors } from '../../Theme/Index';
import { useThemedStyles } from '../../Theme/ThemeProvider';

export const MiniPlayerBar: React.FC = () => {
  const {
    activeStory,
    isPlaying,
    isPreparingAudio,
    currentTime,
    duration: trackDuration,
    seekTo,
    togglePlayPause,
    setCurrentScreen,
  } = useApp();
  const styles = useThemedStyles(makeStyles);
  const [barWidth, setBarWidth] = useState(1);

  if (!activeStory) return null;

  const duration = Math.max(1, trackDuration || activeStory.duration || 1);
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View style={styles.bar}>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.info}
          onPress={() => setCurrentScreen('NowPlaying')}
          accessibilityRole="button"
          accessibilityLabel={`Open ${activeStory.title}`}>
          <Text style={styles.art}>{activeStory.artwork}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {activeStory.title}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.playBtn}
          onPress={togglePlayPause}
          disabled={isPreparingAudio}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}>
          <Text style={styles.playIcon}>{isPreparingAudio ? '…' : isPlaying ? '⏸' : '▶'}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.sliderBg}
        activeOpacity={1}
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
        onPress={(event) => {
          if (barWidth <= 0) return;
          seekTo((event.nativeEvent.locationX / barWidth) * duration);
        }}
        accessibilityRole="adjustable"
        accessibilityLabel="Playback progress">
        <View style={[styles.sliderFill, { width: `${Math.min(100, Math.max(0, progressPct))}%` }]} />
      </TouchableOpacity>
    </View>
  );
};

const makeStyles = (colors: ThemeColors) => ({
  bar: {
    backgroundColor: colors.playerBg,
    borderTopWidth: 1,
    borderTopColor: colors.sliderTrack,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  info: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginRight: 8,
  },
  art: { fontSize: 22, marginRight: 10 },
  title: { ...theme.typography.cardTitle, color: colors.playerText, flex: 1 },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  playIcon: { color: colors.onPrimary, fontSize: 16 },
  sliderBg: {
    width: '100%' as const,
    height: 3,
    backgroundColor: colors.sliderTrack,
    overflow: 'hidden' as const,
  },
  sliderFill: { height: '100%' as const, backgroundColor: colors.primary },
});
