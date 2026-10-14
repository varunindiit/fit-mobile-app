import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { foodById, type MealKey } from '@/data/foods';
import type { PlanTier } from '@/data/plans';
import { programDay, sessionStats, type ProgramId } from '@/data/program';
import { addDays, round1, targets, todayKey } from './calc';

export type Goal = 'lose' | 'maintain' | 'gain' | 'muscle' | 'healthy';

export type Profile = {
  name: string;
  phone: string;
  goal: Goal;
  motivations: string[];
  gender: 'male' | 'female' | 'other';
  age: number;
  heightCm: number;
  weightKg: number;
  targetKg: number;
  pace: number; // kg per week
  activity: 'sedentary' | 'light' | 'moderate' | 'very';
  exercise: string;
  diet: string;
  cuisines: string[];
  restrictions: string[];
  conditions: string[];
  sleep: string;
  waterHabit: string;
  challenges: string[];
  mealTimes: { breakfast: string; lunch: string; dinner: string };
  healthSync: boolean;
  notifications: boolean;
  startWeightKg: number;
  program: ProgramId;
  weeklyGoal: number; // workout days per week
  /** Onboarding answers. Body shapes are 0 (cut) … 6 (extra) on the body-fat scale. */
  bodyShape: number;
  targetShape: number;
  birthYear: number;
  experience: string;
  workoutLevel: string;
  restDays: string[];
  dietType: string;
  rewards: string[];
};

export type FoodEntry = { id: string; foodId: string; meal: MealKey; qty: number; date: string };
export type WorkoutLog = { id: string; workoutId?: string; sessionKey?: string; title: string; emoji: string; minutes: number; kcal: number; date: string };
export type WeightEntry = { id: string; date: string; kg: number };
export type Settings = { mealReminders: boolean; waterReminders: boolean; weighInReminders: boolean; units: 'kg' | 'lb'; language: string; restSeconds: number; coachVoice: boolean; music: boolean; countdown: number };

export type AppState = {
  onboarded: boolean;
  profile: Profile;
  entries: FoodEntry[];
  water: Record<string, number>;
  steps: Record<string, number>;
  workouts: WorkoutLog[];
  weights: WeightEntry[];
  premium: { tier: PlanTier; months: number; since: string } | null;
  readNotifs: string[];
  settings: Settings;
  programProgress: Record<string, number>; // completed days per program
  backup: { name: string; email: string; lastSync: string } | null;
};

export const DEFAULT_PROFILE: Profile = {
  name: '',
  phone: '',
  goal: 'lose',
  motivations: [],
  gender: 'female',
  age: 29,
  heightCm: 162,
  weightKg: 68,
  targetKg: 60,
  pace: 0.5,
  activity: 'light',
  exercise: '',
  diet: '',
  cuisines: [],
  restrictions: [],
  conditions: [],
  sleep: '',
  waterHabit: '',
  challenges: [],
  mealTimes: { breakfast: '8:00 AM', lunch: '1:30 PM', dinner: '8:30 PM' },
  healthSync: false,
  notifications: false,
  startWeightKg: 68,
  program: 'belly',
  weeklyGoal: 3,
  bodyShape: 4,
  targetShape: 2,
  birthYear: new Date().getFullYear() - 29,
  experience: '',
  workoutLevel: '',
  restDays: [],
  dietType: '',
  rewards: [],
};

const INITIAL: AppState = {
  onboarded: false,
  profile: DEFAULT_PROFILE,
  entries: [],
  water: {},
  steps: {},
  workouts: [],
  weights: [],
  premium: null,
  readNotifs: [],
  settings: { mealReminders: true, waterReminders: true, weighInReminders: false, units: 'kg', language: 'English', restSeconds: 30, coachVoice: true, music: false, countdown: 10 },
  programProgress: {},
  backup: null,
};

let idSeq = 0;
export const uid = () => `${Date.now().toString(36)}${(idSeq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Realistic history so the dashboard looks lived-in right after onboarding. */
function buildDemoData(p: Profile): Pick<AppState, 'entries' | 'water' | 'steps' | 'workouts' | 'weights' | 'programProgress'> {
  const t = todayKey();
  const veg = p.diet === 'Vegetarian' || p.diet === 'Vegan' || p.diet === 'Jain';
  const start = p.weightKg + (p.goal === 'gain' || p.goal === 'muscle' ? -1.8 : p.goal === 'lose' ? 2.6 : 0.4);
  const weights: WeightEntry[] = [];
  for (let i = 0; i <= 7; i++) {
    const frac = i / 7;
    const wobble = i % 2 === 0 ? 0 : 0.2;
    const kg = i === 7 ? p.weightKg : round1(start + (p.weightKg - start) * frac + wobble);
    weights.push({ id: uid(), date: addDays(t, -(7 - i) * 7), kg });
  }
  const y = addDays(t, -1);
  const d2 = addDays(t, -2);
  const e = (foodId: string, meal: MealKey, qty: number, date: string): FoodEntry => ({ id: uid(), foodId, meal, qty, date });
  const entries: FoodEntry[] = [
    e('poha', 'breakfast', 1, t),
    e('masala-chai', 'breakfast', 1, t),
    e('almonds', 'morningSnack', 1, t),
    // yesterday
    e('idli', 'breakfast', 3, y),
    e('masala-chai', 'breakfast', 1, y),
    e('apple', 'morningSnack', 1, y),
    e('roti', 'lunch', 2, y),
    e(veg ? 'rajma' : 'chicken-curry', 'lunch', 1, y),
    e('rice', 'lunch', 0.5, y),
    e('makhana', 'eveningSnack', 1, y),
    e('roti', 'dinner', 2, y),
    e('palak-paneer', 'dinner', 1, y),
    // two days ago
    e('oats', 'breakfast', 1, d2),
    e('roti', 'lunch', 2, d2),
    e('dal', 'lunch', 1, d2),
    e('mix-veg', 'lunch', 1, d2),
    e('samosa', 'eveningSnack', 1, d2),
    e('veg-pulao', 'dinner', 1, d2),
    e('curd', 'dinner', 1, d2),
  ];
  const stepVals = [6840, 9120, 5310, 10450, 7980, 8650];
  const steps: Record<string, number> = { [t]: 4286 };
  stepVals.forEach((v, i) => (steps[addDays(t, -(6 - i))] = v));
  return {
    weights,
    entries,
    steps,
    water: { [t]: 3, [y]: 7, [d2]: 8 },
    workouts: [
      ...[1, 2].map((day) => {
        const sess = programDay(p.program, day);
        const st = sessionStats(sess);
        return { id: uid(), sessionKey: sess.key, title: `${sess.subtitle.split(' · ')[0]} · Day ${day}`, emoji: sess.emoji, minutes: st.minutes, kcal: st.kcal, date: addDays(t, day - 3) };
      }),
      { id: uid(), workoutId: 'morning-yoga', title: 'Morning Yoga Flow', emoji: '🧘', minutes: 20, kcal: 90, date: y },
      { id: uid(), workoutId: 'brisk-walk', title: 'Brisk Walk', emoji: '🚶', minutes: 30, kcal: 140, date: addDays(t, -9) },
    ],
    programProgress: { [p.program]: 2 },
  };
}

const STORAGE_KEY = 'fitora-state-v1';

function useAppStore() {
  const [state, setState] = useState<AppState>(INITIAL);
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const saved = JSON.parse(raw);
          setState({ ...INITIAL, ...saved, profile: { ...DEFAULT_PROFILE, ...saved.profile }, settings: { ...INITIAL.settings, ...saved.settings } });
        }
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
    }, 300);
  }, [state, hydrated]);

  const update = useCallback((fn: (s: AppState) => AppState) => setState(fn), []);

  const actions = useMemo(
    () => ({
      completeOnboarding: (p: Profile) =>
        update((s) => {
          const demo = buildDemoData(p);
          return { ...INITIAL, ...demo, backup: s.backup, profile: { ...p, startWeightKg: demo.weights[0]?.kg ?? p.weightKg }, onboarded: true, settings: { ...INITIAL.settings, ...s.settings, mealReminders: p.notifications } };
        }),
      restartOnboarding: () => update((s) => ({ ...s, onboarded: false })),
      resetAll: () => update(() => INITIAL),
      updateProfile: (patch: Partial<Profile>) => update((s) => ({ ...s, profile: { ...s.profile, ...patch } })),
      updateSettings: (patch: Partial<Settings>) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } })),

      addFood: (foodId: string, meal: MealKey, qty: number, date = todayKey()) =>
        update((s) => ({ ...s, entries: [...s.entries, { id: uid(), foodId, meal, qty, date }] })),
      updateFood: (id: string, patch: Partial<FoodEntry>) =>
        update((s) => ({ ...s, entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      removeFood: (id: string) => update((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) })),

      setWater: (glasses: number, date = todayKey()) =>
        update((s) => ({ ...s, water: { ...s.water, [date]: Math.max(0, Math.min(16, glasses)) } })),
      addSteps: (n: number, date = todayKey()) => update((s) => ({ ...s, steps: { ...s.steps, [date]: (s.steps[date] ?? 0) + n } })),

      logWorkout: (w: Omit<WorkoutLog, 'id'>) => update((s) => ({ ...s, workouts: [{ ...w, id: uid() }, ...s.workouts] })),
      removeWorkout: (id: string) => update((s) => ({ ...s, workouts: s.workouts.filter((w) => w.id !== id) })),

      addWeight: (kg: number, date = todayKey()) =>
        update((s) => {
          const weights = [...s.weights.filter((w) => w.date !== date), { id: uid(), date, kg: round1(kg) }].sort((a, b) => a.date.localeCompare(b.date));
          const latest = weights[weights.length - 1];
          return { ...s, weights, profile: { ...s.profile, weightKg: latest.kg } };
        }),
      removeWeight: (id: string) =>
        update((s) => {
          const weights = s.weights.filter((w) => w.id !== id);
          const latest = weights[weights.length - 1];
          return { ...s, weights, profile: latest ? { ...s.profile, weightKg: latest.kg } : s.profile };
        }),

      /** Log a finished guided session; advances the 30-day program when it is the next day. */
      completeSession: (w: { sessionKey: string; title: string; emoji: string; minutes: number; kcal: number }) =>
        update((s) => {
          const log: WorkoutLog = { ...w, id: uid(), date: todayKey() };
          const progress = { ...s.programProgress };
          const [kind, pid, day] = w.sessionKey.split(':');
          if (kind === 'program' && Number(day) === (progress[pid] ?? 0) + 1) progress[pid] = Number(day);
          return { ...s, workouts: [log, ...s.workouts], programProgress: progress };
        }),
      setProgram: (program: ProgramId) => update((s) => ({ ...s, profile: { ...s.profile, program } })),
      resetProgram: (program: ProgramId) => update((s) => ({ ...s, programProgress: { ...s.programProgress, [program]: 0 } })),
      setBackup: (backup: AppState['backup']) => update((s) => ({ ...s, backup })),

      subscribe: (tier: PlanTier, months: number) => update((s) => ({ ...s, premium: { tier, months, since: todayKey() } })),
      cancelPremium: () => update((s) => ({ ...s, premium: null })),
      markNotifsRead: (ids: string[]) => update((s) => ({ ...s, readNotifs: Array.from(new Set([...s.readNotifs, ...ids])) })),
    }),
    [update],
  );

  const t = useMemo(() => targets(state.profile), [state.profile]);

  return { state, hydrated, targets: t, ...actions };
}

type Store = ReturnType<typeof useAppStore>;
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const store = useAppStore();
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside provider');
  return s;
}

/** Nutrition totals for a day, overall and per meal. */
export function dayTotals(entries: FoodEntry[], date: string) {
  const zero = () => ({ kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  const total = zero();
  const byMeal: Record<string, ReturnType<typeof zero>> = {};
  for (const e of entries) {
    if (e.date !== date) continue;
    const f = foodById(e.foodId);
    if (!f) continue;
    const m = (byMeal[e.meal] ??= zero());
    for (const k of ['kcal', 'protein', 'carbs', 'fat', 'fiber'] as const) {
      const v = (k === 'kcal' ? f.kcal : f[k]) * e.qty;
      total[k] += v;
      m[k] += v;
    }
  }
  return { total, byMeal };
}

/** Calories burned for a day: logged workouts + steps. */
export function burnedOn(state: AppState, date: string) {
  const workoutKcal = state.workouts.filter((w) => w.date === date).reduce((a, w) => a + w.kcal, 0);
  const steps = state.steps[date] ?? 0;
  return { workoutKcal, stepKcal: Math.round(steps * 0.04), total: workoutKcal + Math.round(steps * 0.04) };
}

/** Distinct days with at least one workout. */
export function workoutDays(state: AppState) {
  return new Set(state.workouts.map((w) => w.date));
}

/** Consecutive workout days ending today (or yesterday if nothing logged yet today). */
export function workoutStreak(state: AppState) {
  const days = workoutDays(state);
  let d = todayKey();
  if (!days.has(d)) d = addDays(d, -1);
  let n = 0;
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/** Dates (Sun..Sat) of the current week and how many of them have workouts. */
export function weekProgress(state: AppState) {
  const t = todayKey();
  const dow = new Date().getDay();
  const week = Array.from({ length: 7 }, (_, i) => addDays(t, i - dow));
  const days = workoutDays(state);
  return { week, done: week.filter((d) => days.has(d)).length, days };
}
