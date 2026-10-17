/**
 * Pro-only exercise demonstrations — kept deliberately separate from `EXERCISE_ANIM`
 * in `@/components/glyphs`, which stays exactly as it is for Free and Smart.
 *
 * What these are, precisely: two photographs of a real athlete per exercise (the
 * start and the end of the movement), registered onto each other and played as a
 * loop that holds each pose and eases between them. They are **photo
 * demonstrations, not video footage**, and the in-between frames are a cross-fade,
 * not a synthesised pose — screens must not describe them as video or as footage of
 * the user's own coach.
 *
 * Source: free-exercise-db (https://github.com/yuhonas/free-exercise-db), released
 * into the public domain under the Unlicense. No attribution is required; we carry
 * `PRO_DEMO_CREDIT` anyway and show it on the demonstration surface.
 *
 * An exercise is listed here only when the source photographs genuinely show that
 * movement. Anything missing falls back to the standard animation at runtime
 * (`proDemo()` returns undefined), which is why this map is smaller than `EXERCISES`.
 */

export const PRO_DEMOS: Record<string, number> = {
  'abdominal-crunches': require('@/assets/images/exercises/pro/abdominal-crunches.webp'),
  'bicycle-crunches': require('@/assets/images/exercises/pro/bicycle-crunches.webp'),
  'dead-bug': require('@/assets/images/exercises/pro/dead-bug.webp'),
  'glute-bridge': require('@/assets/images/exercises/pro/glute-bridge.webp'),
  'heel-touch': require('@/assets/images/exercises/pro/heel-touch.webp'),
  'leg-raises': require('@/assets/images/exercises/pro/leg-raises.webp'),
  'lunges': require('@/assets/images/exercises/pro/lunges.webp'),
  'mountain-climber': require('@/assets/images/exercises/pro/mountain-climber.webp'),
  'push-ups': require('@/assets/images/exercises/pro/push-ups.webp'),
  'reverse-crunches': require('@/assets/images/exercises/pro/reverse-crunches.webp'),
  'russian-twist': require('@/assets/images/exercises/pro/russian-twist.webp'),
  'side-plank': require('@/assets/images/exercises/pro/side-plank.webp'),
  'squats': require('@/assets/images/exercises/pro/squats.webp'),
  'superman': require('@/assets/images/exercises/pro/superman.webp'),
  'tricep-dips': require('@/assets/images/exercises/pro/tricep-dips.webp'),
  'v-crunch': require('@/assets/images/exercises/pro/v-crunch.webp'),
  'wide-push-ups': require('@/assets/images/exercises/pro/wide-push-ups.webp'),
};

/** Shown wherever a Pro demonstration is displayed. */
export const PRO_DEMO_CREDIT = 'Photo demonstration · free-exercise-db (public domain)';

/** How many of the app's exercises have a Pro demonstration. */
export const PRO_DEMO_COUNT = Object.keys(PRO_DEMOS).length;

/**
 * The Pro demonstration for an exercise, or `undefined` when there isn't one.
 *
 * Callers must pass `pro` from the entitlement layer — this function is the only
 * place a Pro asset can enter the UI, so a Free or Smart account can never be
 * handed one by accident.
 */
export const proDemo = (id: string | undefined, pro: boolean): number | undefined => (pro && id ? PRO_DEMOS[id] : undefined);

/** True when this exercise would show a Pro demonstration for a Pro account. */
export const hasProDemo = (id: string | undefined) => !!(id && PRO_DEMOS[id]);
