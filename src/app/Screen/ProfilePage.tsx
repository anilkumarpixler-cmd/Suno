import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showToast } from '@/components/Common/Toast';
import { useApp } from '@/Context/AppContext';
import { theme, ThemeColors } from '@/Theme/Index';
import { appearanceLabel, useAppTheme, useThemedStyles } from '@/Theme/ThemeProvider';
import { RootScreen } from '@/Types';

type SettingIcon = 'globe' | 'moon' | 'microphone' | 'lock' | 'sun';

interface HeaderProps {
  title: string;
  onBack: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onBack }) => {
  const styles = useThemedStyles(makeStyles);
  return (
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
};

export const IconContainer: React.FC<{ icon: SettingIcon }> = ({ icon }) => {
  const styles = useThemedStyles(makeStyles);
  const iconContent = {
    globe: '⊕',
    moon: '☾',
    sun: '☼',
    microphone: '♩',
    lock: '▣',
  }[icon];

  return (
    <View style={styles.iconContainer} accessible accessibilityLabel={`${icon} icon`}>
      <Text style={[styles.settingIcon, icon === 'moon' || icon === 'lock' || icon === 'sun' ? styles.yellowIcon : null]}>
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

export const ProfileCard: React.FC<ProfileCardProps> = ({ name, age, avatar, onEdit }) => {
  const styles = useThemedStyles(makeStyles);
  return (
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
};

export const SectionTitle: React.FC<{ children: string }> = ({ children }) => {
  const styles = useThemedStyles(makeStyles);
  return <Text style={styles.sectionTitle}>{children}</Text>;
};

interface SettingsCardProps {
  title: string;
  subtitle: string;
  icon: SettingIcon;
  onPress: () => void;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({ title, subtitle, icon, onPress }) => {
  const styles = useThemedStyles(makeStyles);
  return (
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
};

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
  const { mode, scheme, cycleMode } = useAppTheme();
  const styles = useThemedStyles(makeStyles);

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
        <SettingsCard
          title="Appearance"
          subtitle={`${appearanceLabel(mode)} · ${scheme === 'dark' ? 'Dark' : 'Light'}`}
          icon={scheme === 'dark' ? 'moon' : 'sun'}
          onPress={cycleMode}
        />
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
  const styles = useThemedStyles(makeStyles);

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

const makeStyles = (colors: ThemeColors) => ({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 60,
    paddingHorizontal: 20,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  headerButton: { width: 34, height: 40, justifyContent: 'center' as const },
  backIcon: { color: colors.textDark, fontSize: 32, lineHeight: 34, fontWeight: '300' as const },
  headerTitle: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    textAlign: 'center' as const,
    color: colors.textDark,
    ...theme.typography.cardTitle,
  },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 },
  profileCard: {
    minHeight: 90,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.cardBg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.purpleLightBg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  avatar: { fontSize: 27 },
  profileDetails: { flex: 1, marginLeft: 14 },
  profileName: { ...theme.typography.cardTitle, color: colors.textDark },
  profileAge: { ...theme.typography.body, color: colors.textMuted, marginTop: 4 },
  editButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.cardBg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: colors.textDark,
    shadowOpacity: 0.08,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  editIcon: { color: colors.textDark, fontSize: 21 },
  sectionTitle: {
    color: colors.textDark,
    ...theme.typography.section,
    marginTop: 32,
    marginBottom: 14,
  },
  settingsCard: {
    minHeight: 88,
    marginBottom: 13,
    paddingHorizontal: 18,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.cardBg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.purpleLightBg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  settingIcon: { color: colors.textDark, fontSize: 29, lineHeight: 32 },
  yellowIcon: { color: '#F5C84B' },
  settingDetails: { flex: 1, marginLeft: 16 },
  settingTitle: { ...theme.typography.section, color: colors.textDark },
  settingSubtitle: { ...theme.typography.body, color: colors.textMuted, marginTop: 4 },
  chevron: { color: colors.textDark, fontSize: 25, fontWeight: '300' as const, marginLeft: 10 },
  placeholder: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 20 },
  placeholderTitle: { ...theme.typography.cardTitle, color: colors.textDark },
  placeholderText: { ...theme.typography.body, color: colors.textMuted, marginTop: 8 },
});
