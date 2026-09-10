import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from './Context/AppContext';
import { BottomNavigation } from './components/Common/BottomNavigation';
import { Toast } from './components/Common/Toast';
import { RootScreen } from './Types';

const tabRoutes: Record<string, RootScreen> = {
  '/': 'Home',
  '/Screen/VoicePage': 'Voices',
  '/Screen/CreateStoryPage': 'Create',
  '/Screen/ProfilePage': 'Profile',
};

function AppNavigator() {
  const pathname = usePathname();
  const { currentScreen, setCurrentScreen } = useApp();
  const activeScreen = tabRoutes[pathname] ?? currentScreen;
  const showBottomNavigation = pathname in tabRoutes && pathname !== '/create';

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="Screen/VoicePage" />
        <Stack.Screen name="Screen/CreateStoryPage" />
        <Stack.Screen name="Screen/ProfilePage" />
        <Stack.Screen name="Screen/NowPlay" />
        <Stack.Screen name="Screen/AddVoicePage" />
      </Stack>
      {showBottomNavigation && (
        <BottomNavigation activeScreen={activeScreen} onSelectTab={setCurrentScreen} />
      )}
      <Toast />
    </>
  );
}

export default function AppLayout() {
  return (
    <AppProvider>
      <AppNavigator />
    </AppProvider>
  );
}
