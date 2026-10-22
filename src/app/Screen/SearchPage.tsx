import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/Common/header';
import { StoryCard } from '@/components/Common/Home/StoryCart';
import { useApp } from '@/Context/AppContext';
import { borderRadius, spacing, theme, ThemeColors } from '@/Theme/Index';
import { useAppTheme, useThemedStyles } from '@/Theme/ThemeProvider';
import { Story } from '@/Types';
import {
  addSearchHistory,
  clearSearchHistory,
  getSearchHistory,
  normalize,
} from '@/storage/searchHistory';

/** Title or child's name contains the query (partial: "aar" finds "Aarav"). */
const matchesQuery = (story: Story, query: string) =>
  normalize(story.title).includes(query) ||
  (story.childName ? normalize(story.childName).includes(query) : false);

export const SearchScreen: React.FC = () => {
  const { stories, defaultNarrator, playStory, setCurrentScreen } = useApp();
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

  const normalizedQuery = normalize(query);
  const results = normalizedQuery
    ? stories.filter((story) => matchesQuery(story, normalizedQuery))
    : stories;
  const showHistory = !normalizedQuery && history.length > 0;

  // Saved on the Search key or on opening a result, not per keystroke ("a", "aa", "aar"…).
  const rememberQuery = () => {
    if (!normalizedQuery) return;
    void addSearchHistory(query).then(setHistory);
  };

  const handleClearHistory = () => {
    setHistory([]);
    void clearSearchHistory();
  };

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
          onSubmitEditing={rememberQuery}
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
                    <Text style={styles.historyIcon}>🕘</Text>
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
                ? "Try a different title or child's name."
                : 'Create a story and it will show up here.'}
            </Text>
          </View>
        }
        renderItem={({ item: story }) => (
          <StoryCard
            story={story}
            narrator={defaultNarrator}
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
  historyIcon: { fontSize: 14, marginRight: 10 },
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
