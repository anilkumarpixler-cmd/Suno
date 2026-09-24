import { useEffect } from 'react';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from '@/Context/AppContext';
import { BottomNavigation } from '@/components/Common/BottomNavigation';
import { MiniPlayerBar } from '@/components/Common/MiniPlayerBar';
import { Toast } from '@/components/Common/Toast';
import { ThemeProvider, useAppTheme } from '@/Theme/ThemeProvider';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';
import { RootScreen } from '@/Types';

void SplashScreen.preventAutoHideAsync();

const tabRoutes: Record<string, RootScreen> = {
  '/': 'Home',
  '/Screen/VoicePage': 'Voices',
  '/Screen/CreateStoryPage': 'Create',
  '/Screen/ProfilePage': 'Profile',
};

function AppNavigator() {
  const pathname = usePathname();
  const { currentScreen, setCurrentScreen } = useApp();
  const { scheme, colors } = useAppTheme();
  useNotificationPermission();
  const activeScreen = tabRoutes[pathname] ?? currentScreen;
  const showBottomNavigation = pathname in tabRoutes && pathname !== '/create';

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
          animationDuration: 200,
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="Screen/VoicePage" />
        <Stack.Screen name="Screen/CreateStoryPage" />
        <Stack.Screen name="Screen/ProfilePage" />
        <Stack.Screen name="Screen/NowPlay" />
        <Stack.Screen name="Screen/AddVoicePage" />
        <Stack.Screen name="Screen/FavoritesPage" />
      </Stack>
      {pathname !== '/Screen/NowPlay' && <MiniPlayerBar />}
      {showBottomNavigation && (
        <BottomNavigation activeScreen={activeScreen} onSelectTab={setCurrentScreen} />
      )}
      <Toast />
    </>
  );
}

export default function AppLayout() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppNavigator />
      </AppProvider>
    </ThemeProvider>
  );
}
