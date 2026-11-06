import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/Common/header';
import { showToast } from '@/components/Common/Toast';
import { useApp, VoicesStatus } from '@/Context/AppContext';
import { ConfirmModal } from '@/modal/confirmModal';
import { formatDays, formatTime, SleepModeSettings } from '@/services/sleepMode';
import { accents, theme, ThemeColors } from '@/Theme/Index';
import { appearanceLabel, useAppTheme, useThemedStyles } from '@/Theme/ThemeProvider';
import { RootScreen } from '@/Types';

export type SettingIcon = 'globe' | 'moon' | 'microphone' | 'lock' | 'sun' | 'device';

const SETTING_ICONS: Record<SettingIcon, keyof typeof MaterialIcons.glyphMap> = {
  globe: 'language',
  moon: 'dark-mode',
  sun: 'light-mode',
  microphone: 'mic',
  lock: 'lock',
  device: 'smartphone',
};

const YELLOW_ICON = '#F5C84B';

export const IconContainer: React.FC<{ icon: SettingIcon }> = ({ icon }) => {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useAppTheme();
  const isYellow = icon === 'moon' || icon === 'lock' || icon === 'sun';

  return (
    <View style={styles.iconContainer} accessible accessibilityLabel={`${icon} icon`}>
      <MaterialIcons
        name={SETTING_ICONS[icon]}
        size={26}
        color={isYellow ? YELLOW_ICON : colors.textDark}
      />
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
  const { colors } = useAppTheme();
  return (
    <View style={styles.profileCard}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatar}>{avatar}</Text>
      </View>
      <View style={styles.profileDetails}>
        <Text style={styles.profileName}>hello</Text>
        <Text style={styles.profileAge}>23</Text>
      </View>
      <Pressable
        style={styles.editButton}
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel="Edit profile">
        <MaterialIcons name="edit" size={22} color={colors.textDark} />
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
  const { colors } = useAppTheme();
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
      <MaterialIcons name="chevron-right" size={26} color={colors.textDark} style={styles.chevron} />
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
  { id: 'sleepTimer', title: 'Sleep timer', subtitle: 'Off', icon: 'moon', destination: 'SleepTimer' },
  // Subtitle is the live count from the server's voice list (see familyVoicesLabel).
  { id: 'familyVoices', title: 'Family voices', subtitle: '', icon: 'microphone', destination: 'Voices' },
  { id: 'privacy', title: 'Privacy & voice data', subtitle: 'Manage recordings', icon: 'lock' },
];

const sleepModeLabel = (settings: SleepModeSettings) =>
  settings.enabled
    ? `${formatTime(settings.startMinutes)} – ${formatTime(settings.endMinutes)} · ${formatDays(settings.days)}`
    : 'Off';

/** Live count, e.g. "2 voices"; no "0 voices" while the list is still loading or the server is down. */
const familyVoicesLabel = (count: number, status: VoicesStatus) => {
  if (status === 'loading' && count === 0) return 'Loading…';
  if (status === 'offline' && count === 0) return 'Server not connected';
  return `${count} ${count === 1 ? 'voice' : 'voices'}`;
};

export const ProfileScreen: React.FC = () => {
  const { child, setCurrentScreen, sleepMode, voices, voicesStatus } = useApp();
  const { mode, scheme, accent, colors } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const [logoutVisible, setLogoutVisible] = useState(false);

  // The app has no sign-in yet: the button and its pop-up are in place for when it does.
  const handleLogout = () => {
    setLogoutVisible(false);
    showToast('Logout will be available once sign-in is added.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Profile" showBack onBack={() => setCurrentScreen('Home')} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <ProfileCard
          name={child.name || 'Your child'}
          age={child.age ? `${child.age} ${child.age === 1 ? 'year' : 'years'} old` : ''}
          avatar={child.avatar || '🧒'}
          onEdit={() => showToast('Child Profile Editing.')}
        />
        <SectionTitle>Settings</SectionTitle>
        <SettingsCard
          title="Appearance"
          subtitle={`${appearanceLabel(mode)} · ${scheme === 'dark' ? 'Dark' : 'Light'} · ${accents[accent].label}`}
          icon={scheme === 'dark' ? 'moon' : 'sun'}
          onPress={() => setCurrentScreen('Appearance')}
        />
        {settings.map((setting) => (
          <SettingsCard
            key={setting.id}
            title={setting.title}
            subtitle={
              setting.id === 'sleepTimer'
                ? sleepModeLabel(sleepMode)
                : setting.id === 'familyVoices'
                  ? familyVoicesLabel(voices.length, voicesStatus)
                  : setting.subtitle
            }
            icon={setting.icon}
            onPress={() => {
              if (setting.destination) {
                setCurrentScreen(setting.destination);
              }
            }}
          />
        ))}
        <Pressable
          style={styles.logoutButton}
          onPress={() => setLogoutVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Log out">
          <MaterialIcons name="logout" size={22} color={colors.danger} />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
      <ConfirmModal
        visible={logoutVisible}
        title="Log out?"
        message="Are you sure you want to log out of Suno?"
        confirmLabel="Log out"
        onCancel={() => setLogoutVisible(false)}
        onConfirm={handleLogout}
      />
    </SafeAreaView>
  );
};

export default ProfileScreen;

export const SettingsPlaceholderScreen: React.FC<{ title: string }> = ({ title }) => {
  const { setCurrentScreen } = useApp();
  const styles = useThemedStyles(makeStyles);

  return (
    <SafeAreaView style={styles.container}>
      <Header title={title} showBack onBack={() => setCurrentScreen('Profile')} />
      <View style={styles.placeholder}>
        <Text style={styles.placeholderTitle}>{title}</Text>
        <Text style={styles.placeholderText}>This setting will be available here.</Text>
      </View>
    </SafeAreaView>
  );
};

const makeStyles = (colors: ThemeColors) => ({
  container: { flex: 1, backgroundColor: colors.background },
  // Extra bottom space so the last setting clears the mini player.
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 140 },
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
  settingDetails: { flex: 1, marginLeft: 16 },
  settingTitle: { ...theme.typography.section, color: colors.textDark },
  settingSubtitle: { ...theme.typography.body, color: colors.textMuted, marginTop: 4 },
  chevron: { marginLeft: 10 },
  logoutButton: {
    minHeight: 56,
    marginTop: 19,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.cardBg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  logoutText: { ...theme.typography.section, color: colors.danger, marginLeft: 8 },
  placeholder: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 20 },
  placeholderTitle: { ...theme.typography.cardTitle, color: colors.textDark },
  placeholderText: { ...theme.typography.body, color: colors.textMuted, marginTop: 8 },
});
