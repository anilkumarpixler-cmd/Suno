import React, { useState } from 'react';
import {
  LayoutAnimation,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../Context/AppContext';
import { theme } from '../Theme/Index';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showToast } from '../components/Common/Toast';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FormLabelProps {
  children: string;
}

interface CustomTextInputProps {
  value: string;
  placeholder?: string;
  onChangeText: (value: string) => void;
}
interface CustomDropdownProps {
  label: string;
  value: string;
  options: string[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
}

const FormLabel: React.FC<FormLabelProps> = ({ children }) => (
  <Text style={styles.label}>{children}</Text>
);
const CustomTextInput: React.FC<CustomTextInputProps> = ({ value, placeholder, onChangeText }) => (
  <TextInput
    style={styles.input}
    value={value}
    placeholder={placeholder}
    placeholderTextColor="#63708A"
    onChangeText={onChangeText}
    selectionColor="#17233D"
  />
);
const CustomDropdown: React.FC<CustomDropdownProps> = ({
  label,
  value,
  options,
  isOpen,
  onToggle,
  onSelect,
}) => (
  <View>
    <FormLabel>{label}</FormLabel>
    <Pressable
      style={styles.dropdownField}
      onPress={onToggle}
      accessibilityRole="combobox"
      accessibilityState={{ expanded: isOpen }}>
      <Text style={styles.inputText}>{value}</Text>
      <Text style={styles.chevron}>{isOpen ? '⌃' : '⌄'}</Text>
    </Pressable>
    {isOpen && (
      <View style={styles.inlineOptions} onTouchStart={(event) => event.stopPropagation()}>
        {options.map((option) => (
          <Pressable
            key={option}
            style={[styles.option, option === value && styles.selectedOption]}
            onPress={() => onSelect(option)}>
            <Text style={styles.optionText}>{option}</Text>
          </Pressable>
        ))}
      </View>
    )}
  </View>
);

const HeroCard: React.FC<{ childName: string }> = ({ childName }) => (
  <LinearGradient colors={["#F4E8F5", "#FFF0DF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
    <Text style={styles.heroTitle}>{`A story made just for\n${childName}.`}</Text>
    <Text style={styles.heroDescription}>
      Choose a few details and Suno creates a{`\n`}personalized story in your chosen family{`\n`}voice.
    </Text>
  </LinearGradient>
);

const LanguageSelector: React.FC<{ selected: string; onChange: (language: string) => void }> = ({ selected, onChange }) => (
  <View style={styles.languageRow}>
    {[
      { label: 'हिंदी', value: 'Hindi' },
      { label: 'English', value: 'English' },
      { label: 'Hinglish', value: 'Hinglish' },
    ].map((language) => (
      <Pressable
        key={language.value}
        style={[styles.languagePill, selected === language.value && styles.selectedLanguage]}
        onPress={() => onChange(language.value)}>
        <Text style={[styles.languageText, selected === language.value && styles.selectedLanguageText]}>{language.label}</Text>
      </Pressable>
    ))}
  </View>
);
export const CreateStoryScreen: React.FC = () => {
  const { child, voices, createNewStory, setCurrentScreen } = useApp();
  const [childName, setChildName] = useState(child.name);
  const [age, setAge] = useState('3 years');
  const [language, setLanguage] = useState('Hindi');
  const [topic, setTopic] = useState('');
  const [storyType, setStoryType] = useState('Bedtime adventure');
  const [narrator, setNarrator] = useState('Mummy');
  const [openDropdown, setOpenDropdown] = useState<'age' | 'storyType' | 'narrator' | null>(null);

  const ageOptions = ['3 years', '4 years', '5 years', '6 years'];
  const storyTypeOptions = ['Bedtime adventure', 'Funny Story', 'Moral Story', 'Learning Story'];
  const narratorOptions = ['Mummy', 'Papa', 'Nani'];

  const toggleDropdown = (dropdown: 'age' | 'storyType' | 'narrator') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenDropdown((current) => (current === dropdown ? null : dropdown));
  };

  const selectDropdown = (setter: (value: string) => void, value: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setter(value);
    setOpenDropdown(null);
  };

  const handleCreateStory = async () => {
    const selectedVoice = voices.find((voice) => voice.name === narrator) || voices.find((voice) => voice.isDefault);
    const personalizedName = childName.trim() || child.name || 'your child';
    const title = topic.trim() ? `${personalizedName}'s ${topic.trim()}` : `${personalizedName}'s ${storyType}`;

    showToast(`Creating ${personalizedName}'s personalized story`);
    await new Promise((resolve) => setTimeout(resolve, 2400));
    await createNewStory(title, storyType, 5, selectedVoice?.id);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => setCurrentScreen('Home')} accessibilityLabel="Go back">
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
            <FormLabel>What should the story be about?</FormLabel>
            <CustomTextInput value={topic} placeholder="e.g. dinosaurs, moon, jungle" onChangeText={setTopic} />
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
              value={narrator}
              options={narratorOptions}
              isOpen={openDropdown === 'narrator'}
              onToggle={() => toggleDropdown('narrator')}
              onSelect={(value) => selectDropdown(setNarrator, value)}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backArrow: {
    color: theme.colors.textDark,
    fontSize: 34,
    fontWeight: '300',
    lineHeight: 36,
  },
  headerTitle: {
    color: theme.colors.textDark,
    fontSize: 18,
    fontWeight: '800',
  },
  headerSpacer: { width: 36 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 32,
  },
  heroCard: {
    height: 194,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 24,
    marginBottom: 19,
  },
  heroTitle: {
    color: theme.colors.textDark,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    marginBottom: 12,
  },
  heroDescription: {
    color: theme.colors.textMuted,
    fontSize: 15.5,
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: theme.colors.cardBg,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.borderRadius.card,
    borderWidth: 1,
    padding: 18,
  },
  field: { marginBottom: 18 },
  lastField: { marginBottom: 1 },
  label: {
    color: theme.colors.textDark,
    fontSize: 13.5,
    fontWeight: '800',
    marginBottom: 8,
  },
  input: {
    minHeight: 51,
    borderColor: theme.colors.borderLight,
    borderRadius: 13,
    borderWidth: 1,
    backgroundColor: theme.colors.cardBg,
    color: theme.colors.textDark,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: { color: theme.colors.textDark, fontSize: 16 },
  dropdownField: {
    minHeight: 52,
    borderColor: theme.colors.borderLight,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: theme.colors.cardBg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chevron: {
    color: theme.colors.textMuted,
    fontSize: 22,
    lineHeight: 18,
    marginTop: -5,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  languagePill: {
    minHeight: 44,
    paddingHorizontal: theme.spacing.md,
    borderColor: theme.colors.borderLight,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.cardBg,
  },
  selectedLanguage: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  selectedLanguageText: { color: '#FFFFFF' },
  languageText: {
    color: theme.colors.textDark,
    fontSize: 14,
    fontWeight: '800',
  },
  inlineOptions: {
    backgroundColor: theme.colors.cardBg,
    borderColor: theme.colors.borderLight,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
  },
  option: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    borderRadius: 8,
  },
  selectedOption: { backgroundColor: theme.colors.purpleLightBg },
  optionText: {
    color: theme.colors.textDark,
    fontSize: 16,
  },
  createButton: {
    minHeight: 52,
    marginTop: theme.spacing.md,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: '#FCF8F4',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
