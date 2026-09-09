import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../components/Common/Text';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../Context/AppContext';
import { Header } from '../components/Common/header';
import { StoryCard } from '../components/Common/Home/StoryCart';
import { Category } from '../Types';
import { theme } from '../Theme/Index';
import { SafeAreaView } from 'react-native-safe-area-context';

export const HomeScreen: React.FC = () => {
  const { child, stories, voices, playStory, setCurrentScreen } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');

  const categories: { label: Category; icon?: string }[] = [
    { label: 'All' },
    { label: 'Bedtime', icon: '🌙' },
    { label: 'Animals', icon: '🐻' },
    { label: 'Adventure', icon: '🚀' },
  ];

  const filteredStories = selectedCategory === 'All'
    ? stories
    : stories.filter((s) => s.category === selectedCategory);

  const continueStory = stories.find((s) => s.progress > 0);

  return (
    <SafeAreaView style={styles.container}>
      <Header
        rightElement={
          <TouchableOpacity style={styles.avatarBtn} onPress={() => setCurrentScreen('Profile')}>
            <Text style={styles.avatarText}>{child.avatar}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Card */}
        <LinearGradient colors={theme.gradients.hero} style={styles.heroCard}>
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroTitle}>Stories in the voices they love.</Text>
            <Text style={styles.heroSub}>
              Listen to magical tales narrated by Mummy, Papa, Nani, or Dada.
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

        {/* Popular Stories */}
        <View style={styles.section}>
          <Text style={styles.subSectionTitle}>Popular stories</Text>
          {filteredStories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              narrator={voices.find((v) => v.id === story.narratorId)}
              onPress={() => playStory(story, true)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: theme.spacing.md },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFEAA7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18 },
  heroCard: {
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  heroTextContainer: { flex: 1, marginRight: theme.spacing.sm },
  heroTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.textDark, marginBottom: 4 },
  heroSub: { fontSize: 12, color: theme.colors.textMuted, lineHeight: 16 },
  heroEmoji: { fontSize: 49, lineHeight: 60 },
  sectionHeader: {
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textDark },
  createStoryButton: {
    paddingVertical: theme.spacing.xs,
    paddingLeft: theme.spacing.sm,
  },
  createStoryIcon: {
    color: theme.colors.primary,
    fontSize: 21,
    lineHeight: 20,
    fontWeight: '700',
  },
  subSectionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  pillsScroll: { marginBottom: theme.spacing.md },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.pill,
    backgroundColor: '#EFECE6',
    marginRight: 8,
  },
  activePill: { backgroundColor: theme.colors.primary },
  pillText: { fontSize: 13, fontWeight: '600', color: theme.colors.textDark },
  activePillText: { color: '#FFFFFF' },
  section: { marginTop: theme.spacing.xs },
});