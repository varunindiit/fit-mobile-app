#!/usr/bin/env python3
"""Turn generated coach photography into the card and hero assets the app ships.

Usage:  python3 scripts/workout-photos/optimize.py <source-dir>

Every source file must be named after a workout id from src/data/fitness.ts
(morning-yoga.png, fat-burn-hiit.png, ...); sub-folders are searched too. For each one it writes:
  assets/images/workouts/<id>.webp       card header: 1.14:1 crop, 640px wide (3x the ~173pt card)
  assets/images/workouts/<id>-hero.webp  detail hero: 3:2, 1170px wide (3x a 390pt screen)
"""
import re
import sys
from pathlib import Path

from PIL import Image

CARD = (1.14, 640, 80)  # ratio (w/h), width, quality
HERO = (1.5, 1170, 76)
# Horizontal centre of the card crop, as a fraction of the width, for poses wider than the card
# (a plank or Warrior II) where a plain centre crop would cut off feet or hands.
FOCUS_X = {"core-blast": 0.475, "power-yoga": 0.52}
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "images" / "workouts"
WORKOUT_IDS = set(re.findall(r"id: '([^']+)', title:", (ROOT / "src" / "data" / "fitness.ts").read_text()))


def crop(img: Image.Image, ratio: float, fx: float = 0.5) -> Image.Image:
    w, h = img.size
    if w / h > ratio:  # too wide: trim the sides around fx
        new_w = round(h * ratio)
        left = min(max(round(w * fx - new_w / 2), 0), w - new_w)
        return img.crop((left, 0, left + new_w, h))
    new_h = round(w / ratio)  # too tall: trim the bottom harder than the top, to keep heads in frame
    top = (h - new_h) // 3
    return img.crop((0, top, w, top + new_h))


def save(img: Image.Image, dest: Path, spec, fx: float) -> None:
    ratio, width, quality = spec
    out = crop(img, ratio, fx).resize((width, round(width / ratio)), Image.LANCZOS)
    out.save(dest, "WEBP", quality=quality, method=6)
    print(f"  {dest.relative_to(ROOT)} {out.size[0]}x{out.size[1]} ({dest.stat().st_size // 1024} KB)")


def main(src: Path) -> int:
    files = sorted(p for p in src.rglob("*") if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"})
    for skipped in (p for p in files if p.stem not in WORKOUT_IDS):
        print(f"skipping {skipped.name}: not a workout id")
    files = [p for p in files if p.stem in WORKOUT_IDS]
    if not files:
        print(f"no images in {src}")
        return 1
    OUT.mkdir(parents=True, exist_ok=True)
    for f in files:
        img = Image.open(f).convert("RGB")
        print(f.name)
        save(img, OUT / f"{f.stem}.webp", CARD, FOCUS_X.get(f.stem, 0.5))
        save(img, OUT / f"{f.stem}-hero.webp", HERO, 0.5)
    print("\nWORKOUT_PHOTO / WORKOUT_HERO entries for src/components/glyphs.ts:")
    for f in files:
        print(f"  '{f.stem}': require('@/assets/images/workouts/{f.stem}.webp'),")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        raise SystemExit(2)
    raise SystemExit(main(Path(sys.argv[1]).expanduser().resolve()))
