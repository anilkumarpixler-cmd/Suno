import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../components/Common/Text';
import { showToast } from '../components/Common/Toast';
import { useApp } from '../Context/AppContext';
import { RootScreen } from '../Types';

const colors = {
  background: '#FFF9F4',
  card: '#FFFFFF',
  navy: '#07152F',
  muted: '#746C88',
  lavender: '#F1E9FF',
  border: '#E8E1DC',
  yellow: '#F5C84B',
};

type SettingIcon = 'globe' | 'moon' | 'microphone' | 'lock';

interface HeaderProps {
  title: string;
  onBack: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onBack }) => (
  <View style={styles.header}>
    <Pressable
      style={styles.headerButton}
      onPress={onBack}
      accessibilityRole="button"
      accessibilityLabel="Go back">
      <Text style={styles.backIcon}>‹</Text>
    </Pressable>
    <Text style={styles.headerTitle}>{title}</Text>
    <View style={styles.headerButton} />
  </View>
);

export const IconContainer: React.FC<{ icon: SettingIcon }> = ({ icon }) => {
  const iconContent = {
    globe: '⊕',
    moon: '☾',
    microphone: '♩',
    lock: '▣',
  }[icon];

  return (
    <View style={styles.iconContainer} accessible accessibilityLabel={`${icon} icon`}>
      <Text style={[styles.settingIcon, icon === 'moon' || icon === 'lock' ? styles.yellowIcon : null]}>
        {iconContent}
      </Text>
    </View>
  );
};

interface ProfileCardProps {
  name: string;
  age: string;
  avatar: string;
  onEdit: () => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ name, age, avatar, onEdit }) => (
  <View style={styles.profileCard}>
    <View style={styles.avatarCircle}>
      <Text style={styles.avatar}>{avatar}</Text>
    </View>
    <View style={styles.profileDetails}>
      <Text style={styles.profileName}>{name}</Text>
      <Text style={styles.profileAge}>{age}</Text>
    </View>
    <Pressable
      style={styles.editButton}
      onPress={onEdit}
      accessibilityRole="button"
      accessibilityLabel="Edit profile">
      <Text style={styles.editIcon}>✎</Text>
    </Pressable>
  </View>
);

export const SectionTitle: React.FC<{ children: string }> = ({ children }) => (
  <Text style={styles.sectionTitle}>{children}</Text>
);

interface SettingsCardProps {
  title: string;
  subtitle: string;
  icon: SettingIcon;
  onPress: () => void;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({ title, subtitle, icon, onPress }) => (
  <Pressable
    style={styles.settingsCard}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={`${title}, ${subtitle}`}>
    <IconContainer icon={icon} />
    <View style={styles.settingDetails}>
      <Text style={styles.settingTitle}>{title}</Text>
      <Text style={styles.settingSubtitle}>{subtitle}</Text>
    </View>
    <Text style={styles.chevron}>›</Text>
  </Pressable>
);

const settings: Array<{
  id: string;
  title: string;
  subtitle: string;
  icon: SettingIcon;
  destination?: RootScreen;
}> = [
  { id: 'language', title: 'Language', subtitle: 'Hindi + English', icon: 'globe' },
  { id: 'sleepTimer', title: 'Sleep timer', subtitle: 'Off', icon: 'moon' },
  { id: 'familyVoices', title: 'Family voices', subtitle: '3 voices', icon: 'microphone', destination: 'Voices' },
  { id: 'privacy', title: 'Privacy & voice data', subtitle: 'Manage recordings', icon: 'lock' },
];

export const ProfileScreen: React.FC = () => {
  const { child, setCurrentScreen } = useApp();

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Profile" onBack={() => setCurrentScreen('Home')} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <ProfileCard
          name="Aarav"
          age="3 years old"
          avatar={child.avatar || '🧒'}
          onEdit={() => showToast('Child Profile Editing.')}
        />
        <SectionTitle>Settings</SectionTitle>
        {settings.map((setting) => (
          <SettingsCard
            key={setting.id}
            title={setting.title}
            subtitle={setting.subtitle}
            icon={setting.icon}
            onPress={() => {
              if (setting.destination) {
                setCurrentScreen(setting.destination);
              }
            }}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;

export const SettingsPlaceholderScreen: React.FC<{ title: string }> = ({ title }) => {
  const { setCurrentScreen } = useApp();

  return (
    <SafeAreaView style={styles.container}>
      <Header title={title} onBack={() => setCurrentScreen('Profile')} />
      <View style={styles.placeholder}>
        <Text style={styles.placeholderTitle}>{title}</Text>
        <Text style={styles.placeholderText}>This setting will be available here.</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: { width: 34, height: 40, justifyContent: 'center' },
  backIcon: { color: colors.navy, fontSize: 32, lineHeight: 34, fontWeight: '300' },
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: colors.navy,
    fontSize: 18,
    fontWeight: '700',
  },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 },
  profileCard: {
    minHeight: 90,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: { fontSize: 27 },
  profileDetails: { flex: 1, marginLeft: 14 },
  profileName: { color: colors.navy, fontSize: 16, fontWeight: '700' },
  profileAge: { color: colors.muted, fontSize: 13, marginTop: 4 },
  editButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.navy,
    shadowOpacity: 0.08,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  editIcon: { color: colors.navy, fontSize: 21 },
  sectionTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 32,
    marginBottom: 14,
  },
  settingsCard: {
    minHeight: 88,
    marginBottom: 13,
    paddingHorizontal: 18,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIcon: { color: colors.navy, fontSize: 29, lineHeight: 32 },
  yellowIcon: { color: colors.yellow },
  settingDetails: { flex: 1, marginLeft: 16 },
  settingTitle: { color: colors.navy, fontSize: 15, fontWeight: '700' },
  settingSubtitle: { color: colors.muted, fontSize: 13, marginTop: 4 },
  chevron: { color: colors.navy, fontSize: 25, fontWeight: '300', marginLeft: 10 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  placeholderTitle: { color: colors.navy, fontSize: 20, fontWeight: '700' },
  placeholderText: { color: colors.muted, fontSize: 14, marginTop: 8 },
});