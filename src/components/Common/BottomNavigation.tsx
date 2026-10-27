import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootScreen } from '../../Types';
import { theme, ThemeColors } from '../../Theme/Index';
import { useAppTheme, useThemedStyles } from '../../Theme/ThemeProvider';

// Icon + label row, above the bottom gap.
const TAB_ROW_HEIGHT = 52;

/** The inset is the bottom gap; a small one only where the phone has no nav bar. */
const bottomGapFor = (insetBottom: number) => Math.max(insetBottom, 8);

/** Full height of the tab bar on this phone (for laying things out above it). */
export const bottomNavigationHeight = (insetBottom: number) =>
  TAB_ROW_HEIGHT + bottomGapFor(insetBottom);

interface BottomNavProps {
  activeScreen: RootScreen;
  onSelectTab: (screen: RootScreen) => void;
}

export const BottomNavigation: React.FC<BottomNavProps> = ({ activeScreen, onSelectTab }) => {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useAppTheme();
  // Edge-to-edge: the phone's nav bar (3-button, gesture line, iPhone home indicator) draws over
  // the app. The bar's background runs under it; the tabs sit just above it. 0 when there is none.
  const { bottom } = useSafeAreaInsets();
  const bottomGap = bottomGapFor(bottom);
  const tabs: { key: RootScreen; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
    { key: 'Home', label: 'Home', icon: 'home' },
    { key: 'Search', label: 'Search', icon: 'search' },
    { key: 'Voices', label: 'Voices', icon: 'mic' },
    { key: 'Create', label: 'Create', icon: 'auto-awesome' },
    { key: 'Profile', label: 'Profile', icon: 'person' },
  ];

  return (
    <View style={[styles.container, { height: bottomNavigationHeight(bottom), paddingBottom: bottomGap }]}>
      {tabs.map((tab) => {
        const isActive = activeScreen === tab.key;

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onSelectTab(tab.key)}
          >
            <MaterialIcons
              name={tab.icon}
              size={24}
              color={isActive ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.label, isActive && styles.activeLabel]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const makeStyles = (colors: ThemeColors) => ({
  container: {
    backgroundColor: colors.navBg,
    flexDirection: 'row' as const,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  tab: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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
});
