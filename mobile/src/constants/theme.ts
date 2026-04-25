export const Colors = {
  background: '#0A0A0F',
  surface: '#13131A',
  surface2: '#1C1C27',
  accent: '#7C3AED',
  accentGlow: '#7C3AED33',
  accentLight: '#A78BFA',
  success: '#10B981',
  error: '#EF4444',
  textPrimary: '#F9FAFB',
  textSecondary: '#6B7280',
  border: '#ffffff0D',
} as const

export const Typography = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const

export const Shadows = {
  accent: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
} as const
