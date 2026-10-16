/**
 * Demo history for a fresh account: 30 days of meals, water, steps, workouts and
 * weigh-ins, so the diary, progress charts, streaks and the training plan all have
 * something to show right after sign-up, log-in or picking a plan.
 *
 * Today is left half-done on purpose — breakfast, the morning snack and lunch are
 * logged (about half the calorie budget), water and steps sit at half their goal,
 * and today's session is still pending.
 */
import { MEALS, SNAP_SAMPLES, foodById, type MealKey } from '@/data/foods';
import { WORKOUTS } from '@/data/fitness';
import { PROGRAM_DAYS, isRestDay, programById, programDay, sessionStats } from '@/data/program';
import { addDays, parseKey, round1, targets, todayKey } from './calc';
import type { AppState, FoodEntry, Profile, SnapLog, WeightEntry, WorkoutLog } from './store';

export const DEMO_DAYS = 30;
/** Meals already logged today — dinner and the evening snack are still pending. */
const TODAY_MEALS: MealKey[] = ['breakfast', 'morningSnack', 'lunch'];
/** Share of the budget eaten today, so the day reads as half done. */
const TODAY_EATEN = 0.5;
const MEAL_KEYS = MEALS.map((m) => m.key);
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** Days back from today where training was skipped, so the history isn't suspiciously perfect. */
const MISSED = new Set([11, 18]);
/** Every fourth session is a class instead of a program day. */
const CLASSES = ['brisk-walk', 'morning-yoga', 'dance-cardio', 'core-blast'];

type Item = { foodId: string; qty: number };

/** Meal rotations. Lengths differ so the same plate doesn't land on the same weekday every week. */
const PLATES: Record<MealKey, Item[][]> = {
  breakfast: [
    [{ foodId: 'poha', qty: 1 }, { foodId: 'masala-chai', qty: 1 }],
    [{ foodId: 'idli', qty: 3 }, { foodId: 'black-coffee', qty: 1 }],
    [{ foodId: 'oats', qty: 1 }, { foodId: 'banana', qty: 1 }],
    [{ foodId: 'omelette', qty: 1 }, { foodId: 'bread-toast', qty: 2 }, { foodId: 'black-coffee', qty: 1 }],
    [{ foodId: 'aloo-paratha', qty: 1 }, { foodId: 'curd', qty: 1 }],
    [{ foodId: 'upma', qty: 1 }, { foodId: 'masala-chai', qty: 1 }],
    [{ foodId: 'masala-dosa', qty: 1 }, { foodId: 'green-tea', qty: 1 }],
  ],
  morningSnack: [
    [{ foodId: 'almonds', qty: 1 }, { foodId: 'green-tea', qty: 1 }],
    [{ foodId: 'banana', qty: 1 }],
    [{ foodId: 'buttermilk', qty: 1 }, { foodId: 'makhana', qty: 1 }],
    [{ foodId: 'apple', qty: 1 }],
    [{ foodId: 'papaya', qty: 1 }],
    [{ foodId: 'peanuts', qty: 1 }],
  ],
  lunch: [
    [{ foodId: 'roti', qty: 2 }, { foodId: 'dal', qty: 1 }, { foodId: 'mix-veg', qty: 1 }, { foodId: 'curd', qty: 1 }],
    [{ foodId: 'rice', qty: 1 }, { foodId: 'rajma', qty: 1 }, { foodId: 'green-salad', qty: 1 }],
    [{ foodId: 'roti', qty: 2 }, { foodId: 'chole', qty: 1 }, { foodId: 'curd', qty: 1 }],
    [{ foodId: 'brown-rice', qty: 1 }, { foodId: 'chicken-curry', qty: 1 }, { foodId: 'green-salad', qty: 1 }],
    [{ foodId: 'roti', qty: 2 }, { foodId: 'palak-paneer', qty: 1 }, { foodId: 'rice', qty: 0.5 }],
    [{ foodId: 'rice', qty: 1 }, { foodId: 'fish-curry', qty: 1 }, { foodId: 'mix-veg', qty: 1 }],
    [{ foodId: 'roti', qty: 2 }, { foodId: 'dal', qty: 1 }, { foodId: 'green-salad', qty: 1 }, { foodId: 'buttermilk', qty: 1 }],
  ],
  eveningSnack: [
    [{ foodId: 'sprouts', qty: 1 }, { foodId: 'green-tea', qty: 1 }],
    [{ foodId: 'makhana', qty: 1 }, { foodId: 'masala-chai', qty: 1 }],
    [{ foodId: 'dhokla', qty: 1 }],
    [{ foodId: 'whey', qty: 1 }],
    [{ foodId: 'samosa', qty: 1 }, { foodId: 'masala-chai', qty: 1 }],
    [{ foodId: 'apple', qty: 1 }, { foodId: 'almonds', qty: 1 }],
  ],
  dinner: [
    [{ foodId: 'roti', qty: 2 }, { foodId: 'mix-veg', qty: 1 }, { foodId: 'curd', qty: 1 }],
    [{ foodId: 'brown-rice', qty: 1 }, { foodId: 'dal', qty: 1 }, { foodId: 'green-salad', qty: 1 }],
    [{ foodId: 'roti', qty: 2 }, { foodId: 'paneer-bhurji', qty: 1 }, { foodId: 'green-salad', qty: 1 }],
    [{ foodId: 'grilled-chicken', qty: 1 }, { foodId: 'veg-pulao', qty: 1 }, { foodId: 'green-salad', qty: 1 }],
    [{ foodId: 'roti', qty: 2 }, { foodId: 'egg-curry', qty: 1 }, { foodId: 'mix-veg', qty: 1 }],
    [{ foodId: 'veg-pulao', qty: 1 }, { foodId: 'curd', qty: 1 }, { foodId: 'green-salad', qty: 1 }],
  ],
};

const MEAT_SWAP: Record<string, string> = {
  'boiled-egg': 'curd',
  omelette: 'paneer-bhurji',
  'egg-curry': 'palak-paneer',
  'chicken-curry': 'chole',
  'grilled-chicken': 'paneer-bhurji',
  'fish-curry': 'rajma',
  'chicken-biryani': 'veg-pulao',
};
const VEGAN_SWAP: Record<string, string> = {
  curd: 'sprouts',
  'greek-yogurt': 'sprouts',
  buttermilk: 'coconut-water',
  lassi: 'coconut-water',
  'masala-chai': 'green-tea',
  'paneer-bhurji': 'chole',
  'palak-paneer': 'rajma',
  oats: 'poha',
  whey: 'peanuts',
};

/** Keep every demo plate inside the diet picked during onboarding. */
function forDiet(id: string, diet: string) {
  const veg = diet === 'Vegetarian' || diet === 'Vegan';
  let out = veg ? (MEAT_SWAP[id] ?? id) : id;
  if (veg && foodById(out)?.type !== 'veg') out = 'dal';
  if (diet === 'Vegan') out = VEGAN_SWAP[out] ?? out;
  return out;
}

const kcalOf = (items: Item[]) => items.reduce((a, it) => a + (foodById(it.foodId)?.kcal ?? 0) * it.qty, 0);
/** Tea, coffee and green tea are logged as served — portion scaling would read as odd. */
const isLight = (id: string) => (foodById(id)?.kcal ?? 0) <= 10;

/** Stable pseudo-random 0..1: the same day always gets the same numbers. */
const noise = (i: number, salt: number) => {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export type DemoSeed = Pick<AppState, 'entries' | 'water' | 'steps' | 'workouts' | 'weights' | 'snaps' | 'programProgress' | 'recentSearches' | 'favoriteFoods'> & {
  /** Weight 30 days ago, so the progress screens can show what has been lost or gained. */
  startWeightKg: number;
};

/** Build the demo history from the user's own targets, program and diet. */
export function demoSeed(p: Profile, today = todayKey()): DemoSeed {
  const t = targets(p);
  const diet = p.diet;
  const run = Math.random().toString(36).slice(2, 6);
  let seq = 0;
  const nid = () => `demo-${run}-${(seq++).toString(36)}`;

  const entries: FoodEntry[] = [];
  const snaps: SnapLog[] = [];
  const workouts: WorkoutLog[] = [];
  const weights: WeightEntry[] = [];
  const water: Record<string, number> = {};
  const steps: Record<string, number> = {};

  /** Nudge portions in half-unit steps until the day lands on its calorie target. */
  const tune = (items: Item[], target: number) => {
    let now = kcalOf(items);
    for (let guard = 0; guard < 40; guard++) {
      const err = target - now;
      if (Math.abs(err) <= target * 0.03) break;
      let pick: Item | undefined;
      let by = 0;
      let best = Math.abs(err);
      for (const it of items) {
        const step = (foodById(it.foodId)?.kcal ?? 0) / 2;
        if (step < 10) continue; // tea, coffee and salad are too light to tune with
        const up = Math.abs(err - step);
        const down = Math.abs(err + step);
        if (err > 0 && it.qty < 6 && up < best) {
          best = up;
          pick = it;
          by = 0.5;
        } else if (err < 0 && it.qty > 0.5 && down < best) {
          best = down;
          pick = it;
          by = -0.5;
        }
      }
      if (!pick) break;
      pick.qty += by;
      now = kcalOf(items);
    }
  };

  // Weight walks from 30 days ago to the weight given during onboarding (today's weigh-in).
  const perWeek = p.goal === 'lose' ? -Math.abs(p.pace) : p.goal === 'gain' || p.goal === 'muscle' ? Math.abs(p.pace) : 0;
  const weeks = (DEMO_DAYS - 1) / 7;
  const first = p.weightKg - perWeek * weeks;

  const restDays = new Set(p.restDays.length ? p.restDays : ['Sunday']);
  let programAt = 0;
  let sessions = 0;

  for (let i = 0; i < DEMO_DAYS; i++) {
    const back = DEMO_DAYS - 1 - i; // 29 … 0, where 0 is today
    const date = addDays(today, -back);
    const isToday = back === 0;

    /* ----- meals: one scale factor per day keeps every plate in proportion ----- */
    const sample = SNAP_SAMPLES[Math.floor(i / 9) % SNAP_SAMPLES.length];
    // Lunch is a camera snap every ninth day, and again today, so the snap history isn't empty.
    const snapped = isToday || i % 9 === 4;
    const day = MEAL_KEYS.map((meal) => ({
      meal,
      items: (meal === 'lunch' && snapped ? sample.items : PLATES[meal][i % PLATES[meal].length]).map((it) => ({ foodId: forDiet(it.foodId, diet), qty: it.qty })),
    }));
    // An occasional skipped evening snack keeps the history believable.
    const logged = day.filter(({ meal }) => (isToday ? TODAY_MEALS.includes(meal) : !(meal === 'eveningSnack' && noise(i, 2) > 0.82)));
    const target = t.budget * (isToday ? TODAY_EATEN : 0.92 + noise(i, 1) * 0.26);
    const f = clamp(target / Math.max(1, kcalOf(logged.flatMap((m) => m.items))), 0.5, 3);
    const plates = logged.map(({ meal, items }) => ({ meal, items: items.map((it) => ({ foodId: it.foodId, qty: isLight(it.foodId) ? it.qty : Math.max(0.5, Math.round(it.qty * f * 2) / 2) })) }));
    tune(plates.flatMap((m) => m.items), target);
    for (const { meal, items } of plates) {
      const snapId = meal === 'lunch' && snapped ? nid() : undefined;
      for (const it of items) entries.push({ id: nid(), foodId: it.foodId, meal, qty: it.qty, date, ...(snapId ? { snapId } : {}) });
      if (snapId) {
        const score = Math.round(items.reduce((a, it) => a + (foodById(it.foodId)?.score ?? 7), 0) / items.length);
        snaps.unshift({ id: snapId, date, meal, title: sample.title, score, kcal: Math.round(kcalOf(items)), items });
      }
    }

    /* ----- water & steps (half-done today) ----- */
    water[date] = isToday ? Math.round(t.water / 2) : 5 + Math.round(noise(i, 3) * 3);
    const stepF = isToday ? 0.5 : 0.62 + noise(i, 4) * 0.62;
    steps[date] = Math.round((t.stepGoal * stepF) / 100) * 100;

    /* ----- workouts: today's session is still pending ----- */
    const isRest = restDays.has(WEEKDAYS[parseKey(date).getDay()]);
    if (!isToday && !isRest && !MISSED.has(back)) {
      if (sessions % 4 === 3) {
        const w = WORKOUTS.find((x) => x.id === CLASSES[Math.floor(sessions / 4) % CLASSES.length]);
        if (w) workouts.unshift({ id: nid(), workoutId: w.id, title: w.title, emoji: w.emoji, minutes: w.minutes, kcal: w.kcal, date });
      } else if (programAt < PROGRAM_DAYS) {
        programAt++;
        // Plan rest days need no session, so they count as done when the next one is trained.
        if (isRestDay(programAt) && programAt < PROGRAM_DAYS) programAt++;
        const session = programDay(p.program, programAt);
        const stats = sessionStats(session, 30);
        workouts.unshift({
          id: nid(),
          sessionKey: session.key,
          title: `${programById(p.program).title} · Day ${programAt}`,
          emoji: session.emoji,
          minutes: stats.minutes,
          kcal: stats.kcal,
          date,
        });
      }
      sessions++;
    }

    /* ----- weigh-ins every third day, plus today ----- */
    if (isToday || i % 3 === 0) {
      const drift = perWeek * weeks * (i / (DEMO_DAYS - 1));
      weights.push({ id: nid(), date, kg: isToday ? round1(p.weightKg) : round1(first + drift + (noise(i, 5) - 0.5) * 0.5) });
    }
  }

  const favorites = ['roti', 'dal', 'curd', 'banana'].map((id) => forDiet(id, diet));

  return {
    entries,
    water,
    steps,
    workouts,
    weights,
    snaps,
    programProgress: { [p.program]: Math.min(PROGRAM_DAYS, programAt) },
    recentSearches: ['Paneer', 'Oats', 'Roti', 'Sprouts'],
    favoriteFoods: Array.from(new Set(favorites)),
    startWeightKg: round1(weights[0]?.kg ?? p.weightKg),
  };
}
