"""Step 7: compositor assets in the work folder (then run icons.py fetch).

  room/plate_base.jpg, plate_lights.jpg   plate mode: the room plate split into a dim base and its light (saturated,
                                          bright pixels), so the lights can breathe and drift in hue. Live mode: the
                                          first background frame and a drawn RGB wash in the rim colours
  room/plate_blur.jpg                     the blurred "glass" behind full-screen takeovers
  studio/sNNNN.jpg                        project.json "studio".clip frame by frame (1080x1920, its own fps)
  plates/<i>/pNNNN.jpg                    each project.json "explosion".plates[i] clip, frame by frame
  data/plates.json                        what the compositor needs to play those plates
  data/track.json                         optional: a coloured prop (a glove, a mug) tracked through the studio clip,
                                          from "studio".track {hsv_lo, hsv_hi, region, min_area}

Usage: python3 prep_assets.py
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

import config

FIT = "scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920"


def require(path: Path) -> Path:
    if not path.exists():
        sys.exit(f"missing input: {path}")
    return path


def clip_length(path: Path) -> float:
    res = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True)
    try:
        return float(res.stdout.strip())
    except ValueError:
        sys.exit(f"cannot read {path}: {res.stderr.strip()[-300:]}")


def live_layers(room: Path) -> None:
    """Live mode: the real room changes every frame, so the 'lights' are a drawn RGB wash (the rim colours, from the
    sides and the top) and the takeover glass is the middle frame, blurred."""
    cfg = config.section("room")
    src = json.loads(require(config.data() / "timeline.json").read_text())["camera"]["src"]
    first, mid = (config.work() / "bg" / f"b{i:05d}.jpg" for i in (src[0], src[len(src) // 2]))
    shutil.copyfile(require(first), room / "plate_base.jpg")
    h, w = 2560, 1440
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    wash = np.zeros((h, w, 3), np.float32)
    for (cx, cy, r), key, default in (((0, 0.34 * h, 0.75 * w), "rim_left", [0.20, 0.85, 1.00]),
                                      ((w, 0.40 * h, 0.75 * w), "rim_right", [1.00, 0.22, 0.78]),
                                      ((0.5 * w, 0, 0.6 * w), "rim_top", [0.62, 0.30, 1.00])):
        fall = np.exp(-(((xs - cx) ** 2 + (ys - cy) ** 2) / (r * r)))
        wash += fall[..., None] * np.array(cfg.get(key, default), np.float32)[::-1]      # RGB -> BGR
    cv2.imwrite(str(room / "plate_lights.jpg"), (np.clip(wash * 0.55, 0, 1) * 255).astype(np.uint8),
                [cv2.IMWRITE_JPEG_QUALITY, 95])
    blur = cv2.GaussianBlur(cv2.resize(cv2.imread(str(require(mid))), (360, 640)), (0, 0), 14)
    cv2.imwrite(str(room / "plate_blur.jpg"), cv2.resize(blur, (1080, 1920)), [cv2.IMWRITE_JPEG_QUALITY, 92])
    print("live room layers written")


def plate_layers() -> None:
    room = config.work() / "room"
    room.mkdir(parents=True, exist_ok=True)
    if config.section("room").get("background", "live") == "live":
        live_layers(room)
        return
    plate = cv2.imread(str(require(room / "plate.jpg"))).astype(np.float32) / 255
    hsv = cv2.cvtColor((plate * 255).astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32) / 255
    light = np.clip((hsv[..., 1] - 0.35) / 0.4, 0, 1) * np.clip((hsv[..., 2] - 0.30) / 0.45, 0, 1)
    lights = plate * cv2.GaussianBlur(light, (0, 0), 6)[..., None]
    base = np.clip(plate - lights * 0.85, 0, 1)
    cv2.imwrite(str(room / "plate_base.jpg"), (base * 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 95])
    cv2.imwrite(str(room / "plate_lights.jpg"), (lights * 255 / 0.85).clip(0, 255).astype(np.uint8),
                [cv2.IMWRITE_JPEG_QUALITY, 95])
    blur = cv2.GaussianBlur(cv2.resize(plate, (360, 640)), (0, 0), 14)
    cv2.imwrite(str(room / "plate_blur.jpg"), (cv2.resize(blur, (1080, 1920)) * 255).astype(np.uint8),
                [cv2.IMWRITE_JPEG_QUALITY, 92])
    print("plate layers written")


def frames(src: Path, out_dir: Path, prefix: str, start: float, dur: float, fps: float) -> int:
    require(src)                                        # check before deleting the old sequence
    if dur <= 0:
        sys.exit(f"{src.name}: start {start} s is past the end of the clip")
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob(f"{prefix}[0-9][0-9][0-9][0-9].jpg"):   # only frames this tool wrote, never the folder
        old.unlink()
    pattern = str(out_dir).replace("%", "%%") + f"/{prefix}%04d.jpg"  # a % in the path is not an ffmpeg pattern
    res = subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{start}", "-i", str(src), "-t", f"{dur}",
                          "-vf", f"fps={fps},{FIT}", "-q:v", "2", "-start_number", "0", pattern],
                         capture_output=True, text=True)
    if res.returncode:
        sys.exit(f"ffmpeg failed on {src.name}: {res.stderr[-400:]}")
    n = config.frames_in(out_dir, f"{prefix}[0-9][0-9][0-9][0-9].jpg")
    if n < int(dur * fps) - 2:                          # a clip may end a frame or two before start + dur
        sys.exit(f"only {n} frames from {src.name} (expected about {int(dur * fps)})")
    print(f"{n} frames -> {out_dir}")
    return n


def blob(im: np.ndarray, spec: dict) -> tuple[int, np.ndarray, np.ndarray] | None:
    """The biggest blob of the prop's colour inside the search region: (area, centre, pixel coords)."""
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, tuple(spec["hsv_lo"]), tuple(spec["hsv_hi"]))
    x0, y0, x1, y1 = spec.get("region", [0, 0, 1080, 1920])
    keep = np.zeros_like(mask)
    keep[y0:y1, x0:x1] = 255
    mask = cv2.morphologyEx(mask & keep, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    cnt, lab, stats, cents = cv2.connectedComponentsWithStats(mask)
    if cnt < 2:
        return None
    i = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    return int(stats[i, cv2.CC_STAT_AREA]), cents[i], np.nonzero(lab == i)


def track_prop(folder: Path, n: int, spec: dict) -> list[dict]:
    track, last = [], None
    for k in range(n):
        found = blob(cv2.imread(str(folder / f"s{k:04d}.jpg")), spec)
        rec = None
        if found and found[0] > spec.get("min_area", 600):
            area, c, (ys, xs) = found
            jump = last and last["ok"] and np.hypot(c[0] - last["x"], c[1] - last["y"]) > 220
            if not (jump and area < 0.6 * last["area"]):      # a small blob far away is something else
                top = ys < np.percentile(ys, 12)
                rec = {"x": float(c[0]), "y": float(c[1]), "tx": float(xs[top].mean()), "ty": float(ys[top].mean()),
                       "area": area, "ok": True}
        if rec is None:
            rec = dict(last or {"x": 540.0, "y": 800.0, "tx": 540.0, "ty": 760.0, "area": 0}, ok=False)
        track.append(rec)
        last = rec
    return [{key: round(sum(r[key] for r in track[max(0, k - 1):k + 2]) / len(track[max(0, k - 1):k + 2]), 1)
             for key in ("x", "y", "tx", "ty")} | {"ok": track[k]["ok"]} for k in range(n)]   # 3-frame smoothing


def studio() -> None:
    st = config.section("studio")
    track_path = config.data() / "track.json"
    track_path.unlink(missing_ok=True)                 # rewritten below only when this studio clip is tracked
    if not st:
        return
    if not isinstance(st.get("clip"), str):
        sys.exit('project.json studio needs "clip" (the AI studio video in the work folder)')
    tr = st.get("track")
    if tr is not None and not (isinstance(tr, dict) and all(len(tr.get(k) or []) == 3 for k in ("hsv_lo", "hsv_hi"))):
        sys.exit('project.json studio.track needs "hsv_lo" and "hsv_hi", three numbers each (OpenCV HSV)')
    clip = config.work() / st["clip"]
    fps = float(st.get("fps", 24))
    n = frames(clip, config.work() / "studio", "s", 0.0, clip_length(require(clip)), fps)
    if st.get("track"):
        track = track_prop(config.work() / "studio", n, st["track"])
        track_path.write_text(json.dumps(track))
        print(f"prop tracked on {sum(r['ok'] for r in track)}/{n} studio frames")


def explosion() -> None:
    ex = config.section("explosion")
    listing = config.data() / "plates.json"
    listing.unlink(missing_ok=True)                    # never leave an older list behind if a plate fails below
    info = []
    for i, pl in enumerate(ex.get("plates", []) if ex else []):
        if not isinstance(pl, dict) or not isinstance(pl.get("file"), str):
            sys.exit(f'project.json explosion.plates[{i}] needs "file" (a clip in the work folder)')
        clip = require(config.work() / pl["file"])
        start, fps = float(pl.get("start", 0.0)), float(pl.get("fps", 24))
        dur = float(pl.get("dur", clip_length(clip) - start))
        n = frames(clip, config.work() / "plates" / str(i), "p", start, dur, fps)
        info.append({"dir": str(config.work() / "plates" / str(i)), "frames": n, "lead": float(pl.get("lead", 0.3)),
                     "fps": fps, "scale": float(pl.get("scale", 1.3)), "alpha": float(pl.get("alpha", 1.0))})
    listing.write_text(json.dumps(info))


def main() -> None:
    plate_layers()
    studio()
    explosion()


if __name__ == "__main__":
    main()
