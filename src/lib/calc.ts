import type { Profile } from './store';

export const pad = (n: number) => (n < 10 ? '0' + n : '' + n);

export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayKey = () => dateKey(new Date());
export const parseKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (k: string, n: number) => {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return dateKey(d);
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const dayShort = (k: string) => DAYS[parseKey(k).getDay()];
export const fmtDate = (k: string) => {
  const d = parseKey(k);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};
export const fmtLongDate = (d: Date) => `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
export const relDay = (k: string) => {
  const t = todayKey();
  if (k === t) return 'Today';
  if (k === addDays(t, -1)) return 'Yesterday';
  if (k === addDays(t, 1)) return 'Tomorrow';
  return `${dayShort(k)}, ${fmtDate(k)}`;
};

export const bmi = (kg: number, cm: number) => kg / Math.pow(cm / 100, 2);
export const bmiLabel = (b: number) =>
  b < 18.5 ? { label: 'Underweight', color: '#3B82F6' } : b < 23 ? { label: 'Healthy', color: '#0EA472' } : b < 27.5 ? { label: 'Overweight', color: '#F59E0B' } : { label: 'Obese', color: '#E5484D' };

const ACTIVITY_FACTOR: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725 };

export function targets(p: Profile) {
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.gender === 'male' ? 5 : -161);
  const tdee = bmr * (ACTIVITY_FACTOR[p.activity] ?? 1.375);
  let budget = tdee;
  if (p.goal === 'lose') budget = tdee - p.pace * 1100;
  if (p.goal === 'gain' || p.goal === 'muscle') budget = tdee + p.pace * 1100;
  const floor = p.gender === 'male' ? 1500 : 1200;
  budget = Math.max(floor, Math.round(budget / 10) * 10);
  const proteinShare = p.goal === 'muscle' ? 0.25 : 0.2;
  const protein = Math.round((budget * proteinShare) / 4);
  const fat = Math.round((budget * 0.28) / 9);
  const carbs = Math.round((budget * (1 - proteinShare - 0.28)) / 4);
  const diff = Math.abs(p.weightKg - p.targetKg);
  const weeks = p.goal === 'maintain' || p.goal === 'healthy' || diff < 0.1 ? 0 : Math.ceil(diff / Math.max(p.pace, 0.25));
  const goalDate = new Date();
  goalDate.setDate(goalDate.getDate() + weeks * 7);
  const stepGoal = p.activity === 'sedentary' ? 7000 : p.activity === 'very' ? 12000 : 10000;
  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    budget,
    protein,
    carbs,
    fat,
    fiber: p.gender === 'male' ? 38 : 30,
    water: 8,
    stepGoal,
    weeks,
    goalDate,
    bmi: bmi(p.weightKg, p.heightCm),
  };
}

export const kcalFromSteps = (steps: number) => Math.round(steps * 0.04);
export const kmFromSteps = (steps: number) => +(steps * 0.00076).toFixed(1);

export const cmToFtIn = (cm: number) => {
  const inches = Math.round(cm / 2.54);
  return `${Math.floor(inches / 12)}′ ${inches % 12}″`;
};

export const round1 = (n: number) => Math.round(n * 10) / 10;

/** Meal that best matches the current time of day. */
export const currentMeal = () => {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  return h < 10.5 ? 'breakfast' : h < 12.5 ? 'morningSnack' : h < 16 ? 'lunch' : h < 19 ? 'eveningSnack' : 'dinner';
};
