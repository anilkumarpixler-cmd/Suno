import React, { useEffect, useState } from 'react';
import {
  BackHandler,
  FlatList,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/Common/header';
import { StoryCard } from '@/components/Common/Home/StoryCart';
import { useApp } from '@/Context/AppContext';
import { albumLabel, STORY_ALBUMS, storyLanguage } from '@/Data/albums';
import { StoryLanguage } from '@/Types';
import { borderRadius, spacing, theme, ThemeColors } from '@/Theme/Index';
import { useAppTheme, useThemedStyles } from '@/Theme/ThemeProvider';
import { normalize } from '@/storage/searchHistory';

const formatLength = (seconds: number) => `${Math.max(1, Math.round(seconds / 60))} min`;

// Album list: two square covers per row.
const GRID_COLUMNS = 2;
const GRID_GAP = spacing.md;
const MAX_COVER_HEIGHT = 220;

export const AlbumsScreen: React.FC = () => {
  const { stories, playingNarrator, playFromAlbum, activeAlbum, setCurrentScreen } = useApp();
  const styles = useThemedStyles(makeStyles);
  const { colors, gradients } = useAppTheme();
  const [openAlbum, setOpenAlbum] = useState<StoryLanguage | null>(null);
  // One cover per album, from the theme's own gradients: they follow the theme color and dark mode.
  const covers = [gradients.hero, gradients.createHero, gradients.playerArt] as const;
  // Exact cell width, so a lone cover in the last row is as wide as the others.
  const { width: windowWidth } = useWindowDimensions();
  const coverWidth = Math.floor((windowWidth - spacing.md * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS);
  const coverHeight = Math.min(coverWidth, MAX_COVER_HEIGHT);

  // As on Favorites: the header's search icon opens a box that filters albums by name only.
  // The language name counts too, so "hindi" finds हिंदी.
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const normalizedQuery = normalize(query);
  const shownAlbums = normalizedQuery
    ? STORY_ALBUMS.filter(
        (album) =>
          normalize(album.label).includes(normalizedQuery) ||
          normalize(album.language).includes(normalizedQuery),
      )
    : STORY_ALBUMS;

  const toggleSearch = () => {
    // Closing clears the filter, so every album is back.
    if (searchOpen) setQuery('');
    setSearchOpen((open) => !open);
  };

  // Hardware Back in an album goes back to the album list. Added after useAndroidBack's
  // listener, so it runs first.
  useEffect(() => {
    if (Platform.OS !== 'android' || !openAlbum) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setOpenAlbum(null);
      return true;
    });
    return () => subscription.remove();
  }, [openAlbum]);

  const storiesIn = (language: StoryLanguage) =>
    stories.filter((story) => storyLanguage(story) === language);

  if (openAlbum) {
    const albumStories = storiesIn(openAlbum);
    return (
      <SafeAreaView style={styles.container}>
        <Header title={albumLabel(openAlbum)} showBack onBack={() => setOpenAlbum(null)} />
        <FlatList
          data={albumStories}
          keyExtractor={(story) => story.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No stories yet</Text>
              <Text style={styles.emptySub}>
                Stories you create in this language show up here.
              </Text>
            </View>
          }
          renderItem={({ item: story }) => (
            <StoryCard
              story={story}
              narrator={playingNarrator}
              onPress={() => playFromAlbum(openAlbum, story)}
            />
          )}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Albums"
        showBack
        onBack={() => setCurrentScreen('NowPlaying')}
        rightElement={
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={toggleSearch}
            accessibilityRole="button"
            accessibilityState={{ expanded: searchOpen }}
            accessibilityLabel={searchOpen ? 'Close search' : 'Search albums'}>
            <MaterialIcons name={searchOpen ? 'close' : 'search'} size={26} color={colors.textDark} />
          </TouchableOpacity>
        }
      />
      {searchOpen && (
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={22} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search albums by name"
            placeholderTextColor={colors.placeholder}
            selectionColor={colors.primary}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search albums by name"
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
        data={shownAlbums}
        keyExtractor={(album) => album.language}
        numColumns={GRID_COLUMNS}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <MaterialIcons name="search-off" size={36} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>{`No albums named "${query.trim()}"`}</Text>
            <Text style={styles.emptySub}>Try a different name.</Text>
          </View>
        }
        renderItem={({ item: album, index }) => {
          const albumStories = storiesIn(album.language);
          const count = albumStories.length;
          const isEmpty = count === 0;
          const totalSeconds = albumStories.reduce((sum, story) => sum + (story.duration || 0), 0);
          return (
            <LinearGradient
              colors={covers[index % covers.length]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.cover, { width: coverWidth, height: coverHeight }, isEmpty && styles.cardEmpty]}>
              {/* The whole cover opens the album; the play button sits on top of it, not inside. */}
              <Pressable
                style={styles.coverPress}
                disabled={isEmpty}
                onPress={() => setOpenAlbum(album.language)}
                accessibilityRole="button"
                accessibilityLabel={`${album.label} album, ${count} ${count === 1 ? 'story' : 'stories'}`}
                accessibilityState={{ disabled: isEmpty }}>
                <View style={styles.coverTop}>
                  <View style={styles.coverArt}>
                    <Text style={styles.coverEmoji}>{album.icon}</Text>
                  </View>
                  {activeAlbum === album.language ? (
                    <Text style={styles.playingBadge}>Playing</Text>
                  ) : null}
                </View>
                <View style={styles.coverInfo}>
                  <Text style={styles.coverTitle} numberOfLines={1}>
                    {album.label}
                  </Text>
                  <Text style={styles.coverMeta} numberOfLines={1}>
                    {isEmpty ? 'No stories yet' : `${count} ${count === 1 ? 'story' : 'stories'}`}
                  </Text>
                  {isEmpty ? null : (
                    <Text style={styles.coverMeta} numberOfLines={1}>
                      {formatLength(totalSeconds)}
                    </Text>
                  )}
                </View>
              </Pressable>
              {isEmpty ? null : (
                <TouchableOpacity
                  style={[styles.playBtn, styles.coverPlayBtn]}
                  onPress={() => playFromAlbum(album.language, albumStories[0])}
                  accessibilityRole="button"
                  accessibilityLabel={`Play ${album.label} album`}>
                  <MaterialIcons name="play-arrow" size={26} color={colors.onPrimary} />
                </TouchableOpacity>
              )}
            </LinearGradient>
          );
        }}
      />
    </SafeAreaView>
  );
};

export default AlbumsScreen;

const makeStyles = (colors: ThemeColors) => ({
  container: { flex: 1, backgroundColor: colors.background },
  headerIcon: {
    width: 44,
    height: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  // Same box as Favorites and the Search page.
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
  // Extra bottom space so the last card clears the mini player.
  list: { padding: spacing.md, paddingBottom: 140, flexGrow: 1 },
  cardEmpty: { opacity: 0.5 },
  // Two covers per row, GRID_GAP apart (the cover's size comes from the screen width).
  gridRow: { gap: GRID_GAP },
  cover: {
    borderRadius: borderRadius.card,
    marginBottom: GRID_GAP,
    overflow: 'hidden' as const,
  },
  coverPress: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between' as const,
  },
  coverTop: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    justifyContent: 'space-between' as const,
  },
  coverArt: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.cardBg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  coverEmoji: { fontSize: 24 },
  // Room on the right for the play button.
  coverInfo: { paddingRight: 48 },
  coverTitle: { ...theme.typography.cardTitle, color: colors.textDark },
  coverMeta: { ...theme.typography.caption, color: colors.textMuted, marginTop: 2 },
  coverPlayBtn: {
    position: 'absolute' as const,
    right: 12,
    bottom: 12,
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  playingBadge: {
    ...theme.typography.badge,
    color: colors.primary,
    backgroundColor: colors.purpleLightBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden' as const,
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
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
});
