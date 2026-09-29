"""Speech / silence map of the voice track, and word-time refinement.

Whisper's word mode stretches a word across the pause before it ("A" 25.04-25.98 s in this
take), which would make a caption appear too early. This tool measures the real voice onsets
and offsets from the audio energy and writes a corrected word list.

Method: RMS in 10 ms windows; the noise floor is the 10th percentile of window dB; a window is
voiced when it is more than VOICE_DB above the floor. Voiced runs are merged across gaps shorter
than MERGE_GAP; silences at least MIN_SILENCE long are reported. Word edges that Whisper put
inside a pause are snapped to the pause's edge (rules in refine_words).

Usage: python3 speech_map.py AUDIO_16K_WAV WORDS_JSON OUT_WORDS_JSON OUT_SILENCES_JSON
"""
from __future__ import annotations

import json
import sys
import wave

import numpy as np

WIN_S = 0.010
VOICE_DB = 12.0       # dB above the noise floor that counts as voice
MERGE_GAP = 0.15      # voiced runs closer than this are one run
MIN_SILENCE = 0.25    # silences shorter than this are breaths inside speech, not pauses


def load_mono_16k(path: str) -> tuple[np.ndarray, int]:
    with wave.open(path, "rb") as w:
        if w.getnchannels() != 1 or w.getsampwidth() != 2:
            raise ValueError(f"{path}: expected 16-bit mono PCM")
        rate = w.getframerate()
        data = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64)
    return data / 32768.0, rate


def window_db(samples: np.ndarray, rate: int) -> np.ndarray:
    hop = int(round(WIN_S * rate))
    n = len(samples) // hop
    frames = samples[: n * hop].reshape(n, hop)
    rms = np.sqrt(np.mean(frames ** 2, axis=1)) + 1e-9
    return 20 * np.log10(rms)


def voiced_runs(db: np.ndarray) -> tuple[list[tuple[float, float]], float]:
    floor = float(np.percentile(db, 10))
    voiced = db > floor + VOICE_DB
    runs, start = [], None
    for i, v in enumerate(voiced):
        if v and start is None:
            start = i
        elif not v and start is not None:
            runs.append([start * WIN_S, i * WIN_S])
            start = None
    if start is not None:
        runs.append([start * WIN_S, len(voiced) * WIN_S])
    merged: list[list[float]] = []
    for r in runs:
        if merged and r[0] - merged[-1][1] < MERGE_GAP:
            merged[-1][1] = r[1]
        else:
            merged.append(r)
    return [(round(a, 3), round(b, 3)) for a, b in merged], floor


def silences(runs: list[tuple[float, float]], total: float) -> list[dict]:
    out, prev_end = [], 0.0
    for a, b in runs:
        if a - prev_end >= MIN_SILENCE:
            out.append({"s": round(prev_end, 3), "e": round(a, 3), "dur": round(a - prev_end, 3)})
        prev_end = b
    if total - prev_end >= MIN_SILENCE:
        out.append({"s": round(prev_end, 3), "e": round(total, 3), "dur": round(total - prev_end, 3)})
    return out


LEAD_TOL = 0.10   # a pause that begins this close to a word's start is a stretched lead-in
EDGE_TOL = 0.02   # a start this deep inside a pause is in the pause, not at its edge


def refine_words(words: list[dict], sil: list[dict]) -> list[dict]:
    """Snap word edges out of pauses.

    Whisper often starts a word at the end of the previous one and stretches it over the
    pause, or runs a word's end into the pause after it. Rules, per word [s, e]:
      1. s lies inside a pause               -> s = pause end
      2. a pause begins within LEAD_TOL of s  -> s = pause end (stretched lead-in)
         and ends inside the word
      3. a pause begins inside the word and  -> e = pause start (stretched tail)
         reaches (almost) its end
    Then neighbours are made non-overlapping.
    """
    fixed: list[dict] = []
    for w in words:
        s, e, notes = w["s"], w["e"], []
        for p in sil:
            a, b = p["s"], p["e"]
            if a + EDGE_TOL < s < b - EDGE_TOL or (s - LEAD_TOL <= a <= s + LEAD_TOL and s < b < e):
                notes.append(f"start {s:.2f}->{b:.2f}")
                s = b
        for p in sil:
            a, b = p["s"], p["e"]
            if s < a < e and b >= e - LEAD_TOL:
                notes.append(f"end {e:.2f}->{a:.2f}")
                e = a
        e = max(e, s + 0.05)
        if fixed and fixed[-1]["e"] > s:
            fixed[-1]["e"] = round(max(fixed[-1]["s"] + 0.05, s), 3)
        fixed.append({**w, "s": round(s, 3), "e": round(e, 3), **({"fix": "; ".join(notes)} if notes else {})})
    return fixed


def main() -> None:
    if len(sys.argv) != 5:
        sys.exit("usage: speech_map.py AUDIO_16K_WAV WORDS_JSON OUT_WORDS_JSON OUT_SILENCES_JSON")
    samples, rate = load_mono_16k(sys.argv[1])
    words = json.load(open(sys.argv[2]))
    db = window_db(samples, rate)
    runs, floor = voiced_runs(db)
    sil = silences(runs, len(samples) / rate)
    fixed = refine_words(words, sil)
    with open(sys.argv[3], "w") as f:
        json.dump(fixed, f, indent=0)
    with open(sys.argv[4], "w") as f:
        json.dump({"floor_db": round(floor, 1), "voiced": runs, "silences": sil}, f, indent=1)
    print(f"noise floor {floor:.1f} dB, {len(runs)} voiced runs, {len(sil)} silences >= {MIN_SILENCE}s")
    for x in sil:
        print(f"  silence {x['s']:6.2f}-{x['e']:6.2f}  ({x['dur']:.2f}s)")
    for w in fixed:
        if "fix" in w:
            print(f"  word '{w['w']}' {w['fix']}")


if __name__ == "__main__":
    main()
