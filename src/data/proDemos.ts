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
 * into the public domain under the Unlicense (`LICENSE.md`). No attribution is
 * required; we carry `PRO_DEMO_CREDIT` anyway and show it on the demonstration
 * surface, because the dedication is the aggregator's, over third-party gym
 * photography.
 *
 * Build recipe, should one of these ever need rebuilding: both poses are cropped with
 * the *same* square box on the 850x567 source photo (that is the registration; where the
 * camera moved between the two shots, pose B's box is offset by the measured shift),
 * scaled to 320x320, and encoded as an animated WebP of 12 frames — frame 0 holds pose A,
 * 1-5 ease across, frame 6 holds pose B, 7-11 ease back — with durations
 * [520, 55, 55, 55, 55, 55, 520, 55, 55, 55, 55, 55] ms, a smoothstep ease and an
 * infinite loop. Note `ffprobe` cannot read animated WebP; verify by parsing the RIFF
 * chunks or by decoding with Pillow.
 *
 * An exercise is listed here only when the source photographs genuinely show that
 * movement. Anything missing falls back to the standard animation at runtime
 * (`proDemo()` returns undefined), which is why this map is smaller than `EXERCISES`.
 */

/** Each entry's source exercise in free-exercise-db: its photographs are `exercises/<id>/0.jpg` and `/1.jpg`. */
export const PRO_DEMOS: Record<string, number> = {
  'abdominal-crunches': require('@/assets/images/exercises/pro/abdominal-crunches.webp'), // Crunches
  'bicycle-crunches': require('@/assets/images/exercises/pro/bicycle-crunches.webp'), // Cross-Body_Crunch — Air_Bike is the textbook bicycle crunch by name, but both its photographs are symmetric, so the loop showed no rotation at all
  'flutter-kicks': require('@/assets/images/exercises/pro/flutter-kicks.webp'), // Scissor_Kick — the same supine alternating kick; the athlete's arms rest at his sides rather than under his hips
  'glute-bridge': require('@/assets/images/exercises/pro/glute-bridge.webp'), // Pelvic_Tilt_Into_Bridge — Butt_Lift_Bridge photographs the hips already raised in both frames, so there was no lift to see
  'heel-touch': require('@/assets/images/exercises/pro/heel-touch.webp'), // Alternate_Heel_Touchers
  'leg-raises': require('@/assets/images/exercises/pro/leg-raises.webp'), // Flat_Bench_Lying_Leg_Raise — right movement, but performed on a bench where our instructions say floor. The db has no floor version.
  'lunges': require('@/assets/images/exercises/pro/lunges.webp'), // Bodyweight_Walking_Lunge — the camera moved 47px between the two shots, so pose B's crop box is offset to match; without that the whole gym slides through the cross-fade
  'plank': require('@/assets/images/exercises/pro/plank.webp'), // Plank — a single still, not a loop: the hold has no second pose, and the db's other photograph is the kneeling set-up, which would have read as a repetition.
  'push-ups': require('@/assets/images/exercises/pro/push-ups.webp'), // Pushups
  'reverse-crunches': require('@/assets/images/exercises/pro/reverse-crunches.webp'), // Reverse_Crunch
  'russian-twist': require('@/assets/images/exercises/pro/russian-twist.webp'), // Russian_Twist — right movement, but the athlete holds a weight plate where we assume bodyweight
  'side-plank': require('@/assets/images/exercises/pro/side-plank.webp'), // Side_Bridge
  'spine-twist': require('@/assets/images/exercises/pro/spine-twist.webp'), // Knee_Across_The_Body
  'squats': require('@/assets/images/exercises/pro/squats.webp'), // Bodyweight_Squat
  'superman': require('@/assets/images/exercises/pro/superman.webp'), // Superman
  'tricep-dips': require('@/assets/images/exercises/pro/tricep-dips.webp'), // Bench_Dips
  'v-crunch': require('@/assets/images/exercises/pro/v-crunch.webp'), // Jackknife_Sit-Up
  'wide-push-ups': require('@/assets/images/exercises/pro/wide-push-ups.webp'), // Push-Up_Wide
};

/**
 * Deliberately absent, so nobody re-adds them from the same source:
 * - `burpees`, `cobra-stretch` — free-exercise-db has no burpee, squat thrust or cobra at all.
 * - `jumping-jacks` — the nearest, `Star_Jump`, starts in a half-squat with the feet already
 *   apart and ends airborne. A jack starts standing tall with the feet together.
 * - `bent-leg-twist` — no supine both-knees-together rotation in the db; the near misses are
 *   seated, single-leg static holds, partner-assisted or loaded.
 * - `cross-arm-crunches` — nothing has knees bent, feet on the floor *and* arms crossed on the
 *   chest: `Frog_Sit-Ups` has butterfly legs, `Tuck_Crunch` has the legs in the air, `Janda_Sit-Up`
 *   photographs the hands behind the head.
 * - `dead-bug` — the db's two `Dead_Bug` photographs are both the start position: neither shows
 *   the contralateral arm and leg extending, which is the whole movement.
 * - `mountain-climber` — in `Mountain_Climbers` the hips ride well above the shoulder-heel line
 *   (our own listed common mistake) and the same leg is forward in both photographs.
 */

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
