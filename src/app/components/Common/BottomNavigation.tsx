import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/app-text';
import { RootScreen } from '../../Types';
import { theme } from '../../Theme/Index';

interface BottomNavProps {
  activeScreen: RootScreen;
  onSelectTab: (screen: RootScreen) => void;
}

export const BottomNavigation: React.FC<BottomNavProps> = ({ activeScreen, onSelectTab }) => {
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
            <Text variant="caption" style={[styles.label, isActive && styles.activeLabel]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 70,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingBottom: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  label: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  activeLabel: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  createPill: {
    backgroundColor: theme.colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createIcon: {
    fontSize: 18,
  },
});