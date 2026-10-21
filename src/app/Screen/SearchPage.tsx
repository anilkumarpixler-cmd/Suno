import React, { useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/Common/header';
import { StoryCard } from '@/components/Common/Home/StoryCart';
import { useApp } from '@/Context/AppContext';
import { borderRadius, spacing, theme, ThemeColors } from '@/Theme/Index';
import { useAppTheme, useThemedStyles } from '@/Theme/ThemeProvider';
import { Story } from '@/Types';

/** Case and extra spaces don't matter: "  AARAV " finds "Aarav Goes to the Moon". */
const normalize = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase();

/** Title or child's name contains the query (partial: "aar" finds "Aarav"). */
const matchesQuery = (story: Story, query: string) =>
  normalize(story.title).includes(query) ||
  (story.childName ? normalize(story.childName).includes(query) : false);

export const SearchScreen: React.FC = () => {
  const { stories, defaultNarrator, playStory, setCurrentScreen } = useApp();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const [query, setQuery] = useState('');

  const normalizedQuery = normalize(query);
  const results = normalizedQuery
    ? stories.filter((story) => matchesQuery(story, normalizedQuery))
    : stories;

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Search" showBack onBack={() => setCurrentScreen('Home')} />

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by story title or child's name"
          placeholderTextColor={colors.placeholder}
          selectionColor={colors.primary}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search stories"
        />
        {query !== '' && (
          <Pressable
            style={styles.clearButton}
            onPress={() => setQuery('')}
            accessibilityRole="button"
            accessibilityLabel="Clear search">
            <Text style={styles.clearIcon}>✕</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={results}
        keyExtractor={(story) => story.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          results.length > 0 ? (
            <Text style={styles.sectionTitle}>
              {normalizedQuery
                ? `${results.length} ${results.length === 1 ? 'story' : 'stories'} found`
                : 'All stories'}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {normalizedQuery ? `No stories found for "${query.trim()}"` : 'No stories yet'}
            </Text>
            <Text style={styles.emptySub}>
              {normalizedQuery
                ? "Try a different title or child's name."
                : 'Create a story and it will show up here.'}
            </Text>
          </View>
        }
        renderItem={({ item: story }) => (
          <StoryCard
            story={story}
            narrator={defaultNarrator}
            onPress={() => playStory(story, true)}
          />
        )}
      />
    </SafeAreaView>
  );
};

export default SearchScreen;

const makeStyles = (colors: ThemeColors) => ({
  container: { flex: 1, backgroundColor: colors.background },
  searchBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: 14,
    minHeight: 51,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.cardBg,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 13,
    color: colors.textDark,
    ...theme.typography.body,
  },
  clearButton: {
    width: 32,
    height: 32,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  clearIcon: { ...theme.typography.section, color: colors.textMuted },
  sectionTitle: { ...theme.typography.section, color: colors.textDark, marginBottom: spacing.sm },
  // Extra bottom space so the last story clears the mini player.
  list: { padding: spacing.md, paddingBottom: 140, flexGrow: 1 },
  empty: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl * 2,
  },
  emptyTitle: {
    ...theme.typography.section,
    color: colors.textDark,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  emptySub: { ...theme.typography.body, color: colors.textMuted, textAlign: 'center' as const },
});
