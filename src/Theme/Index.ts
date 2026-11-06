import { TextStyle } from 'react-native';

export const typography = {
  hero: { fontSize: 28, fontWeight: '700', lineHeight: 34 } satisfies TextStyle,
  // Page heading in the top bar, the same on every screen.
  screenTitle: { fontSize: 22, fontWeight: '700', lineHeight: 28 } satisfies TextStyle,
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

export type Gradients = {
  hero: readonly [string, string, string];
  playerArt: readonly [string, string];
  createHero: readonly [string, string];
};

/** The colors a theme color changes; everything else (background, cards, text) stays. */
type AccentColors = Pick<
  ThemeColors,
  'primary' | 'primaryDark' | 'purpleDashed' | 'purpleLightBg' | 'continueCard' | 'continueBorder'
>;

export type ThemeAccent =
  | 'purple'
  | 'blue'
  | 'green'
  | 'pink'
  | 'orange'
  | 'teal'
  | 'red'
  | 'indigo'
  | 'cocoa'
  | 'slate';

export const accents: Record<
  ThemeAccent,
  { label: string } & Record<ColorScheme, { colors: AccentColors; gradients: Gradients }>
> = {
  // The original Suno look.
  purple: {
    label: 'Purple',
    light: {
      colors: {
        primary: '#6C5CE7',
        primaryDark: '#5B4BC4',
        purpleDashed: '#A29BFE',
        purpleLightBg: '#F3F0FF',
        continueCard: '#FAF5FF',
        continueBorder: '#E9D8FD',
      },
      gradients: {
        hero: ['#FFE5EC', '#E8E5FF', '#FFF0E5'],
        playerArt: ['#A8A4FF', '#FFB4E6'],
        createHero: ['#F4E8F5', '#FFF0DF'],
      },
    },
    dark: {
      colors: {
        primary: '#7C8CFF',
        primaryDark: '#6575E8',
        purpleDashed: '#7C8CFF',
        purpleLightBg: '#1C2230',
        continueCard: '#1A2030',
        continueBorder: '#2E3644',
      },
      gradients: {
        hero: ['#1A1F2A', '#161B24', '#1C222C'],
        playerArt: ['#4A5A9A', '#5A6AA8'],
        createHero: ['#1A1F2A', '#1C222C'],
      },
    },
  },
  blue: {
    label: 'Blue',
    light: {
      colors: {
        primary: '#2F7DE1',
        primaryDark: '#1F67C4',
        purpleDashed: '#8AB8F6',
        purpleLightBg: '#EAF3FF',
        continueCard: '#F2F8FF',
        continueBorder: '#CFE3FC',
      },
      gradients: {
        hero: ['#E3F0FF', '#E8F7FF', '#F0F4FF'],
        playerArt: ['#7FB2F5', '#9DE3F7'],
        createHero: ['#E6F1FF', '#EEF8FF'],
      },
    },
    dark: {
      colors: {
        primary: '#5AA2FF',
        primaryDark: '#3F8AEB',
        purpleDashed: '#5AA2FF',
        purpleLightBg: '#172235',
        continueCard: '#16202F',
        continueBorder: '#283A52',
      },
      gradients: {
        hero: ['#151E2B', '#131A24', '#18222F'],
        playerArt: ['#2F5A8F', '#3B7099'],
        createHero: ['#151E2B', '#18222F'],
      },
    },
  },
  green: {
    label: 'Green',
    light: {
      colors: {
        primary: '#138A5C',
        primaryDark: '#0E744D',
        purpleDashed: '#7FD3AE',
        purpleLightBg: '#E7F7EF',
        continueCard: '#F1FBF6',
        continueBorder: '#C8EBD9',
      },
      gradients: {
        hero: ['#E3F7EC', '#EAF8F1', '#F3F9E8'],
        playerArt: ['#7BD6A8', '#B8E986'],
        createHero: ['#E6F6EC', '#F2F9E6'],
      },
    },
    dark: {
      colors: {
        primary: '#3CCB8D',
        primaryDark: '#26B077',
        purpleDashed: '#3CCB8D',
        purpleLightBg: '#15261F',
        continueCard: '#15221D',
        continueBorder: '#24392F',
      },
      gradients: {
        hero: ['#14201B', '#121A17', '#17231E'],
        playerArt: ['#2E6B50', '#3E7F5B'],
        createHero: ['#14201B', '#17231E'],
      },
    },
  },
  pink: {
    label: 'Pink',
    light: {
      colors: {
        primary: '#D63A73',
        primaryDark: '#B82C60',
        purpleDashed: '#F49AB9',
        purpleLightBg: '#FDEBF2',
        continueCard: '#FFF4F8',
        continueBorder: '#F8CFE0',
      },
      gradients: {
        hero: ['#FFE3EE', '#FDE8F3', '#FFF0EA'],
        playerArt: ['#F59ABF', '#FFC2A8'],
        createHero: ['#FCE6F0', '#FFF0E6'],
      },
    },
    dark: {
      colors: {
        primary: '#FF6FA3',
        primaryDark: '#EB5590',
        purpleDashed: '#FF6FA3',
        purpleLightBg: '#2A1822',
        continueCard: '#241820',
        continueBorder: '#3D2733',
      },
      gradients: {
        hero: ['#22161D', '#1B1318', '#261920'],
        playerArt: ['#8A3D60', '#A04F6B'],
        createHero: ['#22161D', '#261920'],
      },
    },
  },
  orange: {
    label: 'Orange',
    light: {
      colors: {
        primary: '#D9621F',
        primaryDark: '#BC5218',
        purpleDashed: '#F6B183',
        purpleLightBg: '#FDF0E6',
        continueCard: '#FFF7F0',
        continueBorder: '#F9D9C0',
      },
      gradients: {
        hero: ['#FFEBDD', '#FFF1E3', '#FFF6E0'],
        playerArt: ['#F7A86B', '#FFD27A'],
        createHero: ['#FDEBDD', '#FFF3DF'],
      },
    },
    dark: {
      colors: {
        primary: '#FF9450',
        primaryDark: '#EB7C36',
        purpleDashed: '#FF9450',
        purpleLightBg: '#2A1E15',
        continueCard: '#241B14',
        continueBorder: '#3D2D20',
      },
      gradients: {
        hero: ['#221A14', '#1B1511', '#261D16'],
        playerArt: ['#8A5530', '#A0683A'],
        createHero: ['#221A14', '#261D16'],
      },
    },
  },
  teal: {
    label: 'Teal',
    light: {
      colors: {
        primary: '#0E7C7B',
        primaryDark: '#0A6463',
        purpleDashed: '#7FCFCB',
        purpleLightBg: '#E6F6F5',
        continueCard: '#F1FAF9',
        continueBorder: '#C5E8E5',
      },
      gradients: {
        hero: ['#E0F5F3', '#E6F7F6', '#EEF8F2'],
        playerArt: ['#6CCFC8', '#9EE3D1'],
        createHero: ['#E3F4F2', '#EEF8F2'],
      },
    },
    dark: {
      colors: {
        primary: '#3DD1C7',
        primaryDark: '#26B5AB',
        purpleDashed: '#3DD1C7',
        purpleLightBg: '#13252A',
        continueCard: '#142225',
        continueBorder: '#22393C',
      },
      gradients: {
        hero: ['#13201F', '#111A1A', '#16231F'],
        playerArt: ['#2B6B67', '#357F78'],
        createHero: ['#13201F', '#16231F'],
      },
    },
  },
  red: {
    label: 'Red',
    light: {
      colors: {
        primary: '#C53030',
        primaryDark: '#A52828',
        purpleDashed: '#F2A0A0',
        purpleLightBg: '#FDECEC',
        continueCard: '#FFF5F5',
        continueBorder: '#F8D0D0',
      },
      gradients: {
        hero: ['#FFE5E5', '#FDEBEB', '#FFF1E8'],
        playerArt: ['#F28B8B', '#FFB59E'],
        createHero: ['#FCE7E7', '#FFF1E6'],
      },
    },
    dark: {
      colors: {
        primary: '#FF6B6B',
        primaryDark: '#EB5252',
        purpleDashed: '#FF6B6B',
        purpleLightBg: '#2A1718',
        continueCard: '#241718',
        continueBorder: '#3D2628',
      },
      gradients: {
        hero: ['#221516', '#1B1213', '#261818'],
        playerArt: ['#8A3B3B', '#A04C45'],
        createHero: ['#221516', '#261818'],
      },
    },
  },
  indigo: {
    label: 'Indigo',
    light: {
      colors: {
        primary: '#4C51BF',
        primaryDark: '#3C40A3',
        purpleDashed: '#A3A8F0',
        purpleLightBg: '#EEEFFD',
        continueCard: '#F5F6FF',
        continueBorder: '#D5D8FA',
      },
      gradients: {
        hero: ['#E6E8FF', '#ECEBFF', '#F0F2FF'],
        playerArt: ['#8F95F2', '#B3A8FF'],
        createHero: ['#E9EAFD', '#F1EFFF'],
      },
    },
    dark: {
      colors: {
        primary: '#8C93FF',
        primaryDark: '#737BEB',
        purpleDashed: '#8C93FF',
        purpleLightBg: '#1B1D35',
        continueCard: '#1A1B2E',
        continueBorder: '#2D2F4A',
      },
      gradients: {
        hero: ['#171828', '#141522', '#1A1B2C'],
        playerArt: ['#3E4290', '#4E4FA3'],
        createHero: ['#171828', '#1A1B2C'],
      },
    },
  },
  cocoa: {
    label: 'Cocoa',
    light: {
      colors: {
        primary: '#8B5E3C',
        primaryDark: '#724C30',
        purpleDashed: '#D2AE8E',
        purpleLightBg: '#F7EFE8',
        continueCard: '#FBF6F1',
        continueBorder: '#EADBCB',
      },
      gradients: {
        hero: ['#F6EBE1', '#F8EFE6', '#FBF3E6'],
        playerArt: ['#C99A72', '#E8C49A'],
        createHero: ['#F5EAE0', '#FAF1E4'],
      },
    },
    dark: {
      colors: {
        primary: '#D9A57A',
        primaryDark: '#C38C60',
        purpleDashed: '#D9A57A',
        purpleLightBg: '#2A2019',
        continueCard: '#231C17',
        continueBorder: '#3B3027',
      },
      gradients: {
        hero: ['#211A15', '#1B1612', '#251D17'],
        playerArt: ['#7A5638', '#8F6844'],
        createHero: ['#211A15', '#251D17'],
      },
    },
  },
  slate: {
    label: 'Slate',
    light: {
      colors: {
        primary: '#4A5568',
        primaryDark: '#3A4354',
        purpleDashed: '#A0AEC0',
        purpleLightBg: '#EEF1F5',
        continueCard: '#F6F8FA',
        continueBorder: '#D8DEE6',
      },
      gradients: {
        hero: ['#E9EDF2', '#EEF1F5', '#F2F4F7'],
        playerArt: ['#8D9AAF', '#B4C0D0'],
        createHero: ['#EBEEF3', '#F2F4F7'],
      },
    },
    dark: {
      colors: {
        primary: '#A0AEC0',
        primaryDark: '#8896A9',
        purpleDashed: '#A0AEC0',
        purpleLightBg: '#1D222B',
        continueCard: '#1A1F27',
        continueBorder: '#2E3540',
      },
      gradients: {
        hero: ['#181C23', '#14171D', '#1B2028'],
        playerArt: ['#4A5568', '#5A6678'],
        createHero: ['#181C23', '#1B2028'],
      },
    },
  },
};

export const THEME_ACCENTS = Object.keys(accents) as ThemeAccent[];

/** Light or dark base colors with the chosen theme color on top. */
export const buildPalette = (scheme: ColorScheme, accent: ThemeAccent) => {
  const tint = accents[accent][scheme];
  return {
    colors: { ...palettes[scheme].colors, ...tint.colors },
    gradients: tint.gradients,
  };
};

export const palettes: Record<ColorScheme, { colors: ThemeColors; gradients: Gradients }> = {
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
