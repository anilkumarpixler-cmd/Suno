import React from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/Common/header';
import { StoryCard } from '@/components/Common/Home/StoryCart';
import { showToast } from '@/components/Common/Toast';
import { useApp } from '@/Context/AppContext';
import { spacing, theme, ThemeColors } from '@/Theme/Index';
import { useThemedStyles } from '@/Theme/ThemeProvider';

export const FavoritesScreen: React.FC = () => {
  const { stories, defaultNarrator, playStory, setCurrentScreen, toggleFavorite } = useApp();
  const styles = useThemedStyles(makeStyles);
  const favorites = stories.filter((story) => story.isFavorite);

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Favorites" showBack onBack={() => setCurrentScreen('NowPlaying')} />
      <FlatList
        data={favorites}
        keyExtractor={(story) => story.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No favorites yet</Text>
            <Text style={styles.emptySub}>
              Tap the heart on a story to save it here.
            </Text>
          </View>
        }
        renderItem={({ item: story }) => (
          <StoryCard
            story={story}
            narrator={defaultNarrator}
            onPress={() => playStory(story, true)}
            onRemove={() => {
              toggleFavorite(story.id);
              showToast('Removed from favorites', 'success');
            }}
          />
        )}
      />
    </SafeAreaView>
  );
};

export default FavoritesScreen;

const makeStyles = (colors: ThemeColors) => ({
  container: { flex: 1, backgroundColor: colors.background },
  // Extra bottom space so the last story clears the mini player.
  list: { padding: spacing.md, paddingBottom: 140, flexGrow: 1 },
  empty: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl * 2,
  },
  emptyTitle: { ...theme.typography.section, color: colors.textDark, marginBottom: 8 },
  emptySub: { ...theme.typography.body, color: colors.textMuted, textAlign: 'center' as const },
});
