import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../Theme/Index';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, showBack, onBack, rightElement }) => {
  return (
    <View style={styles.container}>
      {showBack ? (
        <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
          <Text style={styles.iconText}>‹</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>
            suno<Text style={styles.logoDot}>.</Text>
          </Text>
        </View>
      )}

      {title && <Text style={styles.title}>{title}</Text>}

      <View style={styles.rightSlot}>{rightElement}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
  },
  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.textDark,
    letterSpacing: -1,
  },
  logoContainer: {
    paddingLeft: 0,
  },
  logoDot: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  iconBtn: {
    padding: theme.spacing.xs,
  },
  iconText: {
    fontSize: 22,
    color: theme.colors.textDark,
    fontWeight: '600',
  },
  rightSlot: {
    minWidth: 32,
    alignItems: 'flex-end',
  },
});