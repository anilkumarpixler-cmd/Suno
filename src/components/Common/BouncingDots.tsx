import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useAppTheme } from '../../Theme/ThemeProvider';

const DOT_SIZE = 14;
const BOUNCE_HEIGHT = 14;
const BOUNCE_MS = 320;
// Each ball starts a little after the one before it, so they bounce in a wave.
const STAGGER_MS = 120;

const Dot: React.FC<{ color: string; delayMs: number }> = ({ color, delayMs }) => {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1, { duration: BOUNCE_MS, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: BOUNCE_MS, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(progress);
  }, [reduceMotion, delayMs, progress]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -BOUNCE_HEIGHT * progress.value },
      { scale: 1 + 0.15 * progress.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2, backgroundColor: color },
        dotStyle,
      ]}
    />
  );
};

/** Coloured balls bouncing one after another, while a list loads. */
export const BouncingDots: React.FC<{ accessibilityLabel?: string }> = ({ accessibilityLabel }) => {
  const { colors, gradients } = useAppTheme();
  // Purple, pink, yellow (the sleep mode moon) and green.
  const dotColors = [colors.primary, gradients.playerArt[1], '#F5C84B', colors.success];

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 10,
        height: DOT_SIZE + BOUNCE_HEIGHT + 4,
      }}>
      {dotColors.map((color, index) => (
        <Dot key={index} color={color} delayMs={index * STAGGER_MS} />
      ))}
    </View>
  );
};
