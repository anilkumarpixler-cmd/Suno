import React from 'react';
import { Text } from 'react-native';
import { Image } from 'expo-image';
import { useReducedMotion } from 'react-native-reanimated';
import { Category } from '../../Types';

// Google Noto Animated Emoji (CC BY 4.0), one per category.
const ANIMATED_ART: Partial<Record<Category, number>> = {
  Bedtime: require('@/assets/images/story-art/bedtime.webp'),
  Funny: require('@/assets/images/story-art/funny.webp'),
  Magical: require('@/assets/images/story-art/magical.webp'),
  Learning: require('@/assets/images/story-art/learning.webp'),
  Animals: require('@/assets/images/story-art/animals.webp'),
  Adventure: require('@/assets/images/story-art/adventure.webp'),
};

type StoryArtProps = {
  category: Category;
  /** The story's emoji: shown when its category has no animated icon, and read by screen readers. */
  emoji: string;
  size: number;
};

/** A story's animated category icon. With reduced motion on, it stays on its first frame. */
export const StoryArt: React.FC<StoryArtProps> = ({ category, emoji, size }) => {
  const reduceMotion = useReducedMotion();
  const source = ANIMATED_ART[category];

  if (!source) {
    return <Text style={{ fontSize: Math.round(size * 0.9) }}>{emoji}</Text>;
  }
  return (
    <Image
      source={source}
      style={{ width: size, height: size }}
      contentFit="contain"
      autoplay={!reduceMotion}
      accessibilityLabel={emoji}
    />
  );
};
