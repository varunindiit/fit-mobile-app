#!/usr/bin/env python3
"""Turn generated athlete photography into the "Target an area" tile assets the app ships.

Usage:  python3 scripts/area-photos/optimize.py <source-dir>

Every source file must be named after a focus session key without its `focus:` prefix
(abs-beginner.png, chest-dumbbell.png, ...). For each one it writes:
  assets/images/areas/<name>.webp       tile: square crop on the target muscle, 168px (3x the 52pt tile)
  assets/images/focus/<name>-hero.webp  session detail hero: 3:2, 1170px wide (3x a 390pt screen) — only
                                        for sessions in HERO_FOR, the rest keep their "Level up" hero
"""
import sys
from pathlib import Path

from PIL import Image

TILE = (168, 82)  # side, quality
HERO = (1.5, 1170, 76)
# Square tile crop per source: centre x (fraction of the width), centre y and side (fractions of the
# height). Tight enough that the worked muscle group still reads at 52pt.
TILE_CROP = {
    "abs-beginner": (0.36, 0.55, 0.62),
    "rock-hard": (0.48, 0.60, 0.62),
    "stronger-abs": (0.36, 0.45, 0.66),
    "chest-beginner": (0.68, 0.53, 0.55),
    "chest-dumbbell": (0.45, 0.46, 0.75),
    "arm-toning": (0.60, 0.42, 0.66),
    "leg-day": (0.52, 0.55, 0.85),
    "back-relief": (0.64, 0.52, 0.55),
    "intense-shred": (0.55, 0.50, 0.75),
    "ultimate-core": (0.52, 0.48, 0.84),
}
# Sessions that had no photo before this set; the others already ship a "Level up" hero.
HERO_FOR = {"abs-beginner", "chest-beginner", "arm-toning", "back-relief"}
ROOT = Path(__file__).resolve().parents[2]
TILES = ROOT / "assets" / "images" / "areas"
HEROES = ROOT / "assets" / "images" / "focus"


def report(dest: Path, img: Image.Image) -> None:
    print(f"  {dest.relative_to(ROOT)} {img.size[0]}x{img.size[1]} ({dest.stat().st_size // 1024} KB)")


def tile(img: Image.Image, name: str, dest: Path) -> None:
    w, h = img.size
    cx, cy, frac = TILE_CROP[name]
    side = round(h * frac)
    left = min(max(round(w * cx - side / 2), 0), w - side)
    top = min(max(round(h * cy - side / 2), 0), h - side)
    out = img.crop((left, top, left + side, top + side)).resize((TILE[0], TILE[0]), Image.LANCZOS)
    out.save(dest, "WEBP", quality=TILE[1], method=6)
    report(dest, out)


def hero(img: Image.Image, dest: Path) -> None:
    ratio, width, quality = HERO
    w, h = img.size
    if w / h > ratio:  # too wide: keep the centre, where the athlete is
        new_w = round(h * ratio)
        left = (w - new_w) // 2
        box = (left, 0, left + new_w, h)
    else:  # too tall: trim the bottom harder than the top, to keep heads in frame
        new_h = round(w / ratio)
        top = (h - new_h) // 3
        box = (0, top, w, top + new_h)
    out = img.crop(box).resize((width, round(width / ratio)), Image.LANCZOS)
    out.save(dest, "WEBP", quality=quality, method=6)
    report(dest, out)


def main(src: Path) -> int:
    files = sorted(p for p in src.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"} and p.stem in TILE_CROP)
    if not files:
        print(f"no area images ({', '.join(sorted(TILE_CROP))}) in {src}")
        return 1
    TILES.mkdir(parents=True, exist_ok=True)
    for f in files:
        img = Image.open(f).convert("RGB")
        print(f.name)
        tile(img, f.stem, TILES / f"{f.stem}.webp")
        if f.stem in HERO_FOR:
            hero(img, HEROES / f"{f.stem}-hero.webp")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        raise SystemExit(2)
    raise SystemExit(main(Path(sys.argv[1]).expanduser().resolve()))
