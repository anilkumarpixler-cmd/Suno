import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/app-text';
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
          <Text style={styles.iconText}>←</Text>
        </TouchableOpacity>
      ) : (
        <Text variant="display" style={styles.logo}>suno.</Text>
      )}

      {title && <Text variant="title" style={styles.title}>{title}</Text>}

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
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: -1,
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