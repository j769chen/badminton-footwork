/**
 * Design tokens for the Badminton Footwork Trainer.
 * Single dark palette tuned for high contrast in a gym / court setting.
 */

export const Colors = {
  background: '#0B1120',
  surface: '#141C2E',
  surfaceAlt: '#1E2942',
  border: '#2A3654',

  text: '#F8FAFC',
  textMuted: '#94A3B8',

  accent: '#22D3A6',
  accentDim: '#0E5E4C',

  court: '#15803D',
  courtLine: '#E2E8F0',

  cornerIdle: '#1E2942',
  cornerActive: '#FBBF24',
  cornerActiveGlow: '#FCD34D',
  cornerText: '#F8FAFC',
  cornerActiveText: '#0B1120',

  danger: '#F87171',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 14,
  lg: 24,
  pill: 999,
} as const;
