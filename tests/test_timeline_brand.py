"""build_timeline.py end to end on a tiny made-up take: caption rows with word times, the brand block, the end beat's
room after the last word. Needs ffmpeg (the builder probes the source); skipped without it."""
import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parent.parent
pytestmark = pytest.mark.skipif(not (shutil.which("ffmpeg") and shutil.which("ffprobe")), reason="needs ffmpeg")

WORDS = [("Shrink", 0.30, 0.70), ("step", 0.70, 1.00), ("one", 1.00, 1.40), ("until", 1.70, 2.00),
         ("it", 2.00, 2.15), ("takes", 2.15, 2.60), ("two", 2.90, 3.20), ("minutes.", 3.20, 3.80)]


@pytest.fixture(scope="module")
def take(tmp_path_factory):
    src = tmp_path_factory.mktemp("src") / "take.mp4"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i",
                    "color=c=gray:s=1080x1920:r=30:d=6", "-c:v", "libx264", "-pix_fmt", "yuv420p", str(src)], check=True)
    return src


def project(tmp_path, take, plan_extra):
    dest = tmp_path / "proj"
    subprocess.run([sys.executable, str(REPO / "scripts" / "new_project.py"), str(dest), "--source", str(take)],
                   check=True, capture_output=True)
    plan = {"trim": [0.0, 6.0], "phrases": [{"lines": [["SHRINK STEP ONE", "m"]]},
                                            {"lines": [["UNTIL IT TAKES *two minutes.*", "l"]]}], **plan_extra}
    (dest / "plan.json").write_text(json.dumps(plan))
    data = dest / "data"
    data.mkdir()
    (data / "words_refined.json").write_text(json.dumps([{"w": w, "s": s, "e": e} for w, s, e in WORDS]))
    (data / "facetrack_raw.jsonl").write_text(
        "\n".join(json.dumps({"t": n / 30, "x": 340, "y": 386, "w": 455, "h": 455}) for n in range(182)) + "\n")
    return dest


def build(dest):
    return subprocess.run([sys.executable, "tools/build_timeline.py"], cwd=dest, capture_output=True, text=True)


def test_rows_carry_their_words_and_the_brand_block(tmp_path, take):
    dest = project(tmp_path, take, {"brand": {"level": 3, "opener": {"topic": "Build with Me"}}})
    res = build(dest)
    assert res.returncode == 0, res.stderr
    tl = json.loads((dest / "data" / "timeline.json").read_text())
    rows = tl["phrases"][1]["lines"]
    assert [r["text"] for r in rows] == ["UNTIL IT TAKES", "two minutes."]
    assert all(r["size"] == "l" for r in rows)
    assert [w["w"] for w in rows[1]["words"]] == ["two", "minutes."]
    assert rows[1]["t"] == rows[1]["words"][0]["s"] == 2.9
    assert tl["brand"] == {"tier": "rare", "level": 3, "opener": {"topic": "Build with Me", "t1": 2.0},
                           "end_beat": {"cta": "@shareefico", "bubble": "FOLLOW @SHAREEFICO", "t0": 4.0}}
    last = tl["phrases"][-1]
    assert last["t_end"] <= last["t_out"] <= 4.0 - 0.1          # the last caption leaves as the end beat starts
    assert "rare (LVL 3)" in res.stdout


def test_an_end_beat_with_no_room_names_the_trim_fix(tmp_path, take):
    dest = project(tmp_path, take, {"trim": [0.0, 5.0]})
    res = build(dest)
    assert res.returncode != 0
    assert "set plan.json trim end to at least 5.90 s" in res.stderr and '"end_beat": false' in res.stderr


def test_the_suggested_trim_end_is_enough(tmp_path, take):
    dest = project(tmp_path, take, {"trim": [0.0, 5.9]})
    res = build(dest)
    assert res.returncode == 0, res.stderr


def test_without_an_end_beat_the_tail_is_free(tmp_path, take):
    dest = project(tmp_path, take, {"trim": [0.0, 4.2], "brand": {"end_beat": False, "opener": False}})
    res = build(dest)
    assert res.returncode == 0, res.stderr
    tl = json.loads((dest / "data" / "timeline.json").read_text())
    assert tl["brand"]["end_beat"] is None and tl["brand"]["opener"] is None
    assert tl["phrases"][-1]["t_out"] == pytest.approx(3.8 + 0.6)


def test_signs_are_shown_but_never_take_a_spoken_time(tmp_path, take):
    dest = project(tmp_path, take, {})
    (dest / "plan.json").write_text(json.dumps({
        "trim": [0.0, 6.0],
        "phrases": [{"lines": [["SHRINK & STEP", "m"], ["ONE -", "m"]]},
                    {"lines": [["UNTIL IT TAKES TWO MINUTES.", "m"]]}]}))
    res = build(dest)
    assert res.returncode == 0, res.stderr
    first = json.loads((dest / "data" / "timeline.json").read_text())["phrases"][0]["lines"]
    words = [w for row in first for w in row["words"]]
    assert [(w["w"], w.get("sign", False)) for w in words] == [
        ("SHRINK", False), ("&", True), ("STEP", False), ("ONE", False), ("-", True)]
    spoken = [w for w in words if not w.get("sign")]
    assert [w["s"] for w in spoken] == [0.3, 0.7, 1.0]          # each spoken word keeps its own time
    assert first[1]["t"] == 1.0                                # a row rises on its first spoken word


def test_a_line_of_signs_alone_is_refused(tmp_path, take):
    dest = project(tmp_path, take, {})
    plan = json.loads((dest / "plan.json").read_text())
    plan["phrases"] = [{"lines": [["&", "m"]]}] + plan["phrases"]
    (dest / "plan.json").write_text(json.dumps(plan))
    res = build(dest)
    assert res.returncode != 0 and "needs a spoken word" in res.stderr


def test_a_video_too_short_for_the_opener_and_the_end_beat(tmp_path, take):
    dest = project(tmp_path, take, {"trim": [0.0, 3.5]})
    plan = json.loads((dest / "plan.json").read_text())
    plan["phrases"] = [{"lines": [["SHRINK STEP ONE", "m"]]}]
    plan["last_word_t"] = 1.2
    (dest / "plan.json").write_text(json.dumps(plan))
    res = build(dest)
    assert res.returncode != 0 and "need at least 4 s" in res.stderr


def test_a_closing_chat_bubble_shuts_before_the_end_beat(tmp_path, take):
    dest = project(tmp_path, take, {})
    plan = json.loads((dest / "plan.json").read_text())
    plan["phrases"] = [{"lines": [["SHRINK STEP ONE", "m"]]}, {"dm": "until it takes two minutes."}]
    (dest / "plan.json").write_text(json.dumps(plan))
    res = build(dest)
    assert res.returncode == 0, res.stderr
    tl = json.loads((dest / "data" / "timeline.json").read_text())
    dm, t0 = tl["dm"], tl["brand"]["end_beat"]["t0"]
    # it closes 0.3 s before the end beat, or as soon as its last word is typed when that comes later
    assert dm["t_close"] == max(dm["t_end"], min(dm["t_end"] + 0.35, t0 - 0.3))


def test_a_bad_brand_is_refused_before_anything_is_built(tmp_path, take):
    dest = project(tmp_path, take, {"brand": {"tier": "mythic"}})
    res = build(dest)
    assert res.returncode != 0 and "brand.tier must be one of" in res.stderr
    assert not (dest / "data" / "timeline.json").exists()
