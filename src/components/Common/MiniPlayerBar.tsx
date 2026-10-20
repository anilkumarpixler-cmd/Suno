import React, { useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '../../Context/AppContext';
import { theme, ThemeColors } from '../../Theme/Index';
import { useAppTheme, useThemedStyles } from '../../Theme/ThemeProvider';

const formatTime = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

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

  // As on Now Playing: dragging only moves the line; the story seeks once, on release.
  const [dragTime, setDragTime] = useState<number | null>(null);
  const dragTimeRef = useRef<number | null>(null);

  const scrubberPan = useMemo(() => {
    const track = (locationX: number) => {
      const width = barWidthRef.current;
      if (width <= 0) return;
      const time = Math.max(0, Math.min(1, locationX / width)) * durationRef.current;
      if (dragTimeRef.current === null || Math.floor(time) !== Math.floor(dragTimeRef.current)) {
        setDragTime(time);
      }
      dragTimeRef.current = time;
    };
    const release = () => {
      const time = dragTimeRef.current;
      dragTimeRef.current = null;
      setDragTime(null);
      if (time !== null) seekToRef.current(time);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => track(event.nativeEvent.locationX),
      onPanResponderMove: (event) => track(event.nativeEvent.locationX),
      onPanResponderRelease: release,
      onPanResponderTerminate: release,
    });
  }, []);

  if (!activeStory) return null;

  const progressPct = Math.min(100, Math.max(0, ((dragTime ?? currentTime) / duration) * 100));

  const onSliderLayout = (event: LayoutChangeEvent) => {
    barWidthRef.current = event.nativeEvent.layout.width;
  };

  return (
    <View style={styles.bar}>
      <View style={styles.clip}>
        {/* A tap anywhere on the bar opens Now Playing; its buttons only control playback.
            Not one screen-reader element: that would hide the buttons inside it, so "Open" is
            announced on the title area and each control is reachable on its own. */}
        <Pressable
          style={styles.row}
          onPress={() => setCurrentScreen('NowPlaying')}
          accessible={false}>
          <Pressable
            style={styles.info}
            onPress={() => setCurrentScreen('NowPlaying')}
            accessibilityRole="button"
            accessibilityLabel={`Open ${activeStory.title}, ${narrator?.name || 'System Voice'}`}
            accessibilityHint="Opens Now Playing">
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
          </Pressable>

          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.ctrlBtn}
              onPress={() => playPreviousStory(false)}
              accessibilityRole="button"
              accessibilityLabel="Previous story">
              <MaterialIcons name="skip-previous" size={26} color={colors.textDark} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctrlBtn}
              onPress={() => skipTime(-10)}
              accessibilityRole="button"
              accessibilityLabel="Rewind 10 seconds">
              <MaterialIcons name="replay-10" size={24} color={colors.textDark} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.playBtn, isPreparingAudio && styles.playBtnDisabled]}
              onPress={togglePlayPause}
              disabled={isPreparingAudio}
              accessibilityRole="button"
              accessibilityLabel={isPreparingAudio ? 'Preparing voice' : isPlaying ? 'Pause' : 'Play'}
              accessibilityState={{ disabled: isPreparingAudio }}>
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
              accessibilityRole="button"
              accessibilityLabel="Forward 10 seconds">
              <MaterialIcons name="forward-10" size={24} color={colors.textDark} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctrlBtn}
              onPress={() => playNextStory(false)}
              accessibilityRole="button"
              accessibilityLabel="Next story">
              <MaterialIcons name="skip-next" size={26} color={colors.textDark} />
            </TouchableOpacity>
          </View>
        </Pressable>

        <View
          style={styles.sliderHit}
          onLayout={onSliderLayout}
          {...scrubberPan.panHandlers}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Playback progress"
          // Screen readers can't drag: swipe up / down skips 10 s, and the position is read out.
          accessibilityValue={{
            min: 0,
            max: Math.round(duration),
            now: Math.round(Math.min(currentTime, duration)),
            text: `${formatTime(currentTime)} of ${formatTime(duration)}`,
          }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) =>
            skipTime(event.nativeEvent.actionName === 'increment' ? 10 : -10)
          }>
          <View style={styles.sliderBg} pointerEvents="none">
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
    // Pill: fully rounded left and right ends (half the card's ~58 height).
    borderRadius: 30,
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
    borderRadius: 29,
    overflow: 'hidden' as const,
  },
  sliderHit: {
    width: '100%' as const,
    height: 10,
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
    // Wider than the corners' curve, so the artwork and the last button stay clear of it.
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 2,
  },
  info: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginRight: 8,
    minWidth: 0,
  },
  artBox: {
    width: 38,
    height: 38,
    // Round, to match the pill.
    borderRadius: 19,
    backgroundColor: colors.purpleLightBg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 10,
  },
  art: { fontSize: 19 },
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
    height: 38,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
