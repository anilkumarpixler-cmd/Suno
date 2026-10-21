import React, { useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { theme, ThemeColors } from '@/Theme/Index';
import { useThemedStyles } from '@/Theme/ThemeProvider';

export const WHEEL_ITEM_HEIGHT = 44;
export const WHEEL_VISIBLE_ITEMS = 5;
// Empty rows above/below so the first and last items can reach the center row.
const PADDING_ITEMS = (WHEEL_VISIBLE_ITEMS - 1) / 2;

type WheelColumnProps = {
  items: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  accessibilityLabel: string;
};

/** Snapping scroll wheel; the item in the center row is the selected one. */
export const WheelColumn: React.FC<WheelColumnProps> = ({
  items,
  selectedIndex,
  onChange,
  accessibilityLabel,
}) => {
  const styles = useThemedStyles(makeStyles);
  const scrollRef = useRef<ScrollView>(null);
  // Latest value, not the one the picker opened with: a re-layout (rotation, split screen)
  // scrolls back to it, and rapid scroll events don't report the same row twice.
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;

  const select = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    if (clamped === selectedIndexRef.current) return;
    selectedIndexRef.current = clamped;
    onChange(clamped);
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.wheel}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      snapToInterval={WHEEL_ITEM_HEIGHT}
      decelerationRate="fast"
      nestedScrollEnabled
      onLayout={() =>
        scrollRef.current?.scrollTo({
          y: selectedIndexRef.current * WHEEL_ITEM_HEIGHT,
          animated: false,
        })
      }
      // Live while it spins: the bold row follows the wheel, and OK mid-spin saves the center row.
      onScroll={select}
      scrollEventThrottle={16}
      onMomentumScrollEnd={select}
      // Slow drags on Android may end without momentum.
      onScrollEndDrag={select}
      accessibilityLabel={accessibilityLabel}>
      {items.map((item, index) => {
        const selected = index === selectedIndex;
        return (
          <Pressable
            key={item}
            style={styles.item}
            onPress={() => {
              scrollRef.current?.scrollTo({ y: index * WHEEL_ITEM_HEIGHT, animated: true });
              onChange(index);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${accessibilityLabel} ${item}`}>
            <Text style={[styles.itemText, selected && styles.itemTextSelected]}>{item}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

/** Highlight band behind the center row; place it absolutely behind the wheels. */
export const WheelHighlight: React.FC = () => {
  const styles = useThemedStyles(makeStyles);
  return <View pointerEvents="none" style={styles.highlight} />;
};

const makeStyles = (colors: ThemeColors) => ({
  wheel: { height: WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ITEMS, flex: 1 },
  content: { paddingVertical: WHEEL_ITEM_HEIGHT * PADDING_ITEMS },
  item: {
    height: WHEEL_ITEM_HEIGHT,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  itemText: { ...theme.typography.section, color: colors.textMuted },
  itemTextSelected: { ...theme.typography.cardTitle, color: colors.textDark },
  highlight: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: WHEEL_ITEM_HEIGHT * PADDING_ITEMS,
    height: WHEEL_ITEM_HEIGHT,
    borderRadius: 12,
    backgroundColor: colors.purpleLightBg,
  },
});
