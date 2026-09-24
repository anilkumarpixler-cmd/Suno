import React from 'react';
import { Text, View } from 'react-native';
import { spacing, theme, ThemeColors } from '@/Theme/Index';
import { useThemedStyles } from '@/Theme/ThemeProvider';

type NarratorCardProps = {
  avatar: string;
  name: string;
  languages: string;
};

export const NarratorCard: React.FC<NarratorCardProps> = ({ avatar, name, languages }) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.narratorCard}>
      <View style={styles.narratorAvatarCircle}>
        <Text style={styles.avatar}>{avatar}</Text>
      </View>
      <View style={styles.narratorDetails}>
        <Text style={styles.narratorName}>{name}</Text>
        <Text style={styles.languages}>{languages}</Text>
      </View>
      <View style={styles.selectedIndicator} accessibilityLabel={`${name} selected`}>
        <Text style={styles.check}>✓</Text>
      </View>
    </View>
  );
};

const makeStyles = (colors: ThemeColors) => ({
  narratorCard: {
    backgroundColor: colors.cardBg,
    borderColor: colors.borderLight,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 90,
    padding: spacing.md,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  narratorAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.purpleLightBg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: spacing.sm,
  },
  avatar: { fontSize: 27 },
  narratorDetails: { flex: 1 },
  narratorName: { ...theme.typography.cardTitle, color: colors.textDark },
  languages: { ...theme.typography.body, color: colors.textMuted, marginTop: 4 },
  selectedIndicator: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.success,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  check: { color: colors.onPrimary, fontSize: 16, fontWeight: '800' as const },
});
