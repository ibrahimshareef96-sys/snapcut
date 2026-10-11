"""Start a snapcut project for one take: copy the tools and the compositor, write project.json and a plan.json stub.

Usage:
  python3 scripts/new_project.py PROJECT_DIR --source VIDEO [--work DIR] [--out DIR] [--title TITLE]
                                 [--example snap-reel] [--brand none|shareefico]

  PROJECT_DIR   a new (or empty) folder for this video's code and small JSON files
  --source      the vertical 9:16 take (a phone's .MOV or .mp4)
  --work        where heavy media goes (mattes, cut-out frames, renders; several GB): default PROJECT_DIR/work.
                Use an external drive if the internal one is tight.
  --out         the deliverables folder: default PROJECT_DIR/deliverables
  --example     also copy a worked example's beat files and plan (as plan.example.json) to learn from
  --brand       none (default): no level tag opener and no end beat, so nobody else's handle lands on your video.
                shareefico: Ibrahim Shareef's own package (the opener and the end beat with @shareefico); his marks,
                for his videos only.

Nothing is copied over existing files: the command refuses a PROJECT_DIR that is not empty.
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
EXAMPLES = SKILL / "examples"


def args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("project")
    ap.add_argument("--source", required=True)
    ap.add_argument("--work")
    ap.add_argument("--out")
    ap.add_argument("--title", default="Reel")
    ap.add_argument("--example", choices=sorted(p.name for p in EXAMPLES.iterdir() if p.is_dir()))
    ap.add_argument("--brand", choices=sorted(BRANDS), default="none")
    return ap.parse_args()


def project_json(a: argparse.Namespace, dest: Path) -> dict:
    src = Path(a.source).expanduser().resolve()
    if not src.is_file():
        sys.exit(f"source video not found: {src}")
    return {
        "title": a.title,
        "source": str(src),
        "work": str(Path(a.work).expanduser().resolve()) if a.work else "work",
        "out": str(Path(a.out).expanduser().resolve()) if a.out else "deliverables",
        "cover_t": 1.0,
        "vocab": "",
        "room": {"relight": True, "plate": None},
        "studio": {"enabled": False},
        "explosion": {"enabled": False, "plates": []},
        "icons": {},
        "images": {},
    }


# plan.json "brand" per --brand. The opener and the end beat carry Ibrahim Shareef's marks, so they are off unless
# he starts the project as his own.
BRANDS = {
    "none": {"tier": "uncommon", "opener": False, "end_beat": False},
    "shareefico": {"tier": "uncommon", "opener": {"topic": ""},
                   "end_beat": {"cta": "@shareefico", "bubble": "FOLLOW @SHAREEFICO"}},
}

PLAN_STUB = {
    "_about": "Write this from the transcript (references/02-plan-the-edit.md). Source seconds throughout.",
    "trim": None,
    "cuts": [],
    "word_fixes": {},
    "onset_fixes": [],
    "events": {},
    "beats": {},
    "phrases": [],
    "captions": {"position": "bottom"},
    "brand": None,   # filled from BRANDS by --brand
    "camera": {"base_zoom": 1.15, "face_y": 650, "punch": 1.12, "hits": {}},
    "look": {},
}


def main() -> None:
    a = args()
    dest = Path(a.project).expanduser().resolve()
    if dest == SKILL or SKILL in dest.parents:
        sys.exit(f"{dest} is inside the skill's own folder; put the project somewhere else (nothing was copied)")
    if dest.exists() and any(dest.iterdir()):
        sys.exit(f"{dest} is not empty; pick a new folder (nothing was copied)")
    cfg = project_json(a, dest)
    dest.mkdir(parents=True, exist_ok=True)
    ignore = shutil.ignore_patterns("__pycache__", "*.pyc", "visiontool", "._*", ".DS_Store")
    shutil.copytree(SKILL / "template" / "tools", dest / "tools", ignore=ignore)
    shutil.copytree(SKILL / "template" / "compositor", dest / "compositor", ignore=ignore)
    (dest / "project.json").write_text(json.dumps(cfg, indent=2) + "\n")
    (dest / "plan.json").write_text(json.dumps({**PLAN_STUB, "brand": BRANDS[a.brand]}, indent=2) + "\n")
    # if the project is ever put under git, keep the footage, renders and transcript out of it
    (dest / ".gitignore").write_text("work/\ndata/\ndeliverables/\ntools/visiontool\n__pycache__/\n._*\n")
    if a.example:
        ex = EXAMPLES / a.example
        shutil.copytree(ex / "compositor", dest / "example-compositor", ignore=ignore)
        shutil.copy2(ex / "plan.json", dest / "plan.example.json")
        shutil.copy2(ex / "project.json", dest / "project.example.json")
    print(f"project ready: {dest}\nnext: python3 {dest / 'tools' / 'transcribe.py'}")


if __name__ == "__main__":
    main()
