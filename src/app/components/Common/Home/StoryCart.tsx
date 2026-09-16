import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
        <Text style={styles.title} numberOfLines={1}>
          {story.title}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {story.description}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {Math.floor(story.duration / 60)} mins • {narrator ? narrator.name : 'System Voice'}
          </Text>
        </View>

      </View>
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
    ...theme.typography.cardTitle,
    color: theme.colors.textDark,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginVertical: 2,
  },
  metaRow: {
    marginTop: 4,
  },
  metaText: {
    ...theme.typography.badge,
    color: theme.colors.primary,
  },
});