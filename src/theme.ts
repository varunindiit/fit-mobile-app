import { Platform } from 'react-native';

/**
 * Fittelo design tokens.
 * Two-tier brand: `primary` (vivid) for progress, highlights and active states;
 * `primaryDark` (deep) for filled buttons, the quick-log button and text on mint.
 * Neutrals are warm "stone" greys; cards stay white on a warm canvas.
 */
export const C = {
  primary: '#12A87D',
  primaryDark: '#155E50',
  primarySoft: '#E4F5EE',
  primaryTint: '#C9EBDD',
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
  navy: '#13231F',
  white: '#FFFFFF',
  overlay: 'rgba(12,10,9,0.42)',
  /** AI (Saathi) surfaces: mint fill, tinted hairline, deep text. */
  ai: '#1F6B5A',
  aiSoft: '#E8F7F0',
  aiBorder: '#BFE6D4',
};

/** Gradient stops (always use sparingly: hero, premium, celebration). */
export const G = {
  brand: ['#16B98A', '#0F8C69'] as [string, string],
  deep: ['#1C7A66', '#123F36'] as [string, string],
  premium: ['#13231F', '#24463E'] as [string, string],
  warm: ['#FF8A4C', '#F0563D'] as [string, string],
  glow: ['#DDF3EA', 'rgba(245,245,244,0)'] as [string, string],
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
