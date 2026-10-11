"""Steps 9 to 11: QA stills and checks, the sound cue list, and the render, by driving compositor/index.html frame
by frame in headless Chromium.

Frames stream straight into ffmpeg; nothing is stored per frame.

Usage:
  python3 render.py stills N [N ...]     QA stills (output frame numbers) -> <work>/qa/stills/fNNNN.png
  python3 render.py video [FROM TO]       picture only -> <work>/renders/video_only.mp4 (or a range of frames)
  python3 render.py sfx                   the sound cue list -> data/sfx_events.json (build_audio.py reads it)
  python3 render.py safecheck [STEP]      graphics and text only, every STEP-th frame (default 1); fails if any ink
                                          leaves the Instagram safe zone
  python3 render.py facecheck [STEP]      fails if captions or front graphics cover the face (brow to upper lip; for
                                          captions also 40 px under the mouth) on any checked frame (every STEP-th,
                                          default 3); names the fix
  python3 render.py glyphs                checks the letter gaps of every caption word at the size it is shown and
                                          fails if a pair could not be opened to the minimum ink gap

Browser: Playwright's Chromium (`python3 -m playwright install chromium`), or set SNAPCUT_CHROME to another
Chromium-based binary. The page loads Unbounded and IBM Plex Mono from Google Fonts (tools/brand.py FONT_CSS): the
only network request it is allowed to make, so rendering needs an internet connection.
"""
from __future__ import annotations

import base64
import io
import json
import os
import re
import subprocess
import sys
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from PIL import Image
from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

import brand
import config
import icons

SAFE = (65, 269, 1015, 1248)   # Instagram reel safe zone in the 1080x1920 frame (x0, y0, x1, y1)
INK_ALPHA = 24                 # alpha above which a pixel counts as ink (soft glows fade below it)
FONTS = [  # (family the compositor asks for, weight, style, file in the font cache; see tools/fetch_fonts.sh)
    ("Satoshi", "300 900", "normal", "satoshi/Satoshi-Variable.ttf"),
]   # Unbounded and IBM Plex Mono come from Google Fonts through compositor/index.html (brand.FONT_CSS)
ARGS = ["--force-color-profile=srgb", "--font-render-hinting=none", "--disable-lcd-text", "--hide-scrollbars"]
NETWORK = re.compile(r"^(https?|wss?|ftp):", re.I)   # beat code must not reach the network: only the brand fonts load
ENCODE =["-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p", "-c:v", "libx264", "-preset", "slow",
          "-crf", "15", "-profile:v", "high", "-level", "4.2", "-color_primaries", "bt709", "-color_trc", "bt709",
          "-colorspace", "bt709", "-movflags", "+faststart"]


def need(path: Path, hint: str) -> Path:
    if not path.exists():
        sys.exit(f"missing {path}: {hint}")
    return path


def load_fonts() -> list[dict]:
    root = Path(os.environ.get("SNAPCUT_FONT_DIR", config.cache() / "fonts"))
    missing = [f for *_, f in FONTS if not (root / f).is_file()]
    if missing:
        sys.exit(f"fonts missing in {root}: {missing}; run tools/fetch_fonts.sh (it asks you to accept the "
                 "Fontshare licence for Satoshi)")
    return [{"family": fam, "weight": w, "style": s, "b64": base64.b64encode((root / f).read_bytes()).decode()}
            for fam, w, s, f in FONTS]


def load_paths() -> dict:
    work, room = config.work(), config.work() / "room"
    hint = "run tools/prep_assets.py"
    paths = {
        "fg": need(work / "fg", "run tools/build_base.py frames").as_uri(),
        "plateBase": need(room / "plate_base.jpg", hint).as_uri(),
        "plateLights": need(room / "plate_lights.jpg", hint).as_uri(),
        "plateBlur": need(room / "plate_blur.jpg", hint).as_uri(),
        "plates": [dict(p, dir=Path(p["dir"]).as_uri())
                   for p in json.loads(need(config.data() / "plates.json", hint).read_text())],
        "images": {name: need(config.resolve(f), "fix project.json images").as_uri()
                   for name, f in (config.project().get("images") or {}).items()},
    }
    if config.section("room").get("background", "live") == "live":
        paths["bg"] = need(work / "bg", "run tools/build_base.py frames").as_uri()
    if config.section("studio"):
        paths["studio"] = need(work / "studio", hint).as_uri()
        paths["studioFrames"] = config.frames_in(work / "studio", "s[0-9][0-9][0-9][0-9].jpg")
    return paths


def load_data() -> dict:
    track = config.data() / "track.json"
    return {"timeline": json.loads(need(config.data() / "timeline.json", "run tools/build_timeline.py").read_text()),
            "fonts": load_fonts(), "icons": icons.load(), "paths": load_paths(),
            "track": json.loads(track.read_text()) if track.is_file() else None}


def chrome() -> str | None:
    exe = os.environ.get("SNAPCUT_CHROME")
    if exe and not Path(exe).is_file():
        sys.exit(f"SNAPCUT_CHROME points at {exe}, which does not exist")
    return exe


@contextmanager
def compositor(transparent: bool = False) -> Iterator[tuple]:
    """The initialised compositor page. The browser is closed on every exit path."""
    data = load_data()
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(executable_path=chrome(), args=ARGS)
        except PlaywrightError as err:
            sys.exit(f"cannot start Chromium ({str(err).splitlines()[0]}); run `python3 -m playwright install "
                     "chromium`, or set SNAPCUT_CHROME to a Chromium or Chrome binary")
        try:
            page = browser.new_page(viewport={"width": 1080, "height": 1920}, device_scale_factor=1)
            errors: list[str] = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.route(NETWORK, brand.gate)   # refuses everything but the brand fonts, redirects included
            page.goto((config.ROOT / "compositor/index.html").as_uri())
            if transparent:
                page.evaluate("() => { document.documentElement.style.background = 'transparent'; "
                              "document.body.style.background = 'transparent'; }")
            info = page.evaluate("data => M.init(data)", data)
            if errors:
                raise RuntimeError("compositor errors: " + " | ".join(errors))
            yield page, info, errors
        finally:
            browser.close()


def shot(page, n: int, errors: list[str], ink: str | None = None) -> bytes:
    """Frame n as PNG. ink 'all' or 'front': graphics and text only, on transparency (see compositor/main.js)."""
    page.evaluate("([n, ink]) => M.renderFrame(n, { ink })", [n, ink or False])
    if errors:
        raise RuntimeError(f"frame {n}: " + " | ".join(errors))
    return page.screenshot(type="png", clip={"x": 0, "y": 0, "width": 1080, "height": 1920},
                           omit_background=bool(ink))


def stills(frames: list[int]) -> None:
    out = config.work() / "qa" / "stills"
    out.mkdir(parents=True, exist_ok=True)
    with compositor() as (page, info, errors):
        bad = [n for n in frames if not 0 <= n < info["frames"]]
        if bad:
            sys.exit(f"frames {bad} outside 0..{info['frames'] - 1}")
        for n in frames:
            (out / f"f{n:04d}.png").write_bytes(shot(page, n, errors))
    print(f"{len(frames)} stills -> {out}")


def encode(page, errors: list[str], a: int, b: int, dest: Path) -> None:
    # encode to a temporary name and rename only after every frame is in, so a failed render can never leave a
    # valid-but-truncated video for deliver.py to ship
    part = dest.with_name(dest.stem + ".partial.mp4")
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "image2pipe", "-framerate",
           str(config.fps()), "-c:v", "png", "-i", "-", *ENCODE, str(part)]
    start = time.time()
    enc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    try:
        for n in range(a, b):
            frame = shot(page, n, errors)
            try:
                enc.stdin.write(frame)
            except BrokenPipeError:
                raise RuntimeError(f"ffmpeg stopped taking frames at {n} (see its message above)") from None
            if n % 150 == 0:
                print(f"frame {n}/{b} ({(n - a + 1) / max(1e-6, time.time() - start):.1f} fps)", flush=True)
    finally:
        try:
            enc.stdin.close()
        except BrokenPipeError:
            pass
        code = enc.wait()
    if code:
        part.unlink(missing_ok=True)
        sys.exit(f"ffmpeg failed with exit code {code}")
    part.replace(dest)
    print(f"{b - a} frames in {time.time() - start:.0f} s -> {dest}")


def video(first: int | None, last: int | None) -> None:
    renders = config.work() / "renders"
    renders.mkdir(parents=True, exist_ok=True)
    stamp = config.timeline_stamp()                       # the timeline this picture is rendered from
    with compositor() as (page, info, errors):
        a, b = first or 0, (last if last is not None else info["frames"])
        if not 0 <= a < b <= info["frames"]:
            sys.exit(f"range {a}..{b} outside 0..{info['frames']}")
        whole = (a, b) == (0, info["frames"])
        if whole:
            (renders / "video_only.stamp").unlink(missing_ok=True)
        encode(page, errors, a, b, renders / ("video_only.mp4" if whole else f"video_{a}_{b}.mp4"))
        if whole:
            (renders / "video_only.stamp").write_text(stamp)


def sfx() -> None:
    with compositor() as (page, info, _):
        events = page.evaluate("() => M.sfxEvents()")
    # the timeline's fingerprint travels with the cues, so build_audio.py can refuse cues from an older cut
    (config.data() / "sfx_events.json").write_text(json.dumps({"timeline": config.timeline_stamp(),
                                                               "events": events}, indent=0))
    print(f"{len(events)} sound cues -> {config.data() / 'sfx_events.json'}")


def safecheck(step: int) -> None:
    if step < 1:
        sys.exit("safecheck STEP must be 1 or more")
    x0, y0, x1, y1 = SAFE
    fails = []
    with compositor(transparent=True) as (page, info, errors):
        for n in range(0, info["frames"], step):
            alpha = Image.open(io.BytesIO(shot(page, n, errors, ink="all"))).getchannel("A")
            box = alpha.point(lambda v: 255 if v > INK_ALPHA else 0).getbbox()
            if box and (box[0] < x0 or box[1] < y0 or box[2] > x1 or box[3] > y1):
                fails.append((n, box))
    for n, box in fails[:300]:
        print(f"frame {n} ({n / config.fps():.2f} s): ink box {box} leaves the safe zone {SAFE}")
    if fails:
        sys.exit(f"{len(fails)} frames put ink outside the safe zone")
    print(f"safe zone ok on every checked frame (step {step})")


FACE_INK = 0.05               # share of the face box (brow to upper lip) that solid front-layer ink may cover
FACE_ALPHA = 128              # solid ink only: soft shadows and glows spilling onto the face do not count
FACE_MIN_S = 0.2              # shorter spans are a graphic passing across (an entrance overshoot), not sitting on it


def ink_on_face(page, errors: list[str], n: int) -> float:
    box = page.evaluate("n => M.faceBox(n)", n)
    if not box:
        return 0.0
    x0, y0 = max(0, int(box["x0"])), max(0, int(box["y0"]))
    x1, y1 = min(1080, int(box["x1"])), min(1920, int(box["y1"]))
    if x1 <= x0 or y1 <= y0:
        return 0.0
    alpha = Image.open(io.BytesIO(shot(page, n, errors, ink="front"))).getchannel("A").crop((x0, y0, x1, y1))
    hist = alpha.histogram()
    return sum(hist[FACE_ALPHA + 1:]) / ((x1 - x0) * (y1 - y0))


def spans(frames: list[int], step: int) -> list[tuple[int, int]]:
    out: list[tuple[int, int]] = []
    for n in frames:
        if out and n - out[-1][1] <= step:
            out[-1] = (out[-1][0], n)
        else:
            out.append((n, n))
    return out


def facecheck(step: int) -> None:
    if step < 1:
        sys.exit("facecheck STEP must be 1 or more")
    fps = config.fps()
    with compositor(transparent=True) as (page, info, errors):
        report = page.evaluate("() => M.captionFaceReport()")
        covered = [n for n in range(0, info["frames"], step) if ink_on_face(page, errors, n) > FACE_INK]
    bad = [r for r in report if r["overlap"] > 0.25]
    for r in bad:
        print(f"caption at {max(0.0, r['t_in']):6.2f} s covers the face {r['overlap'] * 100:3.0f}% of the time: "
              f"{r['text']}")
    long_spans = [(a, b) for a, b in spans(covered, step) if (b - a + step) / fps > FACE_MIN_S + 1e-6]
    for a, b in long_spans:
        print(f"graphics or captions on the face {a / fps:6.2f}-{b / fps:6.2f} s (frames {a}-{b})")
    if bad or long_spans:
        pos = (config.plan().get("captions") or {}).get("position", "bottom")
        other = "top" if pos == "bottom" else "bottom"
        fix = (f"captions: try plan.json \"captions\": {{\"position\": \"{other}\"}}, or reframe with camera.base_zoom"
               " / face_y. " if bad else "")
        opener = (json.loads((config.data() / "timeline.json").read_text()).get("brand") or {}).get("opener")
        if opener and any(a / fps < opener["t1"] for a, _ in long_spans):
            fix += ("The level tag opener (top left, first 2 s) may be the one on the face: frame the face lower with "
                    "plan.json camera.face_y. ")
        sys.exit(f"{fix}Graphics: move them in compositor/beats.js (look at `render.py stills` of those frames), "
                 "then run this again")
    print(f"face clear of captions and front graphics (every {step} frames)")


def glyphs() -> None:
    """Every caption word, laid out at the size it is shown: the tightest letter pairs, and a failure if any two
    letters stay closer than the compositor's minimum ink gap (it opens such pairs up to 12 px; this catches a
    pair it could not open). Words drawn whole (joined scripts) are not measured."""
    with compositor() as (page, _, errors):
        report = page.evaluate("() => M.glyphReport()")
        if errors:
            raise RuntimeError(" | ".join(errors))
    for r in report["worst"]:
        print(f"{r['word']:>16} {r['size']:6.1f} px  {r['pair']!r:6}  gap {r['min']:5.2f} px  opened {r['opened']:4.1f} px")
    if report["below"]:
        sys.exit(f"{report['below']} letter pairs closer than {report['minGap']} px (the tightest are above)")
    print(f"{report['pairs']} letter pairs, none closer than {report['minGap']} px")


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    mode, rest = sys.argv[1], sys.argv[2:]
    if not all(x.isdigit() for x in rest):
        sys.exit(__doc__)
    nums = [int(x) for x in rest]
    try:
        run(mode, nums)
    except (PlaywrightError, RuntimeError) as err:      # compositor errors: one clear line, not a traceback
        msg = (str(err).replace("Page.evaluate: Error: ", "").splitlines() or [repr(err)])[0]
        sys.exit(f"render failed: {msg}")


def run(mode: str, nums: list[int]) -> None:
    if mode == "stills" and nums:
        stills(nums)
    elif mode == "video" and len(nums) in (0, 2):
        video(*(nums or [None, None]))
    elif mode == "sfx" and not nums:
        sfx()
    elif mode == "safecheck" and len(nums) <= 1:
        safecheck(nums[0] if nums else 1)
    elif mode == "facecheck" and len(nums) <= 1:
        facecheck(nums[0] if nums else 3)
    elif mode == "glyphs" and not nums:
        glyphs()
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
