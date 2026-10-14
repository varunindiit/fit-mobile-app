import { Platform } from 'react-native';

export const C = {
  primary: '#0EA472',
  primaryDark: '#0A7F58',
  primarySoft: '#E5F7EF',
  accent: '#FF6B4A',
  accentSoft: '#FFEDE8',
  bg: '#F5F6FA',
  card: '#FFFFFF',
  text: '#101828',
  textSoft: '#475467',
  muted: '#98A2B3',
  border: '#E4E7EC',
  borderSoft: '#F0F2F5',
  carbs: '#F59E0B',
  protein: '#3B82F6',
  fat: '#EC4899',
  fiber: '#8B5CF6',
  water: '#0EA5E9',
  waterSoft: '#E0F2FE',
  steps: '#F97316',
  stepsSoft: '#FFF1E6',
  workout: '#7C3AED',
  workoutSoft: '#F1EAFE',
  weight: '#14B8A6',
  danger: '#E5484D',
  dangerSoft: '#FDECEC',
  gold: '#F5C451',
  navy: '#141B34',
  white: '#FFFFFF',
  overlay: 'rgba(16,24,40,0.45)',
};

export const R = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };

export const shadow = Platform.select({
  ios: { shadowColor: '#101828', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  android: { elevation: 2 },
  default: { shadowColor: '#101828', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
}) as object;

export const BRAND = 'Fitora';
