"""Pick how each clip loops.

mode "loop": play [i, j) and cross-fade the last K frames into the K frames before i. Every pair
  (i-k, j-k) must already match, otherwise the blend is a visible double exposure. Among windows
  within 1 dB of the best match, the longest wins (more reps on screen).
mode "pingpong": play [a, b] forward then back. Used when no window matches well enough — the
  camera drifts during a hold, or the poses never repeat. Turnarounds sit where the body is
  slowest, so the reversal reads as the natural end of a movement.
Usage: python3 -I loopsearch.py <video> ...  -> JSON lines."""
import json
import subprocess
import sys

import numpy as np

W, H = 192, 108
MIN_LEN = 75  # at least 2.5 s
K = 6


def frames(path):
    raw = subprocess.run(
        ["ffmpeg", "-nostdin", "-v", "error", "-i", path, "-vf", f"scale={W}:{H},format=gray", "-f", "rawvideo", "-"],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)


def psnr(m):
    return round(float(10 * np.log10(255 ** 2 / max(m, 1e-6))), 1)


for path in sys.argv[1:]:
    f = frames(path)
    n = len(f)
    flat = f.reshape(n, -1)
    sq = (flat ** 2).sum(1)
    mse = np.maximum((sq[:, None] + sq[None, :] - 2 * flat @ flat.T) / flat.shape[1], 0)
    steps = np.array([mse[k, k + 1] for k in range(n - 1)])
    med = psnr(float(np.median(steps)))

    cands = []
    for i in range(K, 80):
        for j in range(i + MIN_LEN, n):
            worst = max([mse[i - k, j - k] for k in range(1, K + 1)] + ([mse[i, j]] if j < n else []))
            cands.append((psnr(worst), j - i, i, j))
    top = max(c[0] for c in cands)
    q, _, i, j = max((c for c in cands if c[0] >= top - 1.0), key=lambda c: (c[1], c[0]))

    out = {"file": path, "frames": n, "median_step": med, "seam_was": psnr(mse[n - 1, 0])}
    if q >= min(med - 3, 32):
        out.update(mode="loop", start=i, end=j, fade=K, seam=q)
    else:
        # speed around frame k = mean of the steps either side; turn where the body is slowest
        speed = np.convolve(steps, np.ones(5) / 5, mode="same")
        a, b = min(((a, b) for a in range(2, 50) for b in range(a + MIN_LEN, n - 2)), key=lambda ab: (speed[ab[0]] + speed[ab[1] - 1], -(ab[1] - ab[0])))
        out.update(mode="pingpong", start=a, end=b, turn_speed=[psnr(speed[a]), psnr(speed[b - 1])], loop_seam=q)
    print(json.dumps(out))
