"""Step 10: the audio, cut on the same segments as the picture.

  voice   the take's voice cut on the timeline's segments (equal-power 15 ms joins inside pauses), high-passed at
          70 Hz, lightly compressed, -14 LUFS, true peaks limited. Speech is never sped up or pitched.
  sfx     sounds synthesised on the compositor's cues (data/sfx_events.json, from `render.py sfx`), under the voice
  mixes   mix_sfx.wav (voice + effects) and mix_voice.wav (voice only), both -14 LUFS, true peak under -1 dBTP

Usage: python3 build_audio.py      -> <work>/renders/audio/*.wav and a loudness report
"""
from __future__ import annotations

import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
import pyloudnorm as pyln
from scipy import signal
from scipy.ndimage import maximum_filter1d

import config
from sfx_kit import KINDS, SR, synth

XF = 0.015
TARGET = -14.0
LIMIT_DB = -1.5


# ---------- io ----------
def load_source() -> np.ndarray:
    res = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(config.source()), "-map", "0:a:0",
                          "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True)
    if res.returncode or not res.stdout:
        sys.exit(f"cannot read the source's audio: {res.stderr.decode()[-300:] or 'no audio stream'}")
    return np.frombuffer(res.stdout, dtype="<f4").reshape(-1, 2).astype(np.float64)


def write_wav(path: Path, x: np.ndarray) -> None:
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


# ---------- voice ----------
def cut_voice(src: np.ndarray, segments: list[dict], total: int) -> np.ndarray:
    out = np.zeros((total, 2))
    for s in segments:
        a, b, o = round(s["src_in"] * SR), round(s["src_out"] * SR), round(s["out_in"] * SR)
        n = max(0, min(b - a, total - o, len(src) - a))
        out[o:o + n] = src[a:a + n]
    h = int(XF * SR / 2)
    ramp = np.linspace(0, np.pi / 2, 2 * h)[:, None]
    for prev, cur in zip(segments, segments[1:]):
        j, pa, cb = round(cur["out_in"] * SR), round(prev["src_out"] * SR), round(cur["src_in"] * SR)
        if 0 <= pa - h and pa + h <= len(src) and 0 <= cb - h and cb + h <= len(src) and h <= j <= total - h:
            out[j - h:j + h] = src[pa - h:pa + h] * np.cos(ramp) + src[cb - h:cb + h] * np.sin(ramp)
        else:
            print(f"warning: join at {j / SR:.3f} s is too close to an edge for a crossfade; left as a hard cut")
    return out


def loudness(x: np.ndarray) -> float:
    return pyln.Meter(SR).integrated_loudness(x)


def gain_to(x: np.ndarray, lufs: float) -> np.ndarray:
    now = loudness(x)
    if not np.isfinite(now):
        sys.exit("the audio is silent; check the source has a voice track")
    return x * 10 ** ((lufs - now) / 20)


def compressor(x: np.ndarray, thresh_db=-22.0, ratio=2.5, attack=0.010, release=0.150) -> np.ndarray:
    level = np.sqrt(np.convolve(np.mean(x ** 2, axis=1), np.ones(480) / 480, mode="same")) + 1e-9
    target = -np.maximum(0.0, 20 * np.log10(level) - thresh_db) * (1 - 1 / ratio)
    a, r = np.exp(-1 / (attack * SR)), np.exp(-1 / (release * SR))
    g = np.empty_like(target)
    cur = 0.0
    for i, v in enumerate(target):
        cur = a * cur + (1 - a) * v if v < cur else r * cur + (1 - r) * v
        g[i] = cur
    return x * (10 ** (g / 20))[:, None]


def limiter(x: np.ndarray, limit_db=LIMIT_DB, lookahead=0.004, release=0.08) -> np.ndarray:
    """Look-ahead limiter on TRUE peaks: the detector sees the 4x-oversampled signal, so peaks between samples
    (a snap transient overshoots about 1.7 dB) are held under the limit too."""
    lim = 10 ** (limit_db / 20)
    up = np.abs(signal.resample_poly(x, 4, 1, axis=0)).max(axis=1)
    inter = up[: len(x) * 4].reshape(-1, 4).max(axis=1) if len(up) >= len(x) * 4 else np.max(np.abs(x), axis=1)
    peak = maximum_filter1d(np.maximum(inter, np.max(np.abs(x), axis=1)), size=2 * int(lookahead * SR) + 1)
    want = np.minimum(1.0, lim / np.maximum(peak, 1e-9))
    rel = np.exp(-1 / (release * SR))
    g = np.empty_like(want)
    cur = 1.0
    for i, v in enumerate(want):
        cur = v if v < cur else rel * cur + (1 - rel) * v
        g[i] = cur
    return x * g[:, None]


def voice_chain(raw: np.ndarray) -> np.ndarray:
    b, a = signal.butter(2, 70 / (SR / 2), "highpass")
    x = compressor(gain_to(signal.lfilter(b, a, raw, axis=0), -16.0))
    return limiter(gain_to(x, TARGET))


# ---------- effects ----------
def sfx_track(events: list[dict], total: int) -> np.ndarray:
    out = np.zeros((total, 2))
    for ev in events:
        if ev.get("kind") not in KINDS:
            sys.exit(f"sound cue at {ev.get('t')} s has kind {ev.get('kind')!r}; the kinds are listed in "
                     "tools/sfx_kit.py (fix it in compositor/beats.js or plan.json look.sfx)")
        mono, pan = synth(ev["kind"])
        mono = mono * float(ev.get("gain", 1.0))
        t0 = ev["t"] - (len(mono) / SR if ev.get("align") == "end" else 0.0)
        start = int(round(t0 * SR))
        if start < 0:
            mono, start = mono[-start:], 0
        n = min(len(mono), total - start)
        if n <= 0:
            continue
        left, right = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        out[start:start + n, 0] += mono[:n] * left * np.sqrt(2)
        out[start:start + n, 1] += mono[:n] * right * np.sqrt(2)
    return out


def true_peak_db(x: np.ndarray) -> float:
    up = signal.resample_poly(x, 4, 1, axis=0)
    return 20 * np.log10(np.max(np.abs(up)) + 1e-12)


def main() -> None:
    out = config.work() / "renders" / "audio"
    out.mkdir(parents=True, exist_ok=True)
    tl_path, ev_path = config.data() / "timeline.json", config.data() / "sfx_events.json"
    for p, step in ((tl_path, "build_timeline.py"), (ev_path, "render.py sfx")):
        if not p.is_file():
            sys.exit(f"missing {p}: run {step} first")
    tl = json.loads(tl_path.read_text())
    cues = json.loads(ev_path.read_text())
    stamp = config.timeline_stamp()
    if not isinstance(cues, dict) or cues.get("timeline") != stamp:
        sys.exit("the sound cues were made for an older timeline: run `render.py sfx` again")
    total = int(round(tl["duration"] * SR))
    voice = voice_chain(cut_voice(load_source(), tl["segments"], total))
    sfx = sfx_track(cues["events"], total)
    mix = limiter(gain_to(limiter(voice + sfx), TARGET)) if np.any(sfx) else voice
    for name, x in (("voice_edit", voice), ("sfx", sfx), ("mix_sfx", mix), ("mix_voice", voice)):
        write_wav(out / f"{name}.wav", x)
    (out / "timeline.stamp").write_text(stamp)          # deliver.py checks the mixes match the picture's timeline
    for name, x in (("voice only", voice), ("voice + sfx", mix)):
        print(f"{name:12} {loudness(x):6.1f} LUFS  true peak {true_peak_db(x):5.1f} dBTP  {len(x) / SR:.3f} s")
    print(f"-> {out}")


if __name__ == "__main__":
    main()
