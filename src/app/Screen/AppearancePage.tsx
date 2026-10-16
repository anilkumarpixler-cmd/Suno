import React from 'react';
import { Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/Common/header';
import { useApp } from '@/Context/AppContext';
import { theme, ThemeColors } from '@/Theme/Index';
import {
  AppearanceMode,
  appearanceLabel,
  useAppTheme,
  useThemedStyles,
} from '@/Theme/ThemeProvider';
import { IconContainer, SettingIcon } from './ProfilePage';

const options: Array<{ mode: AppearanceMode; subtitle: string; icon: SettingIcon }> = [
  { mode: 'light', subtitle: 'Bright background', icon: 'sun' },
  { mode: 'dark', subtitle: 'Easy on the eyes at bedtime', icon: 'moon' },
  { mode: 'system', subtitle: 'Follows your phone', icon: 'device' },
];

export const AppearanceScreen: React.FC = () => {
  const { setCurrentScreen } = useApp();
  const { mode, setMode } = useAppTheme();
  const deviceScheme = useColorScheme();
  const styles = useThemedStyles(makeStyles);

  const deviceLabel = deviceScheme === 'dark' ? 'Dark' : 'Light';

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Appearance" showBack onBack={() => setCurrentScreen('Profile')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {options.map((option) => {
          const selected = option.mode === mode;
          const title = appearanceLabel(option.mode);
          const subtitle =
            option.mode === 'system'
              ? `${option.subtitle} · currently ${deviceLabel}`
              : option.subtitle;

          return (
            <Pressable
              key={option.mode}
              style={[styles.optionCard, selected && styles.optionCardSelected]}
              onPress={() => setMode(option.mode)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${title}, ${subtitle}`}>
              <IconContainer icon={option.icon} />
              <View style={styles.optionDetails}>
                <Text style={styles.optionTitle}>{title}</Text>
                <Text style={styles.optionSubtitle}>{subtitle}</Text>
              </View>
              {selected && (
                <View style={styles.selectedIndicator}>
                  <Text style={styles.check}>✓</Text>
                </View>
              )}
            </Pressable>
          );
        })}
        <Text style={styles.caption}>Your choice is saved on this device.</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AppearanceScreen;

const makeStyles = (colors: ThemeColors) => ({
  container: { flex: 1, backgroundColor: colors.background },
  // Extra bottom space so the list clears the mini player.
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 140 },
  optionCard: {
    minHeight: 88,
    marginBottom: 13,
    paddingHorizontal: 18,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.cardBg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  optionCardSelected: { borderColor: colors.primary, borderWidth: 2 },
  optionDetails: { flex: 1, marginHorizontal: 16 },
  optionTitle: { ...theme.typography.section, color: colors.textDark },
  optionSubtitle: { ...theme.typography.body, color: colors.textMuted, marginTop: 4 },
  selectedIndicator: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.success,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  check: { color: colors.onPrimary, fontSize: 16, fontWeight: '800' as const },
  caption: { ...theme.typography.body, color: colors.textMuted, marginTop: 12 },
});
