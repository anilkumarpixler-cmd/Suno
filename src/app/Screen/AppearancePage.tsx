import React from 'react';
import { Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/Common/header';
import { useApp } from '@/Context/AppContext';
import { accents, buildPalette, theme, THEME_ACCENTS, ThemeAccent, ThemeColors } from '@/Theme/Index';
import {
  AppearanceMode,
  appearanceLabel,
  useAppTheme,
  useThemedStyles,
} from '@/Theme/ThemeProvider';
import { SectionTitle } from './ProfilePage';

const DEFAULT_MODE: AppearanceMode = 'system';
const DEFAULT_ACCENT: ThemeAccent = 'purple';

const options: Array<{ mode: AppearanceMode; subtitle: string; icon: keyof typeof MaterialIcons.glyphMap }> = [
  { mode: 'light', subtitle: 'Bright', icon: 'light-mode' },
  { mode: 'dark', subtitle: 'For bedtime', icon: 'dark-mode' },
  { mode: 'system', subtitle: 'Follows phone', icon: 'smartphone' },
];

/** A tiny screen in one scheme's colors (with the chosen theme color), for the mode tiles. */
const MiniScreen: React.FC<{ colors: ThemeColors; style?: object }> = ({ colors, style }) => (
  <View style={[{ flex: 1, backgroundColor: colors.background, padding: 6, gap: 4 }, style]}>
    <View style={{ height: 14, borderRadius: 4, backgroundColor: colors.cardBg }} />
    <View style={{ height: 10, width: '70%', borderRadius: 4, backgroundColor: colors.cardBg }} />
    <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end' }}>
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }} />
    </View>
  </View>
);

export const AppearanceScreen: React.FC = () => {
  const { setCurrentScreen } = useApp();
  const { mode, setMode, scheme, accent, setAccent, colors, gradients } = useAppTheme();
  const deviceScheme = useColorScheme();
  const styles = useThemedStyles(makeStyles);

  const deviceLabel = deviceScheme === 'dark' ? 'Dark' : 'Light';
  const lightColors = buildPalette('light', accent).colors;
  const darkColors = buildPalette('dark', accent).colors;
  const isDefault = mode === DEFAULT_MODE && accent === DEFAULT_ACCENT;

  const resetToDefault = () => {
    setMode(DEFAULT_MODE);
    setAccent(DEFAULT_ACCENT);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Appearance" showBack onBack={() => setCurrentScreen('Profile')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Drawn with the live theme, so it changes the moment a mode or color is picked. */}
        <View
          style={styles.previewCard}
          accessible
          accessibilityLabel={`Preview: ${scheme} mode, ${accents[accent].label} color`}>
          <LinearGradient colors={gradients.hero} style={styles.previewHero}>
            <Text style={styles.previewHeroTitle} numberOfLines={2}>
              Stories in the voices they love.
            </Text>
            <MaterialIcons name="auto-stories" size={34} color={colors.primary} />
          </LinearGradient>
          <View style={styles.previewStory}>
            <View style={styles.previewArt}>
              <Text style={styles.previewEmoji}>🌙</Text>
            </View>
            <View style={styles.previewStoryText}>
              <Text style={styles.previewStoryTitle} numberOfLines={1}>
                The Sleepy Moon
              </Text>
              <Text style={styles.previewStoryMeta} numberOfLines={1}>
                Mummy's voice · Bedtime
              </Text>
            </View>
          </View>
          <View style={styles.previewPlayer}>
            <View style={styles.previewPlayBtn}>
              <MaterialIcons name="play-arrow" size={20} color={colors.onPrimary} />
            </View>
            <View style={styles.previewTrack}>
              <View style={styles.previewFill} />
            </View>
            <Text style={styles.previewTime}>1:24</Text>
          </View>
        </View>

        <View style={styles.modeRow} accessibilityRole="radiogroup" accessibilityLabel="Appearance">
          {options.map((option) => {
            const selected = option.mode === mode;
            const title = appearanceLabel(option.mode);
            const subtitle = option.mode === 'system' ? `Now ${deviceLabel}` : option.subtitle;

            return (
              <Pressable
                key={option.mode}
                style={[styles.modeTile, selected && styles.modeTileSelected]}
                onPress={() => setMode(option.mode)}
                accessibilityRole="radio"
                // Radios are read by `checked` ("checked" / "not checked"), not `selected`.
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${title}, ${subtitle}`}>
                <View style={styles.miniFrame}>
                  {option.mode === 'system' ? (
                    // Half light, half dark: it follows the phone.
                    <View style={styles.miniSplit}>
                      <MiniScreen colors={lightColors} />
                      <MiniScreen colors={darkColors} />
                    </View>
                  ) : (
                    <MiniScreen colors={option.mode === 'dark' ? darkColors : lightColors} />
                  )}
                  {selected && (
                    <View style={styles.selectedIndicator}>
                      <Text style={styles.check}>✓</Text>
                    </View>
                  )}
                </View>
                <View style={styles.modeLabelRow}>
                  <MaterialIcons
                    name={option.icon}
                    size={16}
                    color={selected ? colors.primary : colors.textMuted}
                  />
                  <Text style={[styles.modeTitle, selected && styles.modeTitleSelected]} numberOfLines={1}>
                    {title}
                  </Text>
                </View>
                <Text style={styles.modeSubtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <SectionTitle>Theme color</SectionTitle>
        <View
          style={styles.swatchCard}
          accessibilityRole="radiogroup"
          accessibilityLabel="Theme color">
          {THEME_ACCENTS.map((name) => {
            const selected = name === accent;
            const { label } = accents[name];
            return (
              <Pressable
                key={name}
                style={styles.swatchItem}
                onPress={() => setAccent(name)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={label}>
                {/* Each swatch shows its color as it looks in the current light / dark mode. */}
                <View
                  style={[
                    styles.swatch,
                    { backgroundColor: accents[name][scheme].colors.primary },
                    selected && styles.swatchSelected,
                  ]}>
                  {selected && <Text style={styles.check}>✓</Text>}
                </View>
                <Text style={[styles.swatchLabel, selected && styles.swatchLabelSelected]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.caption}>Your choices are saved on this device.</Text>

        <Pressable
          style={[styles.resetBtn, isDefault && styles.resetBtnDisabled]}
          onPress={resetToDefault}
          disabled={isDefault}
          accessibilityRole="button"
          accessibilityState={{ disabled: isDefault }}
          accessibilityLabel="Reset to default: Match device and Purple">
          <MaterialIcons name="restart-alt" size={20} color={colors.primary} />
          <Text style={styles.resetText}>Reset to default</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AppearanceScreen;

const makeStyles = (colors: ThemeColors) => ({
  container: { flex: 1, backgroundColor: colors.background },
  // Extra bottom space so the list clears the mini player.
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 140 },
  previewCard: {
    padding: 12,
    gap: 10,
    marginBottom: 16,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.cardBg,
  },
  previewHero: {
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  previewHeroTitle: { ...theme.typography.section, color: colors.textDark, flex: 1, marginRight: 8 },
  previewStory: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 10,
    borderRadius: 16,
    backgroundColor: colors.continueCard,
    borderWidth: 1,
    borderColor: colors.continueBorder,
  },
  previewArt: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.pillBg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 10,
  },
  previewEmoji: { fontSize: 20 },
  previewStoryText: { flex: 1, minWidth: 0 },
  previewStoryTitle: { ...theme.typography.section, fontSize: 15, color: colors.textDark },
  previewStoryMeta: { ...theme.typography.caption, color: colors.textMuted, marginTop: 2 },
  previewPlayer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: colors.playerBg,
  },
  previewPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  previewTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.sliderTrack,
    overflow: 'hidden' as const,
  },
  previewFill: { width: '40%' as const, height: '100%' as const, backgroundColor: colors.primary },
  previewTime: { ...theme.typography.caption, color: colors.playerMuted },
  modeRow: { flexDirection: 'row' as const, gap: 10, marginBottom: 8 },
  modeTile: {
    flex: 1,
    padding: 8,
    paddingBottom: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.cardBg,
  },
  // Same outer size selected or not (1 + 1 vs 2), so the row doesn't shift.
  modeTileSelected: { borderColor: colors.primary, borderWidth: 2, padding: 7, paddingBottom: 9 },
  miniFrame: {
    height: 72,
    borderRadius: 10,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  miniSplit: { flex: 1, flexDirection: 'row' as const },
  modeLabelRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    marginTop: 8,
  },
  modeTitle: { ...theme.typography.badge, fontSize: 13, color: colors.textDark, flexShrink: 1 },
  modeTitleSelected: { color: colors.primary },
  modeSubtitle: { ...theme.typography.caption, color: colors.textMuted, marginTop: 2 },
  selectedIndicator: {
    position: 'absolute' as const,
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.success,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  check: { color: colors.onPrimary, fontSize: 14, fontWeight: '800' as const },
  swatchCard: {
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.cardBg,
    flexDirection: 'row' as const,
    // Two rows of five: ten swatches don't fit in one row on a phone.
    flexWrap: 'wrap' as const,
    rowGap: 16,
    justifyContent: 'flex-start' as const,
  },
  swatchItem: { alignItems: 'center' as const, width: '20%' as const },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  // Ring in the text color, so it shows on any swatch in light and dark mode.
  swatchSelected: { borderWidth: 3, borderColor: colors.textDark },
  swatchLabel: { ...theme.typography.badge, color: colors.textMuted, marginTop: 8 },
  swatchLabelSelected: { color: colors.textDark },
  caption: { ...theme.typography.body, color: colors.textMuted, marginTop: 12 },
  resetBtn: {
    alignSelf: 'center' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.cardBg,
  },
  resetBtnDisabled: { opacity: 0.45 },
  resetText: { ...theme.typography.section, color: colors.primary },
});
