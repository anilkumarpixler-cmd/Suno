import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, StyleSheet, useColorScheme, View } from 'react-native';
import {
  buildPalette,
  ColorScheme,
  Gradients,
  palettes,
  THEME_ACCENTS,
  ThemeAccent,
  ThemeColors,
} from './Index';

export type AppearanceMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = '@suno_appearance';
const ACCENT_STORAGE_KEY = '@suno_theme_color';

export const appearanceLabel = (mode: AppearanceMode) =>
  ({ system: 'Match device', light: 'Light', dark: 'Dark' })[mode];

type ThemeContextValue = {
  mode: AppearanceMode;
  scheme: ColorScheme;
  /** Theme color: buttons, highlights and gradients. */
  accent: ThemeAccent;
  colors: ThemeColors;
  gradients: Gradients;
  setMode: (mode: AppearanceMode) => void;
  setAccent: (accent: ThemeAccent) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const parseMode = (value: string | null): AppearanceMode =>
  value === 'light' || value === 'dark' || value === 'system' ? value : 'system';

const parseAccent = (value: string | null): ThemeAccent =>
  THEME_ACCENTS.includes(value as ThemeAccent) ? (value as ThemeAccent) : 'purple';

let cachedMode: AppearanceMode | null = null;
let cachedAccent: ThemeAccent = 'purple';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const system = useColorScheme();
  const [mode, setModeState] = useState<AppearanceMode>(cachedMode ?? 'system');
  const [accent, setAccentState] = useState<ThemeAccent>(cachedAccent);
  const [ready, setReady] = useState(cachedMode !== null);

  useEffect(() => {
    if (cachedMode !== null) {
      void SplashScreen.hideAsync();
      return;
    }
    let cancelled = false;
    AsyncStorage.multiGet([STORAGE_KEY, ACCENT_STORAGE_KEY])
      .then(([[, savedMode], [, savedAccent]]) => {
        if (cancelled) return;
        const next = parseMode(savedMode);
        cachedMode = next;
        cachedAccent = parseAccent(savedAccent);
        setModeState(next);
        setAccentState(cachedAccent);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = (next: AppearanceMode) => {
    cachedMode = next;
    setModeState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const setAccent = (next: ThemeAccent) => {
    cachedAccent = next;
    setAccentState(next);
    void AsyncStorage.setItem(ACCENT_STORAGE_KEY, next);
  };

  const scheme: ColorScheme =
    mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  const palette = useMemo(() => buildPalette(scheme, accent), [scheme, accent]);

  useEffect(() => {
    if (!ready) return;
    void SplashScreen.hideAsync();
  }, [ready]);

  const value = useMemo(
    () => ({
      mode,
      scheme,
      accent,
      colors: palette.colors,
      gradients: palette.gradients,
      setMode,
      setAccent,
    }),
    [mode, scheme, accent, palette],
  );

  if (!ready) {
    const bootScheme = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
    return (
      <View
        style={{ flex: 1, backgroundColor: palettes[bootScheme].colors.background }}
      />
    );
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAppTheme must be used within ThemeProvider');
  return context;
};

export const useThemedStyles = <T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: ThemeColors, gradients: Gradients) => T,
) => {
  const { colors, gradients, scheme } = useAppTheme();
  return useMemo(() => StyleSheet.create(factory(colors, gradients)), [colors, gradients, scheme]);
};
