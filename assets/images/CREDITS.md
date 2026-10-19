# Image credits

- `home-hero.jpg` — "Woman exercising with dumbbell in a bright living" by Shixart1985, via Wikimedia Commons, licensed under [CC BY 2.0](https://creativecommons.org/licenses/by/2.0). Resized and compressed.
  Source: https://commons.wikimedia.org/wiki/File:Woman_exercising_with_dumbbell_in_a_bright_living.jpg
- `welcome-bg.jpg` — "Diana fitness work" by Filip Mroz, via Wikimedia Commons, released under [CC0](https://creativecommons.org/publicdomain/zero/1.0/) (public domain). Resized and compressed.
  Source: https://commons.wikimedia.org/wiki/File:Diana_fitness_work.jpg

## Onboarding imagery

- `onboarding/*.webp` — original images generated with OpenAI image generation (via Codex) for Fittelo's onboarding, modelled on the reference onboarding storyboard. No real people, third-party likeness or branding. Resized and compressed to WebP.

## Trainer portraits

- `trainers/*.webp` — original images generated with OpenAI image generation for Fittelo's Pro coaching
  feature, in the same style and pipeline as the onboarding imagery above. No real people, third-party
  likeness or branding; the coaches they depict are fictional. Resized and compressed to WebP.
  `trainers/arjun-mehta.webp` is the same asset as `onboarding/coach.webp`.

## Level up card photography

- `focus/*.webp` — original images generated with OpenAI image generation via Codex for Fittelo's
  "Level up" carousel, using the prompts and personas in `scripts/level-up-photos/README.md`. No real
  people, third-party likeness or branding; the athletes are fictional. Cropped, resized and
  compressed to WebP with `scripts/level-up-photos/optimize.py`.

## Workout card photography

- `workouts/*.webp` — original images generated with OpenAI image generation via Codex (`codex exec`,
  `image_generation` feature) for the "Train with a coach" cards and workout detail heroes, from the prompts in
  `scripts/workout-photos/README.md`. Each coach's two images were made in one session, the second using the
  first as its identity reference. No real people, third-party likeness or branding; the coaches are
  fictional. Cropped and compressed to WebP by `scripts/workout-photos/optimize.py`.

## Today's workout card photography

- `programs/*.webp` — original images generated with OpenAI image generation via Codex (`codex exec`,
  `image_generation` feature) for the 30-day program's "Today's workout" card and program day detail hero,
  from the prompts in `scripts/today-workout-photos/README.md`. Each athlete was generated with their
  existing "Level up" / "Train with a coach" photo attached as the identity reference. No real people,
  third-party likeness or branding; the athletes are fictional. Cropped and compressed to WebP by
  `scripts/today-workout-photos/optimize.py`.

## Target an area tile photography

- `areas/*.webp`, plus `focus/{abs-beginner,chest-beginner,arm-toning,back-relief}-hero.webp` — original
  images generated with OpenAI image generation via Codex (`codex exec`, `image_generation` feature) for
  the "Target an area" session tiles and the detail heroes of the sessions that had no photo, from the
  prompts in `scripts/area-photos/README.md`. Each athlete was generated with their existing "Level up" /
  "Train with a coach" photo attached as the identity reference. No real people, third-party likeness or
  branding; the athletes are fictional. Cropped and compressed to WebP by `scripts/area-photos/optimize.py`.

## Exercise animations

- `exercises/*.webp` and `exercises/anim/*.webp` — exercise animations and their opening still frames.
  **© Gym visual — https://gymvisual.com/**
  Sourced from the [exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) repository (`videos/`,
  dataset text MIT-licensed), where the media is redistributed with the rights holder's permission at 180x180.
  Converted from GIF to animated WebP, background keyed to transparency and trimmed; resolution is not increased
  beyond the 180px the rights holder permits, and this attribution must stay intact wherever the media is used.
  The media itself remains Gym visual's property and is governed by their
  [Terms & Conditions of Use](https://gymvisual.com/content/3-terms-and-conditions-of-use) — using it in a shipped
  product needs a licence obtained directly from Gym visual.

### Which dataset clip each exercise uses

Recovered by matching every shipped still against the dataset's thumbnails, so nobody has to guess
again. The number is the dataset's own exercise id (`videos/<id>.gif`).

| exercise id | dataset clip | exercise id | dataset clip |
| --- | --- | --- | --- |
| `abdominal-crunches` | 0274 crunch floor | `leg-raises` | 0620 lying leg raise flat bench |
| `bent-leg-twist` | 3639 bent knee lying twist | `lunges` | 3470 forward lunge |
| `bicycle-crunches` | 0003 air bike | `mountain-climber` | 0630 mountain climber |
| `burpees` | 1160 burpee | `plank` | 2135 weighted front plank |
| `cobra-stretch` | 1366 upward facing dog | `push-ups` | 0662 push-up |
| `cross-arm-crunches` | 3679 sit-up with arms on chest | `reverse-crunches` | 0872 reverse crunch |
| `dead-bug` | 0276 dead bug | `russian-twist` | 0687 russian twist |
| `flutter-kicks` | 0459 flutter kicks | `side-plank` | 0705 side bridge v. 2 |
| `glute-bridge` | 3013 low glute bridge on floor | `squats` | 3119 potty squat |
| `heel-touch` | 0006 alternate heel touchers | `superman` | 1352 lower back curl |
| `jumping-jacks` | 3220 astride jumps | `tricep-dips` | 0129 bench dip (knees bent) |
| `v-crunch` | 0507 jackknife sit-up | `wide-push-ups` | 1311 wide hand push up |

`spine-twist` has no clip of its own and deliberately reuses `bent-leg-twist`: the dataset's own
`2329 spine twist` is a *seated* twist, and its supine knee-across clips have a partner pushing the
knee down.

Four of these are the closest the dataset offers rather than an exact depiction, and are kept only
because there is nothing better in it: `flutter-kicks` (0459 is prone on a bench, a glute flutter,
where ours is supine on the floor), `plank` (2135 has weight plates resting on the lower back),
`leg-raises` (0620 is performed on a bench, ours on the floor) and `superman` (1352 lifts only the
chest, with the arms by the sides).

## Pro exercise demonstrations

- `exercises/pro/*.webp` — photographs of a real athlete from
  [free-exercise-db](https://github.com/yuhonas/free-exercise-db), released into the public domain
  under the Unlicense: commercial use, modification and redistribution are all permitted and no
  attribution is required. We show a credit line anyway (`PRO_DEMO_CREDIT`), because the dedication
  is the aggregator's, made over third-party gym photography they collected.
  Each file is built from that exercise's two photographs (`exercises/<id>/0.jpg` and `/1.jpg`),
  cropped to a common square, held and cross-faded — no synthesised motion. `src/data/proDemos.ts`
  records which source exercise each one comes from, and which of the app's exercises deliberately
  have no Pro demonstration because the repository has no genuine match.
