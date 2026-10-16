import React, { useMemo, useRef } from 'react';
import { LayoutChangeEvent, PanResponder, Pressable, Text, TouchableOpacity, View } from 'react-native';
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
    defaultNarrator: narrator,
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

  const onSliderLayout = (event: LayoutChangeEvent) => {
    barWidthRef.current = event.nativeEvent.layout.width;
  };

  return (
    <View style={styles.bar}>
      <View style={styles.clip}>
        {/* A tap anywhere on the bar opens Now Playing; its buttons only control playback. */}
        <Pressable
          style={styles.row}
          onPress={() => setCurrentScreen('NowPlaying')}
          accessibilityRole="button"
          accessibilityLabel={`Open ${activeStory.title}`}>
          <View style={styles.info}>
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
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.ctrlBtn}
              onPress={() => playPreviousStory(false)}
              accessibilityLabel="Previous story">
              <MaterialIcons name="skip-previous" size={26} color={colors.textDark} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctrlBtn}
              onPress={() => skipTime(-10)}
              accessibilityLabel="Rewind 10 seconds">
              <MaterialIcons name="replay-10" size={24} color={colors.textDark} />
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
              <MaterialIcons name="forward-10" size={24} color={colors.textDark} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctrlBtn}
              onPress={() => playNextStory(false)}
              accessibilityLabel="Next story">
              <MaterialIcons name="skip-next" size={26} color={colors.textDark} />
            </TouchableOpacity>
          </View>
        </Pressable>

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
    </View>
  );
};

const makeStyles = (colors: ThemeColors) => ({
  bar: {
    marginHorizontal: 10,
    marginBottom: 8,
    borderRadius: 18,
    backgroundColor: colors.navBg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    // Lifts the card off the screen. On the outer view: iOS clips a shadow under overflow hidden.
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  clip: {
    // Clips the progress line at the bottom to the rounded corners.
    borderRadius: 17,
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
    backgroundColor: colors.pillBg,
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
    backgroundColor: colors.purpleLightBg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 10,
  },
  art: { fontSize: 22 },
  textCol: { flex: 1, minWidth: 0 },
  title: { ...theme.typography.cardTitle, fontSize: 15, lineHeight: 20, color: colors.textDark },
  subtitle: { ...theme.typography.caption, color: colors.textMuted, marginTop: 2 },
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
    // Raised play button, in the card's 3D style.
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  playBtnDisabled: { opacity: 0.6 },
});
