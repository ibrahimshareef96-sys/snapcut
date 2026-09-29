"""Project settings shared by every snapcut tool.

A video project is a folder with two JSON files next to `tools/` and `compositor/`:
  project.json   where things are (the take, the heavy-media folder, the deliverables folder) and which effects run
  plan.json      the creative plan written for this take: cuts, caption phrases, the words each beat lands on

Every path in project.json may be absolute or relative to the project folder. Nothing here writes files.
"""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # the project folder (holds project.json)


def _die(msg: str) -> None:
    sys.exit(f"snapcut: {msg}")


@lru_cache(maxsize=1)
def project() -> dict:
    path = ROOT / "project.json"
    if not path.is_file():
        _die(f"no project.json in {ROOT} (start a project with the skill's scripts/new_project.py)")
    try:
        cfg = json.loads(path.read_text())
    except json.JSONDecodeError as err:
        _die(f"project.json is not valid JSON: {err}")
    for key in ("source", "work", "out"):
        if not cfg.get(key):
            _die(f"project.json needs '{key}'")
    return cfg


@lru_cache(maxsize=1)
def plan() -> dict:
    path = ROOT / "plan.json"
    if not path.is_file():
        _die(f"no plan.json in {ROOT} (write it from the transcript, see references/02-plan-the-edit.md)")
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError as err:
        _die(f"plan.json is not valid JSON: {err}")
    return {}


def resolve(p: str | Path) -> Path:
    p = Path(p).expanduser()
    return p if p.is_absolute() else (ROOT / p).resolve()


def source() -> Path:
    src = resolve(project()["source"])
    if not src.is_file():
        _die(f"source video not found: {src}")
    return src


def data() -> Path:
    """Small JSON for this project (words, face track, timeline, cue list): kept inside the project folder."""
    d = ROOT / "data"
    d.mkdir(exist_ok=True)
    return d


def work() -> Path:
    """Heavy media (matte, foreground frames, renders). Must exist: an external drive that is not mounted fails here."""
    w = resolve(project()["work"])
    if not w.parent.is_dir():
        _die(f"work folder's parent is missing (drive not mounted?): {w.parent}")
    w.mkdir(parents=True, exist_ok=True)
    return w


def out() -> Path:
    o = resolve(project()["out"])
    if not o.parent.is_dir():
        _die(f"deliverables folder's parent is missing: {o.parent}")
    o.mkdir(parents=True, exist_ok=True)
    return o


FPS = 30                     # the compositor's clock (compositor/engine.js); every take is edited at 30 fps


def fps() -> int:
    if int(project().get("fps", FPS)) != FPS:
        _die(f"project.json fps must be {FPS} (sources at other rates are resampled, see references/07-pitfalls.md)")
    return FPS


def section(name: str) -> dict:
    """An effect's settings; {} when the effect is off or absent."""
    s = project().get(name) or {}
    return s if s.get("enabled", True) else {}


def frames_in(folder: Path, pattern: str = "[!.]*.jpg") -> int:
    """Count frames, skipping the macOS '._' sidecars exFAT drives collect."""
    return len(list(folder.glob(pattern)))


@lru_cache(maxsize=1)
def probe() -> dict:
    """The source's picture as a viewer sees it: {w, h, fps, transfer}. A portrait iPhone file reports 3840x2160
    plus a rotation, so w and h are swapped back here."""
    res = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                          "stream=width,height,r_frame_rate,color_transfer:stream_side_data=rotation", "-of", "json",
                          str(source())], capture_output=True, text=True)
    if res.returncode:
        _die(f"ffprobe cannot read the source: {res.stderr.strip()[-300:]}")
    streams = json.loads(res.stdout).get("streams") or []
    if not streams:
        _die("the source has no video stream")
    st = streams[0]
    rot = next((d.get("rotation", 0) for d in st.get("side_data_list", []) if "rotation" in d), 0)
    rot = abs(int(float(rot))) % 360
    w, h = (st["height"], st["width"]) if rot in (90, 270) else (st["width"], st["height"])
    num, _, den = st.get("r_frame_rate", "30/1").partition("/")
    return {"w": w, "h": h, "fps": float(num) / float(den or 1), "transfer": st.get("color_transfer", "")}


def require_portrait() -> dict:
    """The pipeline frames a 9:16 vertical take. Anything else fails here, before hours of work."""
    p = probe()
    if abs(p["w"] / p["h"] - 9 / 16) > 0.01:
        _die(f"the source is {p['w']}x{p['h']}; snapcut edits 9:16 vertical takes (crop it first, "
             "see references/07-pitfalls.md)")
    if p["transfer"] in ("arib-std-b67", "smpte2084"):
        _die("the source is HDR (HLG or PQ); convert it to SDR first, see references/07-pitfalls.md")
    return p


def trim() -> tuple[float, float]:
    t = plan().get("trim") or []
    ok = (isinstance(t, list) and len(t) == 2 and all(isinstance(x, (int, float)) and not isinstance(x, bool)
                                                        for x in t) and 0 <= t[0] < t[1])
    if not ok:
        _die('plan.json needs "trim": [start, end] in source seconds, start before end')
    return float(t[0]), float(t[1])


def timeline_stamp() -> str:
    """Fingerprint of data/timeline.json. The cue list, the rendered picture and the audio mixes record the one they
    were made from, so a later step can refuse output from an older cut."""
    path = data() / "timeline.json"
    if not path.is_file():
        _die("no timeline yet: run tools/build_timeline.py")
    return hashlib.sha256(path.read_bytes()).hexdigest()[:16]


def cache() -> Path:
    """Per-user downloads shared by every project (fonts, brand icons): never inside the skill's git folder."""
    c = Path(os.environ.get("SNAPCUT_CACHE", "~/.cache/snapcut")).expanduser()
    c.mkdir(parents=True, exist_ok=True)
    return c
