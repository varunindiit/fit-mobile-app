# "Train with a coach" card photography

The eight cards in the **Train with a coach** grid (`src/app/(tabs)/fitness.tsx`) show a photo
header. Photos live in `assets/images/workouts/<workout id>.webp` and are wired up in
`WORKOUT_PHOTO` (`src/components/glyphs.ts`). A workout with no photo falls back to its tinted
colour tile with the mascot artwork, so the grid never breaks while the set is incomplete.

## Pipeline

1. Generate one image per workout id with an image model (the rest of the app's imagery was made
   with OpenAI image generation via Codex — `assets/images/CREDITS.md`). Use the prompts below
   verbatim: the **persona block** is what keeps a coach's face and kit identical across the two
   cards they appear on. Ask for landscape 4:3, at least 1024px wide.
2. Save each result as `<workout id>.(png|jpg)` in a scratch folder.
3. `python3 scripts/workout-photos/optimize.py <scratch folder>` — centre-crops to the card's
   1.14:1 header, resizes to 640px wide and writes optimised WebP into `assets/images/workouts/`.
   It prints the exact `WORKOUT_PHOTO` lines to paste into `src/components/glyphs.ts`.
4. Add the generation to `assets/images/CREDITS.md`.

Reject and regenerate anything with distorted hands or faces, wrong limb counts, visible text or
logos, or a pose that does not match the workout.

## Shared style suffix

> Photorealistic editorial fitness photography, shot on an 85mm lens at f/2.0, shallow depth of
> field, soft natural daylight with a warm colour grade, warm stone-grey and light-oak surroundings
> that match a warm neutral app palette, sharp focus on the subject, anatomically correct natural
> body proportions, full body in frame with headroom, subject slightly left of centre with clean
> negative space on the right, landscape 4:3. No text, no logos, no watermarks, no brand marks, no
> extra limbs, no distorted hands or faces.

## Personas

- **Anjali R.** (`morning-yoga`, `power-yoga`) — Indian woman, about 30, warm light-brown skin, long
  dark hair in a low bun, heather-grey racerback tank top, charcoal leggings, barefoot.
- **Rohit S.** (`fat-burn-hiit`, `core-blast`) — Indian man, about 32, lean athletic build, short
  black hair, neatly trimmed short beard, fitted black performance t-shirt, grey training shorts.
- **Vikram M.** (`full-body-strength`, `cycling`) — Indian man, about 35, muscular build, very short
  cropped black hair, clean shaven, navy sleeveless training tank, black shorts.
- **Meera K.** (`dance-cardio`) — Indian woman, about 27, dark hair in a high ponytail, magenta crop
  top, black leggings, white trainers.
- **Self-paced** (`brisk-walk`) — Indian woman in her early thirties, dark hair in a high ponytail,
  sage-green long-sleeve athletic top, black leggings, white walking trainers.

## Prompts

Each prompt is: *persona block* + *scene* + *shared style suffix*.

| workout id | scene |
| --- | --- |
| `morning-yoga` | Seated cross-legged on a slate-grey mat in a side stretch, right arm raised overhead in a graceful arc, left hand on the mat, eyes closed, serene. Bright yoga studio at sunrise, light oak floor, tall windows with golden morning light, a few green plants far behind. |
| `power-yoga` | Standing in Warrior II, front knee at 90°, arms extended level, strong focused gaze. Same yoga studio later in the morning, brighter and cooler light, mat on light oak floor. |
| `fat-burn-hiit` | Mid high-intensity interval: exploding upward out of a squat jump, arms driving back, feet just off the floor, determined expression. Premium gym, warm stone-grey concrete walls, light oak accents, black rubber floor, blurred dumbbell rack behind. |
| `core-blast` | Holding a forearm plank on a slate-grey mat, body in one straight line, core braced, looking at the floor just ahead. Same premium gym, floor-level camera, warm window light. |
| `full-body-strength` | Performing a dumbbell goblet squat, one dumbbell held vertically at the chest with both hands, thighs parallel to the floor, chest up, neutral spine. Premium gym with light oak slat panelling and a blurred dumbbell rack. |
| `cycling` | Riding out of the saddle on a premium indoor spin bike, hands on the bars, focused. Indoor cycling studio, dark warm walls, a row of blurred bikes behind, warm spot lighting. |
| `dance-cardio` | Mid dance-cardio move, one arm raised, hips turned, hair in motion, joyful laughing expression. Bright dance studio with a light oak floor, mirrored wall softly blurred, warm daylight. |
| `brisk-walk` | Mid-stride on a brisk power walk, arms swinging naturally, upright posture, relaxed happy expression looking ahead. Wide tree-lined park path on a clear morning, golden backlight through the leaves, background softly blurred. |
