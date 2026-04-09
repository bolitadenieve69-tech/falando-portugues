export const Colors = {
  background: '#121412',
  surface: '#121412',
  surfaceDim: '#121412',
  surfaceContainerLowest: '#0d0f0d',
  surfaceContainerLow: '#1a1c1a',
  surfaceContainer: '#1e201e',
  surfaceContainerHigh: '#292a28',
  surfaceContainerHighest: '#333533',
  surfaceBright: '#383a37',
  surfaceVariant: '#333533',

  primary: '#81db6e',
  primaryContainer: '#006600',
  primaryFixed: '#9cf987',
  primaryFixedDim: '#81db6e',
  onPrimary: '#003a00',
  onPrimaryContainer: '#88e274',
  onPrimaryFixed: '#002200',

  secondary: '#abd19d',
  secondaryContainer: '#33532b',
  onSecondary: '#183712',
  onSecondaryContainer: '#a0c693',

  tertiary: '#ffb3ac',
  tertiaryContainer: '#b10315',
  onTertiary: '#680008',
  onTertiaryContainer: '#ffbdb6',

  error: '#ffb4ab',
  errorContainer: '#93000a',
  onError: '#690005',
  onErrorContainer: '#ffdad6',

  onBackground: '#e3e3df',
  onSurface: '#e3e3df',
  onSurfaceVariant: '#bfcab7',
  outline: '#899483',
  outlineVariant: '#404a3b',

  inverseSurface: '#e3e3df',
  inverseOnSurface: '#2f312e',
  inversePrimary: '#106e09',
} as const;

export const Typography = {
  headline: 'Manrope_800ExtraBold',
  headlineBold: 'Manrope_700Bold',
  body: 'Manrope_400Regular',
  label: 'Inter_400Regular',
  labelMedium: 'Inter_600SemiBold',
} as const;

export const BorderRadius = {
  sm: 8,
  md: 16,
  lg: 32,
  xl: 48,
  full: 9999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;
