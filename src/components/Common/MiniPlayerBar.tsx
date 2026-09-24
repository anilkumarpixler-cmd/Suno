import React, { useMemo, useRef } from 'react';
import { LayoutChangeEvent, PanResponder, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '../../Context/AppContext';
import { theme, ThemeColors } from '../../Theme/Index';
import { useAppTheme, useThemedStyles } from '../../Theme/ThemeProvider';

export const MiniPlayerBar: React.FC = () => {
  const {
    activeStory,
    isPlaying,
    isPreparingAudio,
    currentTime,
    duration: trackDuration,
    seekTo,
    skipTime,
    playNextStory,
    playPreviousStory,
    togglePlayPause,
    setCurrentScreen,
    voices,
  } = useApp();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
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

  const progressPct = Math.min(100, Math.max(0, (currentTime / duration) * 100));
  const narrator = voices.find((voice) => voice.id === activeStory.narratorId);

  const onSliderLayout = (event: LayoutChangeEvent) => {
    barWidthRef.current = event.nativeEvent.layout.width;
  };

  return (
    <View style={styles.bar}>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.info}
          onPress={() => setCurrentScreen('NowPlaying')}
          accessibilityRole="button"
          accessibilityLabel={`Open ${activeStory.title}`}>
          <View style={styles.artBox}>
            <Text style={styles.art}>{activeStory.artwork}</Text>
          </View>
          <View style={styles.textCol}>
            <Text style={styles.title} numberOfLines={1}>
              {activeStory.title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {narrator?.name || 'System Voice'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.ctrlBtn}
            onPress={playPreviousStory}
            accessibilityLabel="Previous story">
            <MaterialIcons name="skip-previous" size={26} color={colors.playerText} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ctrlBtn}
            onPress={() => skipTime(-10)}
            accessibilityLabel="Rewind 10 seconds">
            <MaterialIcons name="replay-10" size={24} color={colors.playerText} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.playBtn, isPreparingAudio && styles.playBtnDisabled]}
            onPress={togglePlayPause}
            disabled={isPreparingAudio}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}>
            {isPreparingAudio ? (
              <MaterialIcons name="more-horiz" size={24} color={colors.onPrimary} />
            ) : (
              <MaterialIcons
                name={isPlaying ? 'pause' : 'play-arrow'}
                size={30}
                color={colors.onPrimary}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ctrlBtn}
            onPress={() => skipTime(10)}
            accessibilityLabel="Forward 10 seconds">
            <MaterialIcons name="forward-10" size={24} color={colors.playerText} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ctrlBtn}
            onPress={playNextStory}
            accessibilityLabel="Next story">
            <MaterialIcons name="skip-next" size={26} color={colors.playerText} />
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={styles.sliderHit}
        onLayout={onSliderLayout}
        {...scrubberPan.panHandlers}
        accessibilityRole="adjustable"
        accessibilityLabel="Playback progress">
        <View style={styles.sliderBg}>
          <View style={[styles.sliderFill, { width: `${progressPct}%` }]} />
        </View>
      </View>
    </View>
  );
};

const makeStyles = (colors: ThemeColors) => ({
  bar: {
    width: '100%' as const,
    backgroundColor: colors.playerBg,
    borderTopColor: colors.borderLight,
    overflow: 'hidden' as const,
  },
  sliderHit: {
    width: '100%' as const,
    height: 16,
    justifyContent: 'flex-end' as const,
  },
  sliderBg: {
    alignSelf: 'stretch' as const,
    width: '100%' as const,
    height: 3,
    backgroundColor: colors.sliderTrack,
  },
  sliderFill: {
    height: '100%' as const,
    backgroundColor: colors.primary,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  info: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginRight: 8,
    minWidth: 0,
  },
  artBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.sliderTrack,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 10,
  },
  art: { fontSize: 22 },
  textCol: { flex: 1, minWidth: 0 },
  title: { ...theme.typography.cardTitle, fontSize: 15, lineHeight: 20, color: colors.playerText },
  subtitle: { ...theme.typography.caption, color: colors.playerMuted, marginTop: 2 },
  controls: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 2,
  },
  ctrlBtn: {
    width: 34,
    height: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginHorizontal: 2,
  },
  playBtnDisabled: { opacity: 0.6 },
});
