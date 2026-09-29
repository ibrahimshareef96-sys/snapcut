"""Check plan.json's shape before anything is built, and name every problem at once (not one traceback at a time).

The rules follow references/02-plan-the-edit.md. Only the shape is checked here; whether the words match the
transcript is build_timeline.py's job.
"""
from __future__ import annotations

from sfx_kit import KINDS

SIZES = ("s", "m", "l", "xl")


def _num(x: object) -> bool:
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def _beats(plan: dict) -> list[str]:
    out = []
    beats = plan.get("beats") or {}
    if not isinstance(beats, dict):
        return ["beats must be an object: {\"key\": {\"word\": \"...\"}}"]
    for key, spec in beats.items():
        if not isinstance(spec, dict) or not isinstance(spec.get("word"), str) or not spec["word"].strip():
            out.append(f'beats.{key}: "word" is required (the spoken word the beat lands on)')
        elif "after" in spec and not _num(spec["after"]):
            out.append(f'beats.{key}: "after" must be a number of seconds')
    for key, t in (plan.get("events") or {}).items():
        if not _num(t):
            out.append(f"events.{key} must be a number of seconds")
    for i, f in enumerate(plan.get("onset_fixes") or []):
        ok = isinstance(f, dict) and isinstance(f.get("word"), str) and _num(f.get("start")) and _num(f.get("onset"))
        if not ok:
            out.append(f'onset_fixes[{i}] needs "word", "start" and "onset"')
    if "end" in plan and plan["end"] is not None and not _num(plan["end"]):
        out.append('"end" must be a number of seconds')
    return out


def _phrases(plan: dict) -> list[str]:
    out = []
    for i, ph in enumerate(plan.get("phrases") or [], 1):
        if not isinstance(ph, dict):
            out.append(f"phrases[{i}] must be an object")
        elif "dm" in ph:
            if not isinstance(ph["dm"], str) or not ph["dm"].strip():
                out.append(f'phrases[{i}].dm must be the question, as spoken')
        elif not isinstance(ph.get("lines"), list) or not ph["lines"]:
            out.append(f'phrases[{i}] needs "lines": [[text, size], ...] (or "dm")')
        else:
            for ln in ph["lines"]:
                if not (isinstance(ln, list) and len(ln) == 2 and isinstance(ln[0], str) and ln[1] in SIZES):
                    out.append(f'phrases[{i}]: each line is [text, size] with size one of {", ".join(SIZES)}: {ln!r}')
    return out


def _look(plan: dict) -> list[str]:
    out, look = [], plan.get("look") or {}
    for name in ("shakes", "light_flares", "caption_flips", "sfx"):
        for i, s in enumerate(look.get(name) or []):
            if not isinstance(s, dict) or not isinstance(s.get("beat"), str):
                out.append(f'look.{name}[{i}] needs "beat"')
            elif name == "sfx" and s.get("kind") not in KINDS:
                out.append(f"look.sfx[{i}].kind must be one of the kinds in tools/sfx_kit.py, not {s.get('kind')!r}")
    for name in ("stutter", "push"):
        s = look.get(name)
        ends = isinstance(s, dict) and isinstance(s.get("from"), str) and isinstance(s.get("to"), str)
        if s is not None and not ends:
            out.append(f'look.{name} needs "from" and "to" beats')
    hits = (plan.get("camera") or {}).get("hits") or {}
    out += [f"camera.hits.{k} must be a zoom like 1.1" for k, z in hits.items() if not _num(z)]
    return out


def problems(plan: dict) -> list[str]:
    return _beats(plan) + _phrases(plan) + _look(plan)
