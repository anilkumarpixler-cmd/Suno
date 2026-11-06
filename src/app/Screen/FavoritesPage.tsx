import React, { useState } from 'react';
import { FlatList, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/Common/header';
import { StoryArt } from '@/components/Common/StoryArt';
import { showToast } from '@/components/Common/Toast';
import { useApp } from '@/Context/AppContext';
import { borderRadius, spacing, theme, ThemeColors } from '@/Theme/Index';
import { useAppTheme, useThemedStyles } from '@/Theme/ThemeProvider';
import { normalize } from '@/storage/searchHistory';

const formatLength = (seconds: number) => `${Math.max(1, Math.round(seconds / 60))} min`;

export const FavoritesScreen: React.FC = () => {
  const { stories, activeStory, playingNarrator, playStory, setCurrentScreen, toggleFavorite } = useApp();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useAppTheme();
  const favorites = stories.filter((story) => story.isFavorite);
  const narratorLabel = playingNarrator?.name ? `${playingNarrator.name}'s voice` : 'System Voice';

  // The header's search icon opens a box that filters favorites by title only.
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const normalizedQuery = normalize(query);
  const shown = normalizedQuery
    ? favorites.filter((story) => normalize(story.title).includes(normalizedQuery))
    : favorites;

  const toggleSearch = () => {
    // Closing clears the filter, so the full list is back.
    if (searchOpen) setQuery('');
    setSearchOpen((open) => !open);
  };

  const removeFavorite = (storyId: string) => {
    toggleFavorite(storyId);
    showToast('Removed from favorites', 'success');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Favorites"
        showBack
        onBack={() => setCurrentScreen('NowPlaying')}
        rightElement={
          favorites.length > 0 ? (
            <TouchableOpacity
              style={styles.headerIcon}
              onPress={toggleSearch}
              accessibilityRole="button"
              accessibilityState={{ expanded: searchOpen }}
              accessibilityLabel={searchOpen ? 'Close search' : 'Search favorites'}>
              <MaterialIcons
                name={searchOpen ? 'close' : 'search'}
                size={26}
                color={colors.textDark}
              />
            </TouchableOpacity>
          ) : null
        }
      />
      {searchOpen && favorites.length > 0 && (
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={22} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search favorites by title"
            placeholderTextColor={colors.placeholder}
            selectionColor={colors.primary}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search favorites by title"
          />
          {query !== '' && (
            <Pressable
              style={styles.clearButton}
              onPress={() => setQuery('')}
              accessibilityRole="button"
              accessibilityLabel="Clear search">
              <MaterialIcons name="cancel" size={20} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      )}
      <FlatList
        data={shown}
        keyExtractor={(story) => story.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          shown.length > 0 ? (
            <Text style={styles.count}>
              {normalizedQuery
                ? `${shown.length} of ${favorites.length} saved ${favorites.length === 1 ? 'story' : 'stories'}`
                : `${favorites.length} saved ${favorites.length === 1 ? 'story' : 'stories'}`}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          favorites.length > 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <MaterialIcons name="search-off" size={36} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>{`No favorites named "${query.trim()}"`}</Text>
              <Text style={styles.emptySub}>Try a different title.</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <MaterialIcons name="favorite-border" size={36} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No favorites yet</Text>
              <Text style={styles.emptySub}>Tap the heart on a story to save it here.</Text>
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => setCurrentScreen('Home')}
                accessibilityRole="button">
                <Text style={styles.browseText}>Browse stories</Text>
              </TouchableOpacity>
            </View>
          )
        }
        renderItem={({ item: story, index }) => {
          const isActive = activeStory?.id === story.id;
          return (
            <View style={[styles.row, isActive && styles.rowActive]}>
              <Pressable
                style={styles.mainPress}
                onPress={() => playStory(story, true)}
                accessibilityRole="button"
                accessibilityLabel={story.title}>
                <Text style={styles.number}>{index + 1}</Text>
                <View style={styles.art}>
                  <StoryArt category={story.category} emoji={story.artwork} size={30} />
                </View>
                <View style={styles.body}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={1}>
                      {story.title}
                    </Text>
                    {isActive ? <Text style={styles.playingBadge}>Playing</Text> : null}
                  </View>
                  <Text style={styles.meta} numberOfLines={1}>
                    {story.category} · {formatLength(story.duration)} · {narratorLabel}
                  </Text>
                </View>
              </Pressable>
              <TouchableOpacity
                style={styles.heartBtn}
                onPress={() => removeFavorite(story.id)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${story.title} from favorites`}>
                <MaterialIcons name="favorite" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
};

export default FavoritesScreen;

const makeStyles = (colors: ThemeColors) => ({
  container: { flex: 1, backgroundColor: colors.background },
  headerIcon: {
    width: 44,
    height: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  // Same box as the Search page.
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
  // Extra bottom space so the last story clears the mini player.
  list: { padding: spacing.md, paddingBottom: 140, flexGrow: 1 },
  count: { ...theme.typography.badge, color: colors.textMuted, marginBottom: spacing.sm, marginLeft: spacing.xs },
  row: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.button,
    borderWidth: 1,
    borderColor: colors.borderLight,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: spacing.sm,
    overflow: 'hidden' as const,
  },
  rowActive: { backgroundColor: colors.continueCard, borderColor: colors.continueBorder },
  mainPress: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    minWidth: 0,
    paddingVertical: 12,
    paddingLeft: spacing.sm,
  },
  number: {
    ...theme.typography.badge,
    width: 24,
    textAlign: 'center' as const,
    color: colors.textMuted,
  },
  art: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.pillBg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginHorizontal: spacing.sm,
  },
  body: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  title: { ...theme.typography.section, color: colors.textDark, flexShrink: 1 },
  playingBadge: {
    ...theme.typography.badge,
    color: colors.primary,
    backgroundColor: colors.purpleLightBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden' as const,
  },
  meta: { ...theme.typography.caption, color: colors.textMuted, marginTop: 4 },
  heartBtn: {
    width: 48,
    alignSelf: 'stretch' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  empty: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl * 2,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.purpleLightBg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: spacing.md,
  },
  emptyTitle: { ...theme.typography.section, color: colors.textDark, marginBottom: 8 },
  emptySub: { ...theme.typography.body, color: colors.textMuted, textAlign: 'center' as const },
  browseBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: borderRadius.button,
    backgroundColor: colors.primary,
  },
  browseText: { ...theme.typography.section, color: colors.onPrimary },
});
