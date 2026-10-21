import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '@/Context/AppContext';
import { BottomNavigation, bottomNavigationHeight } from '@/components/Common/BottomNavigation';
import { MiniPlayerBar } from '@/components/Common/MiniPlayerBar';
import { setBottomToastOffset, Toast } from '@/components/Common/Toast';
import { ThemeProvider, useAppTheme } from '@/Theme/ThemeProvider';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';
import { ConfirmModal } from '@/modal/confirmModal';
import { RootScreen } from '@/Types';

void SplashScreen.preventAutoHideAsync();

const tabRoutes: Record<string, RootScreen> = {
  '/': 'Home',
  '/Screen/SearchPage': 'Search',
  '/Screen/VoicePage': 'Voices',
  '/Screen/CreateStoryPage': 'Create',
  '/Screen/ProfilePage': 'Profile',
};

function AppNavigator() {
  const pathname = usePathname();
  const { currentScreen, setCurrentScreen } = useApp();
  const { scheme, colors } = useAppTheme();
  const notification = useNotificationPermission();
  const activeScreen = tabRoutes[pathname] ?? currentScreen;
  const showBottomNavigation = pathname in tabRoutes && pathname !== '/create';
  const insets = useSafeAreaInsets();
  // Only on the tab screens and the recording page (Add Voice); not on Now Playing or the
  // settings sub-screens (Favorites, Sleep timer, Appearance).
  const showMiniPlayer = showBottomNavigation || pathname === '/Screen/AddVoicePage';
  // Measured: 0 while no story is active (the bar renders nothing).
  const [miniPlayerHeight, setMiniPlayerHeight] = useState(0);

  // Bottom toasts sit just above the mini player, else above the tab bar / the phone's nav bar.
  const bottomBase = showBottomNavigation ? bottomNavigationHeight(insets.bottom) : insets.bottom;
  const toastOffset = bottomBase + (showMiniPlayer ? miniPlayerHeight : 0) + 8;
  useEffect(() => {
    setBottomToastOffset(toastOffset);
  }, [toastOffset]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.screenArea}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'fade',
            animationDuration: 200,
          }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="Screen/SearchPage" />
          <Stack.Screen name="Screen/VoicePage" />
          <Stack.Screen name="Screen/CreateStoryPage" />
          <Stack.Screen name="Screen/ProfilePage" />
          <Stack.Screen name="Screen/NowPlay" />
          <Stack.Screen name="Screen/AddVoicePage" />
          <Stack.Screen name="Screen/FavoritesPage" />
          <Stack.Screen name="Screen/SleepTimerPage" />
          <Stack.Screen name="Screen/AppearancePage" />
        </Stack>
        {/* Floats over the screen: the content shows around the rounded card. Above the tab bar
            on tab screens; elsewhere above the phone's nav bar. */}
        {showMiniPlayer && (
          <View
            style={[styles.miniPlayer, !showBottomNavigation && { bottom: insets.bottom }]}
            onLayout={(event) => setMiniPlayerHeight(Math.round(event.nativeEvent.layout.height))}>
            <MiniPlayerBar />
          </View>
        )}
      </View>
      {showBottomNavigation && (
        <BottomNavigation activeScreen={activeScreen} onSelectTab={setCurrentScreen} />
      )}
      <Toast />
      {/* After a permanent deny only; themed (light / dark). The permission dialog itself is Android's. */}
      <ConfirmModal
        visible={notification.prompt === 'settings'}
        title="Notifications are off"
        message="To see story controls on the lock screen and notification panel, turn on notifications in Settings."
        cancelLabel="Not now"
        confirmLabel="Open Settings"
        confirmVariant="primary"
        onCancel={notification.dismiss}
        onConfirm={notification.openSettings}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screenArea: { flex: 1 },
  miniPlayer: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});

export default function AppLayout() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppNavigator />
      </AppProvider>
    </ThemeProvider>
  );
}
