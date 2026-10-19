# "Level up" card photography

The six cards in the **Level up** carousel (`src/app/(tabs)/fitness.tsx`) show an athlete photo
behind the card's brand gradient: solid brand colour on the left under the title, clearing to the
photo on the right. Photos live in `assets/images/focus/<name>.webp` and are wired up in
`FOCUS_PHOTO` (`src/components/glyphs.ts`), keyed by the focus session key. A session with no photo
keeps the gradient + mascot artwork card, so the carousel never breaks while the set is incomplete.

## Pipeline

1. Generate one image per row below with OpenAI image generation via Codex (same as the rest of the
   app's imagery — `assets/images/CREDITS.md`). Use the prompts verbatim: the **persona block** is
   what keeps a model's face and kit identical across the two cards they appear on. Ask for
   landscape 3:2, at least 1536px wide. From the terminal, the Codex CLI bundled with the ChatGPT
   app does this non-interactively (`codex exec --enable image_generation ...`). For a persona's
   second card, attach their first card as an identity reference with `-i <first>.png` and pass
   the prompt on stdin (`-` as the prompt argument): `-i` is variadic and would otherwise swallow
   the prompt as another image path.
2. Save each result as `<name>.(png|jpg)` in a scratch folder (`rock-hard.png`, ...).
3. `python3 scripts/level-up-photos/optimize.py <scratch folder>` — crops to the card's 1.6:1
   ratio (keeping the right side, where the athlete is), resizes to 720px wide and writes optimised
   WebP into `assets/images/focus/`. It prints the exact `FOCUS_PHOTO` lines to paste into
   `src/components/glyphs.ts`.
4. Add the generation to `assets/images/CREDITS.md`.

Reject and regenerate anything with distorted hands or faces, wrong limb counts, visible text or
logos, a pose that does not match the workout, or an athlete in the left half of the frame (the
title sits there).

## Shared style suffix

> Dark premium gym interior: charcoal and warm stone-grey concrete walls, light-oak slat panelling,
> black rubber floor, blurred equipment far behind. Photorealistic editorial fitness photography,
> shot on an 85mm lens at f/2.0, shallow depth of field, cinematic directional key light with a warm
> rim light and a warm colour grade, realistic skin texture and natural facial detail, anatomically
> correct natural body proportions, sharp focus on the subject, subject placed on the right third of
> the frame with clean uncluttered dark negative space filling the left half, landscape 3:2. No text,
> no logos, no watermarks, no brand marks, no extra limbs, no distorted hands or faces.

## Personas

Same cast as the "Train with a coach" cards (`scripts/workout-photos/README.md`), so the two
sections read as one app.

- **Vikram M.** (`rock-hard`, `chest-dumbbell`) — Indian man, about 35, muscular athletic build,
  very short cropped black hair, clean shaven, navy sleeveless training tank, black training shorts.
- **Rohit S.** (`intense-shred`, `ultimate-core`) — Indian man, about 32, lean athletic build, short
  black hair, neatly trimmed short beard, fitted black performance t-shirt, grey training shorts.
- **Meera K.** (`stronger-abs`, `leg-day`) — Indian woman, about 27, athletic build, dark hair in a
  high ponytail, magenta cropped training top, black leggings, white trainers.

## Prompts

Each prompt is: *persona block* + *scene* + *shared style suffix*.

| name (session) | scene |
| --- | --- |
| `rock-hard` (Rock-Hard Six Packs) | Stands tall and squared to camera mid-set, a heavy black kettlebell held in each hand at his sides, shoulders down, deeply defined abdominals visible through the fitted tank, jaw set with intense focus. |
| `intense-shred` (Intense Shred) | Caught mid burpee at the top of the jump: exploding upward, both feet just off the floor, arms driving overhead, body fully extended, determined expression, a faint sheen of sweat. |
| `stronger-abs` (Stronger Abs Shape & Blast) | Lying on a slate-grey mat performing a controlled bicycle crunch: shoulders lifted, right elbow rotating toward the raised left knee, opposite leg extended straight and low, core engaged, calm focused expression. Low camera just above floor level. |
| `chest-dumbbell` (Chest Dumbbell Circuit) | Lying on his back on a flat black weight bench performing a dumbbell chest press: feet flat on the floor, a heavy hexagonal dumbbell in each hand pressed up above his chest with arms nearly straight, wrists stacked, natural five-fingered grip, face in profile toward the camera. Side-on camera at bench height; head and dumbbells in the right half of the frame. Generated with `rock-hard` attached as the identity reference. (A seated version came out as a shoulder press, so it was rejected.) |
| `leg-day` (Leg Day Burner) | Holding the bottom of a deep forward lunge: front knee stacked over the ankle at ninety degrees, back knee hovering just above the floor, chest tall, hands at her hips, strong steady expression. |
| `ultimate-core` (Ultimate Abs & Core Blast) | Holding a hard forearm plank on a slate-grey mat with one arm reaching straight forward, body in one rigid line from heels to head, core braced, eyes on the floor just ahead. Floor-level camera. |
