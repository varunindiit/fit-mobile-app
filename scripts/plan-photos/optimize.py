#!/usr/bin/env python3
"""Turn generated athlete photography into the "Select Training Plan" card assets the app ships.

Usage:  python3 scripts/plan-photos/optimize.py <source-dir>

Every source file must be named after a program id (belly.png, abs.png, sixpack.png). For each one it
writes assets/images/plans/<id>.webp: a 3:4 portrait crop centred on the athlete, 600px wide (3x the
right-hand photo panel of the expanded plan card, which shows it with contentFit="cover").
"""
import sys
from pathlib import Path

from PIL import Image

RATIO, WIDTH, QUALITY = 0.75, 600, 80
# Horizontal centre of the athlete per source (fraction of the width).
CENTRE_X = {"belly": 0.52, "abs": 0.50, "sixpack": 0.50}
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "images" / "plans"


def main(src: Path) -> int:
    files = sorted(p for p in src.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"} and p.stem in CENTRE_X)
    if not files:
        print(f"no plan images ({', '.join(sorted(CENTRE_X))}) in {src}")
        return 1
    OUT.mkdir(parents=True, exist_ok=True)
    for f in files:
        img = Image.open(f).convert("RGB")
        w, h = img.size
        crop_w = round(h * RATIO)
        left = min(max(round(w * CENTRE_X[f.stem] - crop_w / 2), 0), w - crop_w)
        out = img.crop((left, 0, left + crop_w, h)).resize((WIDTH, round(WIDTH / RATIO)), Image.LANCZOS)
        dest = OUT / f"{f.stem}.webp"
        out.save(dest, "WEBP", quality=QUALITY, method=6)
        print(f"  {dest.relative_to(ROOT)} {out.size[0]}x{out.size[1]} ({dest.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        raise SystemExit(2)
    raise SystemExit(main(Path(sys.argv[1]).expanduser().resolve()))
