"""Step 12: mux the rendered picture with the audio mixes and write the deliverables to project.json "out".

  01 <title> 1080x1920 (upload this).mp4    picture + voice + sound effects
  02 <title> voice only.mp4                 picture + voice (for a platform's own music, or a quieter cut)
  03 COVER <t>s.jpg                         cover frame (project.json cover_t, or the argument)
  04 CONTACT SHEET.jpg                      one frame per second, for a quick look

Usage: python3 deliver.py [COVER_SECONDS]
"""
from __future__ import annotations

import json
import math
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

import config


def run(cmd: list[str]) -> None:
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode:
        sys.exit(f"command failed: {' '.join(cmd[:6])} ...\n{res.stderr[-800:]}")


def duration(path: Path) -> float:
    res = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True)
    try:
        return float(res.stdout.strip())
    except ValueError:
        sys.exit(f"cannot read {path}: {res.stderr.strip()[-300:]}")


def mux(video: Path, audio: Path, dest: Path) -> None:
    part = dest.with_name(dest.stem + ".partial.mp4")
    run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-i", str(audio), "-map", "0:v:0", "-map", "1:a:0",
         "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", "-movflags", "+faststart",
         str(part)])
    part.replace(dest)


def contact_sheet(src: Path, dest: Path) -> None:
    thumbs = []
    with tempfile.TemporaryDirectory() as tmp:
        for s in range(max(1, int(duration(src)))):
            frame = Path(tmp) / f"{s}.jpg"
            run(["ffmpeg", "-v", "error", "-y", "-ss", str(s + 0.5), "-i", str(src), "-frames:v", "1",
                 "-vf", "scale=180:-2", str(frame)])
            with Image.open(frame) as im:
                thumbs.append((s, im.convert("RGB")))
    cols = 11
    w, h = thumbs[0][1].size
    sheet = Image.new("RGB", (cols * w, ((len(thumbs) + cols - 1) // cols) * h), "black")
    draw = ImageDraw.Draw(sheet)
    for i, (s, im) in enumerate(thumbs):
        x, y = (i % cols) * w, (i // cols) * h
        sheet.paste(im, (x, y))
        draw.text((x + 4, y + 4), f"{s}s", fill="yellow")
    sheet.save(dest, quality=88)


def main() -> None:
    work, out = config.work(), config.out()
    video, audio = work / "renders" / "video_only.mp4", work / "renders" / "audio"
    for f in (video, audio / "mix_sfx.wav", audio / "mix_voice.wav"):
        if not f.exists():
            sys.exit(f"missing {f}: run render.py video and build_audio.py first")
    stamp = config.timeline_stamp()
    stamps = ((work / "renders" / "video_only.stamp", "render.py video"), (audio / "timeline.stamp", "build_audio.py"))
    for f, step in stamps:
        if not f.is_file() or f.read_text().strip() != stamp:
            sys.exit(f"the timeline changed after the last `{step}`: run it again before delivering")
    want = json.loads((config.data() / "timeline.json").read_text())["duration"]
    if abs(duration(video) - want) > 1.5 / config.fps():
        sys.exit(f"video_only.mp4 is {duration(video):.3f} s but the timeline is {want:.3f} s: render it again")
    title = re.sub(r"[^\w .,'()-]+", "", str(config.project().get("title", "Reel"))).strip() or "Reel"
    master = out / f"01 {title} 1080x1920 (upload this).mp4"
    mux(video, audio / "mix_sfx.wav", master)
    mux(video, audio / "mix_voice.wav", out / f"02 {title} voice only.mp4")
    try:
        cover_t = float(sys.argv[1]) if len(sys.argv) > 1 else float(config.project().get("cover_t", 1.0))
    except ValueError:
        sys.exit(__doc__)
    if not math.isfinite(cover_t):
        sys.exit("the cover time must be a number of seconds")
    cover_t = min(max(0.0, cover_t), duration(master) - 0.05)
    # -update 1: one image, so a % in the folder name is never read as a frame-number pattern
    run(["ffmpeg", "-v", "error", "-y", "-ss", f"{cover_t}", "-i", str(master), "-frames:v", "1", "-update", "1",
         "-q:v", "2", str(out / f"03 COVER {cover_t:.2f}s.jpg")])
    contact_sheet(master, out / "04 CONTACT SHEET.jpg")
    print(f"picture {duration(video):.3f} s, master {duration(master):.3f} s -> {out}")


if __name__ == "__main__":
    main()
