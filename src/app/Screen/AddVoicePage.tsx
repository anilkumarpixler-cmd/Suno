import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useApp } from '../Context/AppContext';
import { Header } from '../components/Common/header';
import { theme } from '../Theme/Index';

export const AddVoiceScreen: React.FC = () => {
  const { addVoice, setCurrentScreen } = useApp();
  const [name, setName] = useState('');
  const [selectedLang, setSelectedLang] = useState('Hindi + English');
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
    <View style={styles.container}>
      <Header showBack onBack={() => setCurrentScreen('Voices')} title="Add a Voice" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Whose voice is this?</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Mummy, Papa, Nani"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Language</Text>
          <View style={styles.langRow}>
            {['Hindi + English', 'English', 'Hindi'].map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[styles.langChip, selectedLang === lang && styles.activeLangChip]}
                onPress={() => setSelectedLang(lang)}
              >
                <Text style={[styles.langText, selectedLang === lang && styles.activeLangText]}>
                  {lang}
                </Text>
              </TouchableOpacity>
            ))}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md },
  formGroup: { marginBottom: theme.spacing.lg },
  label: { fontSize: 14, fontWeight: '700', color: theme.colors.textDark, marginBottom: 8 },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
  },
  langRow: { flexDirection: 'row', flexWrap: 'wrap' },
  langChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#EFECE6',
    marginRight: 8,
    marginBottom: 8,
  },
  activeLangChip: { backgroundColor: theme.colors.primary },
  langText: { fontSize: 12, fontWeight: '600' },
  activeLangText: { color: '#FFF' },
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