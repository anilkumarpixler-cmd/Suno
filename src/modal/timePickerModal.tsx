import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { WheelColumn, WheelHighlight } from '../components/Common/SleepMode/WheelColumn';
import { theme, ThemeColors } from '../Theme/Index';
import { useThemedStyles } from '../Theme/ThemeProvider';

const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));
const MERIDIEMS = ['AM', 'PM'];

type TimePickerModalProps = {
  visible: boolean;
  title: string;
  /** Minutes after midnight shown when the modal opens. */
  minutes: number;
  onCancel: () => void;
  onConfirm: (minutes: number) => void;
};

export const TimePickerModal = ({ visible, title, minutes, onCancel, onConfirm }: TimePickerModalProps) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.modalOverlay} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          {/* Mounted only while visible, so every open starts from the current value. */}
          <PickerContent title={title} minutes={minutes} onCancel={onCancel} onConfirm={onConfirm} />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const PickerContent = ({ title, minutes, onCancel, onConfirm }: Omit<TimePickerModalProps, 'visible'>) => {
  const styles = useThemedStyles(makeStyles);
  const hours24 = Math.floor(minutes / 60);
  const [hourIndex, setHourIndex] = useState((hours24 % 12 || 12) - 1);
  const [minuteIndex, setMinuteIndex] = useState(minutes % 60);
  const [meridiemIndex, setMeridiemIndex] = useState(hours24 >= 12 ? 1 : 0);

  const confirm = () => {
    const hour12 = hourIndex + 1;
    const hour = (hour12 % 12) + (meridiemIndex === 1 ? 12 : 0);
    onConfirm(hour * 60 + minuteIndex);
  };

  return (
    <>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.wheels}>
        <WheelHighlight />
        <WheelColumn items={HOURS} selectedIndex={hourIndex} onChange={setHourIndex} accessibilityLabel="Hour" />
        <Text style={styles.colon}>:</Text>
        <WheelColumn items={MINUTES} selectedIndex={minuteIndex} onChange={setMinuteIndex} accessibilityLabel="Minute" />
        <WheelColumn items={MERIDIEMS} selectedIndex={meridiemIndex} onChange={setMeridiemIndex} accessibilityLabel="AM or PM" />
      </View>
      <View style={styles.buttonRow}>
        <Pressable style={styles.cancel} onPress={onCancel} accessibilityRole="button" accessibilityLabel="Cancel">
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.ok} onPress={confirm} accessibilityRole="button" accessibilityLabel="OK">
          <Text style={styles.okText}>OK</Text>
        </Pressable>
      </View>
    </>
  );
};

const makeStyles = (colors: ThemeColors) => ({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 24,
  },
  card: {
    width: '85%' as const,
    backgroundColor: colors.cardBg,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 22,
  },
  title: { ...theme.typography.cardTitle, color: colors.textDark, marginBottom: 16 },
  wheels: { flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 20 },
  colon: { ...theme.typography.cardTitle, color: colors.textDark },
  buttonRow: { flexDirection: 'row' as const, gap: 10 },
  cancel: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.cardBg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  cancelText: { ...theme.typography.section, color: colors.textDark },
  ok: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  okText: { ...theme.typography.section, color: colors.onPrimary },
});
