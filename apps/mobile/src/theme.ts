// Design tokens shared across the app. Visual language: light cool
// lavender/off-white background, white rounded cards with soft shadow,
// blue primary accents, charcoal headings, grey secondary text.
// No gradients, no glassmorphism, minimal visual noise.

export const colors = {
  bg: '#F3F4FB',
  bgAlt: '#EAECF8',
  card: '#FFFFFF',
  border: '#E7E8F2',
  primary: '#3652E0',
  primaryDark: '#2A40B8',
  primarySoft: '#EAEDFF',
  text: '#181A2A',
  textSecondary: '#6B6F8B',
  textMuted: '#9A9DB8',
  success: '#1E9E5A',
  successSoft: '#E4F8ED',
  warning: '#B77A12',
  warningSoft: '#FBF0DD',
  danger: '#D64545',
  dangerSoft: '#FCE8E8',
  white: '#FFFFFF',
  overlay: 'rgba(20, 21, 40, 0.45)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 28,
} as const;

export const shadow = {
  card: {
    shadowColor: '#141528',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  floating: {
    shadowColor: '#141528',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;
