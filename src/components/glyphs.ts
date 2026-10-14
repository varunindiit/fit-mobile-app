// Generated from the onboarding/app artwork: maps emoji tokens used in data to generated images or vector icons.
import type { IconName } from '@/components/ui';
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
  '🍿': { img: require('@/assets/images/glyphs/food-makhana.webp') },
  '🥜': { img: require('@/assets/images/glyphs/food-peanuts.webp') },
  '🌰': { img: require('@/assets/images/glyphs/food-almonds.webp') },
  '🍪': { img: require('@/assets/images/glyphs/food-biscuits.webp') },
  '🍌': { img: require('@/assets/images/glyphs/food-banana.webp') },
  '🥭': { img: require('@/assets/images/glyphs/food-mango.webp') },
  '🍉': { img: require('@/assets/images/glyphs/food-watermelon.webp') },
  '☕': { img: require('@/assets/images/glyphs/food-chai.webp') },
  '🍵': { img: require('@/assets/images/glyphs/food-green-tea.webp') },
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
};

/** 3D exercise figures keyed by exercise id. */
export const EXERCISE_ART: Record<string, number> = {
  'jumping-jacks': require('@/assets/images/exercises/jumping-jacks.webp'),
};
