#!/usr/bin/env python3
"""Turn generated activity photography into the "Log activity" tile assets the app ships.

Usage:  python3 scripts/activity-photos/optimize.py <source-dir>

Every source file must be named after an activity id in ACTIVITIES (src/data/fitness.ts):
walking.png, running.png, ... For each one it writes:
  assets/images/activities/<id>.webp   tile: square crop on the athlete, 180px (3x the 58pt sheet tile)
"""
import sys
from pathlib import Path

from PIL import Image

TILE = (180, 82)  # side, quality
# Square crop per source: centre x, centre y and side, all as fractions of the (square) source. Tighter
# where the athlete has room around them; full frame where the racket, bat or bike would be clipped.
TILE_CROP = {
    "walking": (0.48, 0.50, 0.88),
    "running": (0.55, 0.50, 0.90),
    "cycling": (0.50, 0.50, 1.00),
    "yoga": (0.50, 0.50, 0.86),
    "swimming": (0.52, 0.52, 0.86),
    "badminton": (0.50, 0.50, 1.00),
    "cricket": (0.50, 0.50, 1.00),
    "gym": (0.52, 0.50, 1.00),
}
ROOT = Path(__file__).resolve().parents[2]
TILES = ROOT / "assets" / "images" / "activities"


def tile(img: Image.Image, name: str, dest: Path) -> None:
    w, h = img.size
    cx, cy, frac = TILE_CROP[name]
    side = round(min(w, h) * frac)
    left = min(max(round(w * cx - side / 2), 0), w - side)
    top = min(max(round(h * cy - side / 2), 0), h - side)
    out = img.crop((left, top, left + side, top + side)).resize((TILE[0], TILE[0]), Image.LANCZOS)
    out.save(dest, "WEBP", quality=TILE[1], method=6)
    print(f"  {dest.relative_to(ROOT)} {out.size[0]}x{out.size[1]} ({dest.stat().st_size // 1024} KB)")


def main(src: Path) -> int:
    files = sorted(p for p in src.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"} and p.stem in TILE_CROP)
    if not files:
        print(f"no activity images ({', '.join(sorted(TILE_CROP))}) in {src}")
        return 1
    TILES.mkdir(parents=True, exist_ok=True)
    for f in files:
        print(f.name)
        tile(Image.open(f).convert("RGB"), f.stem, TILES / f"{f.stem}.webp")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        raise SystemExit(2)
    raise SystemExit(main(Path(sys.argv[1]).expanduser().resolve()))
