#!/bin/bash
# Build app-ready Pro exercise loops from the source clips, per loopsearch.py's plan:
#   loop:     [start, end) with its last `fade` frames cross-faded into the frames before `start`
#   pingpong: [start, end] forward, then end-1 .. start+1 backward (no doubled frame at a turn)
# Output: 960x540 H.264 High@4.0, 30 fps, no audio track, keyframe every second, faststart.
# Poster = the loop's first frame, so swapping poster -> video shows no jump.
# usage: scripts/pro-videos/build.sh <source-dir>   (run from the repo root)
set -euo pipefail
SRC=$1; PLAN=scripts/pro-videos/plan.jsonl
OUTV=assets/videos/exercises/pro; OUTP=assets/images/exercises/pro/posters
mkdir -p "$OUTV" "$OUTP"

slug() {
  case "$1" in
    "Wide Arm Push-ups") echo wide-push-ups ;;
    "Spine Lumbar Twist Stretch") echo spine-twist ;;
    *) echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g' ;;
  esac
}
get() { python3 -I -c 'import json,sys; print(json.loads(sys.argv[1])[sys.argv[2]])' "$1" "$2"; }

PRE="[0:v]fps=30,scale=960:540:flags=lanczos,settb=1/30"
while IFS= read -r line; do
  f="$SRC/$(get "$line" file)"; mode=$(get "$line" mode); s=$(get "$line" start); e=$(get "$line" end)
  id=$(slug "$(basename "$f" .mp4)")
  if [ "$mode" = loop ]; then
    K=$(get "$line" fade)
    graph="$PRE,split=3[s1][s2][s3];\
[s1]trim=start_frame=$s:end_frame=$((e-K)),setpts=PTS-STARTPTS[a];\
[s2]trim=start_frame=$((e-K)):end_frame=$e,setpts=PTS-STARTPTS[b];\
[s3]trim=start_frame=$((s-K)):end_frame=$s,setpts=PTS-STARTPTS[c];\
[b][c]xfade=transition=fade:duration=$(python3 -I -c "print($K/30)"):offset=0[x];\
[a][x]concat=n=2:v=1:a=0,format=yuv420p[out]"
  else
    graph="$PRE,split=2[s1][s2];\
[s1]trim=start_frame=$s:end_frame=$((e+1)),setpts=PTS-STARTPTS[fw];\
[s2]trim=start_frame=$((s+1)):end_frame=$e,setpts=PTS-STARTPTS,reverse,setpts=PTS-STARTPTS[bw];\
[fw][bw]concat=n=2:v=1:a=0,format=yuv420p[out]"
  fi
  ffmpeg -nostdin -v error -y -i "$f" -filter_complex "$graph" \
    -map "[out]" -an -map_metadata -1 -c:v libx264 -profile:v high -level 4.0 -preset slow -crf 25 \
    -g 30 -keyint_min 30 -sc_threshold 0 -movflags +faststart "$OUTV/$id.mp4"
  ffmpeg -nostdin -v error -y -i "$OUTV/$id.mp4" -frames:v 1 -vf scale=640:360:flags=lanczos -q:v 4 "$OUTP/$id.jpg"
  echo "$id <- $(basename "$f") $mode [$s,$e]"
done < "$PLAN"
