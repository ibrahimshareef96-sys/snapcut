"""Step 2: audio out of the take, word-level transcript, word starts snapped to the real voice onsets.

Writes (project data/): words_raw.json, words_refined.json, silences.json; (work/audio/): src16k.wav, src48k.wav.
Prints the transcript with times and the pauses, which is what plan.json is written from.
Also lists sharp transients (claps, snaps) anywhere in the take, as candidates for plan.events. Every word's own
start and end are in data/words_refined.json (the printout shows the first word of each run).

Vocabulary: project.json "vocab" (names and brand words) biases Whisper toward their spelling.

Usage: python3 transcribe.py
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import numpy as np

import config

HERE = Path(__file__).resolve().parent


def extract_audio(audio_dir: Path) -> tuple[Path, Path]:
    audio_dir.mkdir(parents=True, exist_ok=True)
    a16, a48 = audio_dir / "src16k.wav", audio_dir / "src48k.wav"
    src = str(config.source())
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vn", "-ac", "1", "-ar", "16000", str(a16)], check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vn", "-c:a", "pcm_s24le", str(a48)], check=True)
    return a16, a48


def transcribe(a16: Path, out: Path) -> None:
    from faster_whisper import WhisperModel
    vocab = config.project().get("vocab", "")
    model = WhisperModel(config.project().get("whisper_model", "large-v3-turbo"), device="cpu", compute_type="int8")
    segments, _ = model.transcribe(str(a16), language=config.project().get("language", "en"), word_timestamps=True,
                                   vad_filter=True, vad_parameters={"min_silence_duration_ms": 300},
                                   initial_prompt=vocab or None, condition_on_previous_text=False, beam_size=5)
    words = [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3), "p": round(w.probability, 3)}
             for seg in segments for w in seg.words]
    out.write_text(json.dumps(words, indent=0))
    print(f"{len(words)} words")


def transients(a48: Path) -> list[float]:
    """Sharp broadband hits (a clap, a finger snap): high-passed energy jumping far above the previous 90 ms."""
    from scipy.signal import butter, sosfilt
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(a48), "-ac", "1", "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    sr, hop = 48000, 240
    h = sosfilt(butter(4, 2500, "hp", fs=sr, output="sos"), x)
    n = len(h) // hop
    e = np.sqrt((h[: n * hop].reshape(n, hop) ** 2).mean(1))
    t = np.arange(n) * hop / sr
    p = np.percentile(e, 99.5)
    hits, last = [], -1.0
    for i in range(20, n):
        prev = e[i - 20:i - 2].mean() + 1e-9
        if e[i] > 5 * prev and e[i] > p and t[i] - last > 0.3:
            hits.append(round(float(t[i]), 3))
            last = t[i]
    return hits


def main() -> None:
    data = config.data()
    a16, a48 = extract_audio(config.work() / "audio")
    transcribe(a16, data / "words_raw.json")
    subprocess.run([sys.executable, str(HERE / "speech_map.py"), str(a16), str(data / "words_raw.json"),
                    str(data / "words_refined.json"), str(data / "silences.json")], check=True)
    words = json.loads((data / "words_refined.json").read_text())
    print("\n--- transcript (source seconds; [pause] = silence of 0.25 s or more) ---")
    prev_e, line, t0 = None, [], None
    for w in words:
        if prev_e is not None and w["s"] - prev_e >= 0.25:
            print(f"{t0:7.2f}  {' '.join(line)}   [pause {w['s'] - prev_e:.2f}]")
            line, t0 = [], None
        if t0 is None:
            t0 = w["s"]
        line.append(w["w"])
        prev_e = w["e"]
    if line:
        print(f"{t0:7.2f}  {' '.join(line)}")
    hits = transients(a48)
    print("\n--- sharp transients (claps, snaps) ---")
    print(", ".join(f"{h:.2f}" for h in hits) or "none")


if __name__ == "__main__":
    main()
