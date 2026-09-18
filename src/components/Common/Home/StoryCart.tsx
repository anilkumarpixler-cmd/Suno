import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Story, Voice } from '../../../Types';
import { borderRadius, spacing, theme, ThemeColors } from '../../../Theme/Index';
import { useThemedStyles } from '../../../Theme/ThemeProvider';

type StoryCardProps = {
  story: Story;
  narrator?: Voice;
  variant?: 'default' | 'continue';
  onPress: () => void;
};

export const StoryCard: React.FC<StoryCardProps> = ({ story, narrator, variant = 'default', onPress }) => {
  const styles = useThemedStyles(makeStyles);
  const isContinue = variant === 'continue';
  //const narratorName = narrator?.name || (story.narratorId ? 'Narrator' : 'System Voice');
  const narratorLabel = narrator?.name
  ? `${narrator.name} voice's`
  : 'System Voice';

  return (
    <Pressable
      style={[styles.card, isContinue && styles.continueCard]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={story.title}>
      <View style={styles.art}>
        <Text style={styles.artEmoji}>{story.artwork}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {story.title}
        </Text>
        <Text style={styles.preview}>{story.description ||story.script}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {narratorLabel} · {story.category}
        </Text>
        {isContinue && story.progress > 0 ? (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, (story.progress / Math.max(1, story.duration)) * 100)}%` },
              ]}
            />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
};

const makeStyles = (colors: ThemeColors) => ({
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: spacing.sm,
  },
  continueCard: {
    backgroundColor: colors.continueCard,
    borderWidth: 1,
    borderColor: colors.continueBorder,
  },
  art: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: spacing.md,
  },
  artEmoji: { fontSize: 28 },
  body: { flex: 1 },
  title: { ...theme.typography.cardTitle, color: colors.textDark },
  meta: { ...theme.typography.caption, color: colors.textMuted, marginTop: 4 },
  progressTrack: {
    height: 4,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden' as const,
  },
  progressFill: { height: '100%' as const, backgroundColor: colors.primary },
  preview: {
    ...theme.typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
});
