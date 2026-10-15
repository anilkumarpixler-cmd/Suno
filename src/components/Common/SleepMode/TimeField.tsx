import React, { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { TimePickerModal } from '@/modal/timePickerModal';
import { formatTime } from '@/services/sleepMode';
import { theme, ThemeColors } from '@/Theme/Index';
import { useThemedStyles } from '@/Theme/ThemeProvider';

type TimeFieldProps = {
  label: string;
  /** Minutes after midnight. */
  minutes: number;
  disabled?: boolean;
  onChange: (minutes: number) => void;
};

/** Time row; tapping opens a scroll-wheel picker, applied on OK. */
export const TimeField: React.FC<TimeFieldProps> = ({ label, minutes, disabled, onChange }) => {
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        style={[styles.card, disabled && styles.disabled]}
        disabled={disabled}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityLabel={`${label}, ${formatTime(minutes)}`}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{formatTime(minutes)}</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      <TimePickerModal
        visible={open}
        title={label}
        minutes={minutes}
        onCancel={() => setOpen(false)}
        onConfirm={(value) => {
          setOpen(false);
          onChange(value);
        }}
      />
    </>
  );
};

const makeStyles = (colors: ThemeColors) => ({
  card: {
    minHeight: 64,
    marginBottom: 13,
    paddingHorizontal: 18,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.cardBg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  disabled: { opacity: 0.5 },
  label: { ...theme.typography.section, color: colors.textDark, flex: 1 },
  value: { ...theme.typography.cardTitle, color: colors.primary },
  chevron: { color: colors.textDark, fontSize: 25, fontWeight: '300' as const, marginLeft: 10 },
});
