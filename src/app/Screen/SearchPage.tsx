import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/Common/header';
import { StoryCard } from '@/components/Common/Home/StoryCart';
import { useApp } from '@/Context/AppContext';
import { storyLanguage } from '@/Data/albums';
import { borderRadius, spacing, theme, ThemeColors } from '@/Theme/Index';
import { useAppTheme, useThemedStyles } from '@/Theme/ThemeProvider';
import { Story } from '@/Types';
import {
  addSearchHistory,
  clearSearchHistory,
  getSearchHistory,
  normalize,
  searchHistoryClearCount,
} from '@/storage/searchHistory';

/** A story's searchable text, normalized once per story list (not on every key press). */
type SearchEntry = { story: Story; title: string; child: string; tags: string; script: string };

/** Partial match ("aar" finds "Aarav"): 0 title, 1 child's name, 2 category / language,
 * 3 words in the story; null = no match. Lower ranks are listed first. */
const matchRank = (entry: SearchEntry, query: string): number | null => {
  if (entry.title.includes(query)) return 0;
  if (entry.child.includes(query)) return 1;
  if (entry.tags.includes(query)) return 2;
  if (entry.script.includes(query)) return 3;
  return null;
};

export const SearchScreen: React.FC = () => {
  const { stories, playingNarrator, playStory, setCurrentScreen } = useApp();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    void getSearchHistory().then((saved) => {
      if (mounted) setHistory(saved);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const entries = useMemo<SearchEntry[]>(
    () =>
      stories.map((story) => ({
        story,
        title: normalize(story.title),
        child: story.childName ? normalize(story.childName) : '',
        tags: normalize(`${story.category} ${storyLanguage(story)}`),
        script: normalize(story.script || ''),
      })),
    [stories],
  );

  const normalizedQuery = normalize(query);
  // Best matches first; sort is stable, so equal ranks keep the server's newest-first order.
  const results = normalizedQuery
    ? entries
        .map((entry) => ({ story: entry.story, rank: matchRank(entry, normalizedQuery) }))
        .filter((match): match is { story: Story; rank: number } => match.rank !== null)
        .sort((a, b) => a.rank - b.rank)
        .map((match) => match.story)
    : stories;
  const showHistory = !normalizedQuery && history.length > 0;

  // Saved on the Search key or on opening a result, not per keystroke ("a", "aa", "aar"…).
  const rememberQuery = () => {
    if (!normalizedQuery) return;
    const askedAt = searchHistoryClearCount();
    // A save that finishes after "Clear all" must not put the old list back on screen.
    void addSearchHistory(query).then((next) => {
      if (searchHistoryClearCount() === askedAt) setHistory(next);
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    void clearSearchHistory();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Search" showBack onBack={() => setCurrentScreen('Home')} />

      <View style={styles.searchBox}>
        <MaterialIcons name="search" size={22} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search titles, names or words in a story"
          placeholderTextColor={colors.placeholder}
          selectionColor={colors.primary}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={rememberQuery}
          accessibilityLabel="Search stories"
        />
        {query !== '' && (
          <Pressable
            style={styles.clearButton}
            onPress={() => setQuery('')}
            accessibilityRole="button"
            accessibilityLabel="Clear search">
            <MaterialIcons name="close" size={20} color={colors.textMuted} />
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
          <>
            {showHistory && (
              <View style={styles.history}>
                <View style={styles.historyHeader}>
                  <Text style={styles.sectionTitle}>Recent searches</Text>
                  <Pressable
                    onPress={handleClearHistory}
                    hitSlop={8}
                    accessibilityRole="link"
                    accessibilityLabel="Clear all recent searches">
                    <Text style={styles.clearAllText}>Clear all</Text>
                  </Pressable>
                </View>
                {history.map((item) => (
                  <Pressable
                    key={item}
                    style={styles.historyItem}
                    onPress={() => setQuery(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Search ${item}`}>
                    <MaterialIcons
                      name="history"
                      size={20}
                      color={colors.textMuted}
                      style={styles.historyIcon}
                    />
                    <Text style={styles.historyText} numberOfLines={1}>
                      {item}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            {results.length > 0 && (
              <Text style={styles.sectionTitle}>
                {normalizedQuery
                  ? `${results.length} ${results.length === 1 ? 'story' : 'stories'} found`
                  : 'All stories'}
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {normalizedQuery ? `No stories found for "${query.trim()}"` : 'No stories yet'}
            </Text>
            <Text style={styles.emptySub}>
              {normalizedQuery
                ? 'Try a different word.'
                : 'Create a story and it will show up here.'}
            </Text>
          </View>
        }
        renderItem={({ item: story }) => (
          <StoryCard
            story={story}
            narrator={playingNarrator}
            onPress={() => {
              rememberQuery();
              playStory(story, true);
            }}
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
  searchIcon: { marginRight: 8 },
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
  sectionTitle: { ...theme.typography.section, color: colors.textDark, marginBottom: spacing.sm },
  history: { marginBottom: spacing.md },
  historyHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  clearAllText: { ...theme.typography.caption, color: colors.primary, marginBottom: spacing.sm },
  historyItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  historyIcon: { marginRight: 10 },
  historyText: { flex: 1, ...theme.typography.body, color: colors.textMuted },
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
