import { Platform } from 'react-native';

/**
 * Fittelo design tokens.
 * One brand green, #56D661, everywhere: buttons, text, sliders, progress, active states,
 * the splash and the app icon. The three `primary*` keys are kept so a future shade split
 * is a one-file edit, but today they all resolve to the same value.
 *
 * #56D661 is light (1.88:1 on white), so anything sitting ON a green fill uses `onPrimary`,
 * never white. For a fill whose colour is only known at runtime, use `onFill()`.
 * Neutrals are warm "stone" greys; cards stay white on a warm canvas.
 */
export const C = {
  /** The brand green. Content on top of it must be `onPrimary`. */
  primaryBright: '#56D661',
  /** Ink for text and icons sitting on any green fill. */
  onPrimary: '#04080B',
  primary: '#56D661',
  primaryDark: '#56D661',
  primarySoft: '#E6FCE8',
  primaryTint: '#B3F2B9',
  accent: '#F2703A',
  accentSoft: '#FEEDE4',
  bg: '#F5F5F4',
  card: '#FFFFFF',
  surfaceAlt: '#F8F7F6',
  text: '#1C1917',
  textSoft: '#57534E',
  muted: '#8C8580',
  border: '#E7E5E4',
  borderSoft: '#F0EFED',
  skeleton: '#ECEAE8',
  carbs: '#F0AE1C',
  protein: '#4A7CF0',
  fat: '#EC6A8E',
  fiber: '#8D70E0',
  water: '#2C9BDB',
  waterSoft: '#E3F2FB',
  steps: '#7457D6',
  stepsSoft: '#EEEAFB',
  workout: '#C2468F',
  workoutSoft: '#FBEAF3',
  weight: '#1F8572',
  weightSoft: '#E2F3EF',
  danger: '#E5484D',
  dangerSoft: '#FDECEC',
  warning: '#C98A06',
  warningSoft: '#FDF4DC',
  gold: '#F5C451',
  navy: '#121417',
  white: '#FFFFFF',
  overlay: 'rgba(12,10,9,0.42)',
  /** AI (Saathi) surfaces: mint fill, tinted hairline, deep text. */
  ai: '#1F6B5A',
  aiSoft: '#E8F7F0',
  aiBorder: '#BFE6D4',
};

/**
 * Neutral ink used for every scrim laid over photography — kept free of brand hue so
 * photos read as photos. `ink(0)` gives the fully transparent stop for a fade.
 */
export const INK = '#0B0B0C';
export const ink = (opacity: number) => `rgba(11,11,12,${opacity})`;

/**
 * Readable ink for content sitting on `fill`: dark on light fills, white on dark ones.
 * For fills chosen at runtime (a chip's colour prop, a plan's accent) — static green
 * fills can just use `C.onPrimary`.
 */
export const onFill = (fill: string) => {
  if (fill.length !== 7 || fill[0] !== '#') return C.white;
  const srgb = [1, 3, 5].map((i) => parseInt(fill.slice(i, i + 2), 16) / 255);
  const [r, g, b] = srgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? C.onPrimary : C.white;
};

/** Gradient stops (always use sparingly: hero, premium, celebration). */
export const G = {
  brand: ['#56D661', '#56D661'] as [string, string],
  deep: ['#078511', '#044A0A'] as [string, string],
  premium: ['#121417', '#2B3036'] as [string, string],
  warm: ['#FF8A4C', '#F0563D'] as [string, string],
  glow: ['#DEF9E0', 'rgba(245,245,244,0)'] as [string, string],
  /** Charcoal wash that sits behind or below a photo. */
  photo: ['#1C2026', '#0B0B0C'] as [string, string],
};

export const R = { xs: 8, sm: 12, md: 16, lg: 20, xl: 28, pill: 999 };

/** 4-pt spacing scale. Screen gutter is `S.lg` (16). */
export const S = { xxs: 4, xs: 8, sm: 12, md: 14, lg: 16, xl: 20, xxl: 24, xxxl: 32 };

const ios = (opacity: number, radius: number, y: number, color = '#1C1917') => ({ shadowColor: color, shadowOpacity: opacity, shadowRadius: radius, shadowOffset: { width: 0, height: y } });

/** Soft, diffuse card shadow. */
export const shadow = Platform.select<object>({ ios: ios(0.06, 14, 4), android: { elevation: 2 }, default: ios(0.06, 14, 4) }) as object;
export const shadowSm = Platform.select<object>({ ios: ios(0.05, 6, 2), android: { elevation: 1 }, default: ios(0.05, 6, 2) }) as object;
export const shadowLg = Platform.select<object>({ ios: ios(0.12, 24, 10), android: { elevation: 8 }, default: ios(0.12, 24, 10) }) as object;
/** Coloured glow under brand-filled elements (buttons, quick-log). */
export const glow = (color: string) => Platform.select<object>({ ios: ios(0.3, 14, 6, color), android: { elevation: 6 }, default: ios(0.3, 14, 6, color) }) as object;

/** Motion: durations (ms) and springs. Keep UI motion short; entrances are the longest. */
export const MOTION = {
  fast: 140,
  base: 220,
  enter: 420,
  stagger: 55,
  count: 750,
  progress: 700,
  sheetIn: 320,
  sheetOut: 190,
  pressSpring: { damping: 18, stiffness: 420, mass: 0.6 },
  spring: { damping: 18, stiffness: 200, mass: 0.8 },
};

export const BRAND = 'Fittelo';
