#!/usr/bin/env python3
"""Turn generated athlete photography into the "Level up" card assets the app ships.

Usage:  python3 scripts/level-up-photos/optimize.py <source-dir>

Every source file must be named after a focus session key without its `focus:` prefix
(rock-hard.png, intense-shred.jpg, ...). Each image is cropped to the card's 1.6:1 ratio,
resized to 720px wide (3x the 240pt card) and written to assets/images/focus/<name>.webp.
"""
import sys
from pathlib import Path

from PIL import Image

RATIO = 1.6  # width / height of the 240x150 card
WIDTH = 720
QUALITY = 80
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "images" / "focus"


def crop(img: Image.Image) -> Image.Image:
    w, h = img.size
    if w / h > RATIO:  # too wide: keep the right side, where the athlete stands
        new_w = round(h * RATIO)
        box = (w - new_w, 0, w, h)
    else:  # too tall: trim the bottom harder than the top, to keep heads in frame
        new_h = round(w / RATIO)
        top = (h - new_h) // 3
        box = (0, top, w, top + new_h)
    return img.crop(box)


def main(src: Path) -> int:
    files = sorted(p for p in src.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"})
    if not files:
        print(f"no images in {src}")
        return 1
    OUT.mkdir(parents=True, exist_ok=True)
    for f in files:
        img = crop(Image.open(f).convert("RGB"))
        img = img.resize((WIDTH, round(WIDTH / RATIO)), Image.LANCZOS)
        dest = OUT / f"{f.stem}.webp"
        img.save(dest, "WEBP", quality=QUALITY, method=6)
        print(f"{f.name} -> {dest.relative_to(ROOT)} ({dest.stat().st_size // 1024} KB)")
    print("\nNow add one line per file to FOCUS_PHOTO in src/components/glyphs.ts:")
    for f in files:
        print(f"  'focus:{f.stem}': require('@/assets/images/focus/{f.stem}.webp'),")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        raise SystemExit(2)
    raise SystemExit(main(Path(sys.argv[1]).expanduser().resolve()))
