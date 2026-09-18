import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { RootScreen } from '../../Types';
import { theme, ThemeColors } from '../../Theme/Index';
import { useThemedStyles } from '../../Theme/ThemeProvider';

interface BottomNavProps {
  activeScreen: RootScreen;
  onSelectTab: (screen: RootScreen) => void;
}

export const BottomNavigation: React.FC<BottomNavProps> = ({ activeScreen, onSelectTab }) => {
  const styles = useThemedStyles(makeStyles);
  const tabs: { key: RootScreen; label: string; icon: string }[] = [
    { key: 'Home', label: 'Home', icon: '🏠' },
    { key: 'Voices', label: 'Voices', icon: '🎙️' },
    { key: 'Create', label: 'Create', icon: '✨' },
    { key: 'Profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeScreen === tab.key;
        const isCreate = tab.key === 'Create';

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onSelectTab(tab.key)}
          >
            <View style={[isCreate && styles.createPill]}>
              <Text style={[styles.icon, isCreate && styles.createIcon]}>{tab.icon}</Text>
            </View>
            <Text style={[styles.label, isActive && styles.activeLabel]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const makeStyles = (colors: ThemeColors) => ({
  container: {
    height: 70,
    backgroundColor: colors.navBg,
    flexDirection: 'row' as const,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingBottom: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  icon: {
    fontSize: 20,
  },
  label: {
    ...theme.typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  activeLabel: {
    ...theme.typography.badge,
    color: colors.primary,
    marginTop: 2,
  },
  createPill: {
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  createIcon: {
    fontSize: 18,
  },
});
