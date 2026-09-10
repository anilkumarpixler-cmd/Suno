import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useApp } from '../Context/AppContext';
import { Header } from '../components/Common/header';
import { theme } from '../Theme/Index';
import { SafeAreaView } from 'react-native-safe-area-context';

const LANGUAGE_OPTIONS = ['Hindi + English', 'Hindi', 'English', 'Punjabi', 'Gujarati'];

export const AddVoiceScreen: React.FC = () => {
  const { addVoice, setCurrentScreen } = useApp();
  const [name, setName] = useState('');
  const [selectedLang, setSelectedLang] = useState('Hindi + English');
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isRecorded, setIsRecorded] = useState(false);

  // Recording timer simulation
  React.useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleStartRecording = () => {
    if (!name) return;
    setIsRecording(true);
    setTimer(0);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setIsRecorded(true);
  };

  const handleSave = () => {
    const langs = selectedLang.split(' + ');
    addVoice(name, langs);
    setCurrentScreen('Voices');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header showBack onBack={() => setCurrentScreen('Voices')} title=" Add a Voice" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <View style={styles.formGroup}>
          <Text style={styles.label}>Whose voice is this?</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Mummy, Papa, Nani"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={[styles.formGroup, styles.langGroup]}>
          <Text style={styles.label}>Language</Text>
          <View style={styles.dropdownWrap}>
            <Pressable
              style={styles.dropdownField}
              onPress={() => setIsLangOpen((open) => !open)}
              accessibilityRole="combobox"
              accessibilityState={{ expanded: isLangOpen }}
            >
              <Text style={styles.dropdownValue}>{selectedLang}</Text>
              <Text style={styles.chevron}>{isLangOpen ? '⌃' : '⌄'}</Text>
            </Pressable>
            {isLangOpen && (
              <View style={styles.dropdownMenu}>
                {LANGUAGE_OPTIONS.map((lang) => (
                  <Pressable
                    key={lang}
                    style={[styles.option, lang === selectedLang && styles.selectedOption]}
                    onPress={() => {
                      setSelectedLang(lang);
                      setIsLangOpen(false);
                    }}
                  >
                    <Text style={styles.optionText}>{lang}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Recording Section */}
        <View style={styles.recorderBox}>
          <View style={styles.micCircle}>
            <Text style={styles.micIcon}>🎙️</Text>
          </View>
          <Text style={styles.recTitle}>
            {isRecording ? 'Recording Voice...' : 'Record your voice'}
          </Text>
          <Text style={styles.recSub}>
            Read the sample story aloud for 2–5 minutes to clone your voice tone.
          </Text>

          {isRecording && <Text style={styles.timerText}>0:{timer < 10 ? '0' : ''}{timer}</Text>}

          {!isRecording && !isRecorded && (
            <TouchableOpacity
              style={[styles.recBtn, !name && styles.disabledBtn]}
              disabled={!name}
              onPress={handleStartRecording}
            >
              <Text style={styles.recBtnText}>Start recording</Text>
            </TouchableOpacity>
          )}

          {isRecording && (
            <TouchableOpacity style={[styles.recBtn, { backgroundColor: '#E53E3E' }]} onPress={handleStopRecording}>
              <Text style={styles.recBtnText}>Stop recording</Text>
            </TouchableOpacity>
          )}

          {isRecorded && (
            <View style={styles.postRecRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setIsRecorded(false)}>
                <Text style={styles.secondaryText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveText}>Save Voice</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Privacy Card */}
        <View style={styles.privacyCard}>
          <Text style={styles.privacyTitle}>🔒 Privacy first</Text>
          <Text style={styles.privacySub}>
            Your voice data is encrypted and completely private. It is only used to generate stories for your family and can be deleted anytime.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AddVoiceScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flex: 1, overflow: 'visible' },
  content: { padding: theme.spacing.md, overflow: 'visible' },
  formGroup: { marginBottom: theme.spacing.lg },
  langGroup: { zIndex: 20 },
  dropdownWrap: { position: 'relative' },
  label: { fontSize: 14, fontWeight: '700', color: theme.colors.textDark, marginBottom: 8 },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
  },
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
  dropdownValue: { color: theme.colors.textDark, fontSize: 16 },
  chevron: {
    color: theme.colors.textMuted,
    fontSize: 22,
    lineHeight: 18,
    marginTop: -5,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    zIndex: 30,
    elevation: 8,
    backgroundColor: theme.colors.cardBg,
    borderColor: theme.colors.borderLight,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  option: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  selectedOption: { backgroundColor: theme.colors.purpleLightBg },
  optionText: {
    color: theme.colors.textDark,
    fontSize: 16,
  },
  recorderBox: {
    backgroundColor: theme.colors.purpleLightBg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.purpleDashed,
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  micCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  micIcon: { fontSize: 24 },
  recTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textDark },
  recSub: { fontSize: 12, color: theme.colors.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  timerText: { fontSize: 20, fontWeight: '800', color: theme.colors.primary, marginBottom: 12 },
  recBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.button,
  },
  disabledBtn: { opacity: 0.5 },
  recBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  postRecRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around' },
  secondaryBtn: { padding: 12 },
  secondaryText: { color: theme.colors.textMuted, fontWeight: '600' },
  saveBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  saveText: { color: '#FFF', fontWeight: '700' },
  privacyCard: { backgroundColor: '#FFF', padding: theme.spacing.md, borderRadius: 16 },
  privacyTitle: { fontSize: 13, fontWeight: '700' },
  privacySub: { fontSize: 11, color: theme.colors.textMuted, marginTop: 4 },
});