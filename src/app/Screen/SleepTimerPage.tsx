import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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
  isSleepTime,
  isValidSleepMode,
  secondsUntilSleep,
  SleepModeSettings,
  wrapMinutes,
} from '@/services/sleepMode';
import { theme, ThemeColors } from '@/Theme/Index';
import { useAppTheme, useThemedStyles } from '@/Theme/ThemeProvider';

const MINUTES_PER_DAY = 24 * 60;
// The status line re-checks the clock this often ("Starts in 3 h 20 min" counts down).
const STATUS_TICK_MS = 30_000;

const DAY_SHORTCUTS = [
  { label: 'Every day', days: [0, 1, 2, 3, 4, 5, 6] },
  { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
  { label: 'Weekends', days: [0, 6] },
];

const TIME_PRESETS = [
  { start: 20 * 60, end: 7 * 60 },
  { start: 21 * 60, end: 7 * 60 },
  { start: 22 * 60, end: 6 * 60 },
  // Afternoon nap.
  { start: 13 * 60, end: 15 * 60 },
];

/** "9 PM", or "9:30 PM" when not on the hour: short enough for a chip. */
const shortTime = (minutes: number) => {
  const full = formatTime(minutes);
  return minutes % 60 === 0 ? full.replace(':00', '') : full;
};

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  return mins === 0 ? `${hours} h` : `${hours} h ${mins} min`;
};

const sameDays = (a: number[], b: number[]) => a.length === b.length && a.every((day) => b.includes(day));

const summary = (draft: SleepModeSettings) => {
  if (!draft.enabled) return 'Sleep mode is off. Stories play any time.';
  if (draft.days.length === 0) return 'Choose at least one day.';
  if (draft.startMinutes === draft.endMinutes) return 'Start and end time must be different.';
  return `Stories pause from ${formatTime(draft.startMinutes)} to ${formatTime(
    draft.endMinutes,
  )} · ${formatDays(draft.days)}`;
};

/** The saved schedule right now: on, starting soon, or later. Null when sleep mode is off. */
const statusOf = (saved: SleepModeSettings) => {
  if (!saved.enabled || !isValidSleepMode(saved)) return null;
  if (isSleepTime(saved)) {
    return { active: true, text: `Sleep mode is on now · until ${formatTime(saved.endMinutes)}` };
  }
  const seconds = secondsUntilSleep(saved);
  if (seconds !== null) {
    return {
      active: false,
      text: `Starts in ${formatDuration(Math.max(1, Math.ceil(seconds / 60)))} · at ${formatTime(saved.startMinutes)}`,
    };
  }
  return {
    active: false,
    text: `Next at ${formatTime(saved.startMinutes)} · ${formatDays(saved.days)}`,
  };
};

export const SleepTimerScreen: React.FC = () => {
  const { sleepMode, saveSleepMode, setCurrentScreen } = useApp();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(makeStyles);

  const [draft, setDraft] = useState<SleepModeSettings>(sleepMode);
  const [touched, setTouched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Re-renders the status line as time passes.
  const [, setTick] = useState(0);

  // Saved settings load asynchronously; show them unless the user has started editing.
  useEffect(() => {
    if (!touched) setDraft(sleepMode);
  }, [sleepMode, touched]);

  useEffect(() => {
    const interval = setInterval(() => setTick((tick) => tick + 1), STATUS_TICK_MS);
    return () => clearInterval(interval);
  }, []);

  const update = (patch: Partial<SleepModeSettings>) => {
    setTouched(true);
    setDraft((current) => ({ ...current, ...patch }));
  };

  const canSave = !isSaving && isValidSleepMode(draft) && !isSameSleepMode(draft, sleepMode);
  const fieldsDisabled = !draft.enabled;
  const status = statusOf(sleepMode);
  const quietMinutes = wrapMinutes(draft.endMinutes - draft.startMinutes);
  // The window on a 0–24 h bar: an overnight one (21:00 → 07:00) is two pieces.
  const segments =
    draft.startMinutes < draft.endMinutes
      ? [{ from: draft.startMinutes, to: draft.endMinutes }]
      : [
          { from: draft.startMinutes, to: MINUTES_PER_DAY },
          { from: 0, to: draft.endMinutes },
        ];

  const onSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      await saveSleepMode(draft);
      setTouched(false);
      showToast(draft.enabled ? 'Sleep mode saved' : 'Sleep mode turned off', 'success');
      setCurrentScreen('Profile');
    } catch {
      showToast('Could not save sleep mode. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const renderChip = (key: string, label: string, selected: boolean, onPress: () => void) => (
    <Pressable
      key={key}
      style={[styles.chip, selected && styles.chipSelected]}
      disabled={fieldsDisabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: fieldsDisabled }}
      accessibilityLabel={label}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );

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

        {/* The saved schedule, not the edits: those apply once saved. */}
        {status && (
          <View
            style={[styles.statusCard, status.active && styles.statusCardActive]}
            accessible
            accessibilityRole="text">
            <MaterialIcons
              name={status.active ? 'bedtime' : 'schedule'}
              size={20}
              color={status.active ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.statusText, status.active && styles.statusTextActive]}>
              {status.text}
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Schedule</Text>
        <View style={[styles.chipRow, fieldsDisabled && styles.disabled]}>
          {TIME_PRESETS.map((preset) =>
            renderChip(
              `${preset.start}-${preset.end}`,
              `${shortTime(preset.start)} – ${shortTime(preset.end)}`,
              draft.startMinutes === preset.start && draft.endMinutes === preset.end,
              () => update({ startMinutes: preset.start, endMinutes: preset.end }),
            ),
          )}
        </View>
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

        {quietMinutes > 0 && (
          <View
            style={[styles.quietCard, fieldsDisabled && styles.disabled]}
            accessible
            accessibilityLabel={`${formatDuration(quietMinutes)} of quiet time, from ${formatTime(
              draft.startMinutes,
            )} to ${formatTime(draft.endMinutes)}`}>
            <Text style={styles.quietTitle}>
              <Text style={styles.quietHours}>{formatDuration(quietMinutes)}</Text> of quiet time
            </Text>
            <View style={styles.quietTrack}>
              {segments.map((segment) => (
                <View
                  key={segment.from}
                  style={[
                    styles.quietFill,
                    {
                      left: `${(segment.from / MINUTES_PER_DAY) * 100}%`,
                      width: `${((segment.to - segment.from) / MINUTES_PER_DAY) * 100}%`,
                    },
                  ]}
                />
              ))}
            </View>
            <View style={styles.quietTicks}>
              {['12 AM', '6 AM', '12 PM', '6 PM', '12 AM'].map((label, index) => (
                <Text key={index} style={styles.quietTick}>
                  {label}
                </Text>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Days</Text>
        <View style={[styles.chipRow, fieldsDisabled && styles.disabled]}>
          {DAY_SHORTCUTS.map((shortcut) =>
            renderChip(shortcut.label, shortcut.label, sameDays(draft.days, shortcut.days), () =>
              update({ days: shortcut.days }),
            ),
          )}
        </View>
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
  statusCard: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.cardBg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  statusCardActive: { backgroundColor: colors.continueCard, borderColor: colors.continueBorder },
  statusText: { ...theme.typography.body, color: colors.textMuted, flex: 1 },
  statusTextActive: { color: colors.textDark, fontWeight: '600' as const },
  sectionTitle: {
    ...theme.typography.section,
    color: colors.textDark,
    marginTop: 28,
    marginBottom: 14,
  },
  disabled: { opacity: 0.5 },
  chipRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, marginBottom: 13 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.cardBg,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...theme.typography.badge, fontSize: 14, lineHeight: 18, color: colors.textDark },
  chipTextSelected: { color: colors.onPrimary },
  quietCard: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.cardBg,
  },
  quietTitle: { ...theme.typography.body, color: colors.textMuted },
  quietHours: { ...theme.typography.section, color: colors.primary },
  quietTrack: {
    height: 10,
    marginTop: 12,
    borderRadius: 5,
    backgroundColor: colors.pillBg,
    overflow: 'hidden' as const,
  },
  quietFill: {
    position: 'absolute' as const,
    top: 0,
    bottom: 0,
    backgroundColor: colors.primary,
  },
  quietTicks: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginTop: 6,
  },
  quietTick: { ...theme.typography.caption, color: colors.textMuted },
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
