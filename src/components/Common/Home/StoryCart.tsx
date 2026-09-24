import React from 'react';
import { Pressable, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Story, Voice } from '../../../Types';
import { borderRadius, spacing, theme, ThemeColors } from '../../../Theme/Index';
import { useAppTheme, useThemedStyles } from '../../../Theme/ThemeProvider';

type StoryCardProps = {
  story: Story;
  narrator?: Voice;
  variant?: 'default' | 'continue';
  onPress: () => void;
  onRemove?: () => void;
};

export const StoryCard: React.FC<StoryCardProps> = ({
  story,
  narrator,
  variant = 'default',
  onPress,
  onRemove,
}) => {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useAppTheme();
  const isContinue = variant === 'continue';
  const narratorLabel = narrator?.name ? `${narrator.name} voice's` : 'System Voice';

  return (
    <View style={[styles.card, isContinue && styles.continueCard]}>
      <Pressable
        style={styles.mainPress}
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
          <Text style={styles.preview}>{story.description || story.script}</Text>
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
      {onRemove ? (
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${story.title} from favorites`}>
          <MaterialIcons name="close" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const makeStyles = (colors: ThemeColors) => ({
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.card,
    flexDirection: 'row' as const,
    alignItems: 'stretch' as const,
    marginBottom: spacing.sm,
    overflow: 'hidden' as const,
  },
  mainPress: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    minWidth: 0,
    padding: spacing.md,
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
    backgroundColor: colors.pillBg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: spacing.md,
  },
  artEmoji: { fontSize: 28 },
  body: { flex: 1, minWidth: 0 },
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
  removeBtn: {
    width: 44,
    alignItems: 'center' as const,
    justifyContent: 'flex-start' as const,
    paddingTop: spacing.md,
    paddingRight: spacing.sm,
  },
});
