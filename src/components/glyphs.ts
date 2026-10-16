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

/** 3D exercise figures keyed by exercise id. */
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
  'x-man-crunch': require('@/assets/images/exercises/x-man-crunch.webp'),
  'push-ups': require('@/assets/images/exercises/push-ups.webp'),
  'wide-push-ups': require('@/assets/images/exercises/wide-push-ups.webp'),
  'tricep-dips': require('@/assets/images/exercises/tricep-dips.webp'),
  'squats': require('@/assets/images/exercises/squats.webp'),
  'lunges': require('@/assets/images/exercises/lunges.webp'),
  'glute-bridge': require('@/assets/images/exercises/glute-bridge.webp'),
  'superman': require('@/assets/images/exercises/superman.webp'),
  'burpees': require('@/assets/images/exercises/burpees.webp'),
  'cobra-stretch': require('@/assets/images/exercises/cobra-stretch.webp'),
  'spine-twist': require('@/assets/images/exercises/spine-twist.webp'),
};

/** Second keyframe (opposite phase of the rep) for exercises that loop as a 2-frame animation. Static holds (plank, side plank) have none. */
export const EXERCISE_ART_B: Record<string, number> = {
  'jumping-jacks': require('@/assets/images/exercises/jumping-jacks-b.webp'),
  'abdominal-crunches': require('@/assets/images/exercises/abdominal-crunches-b.webp'),
  'russian-twist': require('@/assets/images/exercises/russian-twist-b.webp'),
  'mountain-climber': require('@/assets/images/exercises/mountain-climber-b.webp'),
  'heel-touch': require('@/assets/images/exercises/heel-touch-b.webp'),
  'leg-raises': require('@/assets/images/exercises/leg-raises-b.webp'),
  'bent-leg-twist': require('@/assets/images/exercises/bent-leg-twist-b.webp'),
  'reverse-crunches': require('@/assets/images/exercises/reverse-crunches-b.webp'),
  'v-crunch': require('@/assets/images/exercises/v-crunch-b.webp'),
  'flutter-kicks': require('@/assets/images/exercises/flutter-kicks-b.webp'),
  'cross-arm-crunches': require('@/assets/images/exercises/cross-arm-crunches-b.webp'),
  'bicycle-crunches': require('@/assets/images/exercises/bicycle-crunches-b.webp'),
  'x-man-crunch': require('@/assets/images/exercises/x-man-crunch-b.webp'),
  'push-ups': require('@/assets/images/exercises/push-ups-b.webp'),
  'wide-push-ups': require('@/assets/images/exercises/wide-push-ups-b.webp'),
  'tricep-dips': require('@/assets/images/exercises/tricep-dips-b.webp'),
  'squats': require('@/assets/images/exercises/squats-b.webp'),
  'lunges': require('@/assets/images/exercises/lunges-b.webp'),
  'glute-bridge': require('@/assets/images/exercises/glute-bridge-b.webp'),
  'superman': require('@/assets/images/exercises/superman-b.webp'),
  'burpees': require('@/assets/images/exercises/burpees-b.webp'),
  'cobra-stretch': require('@/assets/images/exercises/cobra-stretch-b.webp'),
  'spine-twist': require('@/assets/images/exercises/spine-twist-b.webp'),
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
  'focus:ultimate-core': 'x-man-crunch',
};

/** Guided workouts whose emoji glyph is too generic (🔥, 💪) get the mascot doing the move instead. */
export const WORKOUT_ART: Record<string, number> = {
  'fat-burn-hiit': EXERCISE_ART['burpees'],
  'core-blast': EXERCISE_ART['abdominal-crunches'],
};

/** The mascot resting, shown on every rest day instead of the generic 😴 glyph. */
export const REST_ART: number = require('@/assets/images/glyphs/p-yoga.webp');

/** Artwork for a session key (program day or body-focus session); undefined for unknown keys so callers fall back to the emoji. */
export function sessionArt(key?: string): number | undefined {
  if (!key) return undefined;
  if (key.startsWith('program:')) {
    const [, pid, day] = key.split(':');
    return isRestDay(Number(day)) ? REST_ART : PROGRAM_ART[pid];
  }
  const ex = FOCUS_EXERCISE[key];
  return ex ? EXERCISE_ART[ex] : undefined;
}

/** Artwork for a logged workout: its program/focus session or guided workout, when it came from one. */
export const logArt = (w: { sessionKey?: string; workoutId?: string }) => sessionArt(w.sessionKey) ?? (w.workoutId ? WORKOUT_ART[w.workoutId] : undefined);
