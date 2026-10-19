# "Today's workout" card photography

The **Today's workout** card (`ChallengeCard`, on the Home and Training tabs) shows the 30-day
program's athlete photo on its right side, under a scrim in the card's own surface colour, so the day number, chips,
journey strip and start button sit exactly where they did with the mascot. Photos live in
`assets/images/programs/<name>.webp` and are wired up in `PROGRAM_PHOTO`
(`src/components/glyphs.ts`), keyed by program id, plus `rest` for rest days (`programPhoto()` picks the
right one from a `program:<id>:<day>` key). The same photo at full-screen 3:2 (`<name>-hero.webp`,
`PROGRAM_HERO`) is the hero of the program day detail screen (`src/app/program-day.tsx`). A card
without a photo keeps the floating mascot artwork.

## Pipeline

1. Generate one image per row below with OpenAI image generation via the Codex CLI bundled with the
   ChatGPT app (`codex exec --enable image_generation ...`), landscape 1536x1024. Attach the
   persona's existing photo as an identity reference with `-i <ref>.png` and pass the prompt on
   stdin (`-` as the prompt argument). The **persona block** and the reference are what keep a model's face and kit
   identical to the "Level up" and "Train with a coach" cards. The references used:
   `focus/leg-day-hero` (Meera), `focus/intense-shred-hero` (Rohit), `focus/rock-hard-hero` (Vikram),
   `workouts/power-yoga-hero` (Anjali), converted to PNG.
2. Save each result as `<name>.png` in a scratch folder (`belly.png`, `abs.png`, `sixpack.png`, `rest.png`).
3. `python3 scripts/today-workout-photos/optimize.py <scratch folder>` — writes the card (0.9:1 crop
   centred on the athlete via `FOCUS_X`, 720px wide) and the detail hero (3:2, 1170px wide) as
   optimised WebP into `assets/images/programs/`.
4. Add the generation to `assets/images/CREDITS.md`.

Reject and regenerate anything with distorted hands or faces, wrong limb counts, visible text or
logos, or a pose that does not match the program.

## Shared style suffix

The "Level up" suffix (`scripts/level-up-photos/README.md`), verbatim, so the dark card and the
carousel below it share one lighting and colour grade:

> Dark premium gym interior: charcoal and warm stone-grey concrete walls, light-oak slat panelling,
> black rubber floor, blurred equipment far behind. Photorealistic editorial fitness photography,
> shot on an 85mm lens at f/2.0, shallow depth of field, cinematic directional key light with a warm
> rim light and a warm colour grade, realistic skin texture and natural facial detail, anatomically
> correct natural body proportions, sharp focus on the subject, subject placed on the right third of
> the frame with clean uncluttered dark negative space filling the left half, landscape 3:2. No text,
> no logos, no watermarks, no brand marks, no extra limbs, no distorted hands or faces.

## Prompts

Each prompt is: *persona block* (from `scripts/level-up-photos/README.md` /
`scripts/workout-photos/README.md`) + *scene* + *shared style suffix*.

| name (program) | persona | scene |
| --- | --- | --- |
| `belly` (Lose Belly Fat) | Meera K. | Caught at the top of a jumping jack: arms raised overhead in a wide V with open relaxed hands, feet landing wide apart just off the floor, upright posture, bright energetic smile, a light sheen of sweat. Full body in frame with headroom. |
| `abs` (Rock Hard Abs) | Rohit S. | Seated on a slate-grey mat performing a Russian twist: knees bent, both feet lifted just off the mat, torso leaning back at about 45 degrees with a long straight back, hands clasped together and rotated to his right beside the hip, core braced, focused expression. Camera at mat height, slightly side-on. |
| `sixpack` (Six Pack Abs) | Vikram M. | Holding the top of a V-crunch on a slate-grey mat: balanced on his glutes, legs straight and lifted at about 45 degrees, torso lifted to meet them, both arms reaching straight forward alongside the shins, tank lifted slightly to show deeply defined abdominals, jaw set with intense focus. Camera at mat height, side-on. |
| `rest` (any program's rest day) | Anjali R. | Rest and recovery day: seated cross-legged on a slate-grey mat in a gentle seated spinal twist, torso turned toward the camera, right hand resting on her left knee, left hand on the mat behind her, eyes softly closed, calm relaxed half-smile; a rolled white towel and a plain unbranded steel water bottle on the floor beside the mat. Softer, calmer light than a workout. |
