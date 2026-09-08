import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useApp } from '../Context/AppContext';
import { Header } from '../components/Common/header';
import { Category } from '../Types';
import { theme } from '../Theme/Index';

export const CreateStoryScreen: React.FC = () => {
  const { createNewStory, voices, setCurrentScreen } = useApp();
  const [prompt, setPrompt] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('Bedtime');
  const [duration, setDuration] = useState<number>(5);
  const [isGenerating, setIsGenerating] = useState(false);

  const categories: Category[] = ['Bedtime', 'Animals', 'Adventure', 'Learning'];
  const durations = [3, 5, 10];

  const handleCreate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      createNewStory(prompt, selectedCategory, duration);
    }, 3000); // Simulate story generation loader
  };

  if (isGenerating) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={styles.loaderEmoji}>✨</Text>
        <Text style={styles.loaderTitle}>Creating story...</Text>
        <Text style={styles.loaderSub}>Finding a little magic, just for them.</Text>
      </View>
    );
  }

  const defaultVoice = voices.find((v) => v.isDefault) || voices[0];

  return (
    <View style={styles.container}>
      <Header title="Create a Story" showBack onBack={() => setCurrentScreen('Home')} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>Story idea</Text>
          <TextInput
            style={styles.textArea}
            multiline
            placeholder="What should the story be about?"
            value={prompt}
            onChangeText={setPrompt}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Story type</Text>
          <View style={styles.row}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, selectedCategory === cat && styles.activeChip]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.chipText, selectedCategory === cat && styles.activeChipText]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Length</Text>
          <View style={styles.row}>
            {durations.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.chip, duration === d && styles.activeChip]}
                onPress={() => setDuration(d)}
              >
                <Text style={[styles.chipText, duration === d && styles.activeChipText]}>
                  {d} min
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Narrator</Text>
          <View style={styles.narratorCard}>
            <Text style={styles.avatar}>{defaultVoice.avatar}</Text>
            <Text style={styles.narratorName}>{defaultVoice.name} (Default)</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}>
          <Text style={styles.submitText}>Create Story</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md },
  section: { marginBottom: theme.spacing.lg },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  textArea: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    height: 100,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#EFECE6',
    marginRight: 8,
    marginBottom: 8,
  },
  activeChip: { backgroundColor: theme.colors.primary },
  chipText: { fontSize: 13, fontWeight: '600' },
  activeChipText: { color: '#FFF' },
  narratorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 16,
  },
  avatar: { fontSize: 24, marginRight: 8 },
  narratorName: { fontSize: 14, fontWeight: '700' },
  submitBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.button,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  loaderContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  loaderEmoji: { fontSize: 60, marginBottom: 16 },
  loaderTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.textDark },
  loaderSub: { fontSize: 14, color: theme.colors.textMuted, marginTop: 4 },
});