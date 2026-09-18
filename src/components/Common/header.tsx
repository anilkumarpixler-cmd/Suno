import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { spacing, theme, ThemeColors } from '../../Theme/Index';
import { useThemedStyles } from '../../Theme/ThemeProvider';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, showBack, onBack, rightElement }) => {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.container}>
      {showBack ? (
        <TouchableOpacity onPress={onBack} style={styles.side} accessibilityLabel="Go back">
          <Text style={styles.iconText}>‹</Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.side, styles.logoSide]}>
          <Text style={styles.logo}>
            suno<Text style={styles.logoDot}>.</Text>
          </Text>
        </View>
      )}
      <Text style={styles.title} numberOfLines={1}>
        {title?.trim() ?? ''}
      </Text>
      <View style={styles.side}>{rightElement}</View>
    </View>
  );
};

const makeStyles = (colors: ThemeColors) => ({
  container: {
    height: 56,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.sm,
  },
  side: {
    minWidth: 48,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  logoSide: { minWidth: 120, alignItems: 'flex-start' as const, paddingLeft: spacing.sm },
  logo: { ...theme.typography.hero, color: colors.textDark },
  logoDot: { color: colors.primary },
  title: {
    ...theme.typography.section,
    color: colors.textDark,
    flex: 1,
    textAlign: 'center' as const,
  },
  iconText: { fontSize: 28, lineHeight: 32, color: colors.textDark },
});
