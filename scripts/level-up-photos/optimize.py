#!/usr/bin/env python3
"""Turn generated athlete photography into the "Level up" card assets the app ships.

Usage:  python3 scripts/level-up-photos/optimize.py <source-dir>

Every source file must be named after a focus session key without its `focus:` prefix
(rock-hard.png, intense-shred.jpg, ...). For each one it writes:
  assets/images/focus/<name>.webp       card: 1.6:1 crop, 720px wide (3x the 240pt card)
  assets/images/focus/<name>-hero.webp  session detail hero: 3:2, 1170px wide (3x a 390pt screen)
"""
import sys
from pathlib import Path

from PIL import Image

CARD = (1.6, 720, 80)  # ratio (w/h), width, quality — the 240x150 card
HERO = (1.5, 1170, 76)
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "images" / "focus"


def crop(img: Image.Image, ratio: float) -> Image.Image:
    w, h = img.size
    if w / h > ratio:  # too wide: keep the right side, where the athlete stands
        new_w = round(h * ratio)
        box = (w - new_w, 0, w, h)
    else:  # too tall: trim the bottom harder than the top, to keep heads in frame
        new_h = round(w / ratio)
        top = (h - new_h) // 3
        box = (0, top, w, top + new_h)
    return img.crop(box)


def save(img: Image.Image, dest: Path, spec) -> None:
    ratio, width, quality = spec
    out = crop(img, ratio).resize((width, round(width / ratio)), Image.LANCZOS)
    out.save(dest, "WEBP", quality=quality, method=6)
    print(f"  {dest.relative_to(ROOT)} {out.size[0]}x{out.size[1]} ({dest.stat().st_size // 1024} KB)")


def main(src: Path) -> int:
    files = sorted(p for p in src.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"})
    if not files:
        print(f"no images in {src}")
        return 1
    OUT.mkdir(parents=True, exist_ok=True)
    for f in files:
        img = Image.open(f).convert("RGB")
        print(f.name)
        save(img, OUT / f"{f.stem}.webp", CARD)
        save(img, OUT / f"{f.stem}-hero.webp", HERO)
    print("\nFOCUS_PHOTO / FOCUS_HERO entries for src/components/glyphs.ts:")
    for f in files:
        print(f"  'focus:{f.stem}': require('@/assets/images/focus/{f.stem}.webp'),")
        print(f"  'focus:{f.stem}': require('@/assets/images/focus/{f.stem}-hero.webp'),")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        raise SystemExit(2)
    raise SystemExit(main(Path(sys.argv[1]).expanduser().resolve()))
