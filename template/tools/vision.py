"""Step 4 (macOS): the person matte and the face track, with Apple Vision on this Mac (nothing is uploaded).

Compiles tools/visiontool.swift on first use, then writes:
  <work>/matte/matte.mkv          person matte, lossless gray 1080x1920, one frame per output frame (project fps)
  data/facetrack_raw.jsonl         the largest face per source frame, oriented source pixels, absolute seconds

The range is the plan's trim plus 0.5 s either side, unless project.json sets "matte": {"start", "end"}.

Usage: python3 vision.py
"""
from __future__ import annotations

import json
import math
import platform
import subprocess
import sys
from pathlib import Path

import config

HERE = Path(__file__).resolve().parent
TOOL = HERE / "visiontool"
PAD = 0.5


def build_tool() -> None:
    if platform.system() != "Darwin":
        sys.exit("the matte and face track need macOS (Apple Vision); see references/07-pitfalls.md")
    src = HERE / "visiontool.swift"
    if not TOOL.exists() or TOOL.stat().st_mtime < src.stat().st_mtime:
        res = subprocess.run(["swiftc", "-O", str(src), "-o", str(TOOL)])
        if res.returncode:
            sys.exit("swiftc failed: install the Xcode command line tools (xcode-select --install)")


def matte_range() -> tuple[float, float]:
    m = config.project().get("matte") or {}
    if m.get("start") is not None and m.get("end") is not None:
        start, end = float(m["start"]), float(m["end"])
    else:
        a, b = config.trim()
        start, end = max(0.0, a - PAD), b + PAD
    fps = config.fps()
    # on frame boundaries, so matte frame k is exactly source frame start*fps + k
    start, end = math.floor(start * fps + 1e-6) / fps, math.ceil(end * fps - 1e-6) / fps
    if end <= start:
        sys.exit(f"matte range {start}-{end} is empty")
    return start, end


def write_matte(start: float, dur: float) -> tuple[Path, float]:
    """The matte into matte.partial.mkv; returns it and the end second actually covered."""
    out = config.work() / "matte"
    out.mkdir(parents=True, exist_ok=True)
    part = out / "matte.partial.mkv"
    src_fps = config.probe()["fps"]
    # visiontool emits one matte per SOURCE frame; ffmpeg resamples them to the project fps, so matte frame k is
    # always start + k / fps, the same clock build_base.py reads the picture on
    vt = subprocess.Popen([str(TOOL), "matte", str(config.source()), f"{start}", f"{dur}", "1080", "1920"],
                          stdout=subprocess.PIPE)
    ff = subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "gray", "-s", "1080x1920",
                         "-r", f"{src_fps}", "-i", "-", "-vf", f"fps={config.fps()}", "-c:v", "ffv1", str(part)],
                        stdin=vt.stdout)
    vt.stdout.close()
    if vt.wait() or ff.returncode:
        part.unlink(missing_ok=True)
        sys.exit("matte failed (see the error above)")
    res = subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries",
                          "stream=nb_read_frames", "-of", "csv=p=0", str(part)], capture_output=True, text=True)
    if res.returncode or not res.stdout.strip().isdigit() or int(res.stdout.strip()) == 0:
        part.unlink(missing_ok=True)
        sys.exit(f"the matte came out empty or unreadable: {res.stderr.strip()[-300:]}")
    # the range can run past the end of the take: record what was really written
    return part, start + int(res.stdout.strip()) / config.fps()


def write_facetrack(start: float, dur: float, matte_part: Path) -> Path:
    """The face track into facetrack_raw.partial; on failure the new matte is thrown away too."""
    part = config.data() / "facetrack_raw.partial"
    with open(part, "w") as fh:
        res = subprocess.run([str(TOOL), "facetrack", str(config.source()), f"{start}", f"{dur}"], stdout=fh)
    recs = [json.loads(line) for line in part.read_text().splitlines() if line.strip()] if not res.returncode else []
    found = sum(1 for r in recs if not r.get("none"))
    if not found:
        part.unlink(missing_ok=True)
        matte_part.unlink(missing_ok=True)
        sys.exit("face track failed" if res.returncode else
                 "no face found anywhere in the range; snapcut needs a face on camera")
    print(f"face found on {found} of {len(recs)} frames")
    return part


def main() -> None:
    config.require_portrait()
    build_tool()
    start, end = matte_range()
    matte_part, covered = write_matte(start, end - start)
    track_part = write_facetrack(start, end - start, matte_part)
    # both succeeded: swap them in together, so a later step never pairs a new matte with an old face track
    matte = config.work() / "matte" / "matte.mkv"
    track = config.data() / "facetrack_raw.jsonl"
    matte_part.replace(matte)
    track_part.replace(track)
    (matte.parent / "matte.json").write_text(json.dumps({"start": start, "end": covered, "fps": config.fps()}))
    print(f"matte {start:.2f}-{covered:.2f} s -> {matte}\nface track -> {track}")


if __name__ == "__main__":
    main()
