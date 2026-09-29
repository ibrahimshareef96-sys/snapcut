"""Step 6: base layers for the room shots: per source frame, the person cut out, colour-decontaminated and relit
(and, in room.background "live" mode, the frame's own room darkened behind them); in "plate" mode, one room plate.

  frames      <work>/fg/fNNNNN.webp       RGBA per source frame (NNNNN = frame index at the project fps), 1440x2560,
              <work>/bg/bNNNNN.jpg        for every frame the timeline uses (run build_timeline.py first); bg only
                                          in live mode
  reference   <work>/room/reference.jpg   plate mode (tripod only): the real room without the person, 1440x2560: the
                                          frame at room.empty_frame_t, or a masked median over the take
  plate       <work>/room/plate.jpg       plate mode: room.plate (the AI-restyled room) warped onto the real camera;
                                          with no room.plate, the real room itself
  preview N   <work>/qa/base_NNNNN.jpg    person over the room, for a quick look

The face is never regenerated: only a mask, an exposure change and a rim light touch the person's pixels.

Usage: python3 build_base.py frames [FIRST LAST] | reference | plate | preview N [N ...]
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from multiprocessing import Pool
from multiprocessing import TimeoutError as PoolTimeout
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

import config
import relight

W, H = relight.W, relight.H
FPS = config.fps()
FRAME_TIMEOUT = 300           # seconds one frame may take before the build is called stuck (normal: 1 to 2 s)


def room_dir() -> Path:
    d = config.work() / "room"
    d.mkdir(parents=True, exist_ok=True)
    return d


def matte_info() -> dict:
    path = config.work() / "matte" / "matte.json"
    if not path.is_file():
        sys.exit("no matte yet: run tools/vision.py first")
    return json.loads(path.read_text())


def grab(src: Path, t: float, w: int, h: int, gray: bool = False) -> np.ndarray:
    """One frame at t seconds, scaled to w x h (BGR uint8, or gray)."""
    fmt, ch = ("gray", 1) if gray else ("bgr24", 3)
    res = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{max(0.0, t):.4f}", "-i", str(src), "-frames:v", "1",
                          "-vf", f"scale={w}:{h}:flags=lanczos", "-f", "rawvideo", "-pix_fmt", fmt, "-"],
                         capture_output=True)
    if res.returncode or len(res.stdout) != w * h * ch:
        sys.exit(f"cannot read a frame at {t:.2f} s from {src.name}: {res.stderr.decode()[-300:]}")
    return np.frombuffer(res.stdout, np.uint8).reshape((h, w) if gray else (h, w, 3))


# ---------------------------------------------------------------- reference (the real, empty room)
def median_room(samples: int = 32) -> np.ndarray:
    """Masked temporal median: each pixel's median over the frames where the person is not on it. Pixels the
    person covers in every sample stay empty and are inpainted (the person always sits over them anyway)."""
    mi = matte_info()
    sw, sh = W // 2, H // 2
    times = np.linspace(mi["start"] + 0.2, mi["end"] - 0.2, samples)
    stack = np.full((samples, sh, sw, 3), np.nan, np.float32)
    for i, t in enumerate(times):
        img = grab(config.source(), t, sw, sh).astype(np.float32)
        a = grab(config.work() / "matte" / "matte.mkv", t - mi["start"], sw, sh, gray=True)
        person = cv2.dilate((a > 20).astype(np.uint8), np.ones((25, 25), np.uint8)).astype(bool)
        img[person] = np.nan
        stack[i] = img
    med = np.nanmedian(stack, axis=0)
    hole = np.isnan(med).any(axis=2)
    med = np.nan_to_num(med).clip(0, 255).astype(np.uint8)
    if hole.any():
        med = cv2.inpaint(med, hole.astype(np.uint8) * 255, 9, cv2.INPAINT_TELEA)
    print(f"median room from {samples} frames; {hole.mean() * 100:.1f}% never uncovered (inpainted)")
    return cv2.resize(med, (W, H), interpolation=cv2.INTER_CUBIC)


def build_reference() -> None:
    room = config.section("room")
    t = room.get("empty_frame_t")
    ref = grab(config.source(), float(t), W, H) if t is not None else median_room()
    dest = room_dir() / "reference.jpg"
    cv2.imwrite(str(dest), ref, [cv2.IMWRITE_JPEG_QUALITY, 96])
    print(f"reference ({'empty frame at %.2f s' % t if t is not None else 'masked median'}) -> {dest}")


def reference() -> np.ndarray:
    img = cv2.imread(str(room_dir() / "reference.jpg"))
    if img is None:
        sys.exit("no room reference yet: run `build_base.py reference` first")
    return img


# ---------------------------------------------------------------- plate (the restyled room on the real camera)
def align(plate: np.ndarray, real: np.ndarray) -> np.ndarray:
    clahe = cv2.createCLAHE(3.0, (8, 8))
    g1 = clahe.apply(cv2.cvtColor(real, cv2.COLOR_BGR2GRAY))
    g2 = clahe.apply(cv2.cvtColor(plate, cv2.COLOR_BGR2GRAY))
    sift = cv2.SIFT_create(10000)
    k1, d1 = sift.detectAndCompute(g1, None)
    k2, d2 = sift.detectAndCompute(g2, None)
    if d1 is None or d2 is None:
        sys.exit("plate alignment failed: no features (is the plate a picture of the same room?)")
    good = [a for a, b in cv2.BFMatcher().knnMatch(d2, d1, k=2) if a.distance < 0.75 * b.distance]
    if len(good) < 40:
        sys.exit(f"plate alignment failed: only {len(good)} matches; regenerate the plate keeping the room's "
                 "layout (references/05-higgsfield.md) or set room.plate to null")
    src = np.float32([k2[m.queryIdx].pt for m in good])
    dst = np.float32([k1[m.trainIdx].pt for m in good])
    hmat, inl = cv2.findHomography(src, dst, cv2.RANSAC, 4.0)
    if hmat is None or int(inl.sum()) < 30:
        sys.exit("plate alignment failed: RANSAC found no stable homography")
    print(f"plate: {len(good)} matches, {int(inl.sum())} inliers")
    return cv2.warpPerspective(plate, hmat, (W, H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT)


def build_plate() -> None:
    room, real = config.section("room"), reference()
    if room.get("plate"):
        path = config.work() / room["plate"]
        src = cv2.imread(str(path))
        if src is None:
            sys.exit(f"missing room plate: {path}")
        src = cv2.resize(src, (W, int(W * src.shape[0] / src.shape[1])), interpolation=cv2.INTER_AREA)
        plate = cv2.GaussianBlur(align(src, real), (0, 0), 1.3)          # a touch of depth behind the person
    else:
        plate = real
    dest = room_dir() / "plate.jpg"
    cv2.imwrite(str(dest), plate, [cv2.IMWRITE_JPEG_QUALITY, 96])
    print(f"plate -> {dest}")


# ---------------------------------------------------------------- per frame
def load_faces() -> dict[int, dict]:
    path = config.data() / "facetrack_raw.jsonl"
    if not path.is_file():
        sys.exit("no face track yet: run tools/vision.py first")
    s = W / config.probe()["w"]
    faces: dict[int, dict] = {}
    for line in path.read_text().splitlines():
        rec = json.loads(line)
        if not rec.get("none"):
            faces[int(round(rec["t"] * FPS))] = {k: rec[k] * s for k in ("x", "y", "w", "h")}
    return faces


def reader(cmd: list[str], size: int):
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, bufsize=size * 4)
    try:
        while True:
            buf = proc.stdout.read(size)
            if len(buf) < size:
                break
            yield buf
    finally:
        proc.stdout.close()
        proc.wait()


def workers() -> int:
    """About 1.2 GB per worker at 1440x2560; never more than the cores minus one."""
    try:
        ram = os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES")
    except (ValueError, OSError, AttributeError):
        ram = 8 << 30
    return max(1, min((os.cpu_count() or 2) - 1, int(ram / (1.2 * (1 << 30))) - 2))


def used_frames() -> tuple[int, int]:
    path = config.data() / "timeline.json"
    if not path.is_file():
        sys.exit("no timeline yet: run tools/build_timeline.py first")
    src = json.loads(path.read_text())["camera"]["src"]
    return min(src), max(src) + 1


def frames(first: int, last: int) -> None:
    mi = matte_info()
    m0, m1 = int(round(mi["start"] * FPS)), int(round(mi["end"] * FPS))
    if first < m0 or last <= first or last > m1:
        sys.exit(f"frames {first}..{last} are outside the matte ({m0}..{m1}); widen project.json matte and rerun "
                 "vision.py")
    relight.setup(config.section("room"), room_dir(), config.work())   # fails here, in the parent, not in workers
    out = config.work() / "fg"
    out.mkdir(parents=True, exist_ok=True)
    if relight.live_mode(config.section("room")):
        (config.work() / "bg").mkdir(exist_ok=True)
    faces, n = load_faces(), last - first
    vcmd, mcmd = decode_cmds(first, n, m0)
    jobs = ((first + k, fr, mt, faces.get(first + k), str(out))
            for k, (fr, mt) in enumerate(zip(reader(vcmd, W * H * 3), reader(mcmd, 1080 * 1920))))
    done = run_pool(jobs, n)
    if done != n:
        sys.exit(f"only {done} of {n} frames were decoded ({first}..{last}); the source or the matte ended early")
    print(f"fg frames {first}..{last - 1} -> {out}")


def decode_cmds(first: int, n: int, m0: int) -> tuple[list[str], list[str]]:
    """ffmpeg commands for n picture frames and n matte frames from source frame `first`. The picture seeks half a
    frame early and passes frames through untouched: a seek to exactly first/FPS rounds up on fine-grained
    timebases and would start one frame late."""
    scale = f"scale={W}:{H}:flags=lanczos"
    if abs(config.probe()["fps"] - FPS) > 0.01:          # other frame rates: resample to the project clock
        seek, vf, mode = f"{first / FPS:.4f}", f"fps={FPS},{scale}", []
    else:
        seek, vf, mode = f"{max(0.0, (first - 0.5) / FPS):.4f}", scale, ["-fps_mode", "passthrough"]
    vcmd = ["ffmpeg", "-v", "error", "-ss", seek, "-i", str(config.source()), *mode, "-frames:v", str(n),
            "-vf", vf, "-f", "rawvideo", "-pix_fmt", "bgr24", "-"]
    mcmd = ["ffmpeg", "-v", "error", "-ss", f"{(first - m0) / FPS:.4f}", "-i", str(config.work() / "matte/matte.mkv"),
            "-frames:v", str(n), "-f", "rawvideo", "-pix_fmt", "gray", "-"]
    return vcmd, mcmd


def run_pool(jobs, n: int) -> int:
    """Process every frame in worker processes. A worker killed from outside (out of memory) would leave imap waiting
    forever, so each result gets a deadline and the pool is stopped with a clear message instead."""
    done = 0
    with Pool(workers(), initializer=relight.setup,
              initargs=(config.section("room"), room_dir(), config.work())) as pool:
        results = pool.imap(relight.process, jobs)     # chunksize 1: the only form whose next() takes a timeout
        while True:
            try:
                results.next(timeout=FRAME_TIMEOUT)
            except StopIteration:
                break
            except PoolTimeout:
                pool.terminate()
                sys.exit(f"a frame took over {FRAME_TIMEOUT} s (a worker probably ran out of memory) at {done}/{n}; "
                         "free some memory and run `build_base.py frames` again")
            done += 1
            if done % 100 == 0:
                print(f"{done}/{n}", flush=True)
    return done


def preview(indices: list[int]) -> None:
    live = relight.live_mode(config.section("room"))
    plate = None if live else cv2.imread(str(room_dir() / "plate.jpg"))
    if not live and plate is None:
        sys.exit("no plate yet: run `build_base.py plate` first")
    out_dir = config.work() / "qa"
    out_dir.mkdir(exist_ok=True)
    for idx in indices:
        fg = cv2.imread(str(config.work() / "fg" / f"f{idx:05d}.webp"), cv2.IMREAD_UNCHANGED)
        if live:
            plate = cv2.imread(str(config.work() / "bg" / f"b{idx:05d}.jpg"))
        if fg is None or plate is None:
            sys.exit(f"missing fg/bg frame {idx}: run `build_base.py frames` first")
        a = fg[..., 3:4].astype(np.float32) / 255
        comp = fg[..., :3].astype(np.float32) * a + plate.astype(np.float32) * (1 - a)
        cv2.imwrite(str(out_dir / f"base_{idx:05d}.jpg"), comp.astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 92])
    print(f"{len(indices)} previews -> {out_dir}")


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    config.require_portrait()
    cmd, rest = sys.argv[1], sys.argv[2:]
    if cmd == "reference":
        build_reference()
    elif cmd == "plate":
        build_plate()
    elif cmd == "frames":
        first, last = (int(rest[0]), int(rest[1])) if len(rest) == 2 else used_frames()
        frames(first, last)
    elif cmd == "preview":
        preview([int(a) for a in rest])
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
