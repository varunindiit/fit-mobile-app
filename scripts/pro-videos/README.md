# Pro exercise demonstration videos

Pro accounts see a muted, looping demonstration video for every exercise in the player, the
exercise sheet and the rest screen (`ProVideo`, chosen by `ExerciseArt`). Small tiles (day list,
up-next, coach plan rows) show the video's poster instead of playing it. Videos live in
`assets/videos/exercises/pro/<id>.mp4`, posters in `assets/images/exercises/pro/posters/<id>.jpg`,
and both are wired up in `PRO_VIDEOS` (`src/data/proDemos.ts`). Free and Smart never reach them:
`proVideo()` returns `undefined` unless the entitlement layer passes `pro`.

## Source

25 clips supplied in `Fittelo-video-pro-plan/` (folders `AbsCore`, `Back`, `Chest & Arms`,
`Full Body`, `Legs & Glutes`, `Stretching`), one per app exercise: 5 s, 1280x720, 30 fps, H.264,
no audio. Each file name is the exercise's name in the app, except `Wide Arm Push-ups` →
`wide-push-ups` and `Spine Lumbar Twist Stretch` → `spine-twist` (both mapped in `build.sh`).
Every clip was checked against a contact sheet before it was added: each shows the movement its
name says. If you add a clip, check that first. Do not add one just because its file name matches.

## Pipeline

```bash
python3 -I scripts/pro-videos/loopsearch.py <source-dir>/*/*.mp4 > scripts/pro-videos/plan.jsonl  # then make "file" relative to <source-dir>
scripts/pro-videos/build.sh <source-dir>                      # writes the videos and posters
python3 -I scripts/pro-videos/seamcheck.py assets/videos/exercises/pro/*.mp4
```

The clips do not loop as supplied. Their last frame is 17–34 dB PSNR from their first, while
consecutive frames are 37–49 dB apart, so every repeat would visibly jump. `loopsearch.py` picks
one of two loop modes for each clip:

- **loop**: play `[start, end)` and blend the last 6 frames into the 6 frames before `start`.
  The window is chosen so that every blended pair already matches. Otherwise the blend shows a
  double exposure, which a 12-frame blend did on tricep dips, bicycle crunches and reverse
  crunches. The longest window within 1 dB of the best match wins.
- **pingpong**: play `[start, end]` forward and then backward. This is used when no window
  matches: in the plank and side-plank holds the camera drifts, and in some clips the poses never
  repeat. The turns are placed where the body moves slowest, so a turn looks like the natural end
  of a rep.

`build.sh` then encodes 960x540 H.264 High@4.0 at CRF 25 with no audio track, a keyframe every
second and `+faststart`. The poster is frame 0 of the result, so the poster-to-video swap does not
jump. The total size is about 5.7 MB for videos and 0.3 MB for posters (the source was 103 MB).
`seamcheck.py` reports each wrap-around seam against the clip's own frame steps. Every clip
should print `OK`.
