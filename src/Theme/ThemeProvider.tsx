import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { ColorScheme, palettes, ThemeColors } from './Index';

export type AppearanceMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = '@suno_appearance';

const MODE_ORDER: AppearanceMode[] = ['system', 'light', 'dark'];

export const appearanceLabel = (mode: AppearanceMode) =>
  ({ system: 'Match device', light: 'Light', dark: 'Dark' })[mode];

type Gradients = (typeof palettes)['light']['gradients'];

type ThemeContextValue = {
  mode: AppearanceMode;
  scheme: ColorScheme;
  colors: ThemeColors;
  gradients: Gradients;
  setMode: (mode: AppearanceMode) => void;
  cycleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const parseMode = (value: string | null): AppearanceMode =>
  value === 'light' || value === 'dark' || value === 'system' ? value : 'system';

let cachedMode: AppearanceMode | null = null;

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const system = useColorScheme();
  const [mode, setModeState] = useState<AppearanceMode>(cachedMode ?? 'system');
  const [ready, setReady] = useState(cachedMode !== null);

  useEffect(() => {
    if (cachedMode !== null) {
      void SplashScreen.hideAsync();
      return;
    }
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((savedMode) => {
        if (cancelled) return;
        const next = parseMode(savedMode);
        cachedMode = next;
        setModeState(next);
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

  const cycleMode = () => {
    setMode(MODE_ORDER[(MODE_ORDER.indexOf(mode) + 1) % MODE_ORDER.length]);
  };

  const scheme: ColorScheme =
    mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  const palette = palettes[scheme];

  useEffect(() => {
    if (!ready) return;
    void SplashScreen.hideAsync();
  }, [ready]);

  const value = useMemo(
    () => ({
      mode,
      scheme,
      colors: palette.colors,
      gradients: palette.gradients,
      setMode,
      cycleMode,
    }),
    [mode, scheme, palette],
  );

  if (!ready) {
    return <View style={{ flex: 1 }} />;
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
