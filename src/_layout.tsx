import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const [fontsLoaded] = useFonts({
    Mulish_400Regular: require('@/assets/fonts/Mulish-Regular.ttf'),
    Mulish_500Medium: require('@/assets/fonts/Mulish-Medium.ttf'),
    Mulish_600SemiBold: require('@/assets/fonts/Mulish-SemiBold.ttf'),
    Mulish_700Bold: require('@/assets/fonts/Mulish-Bold.ttf'),
    Mulish_800ExtraBold: require('@/assets/fonts/Mulish-ExtraBold.ttf'),
  });
  const colorScheme = useColorScheme();

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs/>
    </ThemeProvider>
  );
}
