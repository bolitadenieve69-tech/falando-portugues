/**
 * "Falando Noturno" palette.
 *
 * The scene this is designed for: someone alone in their living room at ten at
 * night, speaking a language they don't master yet, feeling slightly ridiculous.
 * That asks for lamp light, not a classroom.
 *
 * The Portuguese flag is spread across the palette rather than stuck on as a
 * sticker: its green is taken almost to black and becomes the ground, the gold
 * of the armillary sphere becomes the light (and the tutor's voice), and the red
 * is kept for the one action that ends the conversation.
 *
 * Authored in OKLCH for perceptual evenness, then converted to hex because React
 * Native does not accept oklch(). See docs/design/falando-noturno.html.
 * Every text pairing below clears WCAG AA on the ground (most clear AAA).
 */
export const Colors = {
  // Ground: the flag's green, taken almost to black.
  background: '#080c09',
  surface: '#080c09',
  surfaceDim: '#050906',
  surfaceContainerLowest: '#030604',
  surfaceContainerLow: '#0f1410',
  surfaceContainer: '#131914',
  surfaceContainerHigh: '#1c221d',
  surfaceContainerHighest: '#272d28',
  surfaceBright: '#313732',
  surfaceVariant: '#272d28',

  // Light: the gold of the armillary sphere. Primary accent and the tutor's voice.
  primary: '#f1aa4f',
  primaryContainer: '#683c00',
  primaryFixed: '#ffc573',
  primaryFixedDim: '#f1aa4f',
  onPrimary: '#281601',
  onPrimaryContainer: '#ffd69a',
  onPrimaryFixed: '#1d0e00',

  // Muted sage, lifted out of the ground. Borders and quiet icons.
  secondary: '#91ad96',
  secondaryContainer: '#243928',
  onSecondary: '#07150a',
  onSecondaryContainer: '#c6dfca',

  // Clay: "needs attention" (correction counts, low accuracy). Never alarm red.
  tertiary: '#e78b7c',
  tertiaryContainer: '#782a24',
  onTertiary: '#2c0805',
  onTertiaryContainer: '#ffd0c5',

  error: '#ef7f74',
  errorContainer: '#7c1213',
  onError: '#290605',
  onErrorContainer: '#ffd7d1',

  onBackground: '#ecebe6',
  onSurface: '#ecebe6',
  onSurfaceVariant: '#a5a59e',
  outline: '#777c75',
  outlineVariant: '#323732',

  inverseSurface: '#ecebe6',
  inverseOnSurface: '#1e231f',
  inversePrimary: '#854f00',

  /**
   * The flag proper, used only where it means something. Lifted slightly off the
   * official green so it still reads against the near-black ground. Note the two
   * halves share a luminance and separate by hue alone, so the flag must never be
   * the only thing carrying a meaning.
   */
  flagGreen: '#0b7a43',
  flagRed: '#d5342f',
  /** The learner's own voice: a cool counterpoint to the tutor's gold. */
  userVoice: '#6fcee4',
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
