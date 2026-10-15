import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/Common/header';
import { DayPicker } from '@/components/Common/SleepMode/DayPicker';
import { TimeField } from '@/components/Common/SleepMode/TimeField';
import { showToast } from '@/components/Common/Toast';
import { useApp } from '@/Context/AppContext';
import {
  formatDays,
  formatTime,
  isSameSleepMode,
  isValidSleepMode,
  SleepModeSettings,
} from '@/services/sleepMode';
import { theme, ThemeColors } from '@/Theme/Index';
import { useAppTheme, useThemedStyles } from '@/Theme/ThemeProvider';

const summary = (draft: SleepModeSettings) => {
  if (!draft.enabled) return 'Sleep mode is off. Stories play any time.';
  if (draft.days.length === 0) return 'Choose at least one day.';
  if (draft.startMinutes === draft.endMinutes) return 'Start and end time must be different.';
  return `Stories pause from ${formatTime(draft.startMinutes)} to ${formatTime(
    draft.endMinutes,
  )} · ${formatDays(draft.days)}`;
};

export const SleepTimerScreen: React.FC = () => {
  const { sleepMode, saveSleepMode, setCurrentScreen } = useApp();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(makeStyles);

  const [draft, setDraft] = useState<SleepModeSettings>(sleepMode);
  const [touched, setTouched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Saved settings load asynchronously; show them unless the user has started editing.
  useEffect(() => {
    if (!touched) setDraft(sleepMode);
  }, [sleepMode, touched]);

  const update = (patch: Partial<SleepModeSettings>) => {
    setTouched(true);
    setDraft((current) => ({ ...current, ...patch }));
  };

  const canSave = !isSaving && isValidSleepMode(draft) && !isSameSleepMode(draft, sleepMode);
  const fieldsDisabled = !draft.enabled;

  const onSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      await saveSleepMode(draft);
      setTouched(false);
      showToast(draft.enabled ? 'Sleep mode saved' : 'Sleep mode turned off');
      setCurrentScreen('Profile');
    } catch {
      showToast('Could not save sleep mode. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Sleep timer" showBack onBack={() => setCurrentScreen('Profile')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.toggleCard}>
          <View style={styles.iconContainer}>
            <Text style={styles.moon}>☾</Text>
          </View>
          <View style={styles.toggleDetails}>
            <Text style={styles.toggleTitle}>Sleep mode</Text>
            <Text style={styles.toggleSubtitle}>Stories pause and won’t start at bedtime</Text>
          </View>
          <Switch
            value={draft.enabled}
            // Turning sleep mode on starts with no days selected; the user picks them.
            onValueChange={(enabled) =>
              update(enabled && !sleepMode.enabled ? { enabled, days: [] } : { enabled })
            }
            trackColor={{ false: colors.pillBg, true: colors.primary }}
            thumbColor={colors.onPrimary}
            ios_backgroundColor={colors.pillBg}
            accessibilityLabel="Sleep mode"
          />
        </View>

        <Text style={styles.sectionTitle}>Schedule</Text>
        <TimeField
          label="Start time"
          minutes={draft.startMinutes}
          disabled={fieldsDisabled}
          onChange={(startMinutes) => update({ startMinutes })}
        />
        <TimeField
          label="End time"
          minutes={draft.endMinutes}
          disabled={fieldsDisabled}
          onChange={(endMinutes) => update({ endMinutes })}
        />

        <Text style={styles.sectionTitle}>Days</Text>
        <DayPicker
          days={draft.days}
          disabled={fieldsDisabled}
          onChange={(days) => update({ days })}
        />

        <Text style={styles.summary}>{summary(draft)}</Text>

        <Pressable
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          disabled={!canSave}
          onPress={() => void onSave()}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave }}
          accessibilityLabel="Save sleep mode">
          <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>
            {isSaving ? 'Saving…' : 'Save'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SleepTimerScreen;

const makeStyles = (colors: ThemeColors) => ({
  container: { flex: 1, backgroundColor: colors.background },
  // Extra bottom space so the Save button clears the mini player.
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 140 },
  toggleCard: {
    minHeight: 88,
    paddingHorizontal: 18,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.cardBg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.purpleLightBg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  moon: { color: '#F5C84B', fontSize: 29, lineHeight: 32 },
  toggleDetails: { flex: 1, marginHorizontal: 16 },
  toggleTitle: { ...theme.typography.section, color: colors.textDark },
  toggleSubtitle: { ...theme.typography.body, color: colors.textMuted, marginTop: 4 },
  sectionTitle: {
    ...theme.typography.section,
    color: colors.textDark,
    marginTop: 28,
    marginBottom: 14,
  },
  summary: { ...theme.typography.body, color: colors.textMuted, marginTop: 24 },
  saveButton: {
    marginTop: 20,
    minHeight: 52,
    borderRadius: theme.borderRadius.button,
    backgroundColor: colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  saveButtonDisabled: { backgroundColor: colors.pillBg },
  saveText: { ...theme.typography.section, color: colors.onPrimary },
  saveTextDisabled: { color: colors.textMuted },
});
