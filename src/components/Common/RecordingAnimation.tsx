import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useAudioRecorderState, type AudioRecorder } from 'expo-audio';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { theme, ThemeColors } from '../../Theme/Index';
import { useAppTheme, useThemedStyles } from '../../Theme/ThemeProvider';

const MIC_SIZE = 56;
const PULSE_MS = 1400;
// Quietest level shown; speech sits roughly between -40 and -10 dB.
const SILENCE_DB = -60;
const BAR_WEIGHTS = [0.5, 0.7, 0.9, 1, 0.9, 0.7, 0.5];
const BAR_MAX_HEIGHT = 32;
const BAR_MIN = 0.15;

const PulseRing: React.FC<{ active: boolean; delayMs: number }> = ({ active, delayMs }) => {
  const styles = useThemedStyles(makeStyles);
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (active && !reduceMotion) {
      progress.value = 0;
      progress.value = withDelay(
        delayMs,
        withRepeat(withTiming(1, { duration: PULSE_MS, easing: Easing.out(Easing.quad) }), -1, false),
      );
      return;
    }
    cancelAnimation(progress);
    progress.value = 0;
  }, [active, reduceMotion, delayMs, progress]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: progress.value === 0 ? 0 : 0.5 * (1 - progress.value),
    transform: [{ scale: 1 + 0.9 * progress.value }],
  }));
  
  return <Animated.View pointerEvents="none" style={[styles.ring, ringStyle]} />;
};

/** Two rings spreading out behind the mic while it records. */
export const MicPulse: React.FC<{ active: boolean; children: React.ReactNode }> = ({
  active,
  children,
}) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.pulseWrap}>
      <PulseRing active={active} delayMs={0} />
      <PulseRing active={active} delayMs={PULSE_MS / 2} />
      {children}
    </View>
  );
};

const LevelBar: React.FC<{ level: SharedValue<number>; weight: number }> = ({ level, weight }) => {
  const styles = useThemedStyles(makeStyles);
  const barStyle = useAnimatedStyle(() => ({
    height: BAR_MAX_HEIGHT * Math.max(BAR_MIN, level.value * weight),
  }));
  return <Animated.View style={[styles.bar, barStyle]} />;
};

/**
 * Bars that follow the real microphone level (expo-audio metering), so the parent sees the phone
 * is hearing them. Mount only while recording: it polls the recorder every 100 ms, and only this
 * small component re-renders for it.
 */
export const VoiceLevelBars: React.FC<{ recorder: AudioRecorder }> = ({ recorder }) => {
  const styles = useThemedStyles(makeStyles);
  const reduceMotion = useReducedMotion();
  const { metering } = useAudioRecorderState(recorder, 100);
  const level = useSharedValue(0);

  useEffect(() => {
    const db = metering ?? SILENCE_DB;
    const next = Math.max(0, Math.min(1, (db - SILENCE_DB) / -SILENCE_DB));
    level.value = reduceMotion ? 0 : withTiming(next, { duration: 100 });
  }, [metering, reduceMotion, level]);

  return (
    <View style={styles.bars} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {BAR_WEIGHTS.map((weight, index) => (
        <LevelBar key={index} level={level} weight={weight} />
      ))}
    </View>
  );
};

/** Fills toward the minimum length, then stays full and green: the user stops when ready. */
export const RecordingProgress: React.FC<{ seconds: number; min: number }> = ({ seconds, min }) => {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useAppTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const fill = useSharedValue(0);
  const longEnough = seconds >= min;

  useEffect(() => {
    // `seconds` steps once a second: a 1 s glide reaches each step as the next one arrives, so
    // the bar moves steadily instead of jumping and pausing.
    fill.value = withTiming(Math.min(1, seconds / min), { duration: 1000, easing: Easing.linear });
  }, [seconds, min, fill]);

  const fillStyle = useAnimatedStyle(() => ({ width: trackWidth * fill.value }));

  return (
    <View style={styles.progressWrap}>
      <View style={styles.track} onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}>
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: longEnough ? colors.success : colors.primary },
            fillStyle,
          ]}
        />
      </View>
      <Text style={[styles.progressLabel, longEnough && { color: colors.success }]}>
        {longEnough ? '✓ Long enough · tap Stop when you are done' : `Keep going — ${min} s minimum`}
      </Text>
    </View>
  );
};

const makeStyles = (colors: ThemeColors) => ({
  pulseWrap: {
    width: MIC_SIZE,
    height: MIC_SIZE,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 12,
  },
  ring: {
    position: 'absolute' as const,
    width: MIC_SIZE,
    height: MIC_SIZE,
    borderRadius: MIC_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.danger,
  },
  bars: {
    height: BAR_MAX_HEIGHT,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    marginBottom: 12,
  },
  bar: { width: 4, borderRadius: 2, backgroundColor: colors.danger },
  progressWrap: { alignSelf: 'stretch' as const, marginBottom: 16 },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderLight,
    overflow: 'hidden' as const,
  },
  fill: { height: 6, borderRadius: 3 },
  progressLabel: {
    ...theme.typography.caption,
    color: colors.textMuted,
    textAlign: 'center' as const,
    marginTop: 6,
  },
});
