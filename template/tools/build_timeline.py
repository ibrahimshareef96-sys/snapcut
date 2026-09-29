"""Step 5: build data/timeline.json: the cut (source -> output time), captions, beats and the virtual camera.

Everything creative comes from plan.json (see references/02-plan-the-edit.md). The builder finds each caption line's
first word in the refined transcript, so lines appear on their spoken word, and it FAILS unless every spoken word is
covered exactly once, in order. Nothing is guessed: a beat word that cannot be found stops the build.

Usage: python3 build_timeline.py [--no-cuts]
"""
from __future__ import annotations

import json
import re
import sys

import config
import plan_check

WORK = config.data()          # small JSON inside the project (words, face track, timeline)
PLAN = config.plan()
FPS = config.fps()
TRIM = config.trim()
FIX = {k.lower(): v.lower() for k, v in (PLAN.get("word_fixes") or {}).items()}


def bare(w: str) -> str:
    """Lower case, letters and digits of any script and apostrophes only: "Claude," -> "claude", "À" -> "à"."""
    return re.sub(r"[^\w']|_", "", w.lower().replace("’", "'"))


def norm(w: str) -> str:
    w = bare(w)
    return FIX.get(w, w)


def cut_list() -> list[tuple[float, float]]:
    cuts = PLAN.get("cuts") or []
    if not all(isinstance(c, list) and len(c) == 2 and all(isinstance(x, (int, float)) for x in c) for c in cuts):
        sys.exit("plan.json cuts must be [[from, to], ...] in source seconds")
    return sorted((float(a), float(b)) for a, b in cuts)


def segments(no_cuts: bool, src_out: float) -> list[dict]:
    keep, t = [], TRIM[0]
    for a, b in ([] if no_cuts else cut_list()):
        if not TRIM[0] < a < b < src_out:
            sys.exit(f"cut {a}-{b} is outside the trim {TRIM[0]}-{src_out}")
        if a <= t:
            sys.exit(f"cut {a}-{b} overlaps or touches the cut before it (which ends at {t}); merge them")
        keep.append((t, a))
        t = b
    keep.append((t, src_out))
    out, acc = [], 0
    for a, b in keep:
        a_f, b_f = round(a * FPS), round(b * FPS)                   # frame-aligned
        if b_f <= a_f:
            sys.exit(f"the part kept between {a} and {b} s is shorter than a frame; merge the cuts around it")
        out.append({"src_in": a_f / FPS, "src_out": b_f / FPS, "out_in": acc / FPS})
        acc += b_f - a_f
    for s in out:
        s["out_out"] = s["out_in"] + (s["src_out"] - s["src_in"])
    return out


def to_out(src_t: float, segs: list[dict]) -> float:
    for s in segs:
        if src_t < s["src_in"]:
            return s["out_in"]                                      # inside a cut: snap to the next segment
        if src_t <= s["src_out"]:
            return s["out_in"] + (src_t - s["src_in"])
    return segs[-1]["out_out"]


def need(name: str, step: str) -> str:
    path = WORK / name
    if not path.is_file():
        sys.exit(f"missing {path}: run {step} first")
    return path.read_text()


def load_words(src_out: float) -> list[dict]:
    words = json.loads(need("words_refined.json", "tools/transcribe.py"))
    last_word = PLAN.get("last_word_t", src_out)
    kept = [w for w in words if TRIM[0] - 0.05 <= w["s"] <= last_word]
    fixes = PLAN.get("onset_fixes") or []
    used = set()
    for w in kept:
        for i, f in enumerate(fixes):
            if norm(w["w"]) == norm(f["word"]) and abs(w["s"] - f["start"]) < 0.03:
                w["s"] = f["onset"]
                used.add(i)
    missing = [fixes[i] for i in range(len(fixes)) if i not in used]
    if missing:
        sys.exit(f"onset fixes that matched no word (transcript changed?): {missing}")
    for w in kept:
        fixed = norm(w["w"])
        w["text"] = w["w"] if fixed == bare(w["w"]) else fixed.capitalize() + re.sub(r"[\w']", "", w["w"])
    return kept


def line_tokens(text: str) -> list[str]:
    return [norm(t) for t in re.sub(r"[*~]", "", text).split() if norm(t)]


def build_phrases(words: list[dict], segs: list[dict]) -> tuple[list[dict], dict | None]:
    cursor, phrases, dm = 0, [], None

    def take(tokens: list[str], text: str) -> float:
        nonlocal cursor
        if not tokens:
            sys.exit(f"caption text {text!r} has no words in it")
        t0 = None
        for tok in tokens:
            if cursor >= len(words):
                sys.exit(f"the plan runs past the transcript at '{tok}'")
            got = norm(words[cursor]["w"])
            if got != tok:
                sys.exit(f"plan/transcript mismatch at word {cursor} ({words[cursor]['s']:.2f} s): plan '{tok}', "
                         f"spoken '{got}'")
            if t0 is None:
                t0 = words[cursor]["s"]
            cursor += 1
        return t0

    if not PLAN.get("phrases"):
        sys.exit("plan.json needs \"phrases\": the caption lines, in spoken order (references/02-plan-the-edit.md)")
    for ph in PLAN["phrases"]:
        if "dm" in ph:                                              # the question typed as a chat bubble
            if dm:
                sys.exit("plan.json has more than one dm phrase; the compositor shows one chat bubble per video")
            first = cursor
            take(line_tokens(ph["dm"]), ph["dm"])
            dm = {"words": [{"w": w["text"], "t": round(to_out(w["s"], segs), 4)} for w in words[first:cursor]],
                  "t_end": round(to_out(words[cursor - 1]["e"], segs), 4)}
            dm["t_open"] = round(dm["words"][0]["t"] - 0.25, 4)
            dm["header"] = ph.get("header", "NEW MESSAGE")
            dm["sub"] = ph.get("sub", "")                           # a factual line, e.g. "the most asked question"
            if phrases:
                phrases[-1]["before_dm"] = dm["t_open"]
            continue
        lines = []
        if not ph.get("lines") or any(not isinstance(ln, list) or len(ln) != 2 for ln in ph["lines"]):
            sys.exit(f"phrase {len(phrases) + 1}: \"lines\" must be [[text, size], ...]")
        for text, size in ph["lines"]:
            t = take(line_tokens(text), text)
            lines.append({"text": text, "size": size, "t": round(to_out(t, segs), 4)})
        phrases.append({"lines": lines, "t_in": lines[0]["t"], "t_end": round(to_out(words[cursor - 1]["e"], segs), 4)})
    if cursor != len(words):
        sys.exit(f"the plan covers {cursor} of {len(words)} spoken words; next unplanned: '{words[cursor]['w']}' "
                 f"at {words[cursor]['s']:.2f} s")
    if not phrases:
        sys.exit("plan.json needs at least one caption phrase besides the dm")
    events = PLAN.get("events") or {}
    unknown = [k for k in PLAN.get("wipe_events", []) if k not in events]
    if unknown:
        sys.exit(f"wipe_events {unknown} are not in plan.json events")
    wipes = sorted(to_out(events[k], segs) + 0.12 for k in PLAN.get("wipe_events", []))
    for a, b in zip(phrases, phrases[1:]):
        nxt = min(b["t_in"], a.pop("before_dm", b["t_in"]))
        for w in wipes:                                             # a white-out wipes the caption with it
            if a["t_end"] <= w - 0.12 < nxt:
                nxt = w
        a["t_out"] = round(min(max(a["t_end"], nxt - 0.18), nxt - 0.1), 4)   # gone before the next rises in
        a["exit"] = round(min(0.2, nxt - a["t_out"]), 4)
    phrases[-1].pop("before_dm", None)
    phrases[-1]["t_out"] = phrases[-1]["t_end"] + 0.6
    phrases[-1]["exit"] = 0.2
    if dm:
        after = next((p["t_in"] for p in phrases if p["t_in"] > dm["t_end"]), dm["t_end"] + 1.0)
        dm["t_close"] = round(min(dm["t_end"] + 0.35, after - 0.3), 4)
    return phrases, dm


def build_beats(words: list[dict], segs: list[dict]) -> dict:
    """plan.beats: {"key": {"word": "captions", "after": 18.0}} (after = source seconds, for repeated words)."""
    beats = {}
    for key, spec in (PLAN.get("beats") or {}).items():
        tok, after = norm(spec["word"]), float(spec.get("after", 0))
        hit = next((w for w in words if w["s"] >= after and norm(w["w"]) == tok), None)
        if hit is None:
            sys.exit(f"beat '{key}': word '{spec['word']}' after {after} s not found in the transcript")
        beats[key] = round(to_out(hit["s"], segs), 4)
    for key, src_t in (PLAN.get("events") or {}).items():         # moments measured on the audio (clap, snap)
        beats[key] = round(to_out(src_t, segs), 4)
    if PLAN.get("end") is not None:
        beats["end"] = round(to_out(PLAN["end"], segs), 4)
    return beats


def build_look(beats: dict) -> dict:
    """plan.look -> resolved times for the compositor's generic effects (all optional):
    shakes [{beat, amp, dur, offset}], light_flares [{beat, gain, offset}], stutter {from, to},
    push {from, to, amount}, hue_kick beat, caption_flips [{beat, dur}], sfx [{beat, kind, gain, offset}]."""
    look = PLAN.get("look") or {}

    def at(spec: dict) -> float:
        if spec["beat"] not in beats:
            sys.exit(f"look: beat '{spec['beat']}' is not defined in plan.beats or plan.events")
        return round(beats[spec["beat"]] + float(spec.get("offset", 0)), 4)

    def span(spec: dict | None) -> list[float] | None:
        return [at({"beat": spec["from"]}), at({"beat": spec["to"]})] if spec else None
    push = look.get("push")
    return {
        "shakes": [[at(s), s.get("amp", 10), s.get("dur", 1.0)] for s in look.get("shakes", [])],
        "flares": [[at(s), s.get("gain", 0.8)] for s in look.get("light_flares", [])],
        "stutter": span(look.get("stutter")),
        "push": span(push) + [push.get("amount", 0.1)] if push else None,
        "hue_kick": at({"beat": look["hue_kick"]}) if look.get("hue_kick") else None,
        "caption_flips": [[at(s), s.get("dur", 0.6)] for s in look.get("caption_flips", [])],
        "sfx": [{"t": at(s), "kind": s["kind"], "gain": s.get("gain", 0.6), "align": s.get("align", "start")}
                for s in look.get("sfx", [])],
    }


def camera(segs: list[dict], frames: int) -> dict:
    cam = PLAN.get("camera") or {}
    k = 1080 / config.probe()["w"]                                  # source pixels -> layout (1080 wide)
    raw = {}
    for line in need("facetrack_raw.jsonl", "tools/vision.py").splitlines():
        rec = json.loads(line)
        if not rec.get("none"):
            raw[int(round(rec["t"] * FPS))] = rec
    if not raw:
        sys.exit("no face found in work/facetrack_raw.jsonl")
    first = raw[min(raw)]
    cx, cy, fh, src_idx, last = [], [], [], [], first
    for n in range(frames):
        t = n / FPS
        seg = next((s for s in segs if s["out_in"] - 1e-6 <= t < s["out_out"] - 1e-6), segs[-1])
        si = int(round((seg["src_in"] + (t - seg["out_in"])) * FPS))
        src_idx.append(si)
        rec = raw.get(si) or last
        last = rec
        cx.append((rec["x"] + rec["w"] / 2) * k)
        cy.append((rec["y"] + rec["h"] * 0.5) * k)
        fh.append(rec["h"] * k)

    def follow(vals: list[float], dead: float, ease: float) -> list[float]:
        """Dead-zone follow: reframes only when the person moves, eased, no jitter."""
        out, cur = [], vals[0]
        for v in vals:
            d = v - cur
            if abs(d) > dead:
                cur += (d - dead * (1 if d > 0 else -1)) * ease
            out.append(round(cur, 2))
        return out
    return {"src": src_idx, "cx": follow(cx, 26, 0.18), "cy": follow(cy, 22, 0.18), "fh": follow(fh, 20, 0.1),
            "base_zoom": cam.get("base_zoom", 1.15), "face_y": cam.get("face_y", 650)}


def punches(segs: list[dict], beats: dict) -> list[dict]:
    """Every cut alternates the zoom (a jump cut reads as a camera change); hit words get a soft punch."""
    cam = PLAN.get("camera") or {}
    out, flip = [], False
    for s in segs[1:]:
        flip = not flip
        out.append({"t": s["out_in"], "z": cam.get("punch", 1.12) if flip else 1.0, "hard": True})
    for key, z in (cam.get("hits") or {}).items():
        if key not in beats:
            sys.exit(f"camera hit '{key}' is not a beat")
        out.append({"t": beats[key], "z": z, "hard": False})
    return sorted(out, key=lambda p: p["t"])


def caption_settings() -> dict:
    """plan.json "captions": {"position": "bottom" | "top"}; render.py facecheck tells which a take needs."""
    pos = (PLAN.get("captions") or {}).get("position", "bottom")
    if pos not in ("bottom", "top"):
        sys.exit(f'plan.json captions.position must be "bottom" or "top", not {pos!r}')
    return {"position": pos}


def studio_window(studio: dict, beats: dict) -> dict | None:
    """project.json "studio": the AI studio shot runs from the in_event beat to the out_event beat (output time).
    drive_t0 is the source second the studio clip's first frame lines up with (the take was driven from there)."""
    if not studio:
        return None
    for key in ("in_event", "out_event"):
        if studio.get(key) not in beats:
            sys.exit(f"project.json studio.{key} '{studio.get(key)}' is not a beat or event in plan.json")
    if studio.get("drive_t0") is None:
        sys.exit("project.json studio needs drive_t0 (the source second the studio clip starts from)")
    t_in, t_out = beats[studio["in_event"]], beats[studio["out_event"]]
    if t_out <= t_in:
        sys.exit(f"studio out_event ({t_out:.2f} s) must come after in_event ({t_in:.2f} s)")
    return {"t_in": t_in, "t_out": t_out, "src_t0": float(studio["drive_t0"]), "fps": studio.get("fps", 24)}


def main() -> None:
    no_cuts = "--no-cuts" in sys.argv
    bad = plan_check.problems(PLAN)
    if bad:
        sys.exit("plan.json has problems:\n  " + "\n  ".join(bad))
    config.require_portrait()
    segs = segments(no_cuts, TRIM[1])
    duration = segs[-1]["out_out"]
    frames = int(round(duration * FPS))
    words = load_words(TRIM[1])
    phrases, dm = build_phrases(words, segs)
    beats = build_beats(words, segs)
    studio = config.section("studio")
    tl = {
        "fps": FPS, "duration": round(duration, 4), "frames": frames, "segments": segs,
        "words": [{"w": w["text"], "s": round(to_out(w["s"], segs), 4), "e": round(to_out(w["e"], segs), 4)}
                  for w in words],
        "phrases": phrases, "dm": dm, "beats": beats, "camera": camera(segs, frames), "punches": punches(segs, beats),
        "look": build_look(beats),
        "captions": caption_settings(),
        "studio": studio_window(studio, beats),
    }
    (WORK / "timeline.json").write_text(json.dumps(tl))
    print(f"{len(segs)} segments, {duration:.2f} s, {frames} frames, {len(phrases)} phrases, {len(words)} words"
          + (f", studio {tl['studio']['t_in']:.2f}-{tl['studio']['t_out']:.2f} s" if studio else ""))


if __name__ == "__main__":
    main()
