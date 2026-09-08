import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useApp } from '../Context/AppContext';
import { Header } from '../components/Common/header';
import { theme } from '../Theme/Index';
import { SafeAreaView } from 'react-native-safe-area-context';

export const ProfileScreen: React.FC = () => {
  const { child, setCurrentScreen } = useApp();

  const options = [
    { label: 'Family Voices', icon: '🎙️', action: () => setCurrentScreen('Voices') },
    { label: 'Favorite Stories', icon: '❤️' },
    { label: 'Listening History', icon: '📜' },
    { label: 'Settings', icon: '⚙️' },
    { label: 'Privacy & Permissions', icon: '🔒' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Profile" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>{child.avatar}</Text>
          </View>
          <Text style={styles.childName}>{child.name}</Text>
        </View>

        {options.map((opt) => (
          <TouchableOpacity key={opt.label} style={styles.card} onPress={opt.action}>
            <Text style={styles.icon}>{opt.icon}</Text>
            <Text style={styles.label}>{opt.label}</Text>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md },
  profileHeader: { alignItems: 'center', marginVertical: theme.spacing.lg },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFEAA7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarEmoji: { fontSize: 40 },
  childName: { fontSize: 20, fontWeight: '800', color: theme.colors.textDark },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  icon: { fontSize: 20, marginRight: 12 },
  label: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.colors.textDark },
  arrow: { fontSize: 16, color: theme.colors.textMuted },
});