import { TextStyle } from 'react-native';

export const typography = {
  hero: { fontSize: 28, fontWeight: '700', lineHeight: 34 } satisfies TextStyle,
  cardTitle: { fontSize: 17, fontWeight: '700', lineHeight: 22 } satisfies TextStyle,
  section: { fontSize: 16, fontWeight: '600', lineHeight: 20 } satisfies TextStyle,
  body: { fontSize: 14, fontWeight: '400', lineHeight: 20 } satisfies TextStyle,
  badge: { fontSize: 12, fontWeight: '600', lineHeight: 16 } satisfies TextStyle,
  caption: { fontSize: 11, fontWeight: '400', lineHeight: 14 } satisfies TextStyle,
} as const;

const lightColors = {
  background: '#FAF8F5',
  primary: '#6C5CE7',
  primaryDark: '#5B4BC4',
  textDark: '#1E1E2D',
  textMuted: '#6C757D',
  cardBg: '#FFFFFF',
  playerBg: '#181829',
  success: '#00B894',
  accentPink: '#FFEAA7',
  danger: '#E53E3E',
  borderLight: '#EFECE6',
  purpleDashed: '#A29BFE',
  purpleLightBg: '#F3F0FF',
  onPrimary: '#FFFFFF',
  navBg: '#FFFFFF',
  continueCard: '#FAF5FF',
  continueBorder: '#E9D8FD',
  pillBg: '#EFECE6',
  playerText: '#FFFFFF',
  playerMuted: '#A0AEC0',
  sliderTrack: '#32324D',
  overlay: 'rgba(0, 0, 0, 0.5)',
  placeholder: '#63708A',
  toastBg: '#FFFFFF',
  toastText: '#1E1E2D',
};

const darkColors: typeof lightColors = {
  background: '#0E1116',
  primary: '#7C8CFF',
  primaryDark: '#6575E8',
  textDark: '#F2F4F7',
  textMuted: '#9AA3AF',
  cardBg: '#171B22',
  playerBg: '#12151B',
  success: '#2FBF8A',
  accentPink: '#df3f17',
  danger: '#E35D5D',
  borderLight: '#2A303A',
  purpleDashed: '#7C8CFF',
  purpleLightBg: '#1C2230',
  onPrimary: '#FFFFFF',
  navBg: '#12151B',
  continueCard: '#1A2030',
  continueBorder: '#2E3644',
  pillBg: '#222833',
  playerText: '#F2F4F7',
  playerMuted: '#9AA3AF',
  sliderTrack: '#2A303A',
  overlay: 'rgba(0, 0, 0, 0.65)',
  placeholder: '#7B8494',
  toastBg: '#1C212B',
  toastText: '#F2F4F7',
};


export type ThemeColors = typeof lightColors;
export type ColorScheme = 'light' | 'dark';

export const palettes = {
  light: {
    colors: lightColors,
    gradients: {
      hero: ['#FFE5EC', '#E8E5FF', '#FFF0E5'] as const,
      playerArt: ['#A8A4FF', '#FFB4E6'] as const,
      createHero: ['#F4E8F5', '#FFF0DF'] as const,
    },
  },
  dark: {
    colors: darkColors,
    gradients: {
      hero: ['#1A1F2A', '#161B24', '#1C222C'] as const,
      playerArt: ['#4A5A9A', '#5A6AA8'] as const,
      createHero: ['#1A1F2A', '#1C222C'] as const,
    },
  },
};

export const borderRadius = {
  card: 24,
  button: 16,
  pill: 50,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const theme = {
  typography,
  colors: lightColors,
  gradients: palettes.light.gradients,
  borderRadius,
  spacing,
};
