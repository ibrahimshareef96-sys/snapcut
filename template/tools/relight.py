"""Per-frame person cut-out and relight, run in build_base.py's worker processes.

project.json "room" (all optional):
  background     "live"    each frame's own room behind the person, darkened (bg_exposure) under a drawn RGB wash:
                           works handheld. "plate": one still room plate (the AI-restyled room, room.plate) aligned
                           to the camera: needs a locked-off camera (tripod), or the room swims behind the person
  bg_exposure    0.5       live mode: how bright the real room stays (linear light)
  relight        true      rim light + key-light falloff in linear light; false keeps the person as filmed
  exposure       0.84      overall level of the person (the RGB room is darker than a lit desk)
  rim_left       [0.20, 0.85, 1.00]   RGB 0..1, the light on the person's left edge (on screen)
  rim_right      [1.00, 0.22, 0.78]
  rim_top        [0.62, 0.30, 1.00]
  rim_gain       0.62
  body_falloff   0.62      light level far from the face (1 = no falloff)
  table_mask     null      a white-on-black PNG (in the work folder, 1440x2560) of a desk in front of the person:
                           no rim light where the desk cuts them off
  leak_cleanup   on when empty_frame_t is set: removes matte leaks onto dark static objects (a mic arm, a lamp)
                 by comparing each frame with the real empty room

Never on the face: no generation, no warping; only the mask, exposure and a light rim touch those pixels.
"""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from PIL import Image

W, H = 1440, 2560
DARK_BG = 0.35            # clean-plate luminance under which a background object counts as dark (arm, lamp)
SAME_LO, SAME_HI = 0.045, 0.11   # frame-vs-clean-plate difference: below LO = background, above HI = the person
RIM_PX = 9.0
SPILL = 0.07
FACE_RIM_KEEP = 0.45

_cfg: dict = {}
_clean: np.ndarray | None = None
_guard: np.ndarray | None = None


def setup(room: dict, room_dir: Path, work: Path) -> None:
    """Load the settings and the images every frame needs. Raises (never sys.exit: this runs in pool workers)."""
    global _cfg, _clean, _guard
    mode = room.get("background", "live")
    if mode not in ("live", "plate"):
        raise ValueError('room.background must be "live" or "plate"')
    _cfg = {"live": mode == "live", "bg_exposure": float(room.get("bg_exposure", 0.5)),
            "relight": room.get("relight", True), "exposure": room.get("exposure", 0.84),
            "left": np.array(room.get("rim_left", [0.20, 0.85, 1.00]), np.float32),
            "right": np.array(room.get("rim_right", [1.00, 0.22, 0.78]), np.float32),
            "top": np.array(room.get("rim_top", [0.62, 0.30, 1.00]), np.float32),
            "gain": room.get("rim_gain", 0.62), "falloff": room.get("body_falloff", 0.62),
            "leaks": room.get("leak_cleanup", room.get("empty_frame_t") is not None)}
    for key in ("left", "right", "top"):
        if _cfg[key].shape != (3,) or not ((_cfg[key] >= 0) & (_cfg[key] <= 1)).all():
            raise ValueError(f"room.rim_{key} must be three numbers from 0 to 1")
    _clean = None
    if _cfg["leaks"]:
        img = cv2.imread(str(room_dir / "reference.jpg"))
        if img is None:
            raise RuntimeError("leak cleanup needs the room reference: run `build_base.py reference` first")
        _clean = cv2.resize(img, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
    _guard = np.ones((H, W), np.float32)
    if room.get("table_mask"):
        m = cv2.imread(str(work / room["table_mask"]), cv2.IMREAD_GRAYSCALE)
        if m is None:
            raise RuntimeError(f"table mask missing: {work / room['table_mask']}")
        m = cv2.resize(m, (W, H), interpolation=cv2.INTER_NEAREST)
        grown = cv2.dilate(m, np.ones((61, 61), np.uint8))
        _guard = 1 - cv2.GaussianBlur(grown.astype(np.float32) / 255, (0, 0), 18)


# ---------------------------------------------------------------- matte clean-up
def drift(img: np.ndarray, alpha: np.ndarray) -> tuple[float, float]:
    """Camera drift of this frame against the clean plate, from static edges in the upper left."""
    x0, x1, y0, y1 = 0, int(W * 0.32), int(H * 0.08), int(H * 0.42)
    a = cv2.cvtColor(_clean[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY)
    b = cv2.cvtColor(img[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY) * (1 - alpha[y0:y1, x0:x1])
    a = cv2.Sobel(a, cv2.CV_32F, 1, 0) ** 2 + cv2.Sobel(a, cv2.CV_32F, 0, 1) ** 2
    b = cv2.Sobel(b, cv2.CV_32F, 1, 0) ** 2 + cv2.Sobel(b, cv2.CV_32F, 0, 1) ** 2
    (dx, dy), resp = cv2.phaseCorrelate(np.sqrt(a), np.sqrt(b), cv2.createHanningWindow(a.shape[::-1], cv2.CV_32F))
    if resp < 0.08 or abs(dx) > 20 or abs(dy) > 20:
        return 0.0, 0.0
    return dx, dy


def clean_leaks(img: np.ndarray, alpha: np.ndarray, face: dict | None) -> np.ndarray:
    """Drop matte leaks onto dark static objects where the frame still shows the empty room. The head and the
    solid core of the body are never touched."""
    dx, dy = drift(img, alpha)
    plate = cv2.warpAffine(_clean, np.float32([[1, 0, dx], [0, 1, dy]]), (W, H), borderMode=cv2.BORDER_REFLECT)
    diff = cv2.GaussianBlur(np.abs(img - plate).max(axis=2), (0, 0), 1.5)
    keep = np.clip((diff - SAME_LO) / (SAME_HI - SAME_LO), 0, 1)
    region = (cv2.cvtColor(plate, cv2.COLOR_BGR2GRAY) < DARK_BG).astype(np.float32)
    core = cv2.erode((alpha > 0.5).astype(np.uint8), np.ones((81, 81), np.uint8)).astype(np.float32)
    region *= 1 - core
    if face:
        ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
        fcx, fcy = face["x"] + face["w"] / 2, face["y"] + face["h"] / 2
        region *= ~(((xs - fcx) / (face["w"] * 0.95)) ** 2 + ((ys - fcy) / (face["h"] * 1.05)) ** 2 < 1.0)
    region = cv2.GaussianBlur(region, (0, 0), 3)
    return alpha * (1 - region + region * keep)


# ---------------------------------------------------------------- colour
def srgb_to_lin(x: np.ndarray) -> np.ndarray:
    return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)


def lin_to_srgb(x: np.ndarray) -> np.ndarray:
    x = np.clip(x, 0, 1)
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(x, 1 / 2.4) - 0.055)


def blur_fusion(image, fg, bg, alpha, r):
    """One pass of the blur-fusion foreground estimator (Germer et al., ICIP 2021)."""
    a = alpha[..., None]
    ba = cv2.blur(alpha, (r, r))[..., None]
    bf = cv2.blur(fg * a, (r, r)) / (ba + 1e-5)
    bb = cv2.blur(bg * (1 - a), (r, r)) / ((1 - ba) + 1e-5)
    return np.clip(bf + a * (image - a * bf - (1 - a) * bb), 0, 1), bb


def estimate_fg(image: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    f, b = blur_fusion(image, image, image, alpha, 90)
    return blur_fusion(image, f, b, alpha, 7)[0]


def rim_colour(xs: np.ndarray, ys: np.ndarray, cx: float) -> np.ndarray:
    side = 1 / (1 + np.exp(-(xs - cx) / 140.0))                    # 0 left of the person's centre, 1 right
    top = np.clip(1 - ys / (H * 0.45), 0, 1) ** 2
    left, right, above = _cfg["left"][::-1], _cfg["right"][::-1], _cfg["top"][::-1]   # RGB -> BGR frames
    col = (1 - side)[..., None] * left + side[..., None] * right
    return col * (1 - 0.5 * top[..., None]) + above * (0.5 * top[..., None])


def relight(fg: np.ndarray, alpha: np.ndarray, face: dict | None) -> np.ndarray:
    lin = srgb_to_lin(fg) * _cfg["exposure"]
    small = cv2.resize((alpha > 0.5).astype(np.uint8), (W // 2, H // 2), interpolation=cv2.INTER_NEAREST)
    dist = cv2.resize(cv2.distanceTransform(small, cv2.DIST_L2, 5), (W, H)) * 2.0
    rim = np.exp(-dist / RIM_PX) * alpha * _guard
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    falloff = _cfg["falloff"]
    if face:
        fcx, fcy = face["x"] + face["w"] / 2, face["y"] + face["h"] / 2
        ell = ((xs - fcx) / (face["w"] * 0.62)) ** 2 + ((ys - fcy) / (face["h"] * 0.78)) ** 2
        rim *= np.where(ell < 1.0, FACE_RIM_KEEP, 1.0)
        key = np.exp(-(((xs - fcx) / (face["w"] * 1.9)) ** 2 + ((ys - fcy) / (face["h"] * 2.2)) ** 2))
        lin = lin * (falloff + (1 - falloff) * key)[..., None]
        cx = fcx
    else:
        lin, cx = lin * falloff, W / 2
    col = rim_colour(xs, ys, cx)
    lin = lin + _cfg["gain"] * rim[..., None] * col
    lin = lin * (1 + SPILL * (np.clip(1 - dist / 260.0, 0, 1) * alpha)[..., None] * (col - 0.5))
    out = np.clip((lin_to_srgb(lin) - 0.5) * 1.06 + 0.5, 0, 1)    # gentle contrast, a touch warm
    out[..., 2] *= 1.015
    out[..., 0] *= 0.985
    return np.clip(out, 0, 1)


def process(job: tuple[int, bytes, bytes, dict | None, str]) -> int:
    idx, frame_raw, matte_raw, face, out_dir = job
    img = np.frombuffer(frame_raw, np.uint8).reshape(H, W, 3).astype(np.float32) / 255.0
    m = np.frombuffer(matte_raw, np.uint8).reshape(1920, 1080)
    alpha = cv2.resize(m, (W, H), interpolation=cv2.INTER_CUBIC).astype(np.float32) / 255.0
    alpha = np.clip((alpha - 0.04) / 0.92, 0, 1)                   # choke the faint outer halo
    if _clean is not None:
        alpha = clean_leaks(img, alpha, face)
    fg = estimate_fg(img, alpha)
    lit = relight(fg, alpha, face) if _cfg["relight"] else fg
    rgba = np.dstack([lit[..., ::-1] * 255, alpha * 255]).astype(np.uint8)   # BGR -> RGB + alpha
    Image.fromarray(rgba, "RGBA").save(Path(out_dir) / f"f{idx:05d}.webp", quality=90, method=3)
    if _cfg["live"]:
        bg = lin_to_srgb(srgb_to_lin(img) * _cfg["bg_exposure"])
        bg = np.clip((bg - 0.5) * 1.08 + 0.5, 0, 1)             # the person is still in it; the cut-out covers them
        cv2.imwrite(str(Path(out_dir).parent / "bg" / f"b{idx:05d}.jpg"), (bg * 255).astype(np.uint8),
                    [cv2.IMWRITE_JPEG_QUALITY, 88])
    return idx


def live_mode(room: dict) -> bool:
    return room.get("background", "live") == "live"
