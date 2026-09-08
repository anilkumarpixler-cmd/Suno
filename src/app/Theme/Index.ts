export const theme = {
  colors: {
    background: '#FAF8F5',       // Warm off-white / cream
    primary: '#6C5CE7',          // Vivid purple
    primaryDark: '#5B4BC4',
    textDark: '#1E1E2D',         // Dark navy
    textMuted: '#6C757D',        // Muted blue-gray
    cardBg: '#FFFFFF',
    playerBg: '#181829',        // Dark charcoal-purple
    success: '#00B894',         // Soft green
    accentPink: '#FFEAA7',
    borderLight: '#EFECE6',
    purpleDashed: '#A29BFE',
    purpleLightBg: '#F3F0FF',
  },
  gradients: {
    hero: ['#FFE5EC', '#E8E5FF', '#FFF0E5'] as const, // Pink -> Lavender -> Peach
    playerArt: ['#A8A4FF', '#FFB4E6'] as const,
  },
  borderRadius: {
    card: 24,
    button: 16,
    pill: 50,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  }
};