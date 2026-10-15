import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { WEEK_DAYS } from '@/services/sleepMode';
import { theme, ThemeColors } from '@/Theme/Index';
import { useThemedStyles } from '@/Theme/ThemeProvider';

type DayPickerProps = {
  /** Selected days as `Date.getDay()` (0 = Sunday). */
  days: number[];
  disabled?: boolean;
  onChange: (days: number[]) => void;
};

export const DayPicker: React.FC<DayPickerProps> = ({ days, disabled, onChange }) => {
  const styles = useThemedStyles(makeStyles);

  const toggle = (day: number) =>
    onChange(days.includes(day) ? days.filter((value) => value !== day) : [...days, day]);

  return (
    <View style={[styles.row, disabled && styles.disabled]}>
      {WEEK_DAYS.map(({ day, label }) => {
        const selected = days.includes(day);
        return (
          <Pressable
            key={day}
            style={[styles.chip, selected && styles.chipSelected]}
            disabled={disabled}
            onPress={() => toggle(day)}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            accessibilityLabel={label}>
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {label.charAt(0)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const makeStyles = (colors: ThemeColors) => ({
  row: { flexDirection: 'row' as const, justifyContent: 'space-between' as const },
  disabled: { opacity: 0.5 },
  chip: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.cardBg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...theme.typography.section, color: colors.textDark },
  chipTextSelected: { color: colors.onPrimary },
});
