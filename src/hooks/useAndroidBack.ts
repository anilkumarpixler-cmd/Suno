import { useEffect, useRef } from 'react';
import { BackHandler, Platform } from 'react-native';
import { showToast } from '../components/Common/Toast';
import { RootScreen } from '../Types';

/** A second Back on Home within this time closes the app. */
const EXIT_WINDOW_MS = 2000;

// Same screen as each page's own ← button. Every screen change is a router.replace, so without
// this the first hardware Back closed the app from any screen. Voices opened as the narrator
// picker goes back to Now Playing instead (see useAndroidBack).
const BACK_TARGET: Record<Exclude<RootScreen, 'Home'>, RootScreen> = {
  Search: 'Home',
  Voices: 'Home',
  Create: 'Home',
  GenerationLoader: 'Home',
  Profile: 'Home',
  NowPlaying: 'Home',
  AddVoice: 'Voices',
  Favorites: 'NowPlaying',
  SleepTimer: 'Profile',
  Appearance: 'Profile',
};

/** Android hardware Back: other screens go to their parent; Home needs two presses to exit. */
export const useAndroidBack = (
  currentScreen: RootScreen,
  setCurrentScreen: (screen: RootScreen) => void,
  narratorPickerStoryId: string | null,
) => {
  const lastPressRef = useRef(0);
  // Refs: the context re-renders on every playback tick, the listener is added once.
  const screenRef = useRef(currentScreen);
  screenRef.current = currentScreen;
  const navigateRef = useRef(setCurrentScreen);
  navigateRef.current = setCurrentScreen;
  const pickerRef = useRef(Boolean(narratorPickerStoryId));
  pickerRef.current = Boolean(narratorPickerStoryId);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      const screen = screenRef.current;
      if (screen !== 'Home') {
        navigateRef.current(screen === 'Voices' && pickerRef.current ? 'NowPlaying' : BACK_TARGET[screen]);
        return true;
      }
      const now = Date.now();
      // Second press in time: let Android close the app.
      if (now - lastPressRef.current < EXIT_WINDOW_MS) return false;
      lastPressRef.current = now;
      showToast('Press back again to exit', 'info', { durationMs: EXIT_WINDOW_MS });
      return true;
    });
    return () => subscription.remove();
  }, []);
};
