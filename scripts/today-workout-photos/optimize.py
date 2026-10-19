#!/usr/bin/env python3
"""Turn generated athlete photography into the "Today's workout" card assets the app ships.

Usage:  python3 scripts/today-workout-photos/optimize.py <source-dir>

Every source file must be named after a 30-day program id, or `rest` for rest days
(belly.png, abs.jpg, sixpack.png, rest.png). For each one it writes:
  assets/images/programs/<name>.webp       card: 0.9:1 crop around the athlete, 720px wide
                                           (3x the ~230pt photo panel on the right of the card)
  assets/images/programs/<name>-hero.webp  program day detail hero: 3:2, 1170px wide (3x a 390pt screen)
"""
import sys
from pathlib import Path

from PIL import Image

NAMES = {"belly", "abs", "sixpack", "rest"}
CARD = (0.9, 720, 80)  # ratio (w/h), width, quality
HERO = (1.5, 1170, 76)
# Horizontal centre of the athlete in each source, as a fraction of its width. The card crop is
# centred on it so the athlete sits in the middle of the photo panel, clear of the left-hand scrim.
FOCUS_X = {"belly": 0.68, "abs": 0.68, "sixpack": 0.68, "rest": 0.68}
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "images" / "programs"


def crop(img: Image.Image, ratio: float, focus_x: float) -> Image.Image:
    w, h = img.size
    if w / h > ratio:  # too wide: centre on the athlete, clamped to the frame
        new_w = round(h * ratio)
        left = min(max(round(w * focus_x - new_w / 2), 0), w - new_w)
        box = (left, 0, left + new_w, h)
    else:  # too tall: trim the bottom harder than the top, to keep heads in frame
        new_h = round(w / ratio)
        top = (h - new_h) // 3
        box = (0, top, w, top + new_h)
    return img.crop(box)


def save(img: Image.Image, dest: Path, spec, focus_x: float) -> None:
    ratio, width, quality = spec
    out = crop(img, ratio, focus_x).resize((width, round(width / ratio)), Image.LANCZOS)
    out.save(dest, "WEBP", quality=quality, method=6)
    print(f"  {dest.relative_to(ROOT)} {out.size[0]}x{out.size[1]} ({dest.stat().st_size // 1024} KB)")


def main(src: Path) -> int:
    files = sorted(p for p in src.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"} and p.stem in NAMES)
    if not files:
        print(f"no program images ({', '.join(sorted(NAMES))}) in {src}")
        return 1
    OUT.mkdir(parents=True, exist_ok=True)
    for f in files:
        img = Image.open(f).convert("RGB")
        print(f.name)
        save(img, OUT / f"{f.stem}.webp", CARD, FOCUS_X[f.stem])
        save(img, OUT / f"{f.stem}-hero.webp", HERO, FOCUS_X[f.stem])
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        raise SystemExit(2)
    raise SystemExit(main(Path(sys.argv[1]).expanduser().resolve()))
