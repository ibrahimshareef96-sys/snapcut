"""Synthesised sound effects: every sound is made from tones and filtered noise, so there are no sample files and no
licences to track. build_audio.py places one per cue in data/sfx_events.json.

Kinds (use them in a beat file's SNAPCUT.cues or plan.json look.sfx):
  pop key whoosh swoosh swish tick chime sparkle tap send notify     small UI moments: bubbles, typing, icons landing
  shutter impact thud stamp error                                    hits: a photo taken, a word slammed in, a "no"
  riser charge                                                       tension that ENDS on its cue (use align 'end')
  boom snapboom lightson                                             cinematic: a clap, a finger snap, lights coming on
"""
from __future__ import annotations

import numpy as np
from scipy import signal

SR = 48000
KINDS = ("pop", "key", "whoosh", "swoosh", "swish", "tick", "chime", "sparkle", "tap", "send", "notify", "shutter",
         "impact", "thud", "stamp", "error", "riser", "charge", "boom", "snapboom", "lightson")
rng = np.random.default_rng(11)


def env(n: int, tau: float, attack: float = 0.002) -> np.ndarray:
    t = np.arange(n) / SR
    return np.exp(-t / tau) * np.minimum(1, t / max(attack, 1e-4))


def tone(f0: float, f1: float, dur: float, tau: float) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, tau)


def band_noise(dur: float, lo: float, hi: float) -> np.ndarray:
    b, a = signal.butter(2, [lo / (SR / 2), hi / (SR / 2)], "band")
    return signal.lfilter(b, a, rng.standard_normal(int(dur * SR)))


def swept_noise(dur: float, f0: float, f1: float, q: float = 1.2) -> np.ndarray:
    """Noise through a band-pass whose centre glides f0 -> f1 (state-variable filter)."""
    n = int(dur * SR)
    fc = f0 * (f1 / f0) ** (np.arange(n) / n)
    x, y = rng.standard_normal(n), np.zeros(n)
    low = band = 0.0
    for i in range(n):
        f = 2 * np.sin(np.pi * fc[i] / SR)
        high = x[i] - low - q * band
        band += f * high
        low += f * band
        y[i] = band
    return y / (np.max(np.abs(y)) + 1e-9)


def shaped(x: np.ndarray, rise: float) -> np.ndarray:
    n = len(x)
    k = int(n * rise)
    e = np.concatenate([np.sin(np.linspace(0, np.pi / 2, k)) ** 2, np.cos(np.linspace(0, np.pi / 2, n - k)) ** 2])
    return x * e


def norm(x: np.ndarray, db: float) -> np.ndarray:
    return x / (np.max(np.abs(x)) + 1e-9) * 10 ** (db / 20)


def reverb_tail(x: np.ndarray, seconds: float, decay: float) -> np.ndarray:
    """Cheap diffuse tail: the sound convolved with decaying noise."""
    n = int(seconds * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / (decay * SR))
    ir[0] = 3.0
    return signal.fftconvolve(x, ir)[: len(x) + n]


def layered(parts: list[tuple[np.ndarray, float]], dur: float) -> np.ndarray:
    """Mix (sound, start seconds) pairs into one buffer of dur seconds."""
    out = np.zeros(int(dur * SR))
    for x, at in parts:
        s = int(at * SR)
        n = max(0, min(len(x), len(out) - s))
        out[s:s + n] += x[:n]
    return out


def pings(count: int, lo: float, hi: float, span: float, dur: float, length: float, tau: float) -> np.ndarray:
    parts = []
    for _ in range(count):
        f = rng.uniform(lo, hi)
        parts.append((tone(f, f * 1.01, length, tau), rng.uniform(0, span)))
    return layered(parts, dur)


def _ui(kind: str) -> tuple[np.ndarray, float] | None:
    if kind == "pop":
        return norm(tone(900, 430, 0.09, 0.025) + 0.3 * band_noise(0.09, 2000, 6000) * env(int(0.09 * SR), 0.004), -17), 0
    if kind == "key":
        p = 0.85 + 0.3 * rng.random()
        click = band_noise(0.03, 2500 * p, 7000) * env(int(0.03 * SR), 0.003) + 0.6 * tone(180 * p, 150 * p, 0.03, 0.005)
        return norm(click, -27), rng.uniform(-0.3, 0.3)
    if kind in ("whoosh", "swoosh"):
        return norm(shaped(swept_noise(0.5, 300, 2600), 0.55), -21), 0
    if kind == "swish":
        return norm(shaped(swept_noise(0.28, 1200, 4200), 0.4), -25), 0.2
    if kind == "tick":
        return norm(band_noise(0.02, 3000, 9000) * env(int(0.02 * SR), 0.003), -27), 0
    if kind == "chime":
        n = int(0.7 * SR)
        t = np.arange(n) / SR
        f = 1046.5 * 2 ** (rng.integers(0, 5) * 2 / 12)
        return norm((np.sin(2 * np.pi * f * t) + 0.6 * np.sin(2 * np.pi * f * 1.5 * t)) * env(n, 0.3, 0.004), -21), \
            rng.uniform(-0.3, 0.3)
    if kind == "sparkle":
        return norm(pings(8, 2600, 5600, 0.45, 0.6, 0.12, 0.04), -23), rng.uniform(-0.2, 0.2)
    if kind == "tap":
        return norm(band_noise(0.04, 1200, 6000) * env(int(0.04 * SR), 0.006) + 0.5 * tone(400, 300, 0.04, 0.01), -22), 0.2
    if kind == "send":
        return norm(tone(520, 1500, 0.12, 0.07) + 0.4 * shaped(swept_noise(0.12, 900, 3500), 0.3), -21), 0.3
    if kind == "notify":
        return norm(layered([(tone(880, 880, 0.12, 0.06), 0), (tone(1320, 1320, 0.3, 0.12), 0.1)], 0.42), -19), 0.4
    return None


def _hit(kind: str) -> tuple[np.ndarray, float] | None:
    if kind == "shutter":
        a = band_noise(0.05, 1500, 9000) * env(int(0.05 * SR), 0.008)
        return norm(layered([(a, 0), (a * 0.7, 0.08)], 0.16), -21), 0
    if kind == "impact":
        return norm(tone(120, 50, 0.5, 0.12) + 0.5 * band_noise(0.5, 400, 6000) * env(int(0.5 * SR), 0.03), -14), 0
    if kind == "thud":
        return norm(tone(95, 42, 0.3, 0.09) + 0.5 * band_noise(0.3, 700, 4000) * env(int(0.3 * SR), 0.02), -13), 0
    if kind == "stamp":
        return norm(tone(140, 60, 0.25, 0.06) + 0.8 * band_noise(0.25, 300, 5000) * env(int(0.25 * SR), 0.015), -14), 0
    if kind == "error":
        return norm(layered([(tone(330, 320, 0.12, 0.08), 0), (tone(247, 240, 0.2, 0.1), 0.12)], 0.34), -22), 0
    return None


def _cinema(kind: str) -> tuple[np.ndarray, float] | None:
    if kind == "riser":                         # 1.45 s of tension; place it with align 'end' on the hit
        dur = 1.45
        body = swept_noise(dur, 120, 4200, 0.9) + 0.35 * tone(110, 440, dur, 9.0) + 0.2 * tone(165, 660, dur, 9.0)
        return norm(body * np.linspace(0, 1, len(body)) ** 2.4, -17), 0
    if kind == "charge":                        # energy gathering for 0.35 s before a snap
        body = swept_noise(0.35, 800, 6000, 0.7) + 0.5 * tone(300, 1800, 0.35, 5.0)
        return norm(body * np.linspace(0, 1, len(body)) ** 2, -18), 0
    if kind == "boom":                          # layered on a real clap
        body = tone(70, 34, 1.4, 0.35) + 0.6 * band_noise(1.4, 60, 900) * env(int(1.4 * SR), 0.08)
        return norm(reverb_tail(body, 0.8, 0.35)[:int(1.9 * SR)], -11), 0
    if kind == "snapboom":                      # the snap: sub drop, crack, shimmer, long tail
        n = int(2.6 * SR)
        body = tone(90, 28, 2.6, 0.7) + 0.7 * band_noise(2.6, 1500, 12000) * env(n, 0.03) \
            + 0.25 * pings(14, 1800, 5200, 0.9, 2.6, 0.6, 0.25)
        return norm(reverb_tail(body, 1.2, 0.5)[: int(3.2 * SR)], -9), 0
    if kind == "lightson":                      # studio practicals clunk on
        a = band_noise(0.08, 200, 3000) * env(int(0.08 * SR), 0.01)
        return norm(layered([(a, 0), (a * 0.8, 0.12), (tone(60, 55, 0.5, 0.2) * 0.4, 0)], 0.7), -20), -0.3
    return None


def synth(kind: str) -> tuple[np.ndarray, float]:
    """Mono sound and its pan (-1 left .. 1 right)."""
    for family in (_ui, _hit, _cinema):
        made = family(kind)
        if made is not None:
            return made
    raise ValueError(f"unknown sound kind {kind!r} (see the list at the top of tools/sfx_kit.py)")
