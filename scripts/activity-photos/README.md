# "Log activity" tile photography

Each activity in the **Log activity** sheet (`src/app/(tabs)/fitness.tsx`) shows a square athlete
photo in its 58pt tile and in the kcal summary below the grid; manual log rows on the Training tab
use the same photo. Photos live in `assets/images/activities/<id>.webp` and are wired up in
`ACTIVITY_PHOTO` (`src/components/glyphs.ts`), keyed by the activity id in `ACTIVITIES`
(`src/data/fitness.ts`). An activity without one keeps its emoji glyph.

## Pipeline

1. Generate one image per row below with OpenAI image generation via the Codex CLI bundled with the
   OpenAI VS Code extension (`codex exec --enable image_generation --skip-git-repo-check -i <ref>.png - < prompt.txt`),
   square 1024x1024. Attach the persona's existing photo (converted to PNG) as the identity reference.
2. Save each result as `<id>.png` in a scratch folder.
3. `python3 scripts/activity-photos/optimize.py <scratch folder>` — writes the 180px square tile
   (crop per source via `TILE_CROP`) as optimised WebP into `assets/images/activities/`.
4. Add the generation to `assets/images/CREDITS.md`.

Reject and regenerate anything with distorted hands or faces, wrong limb counts, visible text or
logos, or equipment (bat, racket, bike) clipped out of the square.

## Prompt

Each prompt is: an instruction to use the attached photo only as the identity reference + *persona
block* (from `scripts/workout-photos/README.md`, kit overridden per sport) + *scene* + the style below.

> Photorealistic editorial fitness photography, shot on an 85mm lens at f/2.0, shallow depth of field, soft natural light with a warm colour grade, realistic skin texture and natural facial detail, anatomically correct natural body proportions, natural five-fingered hands, sharp focus on the subject. Square 1:1 composition, 1024x1024. The person and their equipment are centred and fill about 85% of the frame height with a simple softly blurred background, so the activity still reads instantly when the image is shown as a tiny 58-point square thumbnail. No text, no logos, no watermarks, no brand marks, no numbers on clothing, no extra limbs, no distorted hands or faces.

| id | persona | reference | scene |
| --- | --- | --- | --- |
| `walking` | Self-paced | `workouts/brisk-walk-hero` | Brisk walking on a tree-lined park path in soft morning light, mid-stride, arms swinging naturally, relaxed confident smile. Three-quarter front camera at hip height, full body in frame. |
| `running` | Rohit S. | `focus/intense-shred-hero` | Wearing a fitted black performance t-shirt and grey running shorts with running shoes. Running on an outdoor terracotta athletics track in golden early-morning light, mid-stride with one foot off the ground, arms driving, focused expression. Side-on three-quarter camera, full body in frame. |
| `cycling` | Vikram M. | `focus/rock-hard-hero` | Wearing a navy fitted cycling jersey, black cycling shorts and a plain matte-black helmet with the face clearly visible. Riding a plain matte-grey road bicycle along an open road at sunrise, hands on the handlebars, pedalling, the whole bicycle and rider visible. Side-on camera, full bike and rider in frame. |
| `yoga` | Anjali R. | `workouts/power-yoga-hero` | Sitting cross-legged in a calm meditation pose (sukhasana) on a slate-grey yoga mat in a bright airy yoga studio with light-oak floor, back straight, hands resting on her knees in a mudra, eyes gently closed, serene expression. Front camera at chest height, full body in frame. |
| `swimming` | Rohit S. | `focus/intense-shred-hero` | Wearing a plain black swim cap and clear swim goggles pushed up on the forehead so the face is visible. Swimming freestyle in a bright clear-blue indoor pool, one arm reaching forward out of the water mid-stroke, head turned to breathe, water splashing around him. Camera at water level, three-quarter front view. |
| `badminton` | Meera K. | `focus/leg-day-hero` | Wearing a magenta sports t-shirt, black sports shorts and white court shoes. Playing badminton on an indoor wooden court with a green court mat, mid-smash with a plain white badminton racket raised overhead and a white feather shuttlecock just above the racket, athletic jumping pose. Three-quarter front camera, full body, racket and shuttlecock clearly visible. |
| `cricket` | Vikram M. | `focus/rock-hard-hero` | Wearing plain white cricket clothes, white batting pads and batting gloves, no helmet so the face is visible. Batting in the cricket nets on a green outdoor ground in warm afternoon light, playing a confident front-foot drive with a plain unbranded wooden cricket bat, a red leather cricket ball near the bat. Three-quarter front camera, full body, bat and ball clearly visible. |
| `gym` | Meera K. | `focus/leg-day-hero` | Wearing a magenta cropped training top, black leggings and white trainers. In a modern gym with light-oak and stone-grey walls, standing tall performing a dumbbell shoulder press with a hexagonal black dumbbell in each hand pressed overhead, toned arms and shoulders, focused determined expression. Front three-quarter camera, full body in frame. |
