import React, { useState } from 'react';
import { FlatList, View, ScrollView, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '@/Context/AppContext';
import { Header } from '@/components/Common/header';
import { StoryCard } from '@/components/Common/Home/StoryCart';
import { showToast } from '@/components/Common/Toast';
import { ConfirmModal } from '@/modal/confirmModal';
import { Category, Story } from '@/Types';
import { STORY_TYPES } from '@/services/storySpeech';
import { borderRadius, spacing, theme, ThemeColors } from '@/Theme/Index';
import { useAppTheme, useThemedStyles } from '@/Theme/ThemeProvider';
import { SafeAreaView } from 'react-native-safe-area-context';

export const HomeScreen: React.FC = () => {
  const {
    child,
    stories,
    playingNarrator,
    playStory,
    setCurrentScreen,
    lastPlayedStoryId,
    deleteStory,
  } = useApp();
  const { gradients, colors } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const [pendingDelete, setPendingDelete] = useState<Story | null>(null);
  // Kept after the pop-up closes, so its text doesn't flip to "this story" while it fades out.
  const [deleteTitle, setDeleteTitle] = useState('');

  const openDelete = (story: Story) => {
    setDeleteTitle(story.title);
    setPendingDelete(story);
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    deleteStory(pendingDelete.id);
    setPendingDelete(null);
    showToast('Story deleted', 'success');
  };

  // One pill per Create story type, plus Adventure for the built-in and older stories.
  const categories: { label: Category; icon?: keyof typeof MaterialIcons.glyphMap }[] = [
    { label: 'All' },
    ...STORY_TYPES.map((type) => ({ label: type.category, icon: type.icon })),
    { label: 'Adventure', icon: 'rocket-launch' },
  ];

  const continueStory = lastPlayedStoryId
    ? stories.find((s) => s.id === lastPlayedStoryId)
    : undefined;

  const filteredStories = selectedCategory === 'All'
    ? stories
    : stories.filter((s) => s.category === selectedCategory);

  const popularStories = continueStory
    ? filteredStories.filter((s) => s.id !== continueStory.id)
    : filteredStories;

  return (
    <SafeAreaView style={styles.container}>
      <Header
        rightElement={
          <TouchableOpacity style={styles.avatarBtn} onPress={() => setCurrentScreen('Profile')}>
            <Text style={styles.avatarText}>{child.avatar}</Text>
          </TouchableOpacity>
        }
      />
      <FlatList
        data={popularStories}
        keyExtractor={(story) => story.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={
          <>
            <LinearGradient colors={gradients.hero} style={styles.heroCard}>
              <View style={styles.heroTextContainer}>
                <Text style={styles.heroTitle}>Stories in the voices they love.</Text>
                <Text style={styles.heroSub}>
                  Listen to magical tales narrated by Mummy, Papa, Nani, or Dada's voice.
                </Text>
              </View>
              <MaterialIcons name="auto-stories" size={80} color={colors.primary} />
            </LinearGradient>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Stories for {child.name}</Text>
              <TouchableOpacity
                accessibilityLabel="Create a story"
                accessibilityRole="button"
                style={styles.createStoryButton}
                onPress={() => setCurrentScreen('Create')}
              >
                <MaterialIcons name="add" size={22} color={colors.primary} />
                <Text style={styles.createStoryText}>Create</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
              {categories.map((cat) => {
                const isActive = selectedCategory === cat.label;
                return (
                  <TouchableOpacity
                    key={cat.label}
                    style={[styles.pill, isActive && styles.activePill]}
                    onPress={() => setSelectedCategory(cat.label)}
                  >
                    {cat.icon ? (
                      <MaterialIcons
                        name={cat.icon}
                        size={18}
                        color={isActive ? colors.onPrimary : colors.textDark}
                      />
                    ) : null}
                    <Text style={[styles.pillText, isActive && styles.activePillText]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {continueStory && (
              <View style={styles.section}>
                <Text style={styles.subSectionTitle}>Continue listening</Text>
                <StoryCard
                  story={continueStory}
                  variant="continue"
                  narrator={playingNarrator}
                  onPress={() => playStory(continueStory, true)}
                  onRemove={() => openDelete(continueStory)}
                  removeLabel={`Delete ${continueStory.title}`}
                />
              </View>
            )}

            <Text style={[styles.subSectionTitle, styles.popularTitle]}>Popular stories</Text>
          </>
        }
        // Only when the category has none: the one in "Continue listening" is left out of this list.
        ListEmptyComponent={
          filteredStories.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {selectedCategory === 'All' ? 'No stories yet' : `No ${selectedCategory} stories yet`}
              </Text>
              <Text style={styles.emptySub}>Tap + Create to make one.</Text>
            </View>
          ) : null
        }
        renderItem={({ item: story }) => (
          <StoryCard
            story={story}
            narrator={playingNarrator}
            onPress={() => playStory(story, true)}
            onRemove={() => openDelete(story)}
            removeLabel={`Delete ${story.title}`}
          />
        )}
      />
      <ConfirmModal
        visible={pendingDelete !== null}
        title="Delete story"
        message={`Remove "${deleteTitle}"? This cannot be undone.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </SafeAreaView>
  );
};

export default HomeScreen;

const makeStyles = (colors: ThemeColors) => ({
  container: { flex: 1, backgroundColor: colors.background },
  // Extra bottom space so the last story clears the mini player.
  scrollContent: { padding: spacing.md, paddingBottom: 140 },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentPink,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  avatarText: { fontSize: 18 },
  heroCard: {
    minHeight: 180,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: spacing.lg,
  },
  heroTextContainer: { flex: 1, marginRight: spacing.sm },
  heroTitle: { ...theme.typography.hero, color: colors.textDark, marginBottom: 8 },
  heroSub: { ...theme.typography.body, color: colors.textMuted },
  sectionHeader: {
    marginBottom: spacing.sm,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  sectionTitle: { ...theme.typography.section, color: colors.textDark },
  createStoryButton: {
    paddingVertical: spacing.xs,
    paddingLeft: spacing.sm,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 2,
  },
  createStoryText: {
    color: colors.primary,
    fontSize: 21,
    lineHeight: 20,
    fontWeight: '700' as const,
  },
  subSectionTitle: { ...theme.typography.hero, fontSize: 24, lineHeight: 30, color: colors.textDark, marginBottom: spacing.sm },
  popularTitle: { marginTop: spacing.xs, },
  // Sized by its pills (no fixed height that would crop them).
  pillsScroll: { marginBottom: spacing.md, flexGrow: 0 },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.pillBg,
    marginRight: 8,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  activePill: { backgroundColor: colors.primary },
  // Same size selected or not, so the row doesn't shift when a category is picked.
  pillText: { ...theme.typography.badge, color: colors.textDark, fontSize: 17, lineHeight: 22 },
  activePillText: { color: colors.onPrimary },
  section: { marginTop: spacing.xs },
  empty: { alignItems: 'center' as const, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  emptyTitle: {
    ...theme.typography.section,
    color: colors.textDark,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  emptySub: { ...theme.typography.body, color: colors.textMuted, textAlign: 'center' as const },
});
