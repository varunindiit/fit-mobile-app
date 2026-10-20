# "Select Training Plan" card photography

The expanded card of the **Select Training Plan** accordion (`PlanAccordion`, on the select-plan screen
and in onboarding) shows the program's athlete full height on its right side, under a scrim in the
program colour that clears towards them (the same treatment as the "Today's workout" card). Photos live in
`assets/images/plans/<id>.webp` and are wired up in `PLAN_PHOTO` (`src/components/glyphs.ts`), keyed by
program id. A program without one keeps the mascot artwork (`PROGRAM_ART`).

## Pipeline

1. Generate one image per row below with OpenAI image generation via the Codex CLI bundled with the
   ChatGPT app (`codex exec --enable image_generation ...`), square 1024x1024. Attach the persona's
   existing photo as an identity reference with `-i <ref>.png` and pass the prompt on stdin (`-` as the
   prompt argument). The references used: `focus/leg-day-hero` (Meera), `focus/intense-shred-hero`
   (Rohit), `focus/rock-hard-hero` (Vikram), converted to PNG. Each program keeps the persona of its
   "Today's workout" photo (`scripts/today-workout-photos/README.md`).
2. Save each result as `<id>.png` in a scratch folder (`belly.png`, `abs.png`, `sixpack.png`).
3. `python3 scripts/plan-photos/optimize.py <scratch folder>` — writes a 3:4 portrait crop centred on
   the athlete (`CENTRE_X`, 600x800) as optimised WebP into `assets/images/plans/`.
4. Add the generation to `assets/images/CREDITS.md`.

Reject and regenerate anything with distorted hands or faces, wrong limb counts, visible text or logos.

## Prompt

Each prompt is: an instruction to use the attached photo as the identity reference + *persona block*
(from `scripts/level-up-photos/README.md`) + *scene* + the style suffix below.

> Dark premium gym interior: charcoal and warm stone-grey concrete walls, light-oak slat panelling,
> black rubber floor, blurred equipment far behind. Photorealistic editorial fitness photography, shot
> on an 85mm lens at f/2.0, shallow depth of field, cinematic directional key light with a warm rim
> light and a warm colour grade, realistic skin texture and natural facial detail, anatomically correct
> natural body proportions, natural five-fingered hands, sharp focus on the subject. Portrait framing
> for a small CIRCULAR avatar crop: the athlete is perfectly centred horizontally, framed from the head
> to mid-thigh, head near the top with a little headroom, torso and waist at the exact centre of the
> frame, nothing important near the corners. Square 1:1, 1024x1024. No text, no logos, no watermarks,
> no brand marks, no extra limbs, no distorted hands or faces.

The prompt still asks for a circular-avatar framing because the photos first shipped in a 96pt disc.
That framing also suits the right-hand card panel.

| id (program) | persona | scene |
| --- | --- | --- |
| `belly` (Lose Belly Fat) | Meera K. | Standing facing the camera, wrapping a yellow fabric measuring tape around her toned bare waist with both hands, checking her progress with a proud bright smile. |
| `abs` (Rock Hard Abs) | Rohit S. | Standing facing the camera with his arms crossed over his chest, confident relaxed half-smile, toned arms and shoulders, a light sheen of sweat after a core workout. |
| `sixpack` (Six Pack Abs) | Vikram M. | Standing facing the camera, lifting the hem of his tank with one hand to reveal deeply defined six-pack abdominals, other arm relaxed at his side, intense confident expression. |
