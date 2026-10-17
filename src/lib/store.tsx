import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState as RNAppState, Platform } from 'react-native';

import { foodById, type MealKey } from '@/data/foods';
import type { PlanTier } from '@/data/plans';
import { EXERCISES, type ProgramId, type SessionItem } from '@/data/program';
import { addDays, parseKey, round1, targets, todayKey } from './calc';
import { demoSeed } from './demo';
import { loadState, mergeTyped, saveState } from './persist';

export type Goal = 'lose' | 'maintain' | 'gain' | 'muscle' | 'healthy';

export type Profile = {
  name: string;
  phone: string;
  email: string;
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

export type FoodEntry = { id: string; foodId: string; meal: MealKey; qty: number; date: string; snapId?: string };
/** A meal logged from the camera, kept so the user has a snap history. */
export type SnapLog = { id: string; date: string; meal: MealKey; title: string; score: number; kcal: number; items: { foodId: string; qty: number }[] };
export type ChatMsg = { id: string; from: 'bot' | 'user'; text: string; action?: { label: string; icon: string; href?: string; water?: boolean }; at: number };
/** Delivery state of a chat message, mirroring what a messaging backend would report. */
export type MsgStatus = 'sending' | 'sent' | 'delivered' | 'read';
/** One message in the Pro member's conversation with their trainer. */
export type TrainerMsg = {
  id: string;
  from: 'user' | 'trainer';
  text: string;
  at: number;
  status: MsgStatus;
  /** A workout the coach shared: a `trainer:` session key the player can run. */
  planKey?: string;
};
/** A finished (simulated) call with the trainer, kept so the dashboard can show history. */
export type CallSession = { id: string; trainerId: string; kind: 'audio' | 'video'; at: number; seconds: number; outcome: 'ended' | 'missed' | 'declined' };
export type WorkoutLog = { id: string; workoutId?: string; sessionKey?: string; title: string; emoji: string; minutes: number; kcal: number; date: string };
export type WeightEntry = { id: string; date: string; kg: number };
/** `cancelledAt` keeps access until the paid period ends. */
export type Premium = { tier: PlanTier; months: number; since: string; cancelledAt?: string };
export type OnboardingDraft = { p: Profile; step: string; genderPicked: boolean };
export type Settings = {
  mealReminders: boolean;
  waterReminders: boolean;
  weighInReminders: boolean;
  units: 'kg' | 'lb';
  language: string;
  restSeconds: number;
  coachVoice: boolean;
  music: boolean;
  countdown: number;
  /** Guided-class demo speed (1×/5×/10×). */
  classSpeed: number;
  /** Last activity the user logged manually, to pre-fill the next log. */
  lastActivity: { id: string; mins: number };
  heightUnit: 'cm' | 'ft';
  /** Training tab filters ('' = screen default). */
  trainingPart: string;
  trainingCat: string;
};
/** Where to continue a session the user quit midway. */
export type SessionResume = { idx: number; done: number[]; elapsedMs: number; date: string };
/** An in-progress guided class (workout/[id]). */
export type ClassRun = { workoutId: string; idx: number; left: number; elapsed: number; date: string };

export type AppState = {
  onboarded: boolean;
  profile: Profile;
  entries: FoodEntry[];
  water: Record<string, number>;
  steps: Record<string, number>;
  workouts: WorkoutLog[];
  weights: WeightEntry[];
  premium: Premium | null;
  purchases: { tier: PlanTier; months: number; date: string; amount?: number }[];
  readNotifs: string[];
  settings: Settings;
  programProgress: Record<string, number>; // completed days per program
  /** Signed-in cloud account; `provider` is missing on saves from before email/Apple sign-in (treated as Google). */
  backup: { name: string; email: string; lastSync: string; provider?: 'google' | 'apple' | 'email' } | null;
  /** User-edited exercise lists, keyed by session key. */
  planEdits: Record<string, SessionItem[]>;
  sessionResume: Record<string, SessionResume>;
  classRun: ClassRun | null;
  /** One-shot tips the user has dismissed. */
  seenTips: string[];
  /** Streak rewards the user has unlocked. */
  unlockedRewards: string[];
  snaps: SnapLog[];
  coachChat: ChatMsg[];
  recentSearches: string[];
  favoriteFoods: string[];
  onboardingDraft: OnboardingDraft | null;
  /** App rating the user gave (1–5), so we don't ask again. */
  rating: number | null;
  /** Set once the demo history has been filled in — or skipped because real logs already exist. */
  demoSeeded: boolean;
  /** Pro: the trainer assigned to this member (null until they get Pro). */
  trainerId: string | null;
  /** Pro: conversation with the assigned trainer. */
  trainerChat: TrainerMsg[];
  /** Pro: simulated call history. */
  calls: CallSession[];
  /**
   * The `premium.since` of the Pro activation whose welcome screen has been shown.
   * Keyed on `since` rather than a boolean so a renewal or a restore never repeats
   * it, while a genuinely new Pro activation after a lapse does.
   */
  proIntroFor: string | null;
};

export const DEFAULT_PROFILE: Profile = {
  name: '',
  phone: '',
  email: '',
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
  settings: { mealReminders: true, waterReminders: true, weighInReminders: false, units: 'kg', language: 'English', restSeconds: 30, coachVoice: true, music: false, countdown: 10, classSpeed: 5, heightUnit: 'cm', lastActivity: { id: '', mins: 30 }, trainingPart: '', trainingCat: '' },
  programProgress: {},
  backup: null,
  planEdits: {},
  sessionResume: {},
  classRun: null,
  seenTips: [],
  unlockedRewards: [],
  snaps: [],
  coachChat: [],
  recentSearches: [],
  favoriteFoods: [],
  onboardingDraft: null,
  rating: null,
  purchases: [],
  demoSeeded: false,
  trainerId: null,
  trainerChat: [],
  calls: [],
  proIntroFor: null,
};

let idSeq = 0;
export const uid = () => `${Date.now().toString(36)}${(idSeq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Drop malformed records (bad dates, NaN numbers) that would crash screens or skew totals. */
const isDate = (d: unknown): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
export function sanitize(s: AppState): AppState {
  return {
    ...s,
    entries: s.entries.filter((e) => e && typeof e.id === 'string' && typeof e.foodId === 'string' && isDate(e.date) && isNum(e.qty) && e.qty > 0),
    workouts: s.workouts.filter((w) => w && typeof w.id === 'string' && isDate(w.date) && isNum(w.minutes) && isNum(w.kcal)),
    weights: s.weights.filter((w) => w && typeof w.id === 'string' && isDate(w.date) && isNum(w.kg) && w.kg > 0),
    readNotifs: s.readNotifs.filter((x) => typeof x === 'string'),
    coachChat: s.coachChat.filter((m) => m && typeof m.text === 'string' && (m.from === 'bot' || m.from === 'user')).slice(-MAX_CHAT),
    trainerChat: s.trainerChat.filter((m) => m && typeof m.id === 'string' && typeof m.text === 'string' && (m.from === 'user' || m.from === 'trainer') && isNum(m.at)).slice(-MAX_TRAINER_CHAT),
    calls: s.calls.filter((c) => c && typeof c.id === 'string' && isNum(c.at) && isNum(c.seconds) && (c.kind === 'audio' || c.kind === 'video')),
    trainerId: typeof s.trainerId === 'string' ? s.trainerId : null,
    proIntroFor: typeof s.proIntroFor === 'string' ? s.proIntroFor : null,
    recentSearches: s.recentSearches.filter((x) => typeof x === 'string').slice(0, MAX_RECENT),
    favoriteFoods: s.favoriteFoods.filter((x) => typeof x === 'string'),
    premium: s.premium && typeof s.premium.since === 'string' && isNum(s.premium.months) ? s.premium : null,
    classRun: s.classRun && typeof s.classRun.workoutId === 'string' && isNum(s.classRun.idx) ? s.classRun : null,
    rating: isNum(s.rating) ? s.rating : null,
    backup: s.backup && typeof s.backup === 'object' ? s.backup : null,
    onboardingDraft:
      s.onboardingDraft && typeof s.onboardingDraft.step === 'string' ? { ...s.onboardingDraft, p: mergeTyped(DEFAULT_PROFILE, s.onboardingDraft.p) } : null,
    sessionResume: Object.fromEntries(
      Object.entries(s.sessionResume).filter(([, r]) => r && isNum(r.idx) && Array.isArray(r.done) && isNum(r.elapsedMs)),
    ),
    planEdits: Object.fromEntries(
      Object.entries(s.planEdits)
        .filter(([, items]) => Array.isArray(items))
        .map(([k, items]) => [k, items.filter((it) => it && EXERCISE_IDS.has(it.exerciseId))]),
    ),
  };
}

const MAX_CHAT = 100;
const MAX_TRAINER_CHAT = 200;
const MAX_RECENT = 8;
const clampWater = (n: number) => Math.max(0, Math.min(16, Math.round(n)));
const EXERCISE_IDS = new Set(EXERCISES.map((e) => e.id));
const SAVE_DELAY = 300;

/**
 * Fill a brand-new account with the 30-day demo history, leaving today half-logged.
 * Runs once per install: anyone who already has logs only gets the flag set.
 */
function withDemo(s: AppState): AppState {
  if (s.demoSeeded) return s;
  if (s.entries.length || s.workouts.length) return { ...s, demoSeeded: true };
  const d = demoSeed(s.profile);
  return {
    ...s,
    demoSeeded: true,
    entries: d.entries,
    workouts: d.workouts,
    weights: d.weights,
    snaps: d.snaps,
    water: { ...d.water, ...s.water },
    steps: { ...d.steps, ...s.steps },
    programProgress: { ...s.programProgress, ...d.programProgress },
    recentSearches: s.recentSearches.length ? s.recentSearches : d.recentSearches,
    favoriteFoods: s.favoriteFoods.length ? s.favoriteFoods : d.favoriteFoods,
    profile: { ...s.profile, startWeightKg: d.startWeightKg },
  };
}

function useAppStore() {
  const [state, setState] = useState<AppState>(INITIAL);
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(state);
  const dirty = useRef(false);
  // If storage couldn't be read, never write: saving INITIAL would erase the user's real data.
  const loadFailed = useRef(false);

  const flush = useCallback(function save() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    if (!dirty.current || loadFailed.current) return;
    dirty.current = false;
    saveState(latest.current).catch((e) => {
      dirty.current = true;
      console.warn('[store] save failed, retrying', e);
      saveTimer.current = setTimeout(save, 2000);
    });
  }, []);

  useEffect(() => {
    loadState(INITIAL)
      // An onboarded account with no logs yet (e.g. saved before the demo history existed) gets it now.
      .then((saved) => setState(() => {
        const s = sanitize(saved);
        return s.onboarded ? withDemo(s) : s;
      }))
      .catch((e) => {
        loadFailed.current = true;
        console.warn('[store] load failed', e);
      })
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    latest.current = state;
    if (!hydrated) return;
    dirty.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, SAVE_DELAY);
  }, [state, hydrated, flush]);

  // Write immediately when the app is backgrounded or the tab is hidden, so a kill can't drop the last change.
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (s) => s !== 'active' && flush());
    const onHide = () => flush();
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('pagehide', onHide);
    return () => {
      sub.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('pagehide', onHide);
      flush();
    };
  }, [flush]);

  const update = useCallback((fn: (s: AppState) => AppState) => setState(fn), []);

  const actions = useMemo(
    () => ({
      /**
       * Save onboarding answers. Never wipes logs: a re-onboard (after log out / restart) keeps all history,
       * and only a fresh user gets their onboarding weight as the first weigh-in.
       */
      completeOnboarding: (p: Profile) =>
        update((s) => {
          const fresh = s.weights.length === 0;
          const weights = fresh ? [{ id: uid(), date: todayKey(), kg: round1(p.weightKg) }] : s.weights;
          const startWeightKg = fresh ? p.weightKg : (s.profile.startWeightKg || p.weightKg);
          return withDemo({ ...s, weights, profile: { ...p, startWeightKg }, onboarded: true, onboardingDraft: null });
        }),
      restartOnboarding: () => update((s) => ({ ...s, onboarded: false })),
      /** Returning user on this device: go straight back in with their saved data. */
      logIn: () => update((s) => withDemo({ ...s, onboarded: true, onboardingDraft: null })),
      saveOnboardingDraft: (d: OnboardingDraft) => update((s) => ({ ...s, onboardingDraft: d })),
      clearOnboardingDraft: () => update((s) => ({ ...s, onboardingDraft: null })),
      setRating: (n: number) => update((s) => ({ ...s, rating: Math.max(1, Math.min(5, Math.round(n))) })),
      resetAll: () => update(() => INITIAL),
      updateProfile: (patch: Partial<Profile>) => update((s) => ({ ...s, profile: { ...s.profile, ...patch } })),
      updateSettings: (patch: Partial<Settings>) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } })),

      addFood: (foodId: string, meal: MealKey, qty: number, date = todayKey()) =>
        update((s) => (Number.isFinite(qty) && qty > 0 ? { ...s, entries: [...s.entries, { id: uid(), foodId, meal, qty, date }] } : s)),
      updateFood: (id: string, patch: Partial<Omit<FoodEntry, 'id'>>) =>
        update((s) => {
          if (patch.qty !== undefined && !(Number.isFinite(patch.qty) && patch.qty > 0)) return s;
          return { ...s, entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) };
        }),
      removeFood: (id: string) => update((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) })),
      /** Undo a delete: put the original entry back at its old position (same id). */
      restoreFood: (e: FoodEntry, index: number) =>
        update((s) => {
          if (s.entries.some((x) => x.id === e.id)) return s;
          const entries = [...s.entries];
          entries.splice(Math.max(0, Math.min(index, entries.length)), 0, e);
          return { ...s, entries };
        }),
      /** Copy every entry from one day to another; no-op when the target day already has food (prevents double copies). */
      copyDay: (from: string, to: string) =>
        update((s) => {
          if (from === to || s.entries.some((e) => e.date === to)) return s;
          const copies = s.entries.filter((e) => e.date === from).map(({ snapId: _snap, ...e }) => ({ ...e, id: uid(), date: to }));
          return copies.length ? { ...s, entries: [...s.entries, ...copies] } : s;
        }),
      /** Log a snapped meal and all its items in one atomic update. */
      logSnap: (snap: Omit<SnapLog, 'id'>) =>
        update((s) => {
          const id = uid();
          const items = snap.items.filter((i) => i.qty > 0);
          if (!items.length) return s;
          const entries = items.map((i) => ({ id: uid(), foodId: i.foodId, qty: i.qty, meal: snap.meal, date: snap.date, snapId: id }));
          return { ...s, snaps: [{ ...snap, items, id }, ...s.snaps], entries: [...s.entries, ...entries] };
        }),
      toggleFavorite: (foodId: string) =>
        update((s) => ({ ...s, favoriteFoods: s.favoriteFoods.includes(foodId) ? s.favoriteFoods.filter((f) => f !== foodId) : [foodId, ...s.favoriteFoods] })),
      addRecentSearch: (q: string) =>
        update((s) => {
          const t = q.trim();
          if (!t) return s;
          return { ...s, recentSearches: [t, ...s.recentSearches.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX_RECENT) };
        }),
      clearRecentSearches: () => update((s) => ({ ...s, recentSearches: [] })),
      addChatMessage: (m: Omit<ChatMsg, 'id' | 'at'>) =>
        update((s) => ({ ...s, coachChat: [...s.coachChat, { ...m, id: uid(), at: Date.now() }].slice(-MAX_CHAT) })),
      clearChat: () => update((s) => ({ ...s, coachChat: [] })),

      setWater: (glasses: number, date = todayKey()) =>
        update((s) => ({ ...s, water: { ...s.water, [date]: clampWater(glasses) } })),
      /** Relative change computed from the latest state, so rapid taps never drop a glass. */
      addWater: (delta: number, date = todayKey()) => update((s) => ({ ...s, water: { ...s.water, [date]: clampWater((s.water[date] ?? 0) + delta) } })),
      addSteps: (n: number, date = todayKey()) => update((s) => ({ ...s, steps: { ...s.steps, [date]: Math.max(0, Math.round((s.steps[date] ?? 0) + n)) } })),
      setSteps: (n: number, date = todayKey()) => update((s) => ({ ...s, steps: { ...s.steps, [date]: Math.max(0, Math.round(n)) } })),

      /** Returns the new log id so callers can undo it. `date` defaults to the moment of logging. */
      logWorkout: (w: Omit<WorkoutLog, 'id' | 'date'> & { date?: string }) => {
        const id = uid();
        update((s) => ({ ...s, workouts: [{ ...w, id, date: w.date ?? todayKey() }, ...s.workouts] }));
        return id;
      },
      /** Deleting the log for the latest completed program day also rolls the program back. */
      removeWorkout: (id: string) =>
        update((s) => {
          const gone = s.workouts.find((w) => w.id === id);
          const workouts = s.workouts.filter((w) => w.id !== id);
          const programProgress = { ...s.programProgress };
          const [kind, pid, d] = gone?.sessionKey?.split(':') ?? [];
          const day = Number(d);
          if (kind === 'program' && day === programProgress[pid] && !workouts.some((w) => w.sessionKey === gone?.sessionKey)) programProgress[pid] = day - 1;
          return { ...s, workouts, programProgress };
        }),

      addWeight: (kg: number, date = todayKey()) =>
        update((s) => {
          const weights = [...s.weights.filter((w) => w.date !== date), { id: uid(), date, kg: Math.round(kg * 100) / 100 }].sort((a, b) => a.date.localeCompare(b.date));
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
          const { [w.sessionKey]: _done, ...sessionResume } = s.sessionResume;
          return { ...s, workouts: [log, ...s.workouts], programProgress: progress, sessionResume };
        }),
      /** Save (or with null, reset) the user's edited exercise list for a session. */
      setPlanEdit: (key: string, items: SessionItem[] | null) =>
        update((s) => {
          const { [key]: _old, ...planEdits } = s.planEdits;
          return { ...s, planEdits: items ? { ...planEdits, [key]: items } : planEdits };
        }),
      saveResume: (key: string, r: Omit<SessionResume, 'date'>) =>
        update((s) => ({ ...s, sessionResume: { ...s.sessionResume, [key]: { ...r, date: todayKey() } } })),
      clearResume: (key: string) =>
        update((s) => {
          if (!(key in s.sessionResume)) return s;
          const { [key]: _old, ...sessionResume } = s.sessionResume;
          return { ...s, sessionResume };
        }),
      saveClassRun: (r: Omit<ClassRun, 'date'> | null) => update((s) => ({ ...s, classRun: r ? { ...r, date: todayKey() } : null })),
      markTipSeen: (id: string) => update((s) => (s.seenTips.includes(id) ? s : { ...s, seenTips: [...s.seenTips, id] })),
      unlockReward: (id: string) => update((s) => (s.unlockedRewards.includes(id) ? s : { ...s, unlockedRewards: [...s.unlockedRewards, id] })),
      setProgram: (program: ProgramId) => update((s) => withDemo({ ...s, profile: { ...s.profile, program } })),
      resetProgram: (program: ProgramId) => update((s) => ({ ...s, programProgress: { ...s.programProgress, [program]: 0 } })),
      setBackup: (backup: AppState['backup']) => update((s) => ({ ...s, backup })),

      /** Renewing the same active tier extends it; a new tier starts today. */
      subscribe: (tier: PlanTier, months: number, amount?: number) =>
        update((s) => {
          const today = todayKey();
          const extend = s.premium && s.premium.tier === tier && isPremiumActive(s.premium, today);
          const premium: Premium = extend ? { tier, since: s.premium!.since, months: s.premium!.months + months } : { tier, months, since: today };
          return { ...s, premium, purchases: [...s.purchases, { tier, months, date: today, amount }] };
        }),
      /** Replaces the plan outright, e.g. with the one an account brings along at log-in (null = Free). */
      setPremium: (premium: Premium | null) => update((s) => ({ ...s, premium })),
      cancelPremium: () => update((s) => (s.premium ? { ...s, premium: { ...s.premium, cancelledAt: todayKey() } } : s)),
      /** The Pro welcome has been shown for the current activation; don't show it again. */
      markProIntroSeen: () => update((s) => (s.premium ? { ...s, proIntroFor: s.premium.since } : s)),

      /* ---------- Pro trainer ---------- */

      /** Assign (or change) the member's trainer. Keeps the conversation — a coach swap is handled by the screen. */
      assignTrainer: (trainerId: string) => update((s) => (s.trainerId === trainerId ? s : { ...s, trainerId })),
      /** Append a message. Returns its id so the caller can advance its delivery state. */
      addTrainerMsg: (m: Omit<TrainerMsg, 'id' | 'at'> & { at?: number }) => {
        const id = uid();
        update((s) => ({ ...s, trainerChat: [...s.trainerChat, { ...m, id, at: m.at ?? Date.now() }].slice(-MAX_TRAINER_CHAT) }));
        return id;
      },
      setMsgStatus: (id: string, status: MsgStatus) =>
        update((s) => ({ ...s, trainerChat: s.trainerChat.map((m) => (m.id === id ? { ...m, status } : m)) })),
      /** The member opened the thread: everything the coach sent is now read. */
      markTrainerChatRead: () =>
        update((s) => {
          if (!s.trainerChat.some((m) => m.from === 'trainer' && m.status !== 'read')) return s;
          return { ...s, trainerChat: s.trainerChat.map((m) => (m.from === 'trainer' ? { ...m, status: 'read' as MsgStatus } : m)) };
        }),
      clearTrainerChat: () => update((s) => ({ ...s, trainerChat: [] })),
      /** Record a finished call. Demo only — no audio or video is transmitted. */
      logCall: (c: Omit<CallSession, 'id' | 'at'>) => {
        const id = uid();
        update((s) => ({ ...s, calls: [{ ...c, id, at: Date.now() }, ...s.calls].slice(0, 50) }));
        return id;
      },

      markNotifsRead: (ids: string[]) => update((s) => ({ ...s, readNotifs: Array.from(new Set([...s.readNotifs, ...ids])) })),
    }),
    [update],
  );

  const t = useMemo(() => targets(state.profile), [state.profile]);

  return { state, hydrated, targets: t, flush, ...actions };
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

/**
 * Whether this account should be shown the Pro welcome experience.
 * True only for an active Pro plan whose activation hasn't been introduced yet —
 * so Free and Smart never see it, and a renewal or restore never repeats it.
 */
export function needsProWelcome(s: Pick<AppState, 'premium' | 'proIntroFor'>, today = todayKey()) {
  return !!s.premium && s.premium.tier === 'pro' && isPremiumActive(s.premium, today) && s.proIntroFor !== s.premium.since;
}

/** Premium is active until its paid period ends (also after a cancel). */
export function isPremiumActive(premium: Premium | null, today = todayKey()) {
  if (!premium) return false;
  const end = parseKey(premium.since);
  end.setMonth(end.getMonth() + premium.months);
  return parseKey(today) < end;
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
