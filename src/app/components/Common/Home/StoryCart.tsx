import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '../Text';
import { Story, Voice } from '../../../Types';
import { theme } from '../../../Theme/Index';

interface StoryCardProps {
  story: Story;
  narrator?: Voice;
  variant?: 'default' | 'continue' | 'compact';
  onPress: () => void;
  onPlayPress?: () => void;
}

export const StoryCard: React.FC<StoryCardProps> = ({
  story,
  narrator,
  variant = 'default',
  onPress,
  onPlayPress,
}) => {
  const isContinue = variant === 'continue';

  return (
    <TouchableOpacity
      style={[styles.card, isContinue && styles.continueCard]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.artworkContainer}>
        <Text style={styles.artworkText}>{story.artwork}</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text variant="title" style={styles.title} numberOfLines={1}>
          {story.title}
        </Text>
        <Text variant="caption" style={styles.description} numberOfLines={2}>
          {story.description}
        </Text>

        <View style={styles.metaRow}>
          <Text variant="caption" style={styles.metaText}>
            {Math.floor(story.duration / 60)} mins • {narrator ? narrator.name : 'Family Voice'}
          </Text>
        </View>

        {isContinue && (
          <View style={styles.progressBg}>
            <View
              style={[
                styles.fill,
                { width: `${(story.progress / story.duration) * 100}%` },
              ]}
            />
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.playBtn}
        onPress={(e) => {
          e.stopPropagation();
          onPlayPress ? onPlayPress() : onPress();
        }}
      >
        <Text style={styles.playIcon}>▶</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  continueCard: {
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D8FD',
  },
  artworkContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  artworkText: {
    fontSize: 32,
  },
  infoContainer: {
    flex: 1,
    marginRight: theme.spacing.xs,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  description: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginVertical: 2,
  },
  metaRow: {
    marginTop: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  progressBg: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: '#FFF',
    fontSize: 14,
    marginLeft: 2,
  },
});