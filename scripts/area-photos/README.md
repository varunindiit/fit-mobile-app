# "Target an area" tile photography

Each session row in the **Target an area** list (`src/app/(tabs)/fitness.tsx`) shows a square
athlete photo in its 52pt tile, framed on the muscle group the session works. Photos live in
`assets/images/areas/<name>.webp` and are wired up in `AREA_PHOTO` (`src/components/glyphs.ts`),
keyed by the focus session key. A session without one keeps its gradient + artwork tile.

Every session gets its own shot, different from its "Level up" card: both sit on the Training tab,
so reusing the card photo would show the same image twice on one screen. The four sessions that had
no photo at all (`abs-beginner`, `chest-beginner`, `arm-toning`, `back-relief`) also get a 3:2
detail hero from the same image (`FOCUS_HERO`), so tapping a photo tile never lands on an
artwork hero.

## Pipeline

1. Generate one image per row below with OpenAI image generation via the Codex CLI bundled with the
   ChatGPT app (`codex exec --enable image_generation ...`), landscape 1536x1024. Attach the
   persona's existing photo as an identity reference with `-i <ref>.png` and pass the prompt on
   stdin (`-` as the prompt argument). The references used: `focus/rock-hard-hero` (Vikram),
   `focus/intense-shred-hero` (Rohit), `focus/leg-day-hero` (Meera), `workouts/power-yoga-hero`
   (Anjali), converted to PNG. Each session keeps the persona of its "Level up" card.
2. Save each result as `<name>.png` in a scratch folder.
3. `python3 scripts/area-photos/optimize.py <scratch folder>` — writes the tile (square crop on the
   target muscle via `TILE_CROP`, 168px) and, for the four sessions in `HERO_FOR`, the detail hero
   (3:2, 1170px wide) as optimised WebP.
4. Add the generation to `assets/images/CREDITS.md`.

Reject and regenerate anything with distorted hands or faces, wrong limb counts, visible text or
logos, or a pose that does not work the session's body part.

## Prompt

Each prompt is: an instruction to use the attached photo as the identity reference + *persona
block* (from `scripts/level-up-photos/README.md` / `scripts/workout-photos/README.md`) + *scene* +
the style suffix below.

> Dark premium gym interior: charcoal and warm stone-grey concrete walls, light-oak slat panelling,
> black rubber floor, blurred equipment far behind. Photorealistic editorial fitness photography,
> shot on an 85mm lens at f/2.0, shallow depth of field, cinematic directional key light with a warm
> rim light and a warm colour grade, realistic skin texture and natural facial detail, anatomically
> correct natural body proportions, natural five-fingered hands, sharp focus on the subject. The
> athlete is centred in the frame and fills most of its height, with the target muscle group at the
> visual centre, so the image still reads when cropped to a small centred square. Landscape 3:2,
> 1536x1024. No text, no logos, no watermarks, no brand marks, no extra limbs, no distorted hands or
> faces.

It is the "Level up" suffix with the athlete centred instead of on the right third, so the tiles
share the carousel's lighting and grade.

| name (session · area) | persona | scene |
| --- | --- | --- |
| `abs-beginner` (Abs Beginner · Abs) | Anjali R. | Lying on her back on a slate-grey mat performing a basic abdominal crunch: knees bent, feet flat, fingertips lightly behind her ears, shoulders lifted off the mat, abdominals visibly engaged, calm focused expression. Side-on camera just above mat height. |
| `rock-hard` (Rock-Hard Six Packs · Abs) | Vikram M. | Lying on his back on a slate-grey mat performing a lying leg raise: both legs straight and lifted together to about 60 degrees, hands flat beside his hips, head resting down, the tank ridden up to show deeply defined six-pack abdominals braced hard. Side-on camera at mat height. |
| `stronger-abs` (Stronger Abs Shape & Blast · Abs) | Meera K. | Holding a strong side plank on her right forearm on a slate-grey mat, elbow under the shoulder, body in one straight line from head to stacked feet, left hand on her hip, the cropped top showing toned defined obliques and abs, steady focused expression, facing the camera. |
| `chest-beginner` (Chest Beginner · Chest) | Anjali R. | At the bottom of a clean push-up on a slate-grey mat, hands slightly wider than the shoulders, elbows at about 45 degrees, body in one straight line from head to heels, chest just above the mat, chest and shoulders engaged. Side-on camera at floor level. |
| `chest-dumbbell` (Chest Dumbbell Circuit · Chest) | Vikram M. | Lying on a flat black weight bench performing a dumbbell chest fly at the stretched bottom position: a hexagonal dumbbell in each hand, arms wide open with a soft bend at the elbows, palms facing up, chest broad and stretched, feet flat on the floor, natural five-fingered grips. Camera slightly above and to the side, chest and both dumbbells clearly visible. |
| `arm-toning` (Arm Toning · Arm) | Meera K. | Performing a bench tricep dip off the edge of a flat black weight bench: hands gripping the bench edge behind her hips with fingers forward, elbows bent to 90 degrees pointing straight back, knees bent with heels on the floor, toned triceps and shoulders clearly defined, determined expression. Side-on camera at bench height. |
| `leg-day` (Leg Day Burner · Leg) | Meera K. | Holding the bottom of a deep bodyweight squat: feet shoulder-width apart, thighs parallel to the floor, knees tracking over the toes, chest tall, arms extended straight forward for balance, strong defined quadriceps and glutes, steady expression. Side-on three-quarter camera at hip height, full body in frame. |
| `back-relief` (Back Strength & Relief · Back) | Anjali R. | Lying face down on a slate-grey mat in a superman back extension: arms extended straight forward, chest, arms and straight legs lifted a few inches off the mat at the same time, gaze down with a neutral neck, the long muscles of her back visibly engaged. Side-on camera at mat height. |
| `intense-shred` (Intense Shred · Full body) | Rohit S. | Mid mountain climber in a high plank: hands under the shoulders, right knee driven forward toward the chest, left leg extended straight back, hips level with the shoulders, whole body working, a light sheen of sweat, intense expression. Side-on camera at floor level. |
| `ultimate-core` (Ultimate Abs & Core Blast · Full body) | Rohit S. | At the top of a two-handed kettlebell swing: standing tall with hips and knees fully extended, glutes squeezed, core braced, both straight arms holding a heavy black kettlebell out at chest height, feet just wider than the shoulders, focused expression. Side-on three-quarter camera, full body in frame. |
