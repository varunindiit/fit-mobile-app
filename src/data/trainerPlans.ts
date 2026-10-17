/**
 * Workouts a Pro member's trainer has written for them.
 *
 * These are ordinary `Session`s with a `trainer:` key, so the existing day screen
 * and player run them unchanged — including rest timers, resume and logging. Every
 * exercise is a real id from `EXERCISES`; nothing here invents a movement the app
 * cannot demonstrate or explain.
 *
 * Mock assignments for now. The shape matches what a `GET /trainer/:id/plans`
 * response would carry, so swapping in a real one is a data change, not a UI change.
 */
import type { Session, SessionItem } from './program';
import { exerciseById, sessionStats } from './program';
import { DEFAULT_TRAINER_ID, type Weekday } from './trainers';

export type TrainerPlan = Session & {
  trainerId: string;
  /** What the coach wants from this session — shown above the exercise list. */
  note: string;
  /** Headline body area. */
  focus: string;
  /** Weekday it sits on in the member's weekly schedule. */
  day: Weekday;
};

const plan = (
  id: string,
  trainerId: string,
  title: string,
  focus: string,
  day: Weekday,
  colors: [string, string],
  emoji: string,
  note: string,
  items: SessionItem[],
): TrainerPlan => ({
  key: `trainer:${id}`,
  title,
  subtitle: `${focus} · coach plan`,
  colors,
  emoji,
  items,
  trainerId,
  note,
  focus,
  day,
});

export const TRAINER_PLANS: TrainerPlan[] = [
  plan(
    'chest-triceps',
    'arjun-mehta',
    'Chest & Triceps',
    'Chest',
    'Mon',
    ['#3B82F6', '#1D4ED8'],
    '💪',
    'Chest day, bodyweight only. Keep your elbows at about 45°, not flared out. If the full push-up breaks down, drop to your knees and finish the set clean — I would rather have 8 good reps than 15 sloppy ones.',
    [
      { exerciseId: 'jumping-jacks', seconds: 40 },
      { exerciseId: 'push-ups', reps: 12 },
      { exerciseId: 'wide-push-ups', reps: 10 },
      { exerciseId: 'tricep-dips', reps: 12 },
      { exerciseId: 'plank', seconds: 45 },
      { exerciseId: 'cobra-stretch', seconds: 30 },
    ],
  ),
  plan(
    'core-builder',
    'arjun-mehta',
    'Core Builder',
    'Abs',
    'Tue',
    ['#F59E0B', '#B45309'],
    '🔥',
    'Lower back stays pressed into the floor on every rep. The second it lifts, stop the set — that is your real limit for today. Breathe out on the effort.',
    [
      { exerciseId: 'abdominal-crunches', reps: 15 },
      { exerciseId: 'leg-raises', reps: 12 },
      { exerciseId: 'reverse-crunches', reps: 12 },
      { exerciseId: 'russian-twist', reps: 20 },
      { exerciseId: 'dead-bug', reps: 12 },
      { exerciseId: 'plank', seconds: 50 },
    ],
  ),
  plan(
    'legs-glutes',
    'arjun-mehta',
    'Legs & Glutes',
    'Leg',
    'Thu',
    ['#22C55E', '#15803D'],
    '🦵',
    'Drive through your heels, knees tracking over your toes. Take the squats slow on the way down — three seconds — and stand up fast.',
    [
      { exerciseId: 'jumping-jacks', seconds: 40 },
      { exerciseId: 'squats', reps: 18 },
      { exerciseId: 'lunges', reps: 16 },
      { exerciseId: 'glute-bridge', reps: 18 },
      { exerciseId: 'squats', reps: 12 },
      { exerciseId: 'spine-twist', seconds: 30 },
    ],
  ),
  plan(
    'full-body-burn',
    'rohit-shetty',
    'Full Body Burn',
    'Full body',
    'Wed',
    ['#F97316', '#C2410C'],
    '⚡',
    'This one is conditioning, not strength. Keep the rests honest and the pace high — if you can hold a conversation in the middle of it, push harder.',
    [
      { exerciseId: 'jumping-jacks', seconds: 45 },
      { exerciseId: 'burpees', reps: 10 },
      { exerciseId: 'mountain-climber', seconds: 40 },
      { exerciseId: 'squats', reps: 20 },
      { exerciseId: 'push-ups', reps: 12 },
      { exerciseId: 'plank', seconds: 45 },
    ],
  ),
  plan(
    'mobility-reset',
    'kavya-iyer',
    'Mobility Reset',
    'Back',
    'Fri',
    ['#7C3AED', '#5B21B6'],
    '🧘',
    'Recovery session — nothing here should hurt. Hold each stretch and breathe into it instead of forcing the range.',
    [
      { exerciseId: 'glute-bridge', reps: 15 },
      { exerciseId: 'superman', reps: 12 },
      { exerciseId: 'side-plank', seconds: 30 },
      { exerciseId: 'cobra-stretch', seconds: 40 },
      { exerciseId: 'spine-twist', seconds: 40 },
    ],
  ),
  plan(
    'upper-finisher',
    'rohit-shetty',
    'Upper Body Finisher',
    'Arm',
    'Sat',
    ['#0EA5E9', '#0369A1'],
    '🏋️',
    'Short and sharp. Two rounds if you have the time — the second one is where the work happens.',
    [
      { exerciseId: 'push-ups', reps: 10 },
      { exerciseId: 'tricep-dips', reps: 14 },
      { exerciseId: 'wide-push-ups', reps: 10 },
      { exerciseId: 'side-plank', seconds: 30 },
      { exerciseId: 'plank', seconds: 40 },
    ],
  ),
];

export const trainerPlanByKey = (key: string): TrainerPlan | undefined => TRAINER_PLANS.find((p) => p.key === key);

export const isTrainerKey = (key: string) => key.startsWith('trainer:');

/** Every plan this trainer has assigned, in weekday order. */
export const plansFor = (trainerId: string) => TRAINER_PLANS.filter((p) => p.trainerId === trainerId);

/**
 * The member's week with their trainer: one plan per day, rest where the coach
 * scheduled none. Falls back to the default trainer so the dashboard is never empty.
 */
export function weekPlan(trainerId: string) {
  const mine = plansFor(trainerId);
  const list = mine.length ? mine : plansFor(DEFAULT_TRAINER_ID);
  return list;
}

/** The plan scheduled for `day`, if the coach set one. */
export const planOnDay = (trainerId: string, day: Weekday) => weekPlan(trainerId).find((p) => p.day === day);

/** Short "6 moves · 14 min · ~95 kcal" summary for a plan card. */
export const planSummary = (p: TrainerPlan, restSeconds = 30) => sessionStats(p, restSeconds);

/** The exercises in a plan, resolved for display in a chat card or list. */
export const planExercises = (p: TrainerPlan) => p.items.map((it) => ({ it, ex: exerciseById(it.exerciseId) }));
