import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '@/Context/AppContext';
import { CustomDropdown } from '@/components/Common/CustomDropdown';
import { borderRadius, spacing, theme, ThemeColors } from '@/Theme/Index';
import { useAppTheme, useThemedStyles } from '@/Theme/ThemeProvider';
import { StoryLanguage } from '@/Types';
import { getFallbackScript, mapStoryTypeToCategory } from '@/services/storySpeech';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showToast } from '@/components/Common/Toast';

type DropdownKey = 'age' | 'storyType' | 'narrator';

const FormLabel: React.FC<{ children: string }> = ({ children }) => {
  const styles = useThemedStyles(makeStyles);
  return <Text style={styles.label}>{children}</Text>;
};

const CustomTextInput: React.FC<{
  value: string;
  placeholder?: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
}> = ({ value, placeholder, onChangeText, multiline = false }) => {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useAppTheme();
  return (
    <TextInput
      style={[styles.input, multiline && styles.storyInput]}
      value={value}
      placeholder={placeholder}
      placeholderTextColor={colors.placeholder}
      onChangeText={onChangeText}
      selectionColor={colors.primary}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
    />
  );
};

const HeroCard: React.FC<{ childName: string }> = ({ childName }) => {
  const styles = useThemedStyles(makeStyles);
  const { gradients } = useAppTheme();
  return (
    <LinearGradient
      colors={[...gradients.createHero]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroCard}>
      <Text style={styles.heroTitle}>{`A story made just for\n${childName}.`}</Text>
      <Text style={styles.heroDescription}>
        Choose a few details and Suno creates a{`\n`}personalized story in your chosen family
        {`\n`}voice.
      </Text>
    </LinearGradient>
  );
};

const LanguageSelector: React.FC<{
  selected: StoryLanguage;
  onChange: (language: StoryLanguage) => void;
}> = ({ selected, onChange }) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.languageRow}>
      {(
        [
          { label: 'हिंदी', value: 'Hindi' as const },
          { label: 'English', value: 'English' as const },
          { label: 'Hinglish', value: 'Hinglish' as const },
        ] as const
      ).map((language) => (
        <Pressable
          key={language.value}
          style={[styles.languagePill, selected === language.value && styles.selectedLanguage]}
          onPress={() => onChange(language.value)}>
          <Text
            style={[
              styles.languageText,
              selected === language.value && styles.selectedLanguageText,
            ]}>
            {language.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
};

export const CreateStoryScreen: React.FC = () => {
  const { child, voices, defaultNarratorId, createNewStory, setCurrentScreen } = useApp();
  const styles = useThemedStyles(makeStyles);
  const [childName, setChildName] = useState(child.name || 'Aarav');
  const [age, setAge] = useState('3 years');
  const [language, setLanguage] = useState<StoryLanguage>('Hindi');
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [storyType, setStoryType] = useState('Bedtime adventure');
  const [narratorId, setNarratorId] = useState(defaultNarratorId);
  const [openDropdown, setOpenDropdown] = useState<DropdownKey | null>(null);

  const ageOptions = ['2 years', '3 years', '4 years', '5 years', '6 years'];
  const storyTypeOptions = [
    'Bedtime adventure',
    'Funny adventure',
    'Magical adventure',
    'Learning story',
    'Animal adventure',
  ];
  const selectedNarrator = voices.find((voice) => voice.id === narratorId);
  const narratorOptions = [
    'System Voice',
    ...voices
      .filter((voice) => Boolean(voice.audioUri))
      .map((voice) => `${voice.avatar} ${voice.name}`),
  ];

  const getWordCount = (text: string) =>
    text.trim() ? text.trim().split(/\s+/).length : 0;

  const handleTitleChange = (text: string) => {
    const words = text.trim().split(/\s+/);
    if (words.length > 20 && text.endsWith(' ')) {
      showToast('Story title cannot exceed 20 words');
      return;
    }
    setTitle(text);
  };

  const toggleDropdown = (dropdown: DropdownKey) => {
    setOpenDropdown((current) => (current === dropdown ? null : dropdown));
  };

  const selectDropdown = (setter: (value: string) => void, value: string) => {
    setter(value);
    setOpenDropdown(null);
  };

  const handleCreateStory = () => {
    const storyTitle = title.trim();
    if (!storyTitle) {
      showToast('Add a story title');
      return;
    }
    if (getWordCount(storyTitle) > 20) {
      showToast('Story title cannot exceed 20 words');
      return;
    }

    const personalizedName = childName.trim() || child.name || 'Aarav';
    const script = topic.trim() || getFallbackScript(personalizedName, storyType, language);
    if (!script) {
      showToast('Write what the story is about');
      return;
    }

    void createNewStory({
      title: storyTitle,
      script,
      language,
      category: mapStoryTypeToCategory(storyType),
      narratorId,
    })
      .then(() => {
        showToast('Story created');
      })
      .catch((error: unknown) => {
        showToast(error instanceof Error ? error.message : 'Could not save story');
      });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => setCurrentScreen('Home')}
          accessibilityLabel="Go back">
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}> Create a Story</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <HeroCard childName={childName} />

        <View style={styles.formCard}>
          <View style={styles.field}>
            <FormLabel>Child's name</FormLabel>
            <CustomTextInput value={childName} onChangeText={setChildName} />
          </View>

          <View style={styles.field}>
            <CustomDropdown
              label="Age"
              value={age}
              options={ageOptions}
              isOpen={openDropdown === 'age'}
              onToggle={() => toggleDropdown('age')}
              onSelect={(value) => selectDropdown(setAge, value)}
            />
          </View>

          <View style={styles.field}>
            <FormLabel>Story language</FormLabel>
            <LanguageSelector selected={language} onChange={setLanguage} />
          </View>

          <View style={styles.field}>
            <FormLabel>Story title</FormLabel>
            <CustomTextInput
              value={title}
              placeholder="e.g. Aarav and the Moon"
              onChangeText={handleTitleChange}
            />
          </View>

          <View style={styles.field}>
            <FormLabel>What should the story be about?</FormLabel>
            <CustomTextInput
              value={topic}
              placeholder="Write the story here, e.g. dinosaurs, moon, jungle"
              onChangeText={setTopic}
              multiline
            />
          </View>

          <View style={styles.field}>
            <CustomDropdown
              label="Story type"
              value={storyType}
              options={storyTypeOptions}
              isOpen={openDropdown === 'storyType'}
              onToggle={() => toggleDropdown('storyType')}
              onSelect={(value) => selectDropdown(setStoryType, value)}
            />
          </View>

          <View style={styles.lastField}>
            <CustomDropdown
              label="Narrator"
              value={
                selectedNarrator
                  ? `${selectedNarrator.avatar} ${selectedNarrator.name}`
                  : 'System Voice'
              }
              options={narratorOptions}
              isOpen={openDropdown === 'narrator'}
              onToggle={() => toggleDropdown('narrator')}
              onSelect={(value) => {
                if (value === 'System Voice') {
                  selectDropdown(setNarratorId, '');
                  return;
                }
                const voice = voices.find((item) => `${item.avatar} ${item.name}` === value);
                if (voice) selectDropdown(setNarratorId, voice.id);
              }}
            />
          </View>

          <Pressable
            style={styles.createButton}
            onPress={handleCreateStory}
            accessibilityRole="button">
            <Text style={styles.createButtonText}>✨ Create personalized story</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CreateStoryScreen;

const makeStyles = (colors: ThemeColors) => ({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 58,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 22,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'flex-start' as const,
    justifyContent: 'center' as const,
  },
  backArrow: {
    color: colors.textDark,
    fontSize: 34,
    fontWeight: '300' as const,
    lineHeight: 36,
  },
  headerTitle: { color: colors.textDark, ...theme.typography.cardTitle },
  headerSpacer: { width: 36 },
  content: { paddingHorizontal: 16, paddingTop: 28, paddingBottom: 32 },
  heroCard: {
    height: 194,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 24,
    marginBottom: 19,
  },
  heroTitle: { color: colors.textDark, ...theme.typography.hero, marginBottom: 12 },
  heroDescription: { ...theme.typography.body, color: colors.textMuted },
  formCard: {
    backgroundColor: colors.cardBg,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    padding: 18,
  },
  field: { marginBottom: 18 },
  lastField: { marginBottom: 1 },
  label: { ...theme.typography.section, color: colors.textDark, marginBottom: 8 },
  storyInput: { minHeight: 120, paddingTop: 12 },
  input: {
    minHeight: 51,
    borderColor: colors.borderLight,
    borderRadius: 13,
    borderWidth: 1,
    backgroundColor: colors.cardBg,
    color: colors.textDark,
    paddingHorizontal: 14,
    paddingVertical: 13,
    ...theme.typography.body,
  },
  languageRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
  languagePill: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderColor: colors.borderLight,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.cardBg,
  },
  selectedLanguage: { backgroundColor: colors.primary, borderColor: colors.primary },
  selectedLanguageText: { color: colors.onPrimary },
  languageText: { ...theme.typography.badge, color: colors.textDark },
  createButton: {
    minHeight: 52,
    marginTop: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  createButtonText: { ...theme.typography.section, color: colors.onPrimary },
});
