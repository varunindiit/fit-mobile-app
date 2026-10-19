"""Seam check: wrap-around (last -> first) PSNR vs the clip's own worst and median frame step.
Usage: python3 -I seamcheck.py <video> ..."""
import os
import subprocess
import sys

import numpy as np

W, H = 192, 108
for path in sys.argv[1:]:
    raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", path, "-vf", f"scale={W}:{H},format=gray", "-f", "rawvideo", "-"], check=True, capture_output=True).stdout
    f = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)
    steps = [float(((f[k + 1] - f[k]) ** 2).mean()) for k in range(len(f) - 1)]
    seam = float(((f[0] - f[-1]) ** 2).mean())
    p = lambda m: 10 * np.log10(255 ** 2 / max(m, 1e-6))
    print(f"{os.path.basename(path):24} frames={len(f):3} seam={p(seam):5.1f}dB  median_step={p(np.median(steps)):5.1f}dB  worst_step={p(max(steps)):5.1f}dB  {'OK' if seam <= max(steps) else 'SEAM>WORST'}")
