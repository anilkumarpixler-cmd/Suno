import React, { useState } from 'react';
import { FlatList, View, ScrollView, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '@/Context/AppContext';
import { Header } from '@/components/Common/header';
import { StoryCard } from '@/components/Common/Home/StoryCart';
import { Category } from '@/Types';
import { borderRadius, spacing, theme, ThemeColors } from '@/Theme/Index';
import { useAppTheme, useThemedStyles } from '@/Theme/ThemeProvider';
import { SafeAreaView } from 'react-native-safe-area-context';

export const HomeScreen: React.FC = () => {
  const { child, stories, voices, playStory, setCurrentScreen, lastPlayedStoryId } = useApp();
  const { gradients } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');

  const categories: { label: Category; icon?: string }[] = [
    { label: 'All' },
    { label: 'Bedtime', icon: '🌙' },
    { label: 'Animals', icon: '🐻' },
    { label: 'Adventure', icon: '🚀' },
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
            {/* Hero Card */}
            <LinearGradient colors={gradients.hero} style={styles.heroCard}>
              <View style={styles.heroTextContainer}>
                <Text style={styles.heroTitle}>Stories in the voices they love.</Text>
                <Text style={styles.heroSub}>
                  Listen to magical tales narrated by Mummy, Papa, Nani, or Dada's voice.
                </Text>
              </View>
              <Text style={styles.heroEmoji}>📚</Text>
            </LinearGradient>

            {/* Section Header & Pills */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Stories for {child.name}</Text>
              <TouchableOpacity
                accessibilityLabel="Create a story"
                accessibilityRole="button"
                style={styles.createStoryButton}
                onPress={() => setCurrentScreen('Create')}
              >
                <Text style={styles.createStoryIcon}>+ Create</Text>
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
                    <Text style={[styles.pillText, isActive && styles.activePillText]}>
                      {cat.icon ? `${cat.icon} ` : ''}{cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {/* Continue Listening */}
            {continueStory && (
              <View style={styles.section}>
                <Text style={styles.subSectionTitle}>Continue listening</Text>
                <StoryCard
                  story={continueStory}
                  variant="continue"
                  narrator={voices.find((v) => v.id === continueStory.narratorId)}
                  onPress={() => playStory(continueStory, false)}
                />
              </View>
            )}

            <Text style={[styles.subSectionTitle, styles.popularTitle]}>Popular stories</Text>
          </>
        }
        renderItem={({ item: story }) => (
          <StoryCard
            story={story}
            narrator={voices.find((v) => v.id === story.narratorId)}
            onPress={() => playStory(story, true)}
          />
        )}
      />
    </SafeAreaView>
  );
};

export default HomeScreen;

const makeStyles = (colors: ThemeColors) => ({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.md },
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
  heroEmoji: { fontSize: 49, lineHeight: 60 },
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
  },
  createStoryIcon: {
    color: colors.primary,
    fontSize: 21,
    lineHeight: 20,
    fontWeight: '700' as const,
  },
  subSectionTitle: { ...theme.typography.hero, fontSize: 24, lineHeight: 30, color: colors.textDark, marginBottom: spacing.sm },
  popularTitle: { marginTop: spacing.xs },
  pillsScroll: { marginBottom: spacing.md },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.pillBg,
    marginRight: 8,

  },
  activePill: { backgroundColor: colors.primary },
  pillText: { ...theme.typography.badge, color: colors.textDark, fontSize: 16 },
  activePillText: { ...theme.typography.badge, color: colors.onPrimary ,fontSize:18},
  section: { marginTop: spacing.xs },
});
