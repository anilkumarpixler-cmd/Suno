import React from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from './Context/AppContext';
import { BottomNavigation } from './components/Common/BottomNavigation';

import { HomeScreen } from './Screen/HomePage';
import { NowPlayingScreen } from './Screen/NowPlay';
import { VoicesScreen } from './Screen/VoicePage';
import { AddVoiceScreen } from './Screen/AddVoicePage';
import { CreateStoryScreen } from './Screen/CreateStoryPage';
import { ProfileScreen, SettingsPlaceholderScreen } from './Screen/ProfilePage';

const MainNavigator = () => {
  const { currentScreen, setCurrentScreen } = useApp();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Home':
        return <HomeScreen />;
      case 'NowPlaying':
        return <NowPlayingScreen />;
      case 'Voices':
        return <VoicesScreen />;
      case 'AddVoice':
        return <AddVoiceScreen />;
      case 'Create':
        return <CreateStoryScreen />;
      case 'Profile':
        return <ProfileScreen />;
      case 'EditProfile':
        return <SettingsPlaceholderScreen title="Edit Profile" />;
      case 'Language':
        return <SettingsPlaceholderScreen title="Language" />;
      case 'SleepTimer':
        return <SettingsPlaceholderScreen title="Sleep Timer" />;
      case 'PrivacyData':
        return <SettingsPlaceholderScreen title="Privacy & Voice Data" />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>{renderScreen()}</View>
      {currentScreen !== 'Create' && (
        <BottomNavigation
          activeScreen={currentScreen}
          onSelectTab={(screen) => setCurrentScreen(screen)}
        />
      )}
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainNavigator />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAF8F5' },
  container: { flex: 1 },
});