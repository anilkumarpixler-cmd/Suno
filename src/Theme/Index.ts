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
};

const darkColors: typeof lightColors = {
  background: '#12121C',
  primary: '#8B7CFF',
  primaryDark: '#6C5CE7',
  textDark: '#F4F1FF',
  textMuted: '#A8A4C0',
  cardBg: '#1C1C2C',
  playerBg: '#161625',
  success: '#00B894',
  accentPink: '#3D3420',
  borderLight: '#2E2E42',
  purpleDashed: '#7B74D4',
  purpleLightBg: '#2A2450',
  onPrimary: '#FFFFFF',
  navBg: '#1A1A26',
  continueCard: '#241E38',
  continueBorder: '#3D3460',
  pillBg: '#2A2A3C',
  playerText: '#FFFFFF',
  playerMuted: '#A0AEC0',
  sliderTrack: '#32324D',
  overlay: 'rgba(0, 0, 0, 0.65)',
  placeholder: '#8E8AA8',
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
      hero: ['#3A2432', '#2A2848', '#3A3024'] as const,
      playerArt: ['#6B66C8', '#C478A8'] as const,
      createHero: ['#3A2438', '#3A3020'] as const,
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
