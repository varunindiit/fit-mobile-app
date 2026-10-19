// Generated from the onboarding/app artwork: maps emoji tokens used in data to generated images or vector icons.
import type { IconName } from '@/components/ui';
import { isRestDay } from '@/data/program';
import { C } from '@/theme';

export type GlyphEntry = { img: number } | { icon: IconName; color: string };

/** Keys are emoji with variation selectors (U+FE0F) removed. */
export const GLYPHS: Record<string, GlyphEntry> = {
  '🍛': { img: require('@/assets/images/glyphs/food-curry.webp') },
  '🍥': { img: require('@/assets/images/glyphs/food-idli.webp') },
  '🌯': { img: require('@/assets/images/glyphs/food-dosa.webp') },
  '🥣': { img: require('@/assets/images/glyphs/food-porridge.webp') },
  '🫓': { img: require('@/assets/images/glyphs/food-roti.webp') },
  '🥚': { img: require('@/assets/images/glyphs/food-boiled-egg.webp') },
  '🍳': { img: require('@/assets/images/glyphs/food-omelette.webp') },
  '🍞': { img: require('@/assets/images/glyphs/food-toast.webp') },
  '🍲': { img: require('@/assets/images/glyphs/food-dal.webp') },
  '🫘': { img: require('@/assets/images/glyphs/food-rajma.webp') },
  '🥘': { img: require('@/assets/images/glyphs/food-chole.webp') },
  '🧀': { img: require('@/assets/images/glyphs/food-paneer.webp') },
  '🥬': { img: require('@/assets/images/glyphs/food-palak.webp') },
  '🥗': { img: require('@/assets/images/glyphs/food-salad.webp') },
  '🐟': { img: require('@/assets/images/glyphs/food-fish.webp') },
  '🍚': { img: require('@/assets/images/glyphs/food-rice.webp') },
  '🥛': { img: require('@/assets/images/glyphs/food-curd.webp') },
  '🥟': { img: require('@/assets/images/glyphs/food-samosa.webp') },
  '🟨': { img: require('@/assets/images/glyphs/food-dhokla.webp') },
  '🍿': { img: require('@/assets/images/glyphs/food-makhana.webp') },
  '🥜': { img: require('@/assets/images/glyphs/food-peanuts.webp') },
  '🌰': { img: require('@/assets/images/glyphs/food-almonds.webp') },
  '🍪': { img: require('@/assets/images/glyphs/food-biscuits.webp') },
  '🍌': { img: require('@/assets/images/glyphs/food-banana.webp') },
  '🍎': { img: require('@/assets/images/glyphs/food-apple.webp') },
  '🥭': { img: require('@/assets/images/glyphs/food-mango.webp') },
  '🍉': { img: require('@/assets/images/glyphs/food-watermelon.webp') },
  '☕': { img: require('@/assets/images/glyphs/food-chai.webp') },
  '🍵': { img: require('@/assets/images/glyphs/food-green-tea.webp') },
  '🥤': { img: require('@/assets/images/glyphs/food-lassi.webp') },
  '🥥': { img: require('@/assets/images/glyphs/food-coconut.webp') },
  '🍡': { img: require('@/assets/images/glyphs/food-gulab-jamun.webp') },
  '🍮': { img: require('@/assets/images/glyphs/food-kheer.webp') },
  '🍫': { img: require('@/assets/images/glyphs/food-chocolate.webp') },
  '🔥': { img: require('@/assets/images/glyphs/g-flame.webp') },
  '🏆': { img: require('@/assets/images/glyphs/g-trophy.webp') },
  '💪': { img: require('@/assets/images/glyphs/g-biceps.webp') },
  '⚡': { img: require('@/assets/images/glyphs/g-lightning.webp') },
  '💥': { img: require('@/assets/images/glyphs/g-burst.webp') },
  '😴': { img: require('@/assets/images/glyphs/g-sleep.webp') },
  '🎉': { img: require('@/assets/images/glyphs/g-party.webp') },
  '🎂': { img: require('@/assets/images/glyphs/g-cake.webp') },
  '🏸': { img: require('@/assets/images/glyphs/g-badminton.webp') },
  '🏏': { img: require('@/assets/images/glyphs/g-cricket.webp') },
  '🏋': { img: require('@/assets/images/glyphs/p-strength.webp') },
  '🦵': { img: require('@/assets/images/glyphs/g-leg.webp') },
  '🧘': { img: require('@/assets/images/glyphs/p-yoga.webp') },
  '🚶': { img: require('@/assets/images/glyphs/p-walk.webp') },
  '🏃': { img: require('@/assets/images/glyphs/p-run.webp') },
  '🚴': { img: require('@/assets/images/glyphs/p-cycle.webp') },
  '🏊': { img: require('@/assets/images/glyphs/p-swim.webp') },
  '💃': { img: require('@/assets/images/glyphs/p-dance.webp') },
  '🤸': { img: require('@/assets/images/glyphs/p-gymnast.webp') },
  '🧍': { img: require('@/assets/images/glyphs/p-stand.webp') },
  '👩‍⚕': { img: require('@/assets/images/glyphs/c-nutritionist.webp') },
  '🏋‍♂': { img: require('@/assets/images/glyphs/c-trainer.webp') },
  '👩‍🔬': { img: require('@/assets/images/glyphs/c-educator.webp') },
  '🙇': { icon: 'fitness', color: C.primary },
  '🧗': { icon: 'fitness', color: C.primary },
  '👆': { icon: 'fitness', color: C.primary },
  '🧱': { icon: 'fitness', color: C.primary },
  '🌀': { icon: 'fitness', color: C.primary },
  '🔃': { icon: 'fitness', color: C.primary },
  '✌': { icon: 'fitness', color: C.primary },
  '🙅': { icon: 'fitness', color: C.primary },
  '📐': { icon: 'fitness', color: C.primary },
  '❌': { icon: 'fitness', color: C.primary },
  '🦅': { icon: 'fitness', color: C.primary },
  '🌉': { icon: 'fitness', color: C.primary },
  '🦸': { icon: 'fitness', color: C.primary },
  '🐍': { icon: 'fitness', color: C.primary },
  '🍗': { img: require('@/assets/images/onboarding/diet-meat.webp') },
  '🥦': { img: require('@/assets/images/onboarding/diet-vegetarian.webp') },
  '🌱': { img: require('@/assets/images/onboarding/diet-vegan.webp') },
  '🔁': { icon: 'refresh', color: C.primaryDark },
  '🔄': { icon: 'swap-horizontal', color: C.primaryDark },
  '🗑': { icon: 'trash', color: C.danger },
  '😢': { icon: 'sad-outline', color: C.primaryDark },
  '🥺': { icon: 'sad-outline', color: C.primaryDark },
  '🛑': { icon: 'stop-circle', color: C.danger },
  '⏸': { icon: 'pause-circle', color: C.primaryDark },
  '🧹': { icon: 'trash-bin', color: C.danger },
  '👋': { icon: 'hand-left', color: C.primaryDark },
  '🔐': { icon: 'lock-closed', color: C.primaryDark },
  '☁': { icon: 'cloud-upload', color: C.water },
  '❤': { icon: 'heart', color: C.fat },
  '👏': { icon: 'thumbs-up', color: C.primaryDark },
  '⚖': { icon: 'scale', color: C.weight },
  '🍽': { icon: 'restaurant', color: C.accent },
  '🌿': { icon: 'leaf', color: C.primary },
  '🪑': { icon: 'desktop-outline', color: C.textSoft },
  '🙏': { icon: 'flower-outline', color: C.workout },
  '✨': { icon: 'sparkles', color: C.ai },
  '👑': { icon: 'diamond', color: C.gold },
  '💧': { icon: 'water', color: C.water },
};

/** Still pose for each exercise — the opening frame of its animation (© Gym visual), used on cards and log rows. */
export const EXERCISE_ART: Record<string, number> = {
  'jumping-jacks': require('@/assets/images/exercises/jumping-jacks.webp'),
  'abdominal-crunches': require('@/assets/images/exercises/abdominal-crunches.webp'),
  'russian-twist': require('@/assets/images/exercises/russian-twist.webp'),
  'mountain-climber': require('@/assets/images/exercises/mountain-climber.webp'),
  'heel-touch': require('@/assets/images/exercises/heel-touch.webp'),
  'leg-raises': require('@/assets/images/exercises/leg-raises.webp'),
  'plank': require('@/assets/images/exercises/plank.webp'),
  'bent-leg-twist': require('@/assets/images/exercises/bent-leg-twist.webp'),
  'reverse-crunches': require('@/assets/images/exercises/reverse-crunches.webp'),
  'v-crunch': require('@/assets/images/exercises/v-crunch.webp'),
  'flutter-kicks': require('@/assets/images/exercises/flutter-kicks.webp'),
  'cross-arm-crunches': require('@/assets/images/exercises/cross-arm-crunches.webp'),
  'bicycle-crunches': require('@/assets/images/exercises/bicycle-crunches.webp'),
  'side-plank': require('@/assets/images/exercises/side-plank.webp'),
  'dead-bug': require('@/assets/images/exercises/dead-bug.webp'),
  'push-ups': require('@/assets/images/exercises/push-ups.webp'),
  'wide-push-ups': require('@/assets/images/exercises/wide-push-ups.webp'),
  'tricep-dips': require('@/assets/images/exercises/tricep-dips.webp'),
  'squats': require('@/assets/images/exercises/squats.webp'),
  'lunges': require('@/assets/images/exercises/lunges.webp'),
  'glute-bridge': require('@/assets/images/exercises/glute-bridge.webp'),
  'superman': require('@/assets/images/exercises/superman.webp'),
  'burpees': require('@/assets/images/exercises/burpees.webp'),
  'cobra-stretch': require('@/assets/images/exercises/cobra-stretch.webp'),
  'spine-twist': require('@/assets/images/exercises/bent-leg-twist.webp'), // same lying lumbar twist as bent-leg-twist
};

/** Looping animation for each exercise (180px animated WebP, © Gym visual). Every exercise has one; ExerciseArt
 *  still falls back to a breathing loop for any id that does not. */
export const EXERCISE_ANIM: Record<string, number> = {
  'jumping-jacks': require('@/assets/images/exercises/anim/jumping-jacks.webp'),
  'abdominal-crunches': require('@/assets/images/exercises/anim/abdominal-crunches.webp'),
  'russian-twist': require('@/assets/images/exercises/anim/russian-twist.webp'),
  'mountain-climber': require('@/assets/images/exercises/anim/mountain-climber.webp'),
  'heel-touch': require('@/assets/images/exercises/anim/heel-touch.webp'),
  'leg-raises': require('@/assets/images/exercises/anim/leg-raises.webp'),
  'plank': require('@/assets/images/exercises/anim/plank.webp'),
  'bent-leg-twist': require('@/assets/images/exercises/anim/bent-leg-twist.webp'),
  'reverse-crunches': require('@/assets/images/exercises/anim/reverse-crunches.webp'),
  'v-crunch': require('@/assets/images/exercises/anim/v-crunch.webp'),
  'flutter-kicks': require('@/assets/images/exercises/anim/flutter-kicks.webp'),
  'cross-arm-crunches': require('@/assets/images/exercises/anim/cross-arm-crunches.webp'),
  'bicycle-crunches': require('@/assets/images/exercises/anim/bicycle-crunches.webp'),
  'side-plank': require('@/assets/images/exercises/anim/side-plank.webp'),
  'dead-bug': require('@/assets/images/exercises/anim/dead-bug.webp'),
  'push-ups': require('@/assets/images/exercises/anim/push-ups.webp'),
  'wide-push-ups': require('@/assets/images/exercises/anim/wide-push-ups.webp'),
  'tricep-dips': require('@/assets/images/exercises/anim/tricep-dips.webp'),
  'squats': require('@/assets/images/exercises/anim/squats.webp'),
  'lunges': require('@/assets/images/exercises/anim/lunges.webp'),
  'glute-bridge': require('@/assets/images/exercises/anim/glute-bridge.webp'),
  'superman': require('@/assets/images/exercises/anim/superman.webp'),
  'burpees': require('@/assets/images/exercises/anim/burpees.webp'),
  'cobra-stretch': require('@/assets/images/exercises/anim/cobra-stretch.webp'),
  'spine-twist': require('@/assets/images/exercises/anim/bent-leg-twist.webp'),
};

/** Dish-specific artwork keyed by food id — wins over the emoji glyph, which several dishes share (🍛, 🍚, 🫓, ☕…). */
export const FOOD_ART: Record<string, number> = {
  'poha': require('@/assets/images/glyphs/food-poha.webp'),
  'upma': require('@/assets/images/glyphs/food-upma.webp'),
  'aloo-paratha': require('@/assets/images/glyphs/food-aloo-paratha.webp'),
  'mix-veg': require('@/assets/images/glyphs/food-mix-veg.webp'),
  'chicken-curry': require('@/assets/images/glyphs/food-curry.webp'),
  'grilled-chicken': require('@/assets/images/glyphs/food-grilled-chicken.webp'),
  'egg-curry': require('@/assets/images/glyphs/food-egg-curry.webp'),
  'chicken-biryani': require('@/assets/images/glyphs/food-biryani.webp'),
  'veg-pulao': require('@/assets/images/glyphs/food-rice.webp'),
  'rice': require('@/assets/images/glyphs/food-steamed-rice.webp'),
  'brown-rice': require('@/assets/images/glyphs/food-brown-rice.webp'),
  'butter-naan': require('@/assets/images/glyphs/food-butter-naan.webp'),
  'greek-yogurt': require('@/assets/images/glyphs/food-greek-yogurt.webp'),
  'sprouts': require('@/assets/images/glyphs/food-sprouts-salad.webp'),
  'papaya': require('@/assets/images/glyphs/food-papaya.webp'),
  'black-coffee': require('@/assets/images/glyphs/food-black-coffee.webp'),
  'buttermilk': require('@/assets/images/glyphs/food-buttermilk.webp'),
  'whey': require('@/assets/images/glyphs/food-whey-shake.webp'),
};

/** The mascot illustrating each 30-day program. */
export const PROGRAM_ART: Record<string, number> = {
  belly: require('@/assets/images/glyphs/hero-belly.webp'),
  abs: require('@/assets/images/glyphs/hero-abs.webp'),
  sixpack: require('@/assets/images/glyphs/hero-sixpack.webp'),
};

/** Signature exercise shown on each body-focus session card. */
const FOCUS_EXERCISE: Record<string, string> = {
  'focus:abs-beginner': 'abdominal-crunches',
  'focus:rock-hard': 'v-crunch',
  'focus:intense-shred': 'burpees',
  'focus:stronger-abs': 'bicycle-crunches',
  'focus:chest-beginner': 'push-ups',
  'focus:chest-dumbbell': 'wide-push-ups',
  'focus:arm-toning': 'tricep-dips',
  'focus:leg-day': 'squats',
  'focus:back-relief': 'superman',
  'focus:ultimate-core': 'dead-bug',
};

/** Signature exercise shown on each trainer plan card, so the coach's workout reads as a move, not a generic emoji. */
const TRAINER_EXERCISE: Record<string, string> = {
  'trainer:chest-triceps': 'push-ups',
  'trainer:core-builder': 'abdominal-crunches',
  'trainer:legs-glutes': 'squats',
  'trainer:full-body-burn': 'burpees',
  'trainer:mobility-reset': 'cobra-stretch',
  'trainer:upper-finisher': 'tricep-dips',
};

/** Guided workouts whose emoji glyph is too generic (🔥, 💪) get the mascot doing the move instead. */
export const WORKOUT_ART: Record<string, number> = {
  'fat-burn-hiit': EXERCISE_ART['burpees'],
  'core-blast': EXERCISE_ART['abdominal-crunches'],
};

/**
 * Coach photography shown as the header of each "Train with a coach" card, keyed by workout id.
 * Files live in `assets/images/workouts/<workout id>.webp` (see `scripts/workout-photos/README.md`
 * for the prompts and the optimiser). A workout with no entry here falls back to its tinted colour
 * plus `WORKOUT_ART`/emoji, so the grid is never broken while the set is being filled in.
 */
export const WORKOUT_PHOTO: Record<string, number> = {
  'morning-yoga': require('@/assets/images/workouts/morning-yoga.webp'),
  'fat-burn-hiit': require('@/assets/images/workouts/fat-burn-hiit.webp'),
  'full-body-strength': require('@/assets/images/workouts/full-body-strength.webp'),
  'brisk-walk': require('@/assets/images/workouts/brisk-walk.webp'),
  'dance-cardio': require('@/assets/images/workouts/dance-cardio.webp'),
  'core-blast': require('@/assets/images/workouts/core-blast.webp'),
  'power-yoga': require('@/assets/images/workouts/power-yoga.webp'),
  'cycling': require('@/assets/images/workouts/cycling.webp'),
};

/** The same photography at full-screen width and 3:2, for the workout detail hero. Falls back like `WORKOUT_PHOTO`. */
export const WORKOUT_HERO: Record<string, number> = {
  'morning-yoga': require('@/assets/images/workouts/morning-yoga-hero.webp'),
  'fat-burn-hiit': require('@/assets/images/workouts/fat-burn-hiit-hero.webp'),
  'full-body-strength': require('@/assets/images/workouts/full-body-strength-hero.webp'),
  'brisk-walk': require('@/assets/images/workouts/brisk-walk-hero.webp'),
  'dance-cardio': require('@/assets/images/workouts/dance-cardio-hero.webp'),
  'core-blast': require('@/assets/images/workouts/core-blast-hero.webp'),
  'power-yoga': require('@/assets/images/workouts/power-yoga-hero.webp'),
  'cycling': require('@/assets/images/workouts/cycling-hero.webp'),
};

/**
 * Athlete photography shown behind each "Level up" carousel card, keyed by focus session key.
 * Files live in `assets/images/focus/<key without the focus: prefix>.webp` (see
 * `scripts/level-up-photos/README.md` for the prompts, the personas and the optimiser). A session
 * with no entry here falls back to its brand gradient plus the mascot artwork, so the carousel is
 * never broken while the set is being filled in.
 */
export const FOCUS_PHOTO: Record<string, number> = {
  'focus:rock-hard': require('@/assets/images/focus/rock-hard.webp'),
  'focus:intense-shred': require('@/assets/images/focus/intense-shred.webp'),
  'focus:stronger-abs': require('@/assets/images/focus/stronger-abs.webp'),
  'focus:chest-dumbbell': require('@/assets/images/focus/chest-dumbbell.webp'),
  'focus:leg-day': require('@/assets/images/focus/leg-day.webp'),
  'focus:ultimate-core': require('@/assets/images/focus/ultimate-core.webp'),
};

/** The same photography at full-screen width and 3:2, for the session detail hero. Falls back like `FOCUS_PHOTO`. */
export const FOCUS_HERO: Record<string, number> = {
  'focus:rock-hard': require('@/assets/images/focus/rock-hard-hero.webp'),
  'focus:intense-shred': require('@/assets/images/focus/intense-shred-hero.webp'),
  'focus:stronger-abs': require('@/assets/images/focus/stronger-abs-hero.webp'),
  'focus:chest-dumbbell': require('@/assets/images/focus/chest-dumbbell-hero.webp'),
  'focus:leg-day': require('@/assets/images/focus/leg-day-hero.webp'),
  'focus:ultimate-core': require('@/assets/images/focus/ultimate-core-hero.webp'),
  'focus:abs-beginner': require('@/assets/images/focus/abs-beginner-hero.webp'),
  'focus:chest-beginner': require('@/assets/images/focus/chest-beginner-hero.webp'),
  'focus:arm-toning': require('@/assets/images/focus/arm-toning-hero.webp'),
  'focus:back-relief': require('@/assets/images/focus/back-relief-hero.webp'),
};

/**
 * Square athlete photo for each session's tile in the "Target an area" list, framed on the muscle
 * group it works — a different shot from the "Level up" card, which sits on the same screen.
 * Files live in `assets/images/areas/<key without the focus: prefix>.webp` (see
 * `scripts/area-photos/README.md`). A session without one keeps its gradient + artwork tile.
 */
export const AREA_PHOTO: Record<string, number> = {
  'focus:abs-beginner': require('@/assets/images/areas/abs-beginner.webp'),
  'focus:rock-hard': require('@/assets/images/areas/rock-hard.webp'),
  'focus:stronger-abs': require('@/assets/images/areas/stronger-abs.webp'),
  'focus:chest-beginner': require('@/assets/images/areas/chest-beginner.webp'),
  'focus:chest-dumbbell': require('@/assets/images/areas/chest-dumbbell.webp'),
  'focus:arm-toning': require('@/assets/images/areas/arm-toning.webp'),
  'focus:leg-day': require('@/assets/images/areas/leg-day.webp'),
  'focus:back-relief': require('@/assets/images/areas/back-relief.webp'),
  'focus:intense-shred': require('@/assets/images/areas/intense-shred.webp'),
  'focus:ultimate-core': require('@/assets/images/areas/ultimate-core.webp'),
};

/** The mascot resting, shown on every rest day instead of the generic 😴 glyph. */
export const REST_ART: number = require('@/assets/images/glyphs/p-yoga.webp');

/**
 * Athlete photography for the 30-day programs' "Today's workout" card, keyed by program id, plus
 * `rest` for rest days. Files live in `assets/images/programs/` (see
 * `scripts/today-workout-photos/README.md` for the prompts, the personas and the optimiser).
 */
export const PROGRAM_PHOTO: Record<string, number> = {
  belly: require('@/assets/images/programs/belly.webp'),
  abs: require('@/assets/images/programs/abs.webp'),
  sixpack: require('@/assets/images/programs/sixpack.webp'),
  rest: require('@/assets/images/programs/rest.webp'),
};

/** The same photography at full-screen width and 3:2, for the program day detail hero. */
export const PROGRAM_HERO: Record<string, number> = {
  belly: require('@/assets/images/programs/belly-hero.webp'),
  abs: require('@/assets/images/programs/abs-hero.webp'),
  sixpack: require('@/assets/images/programs/sixpack-hero.webp'),
  rest: require('@/assets/images/programs/rest-hero.webp'),
};

/** Photo for a program day key (`program:<id>:<day>`) from `set`; undefined for any other key, so callers fall back. */
export function programPhoto(key: string | undefined, set: Record<string, number> = PROGRAM_PHOTO): number | undefined {
  if (!key?.startsWith('program:')) return undefined;
  const [, pid, day] = key.split(':');
  return set[isRestDay(Number(day)) ? 'rest' : pid];
}

/** Artwork for a session key (program day, body-focus session or trainer plan); undefined for unknown keys so callers fall back to the emoji. */
export function sessionArt(key?: string): number | undefined {
  if (!key) return undefined;
  if (key.startsWith('program:')) {
    const [, pid, day] = key.split(':');
    return isRestDay(Number(day)) ? REST_ART : PROGRAM_ART[pid];
  }
  const ex = FOCUS_EXERCISE[key] ?? TRAINER_EXERCISE[key];
  return ex ? EXERCISE_ART[ex] : undefined;
}

/** Artwork for a logged workout: its program/focus session or guided workout, when it came from one. */
export const logArt = (w: { sessionKey?: string; workoutId?: string }) => sessionArt(w.sessionKey) ?? (w.workoutId ? WORKOUT_ART[w.workoutId] : undefined);
