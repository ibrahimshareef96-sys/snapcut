import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SCRIPT = REPO / "scripts" / "new_project.py"


def run(*args):
    return subprocess.run([sys.executable, str(SCRIPT), *map(str, args)], capture_output=True, text=True)


def test_creates_a_project(tmp_path):
    take = tmp_path / "take.mov"
    take.write_bytes(b"\x00")
    dest = tmp_path / "proj"
    res = run(dest, "--source", take, "--title", "Test")
    assert res.returncode == 0, res.stderr
    for rel in ("tools/render.py", "tools/config.py", "compositor/index.html", "compositor/beats.js", ".gitignore"):
        assert (dest / rel).is_file(), rel
    cfg = json.loads((dest / "project.json").read_text())
    assert cfg["source"] == str(take.resolve()) and cfg["title"] == "Test"
    assert json.loads((dest / "plan.json").read_text())["trim"] is None
    assert not list(dest.rglob("__pycache__"))


def test_a_new_project_carries_no_branding_unless_asked(tmp_path):
    take = tmp_path / "take.mov"
    take.write_bytes(b"\x00")
    assert run(tmp_path / "plain", "--source", take).returncode == 0
    plain = json.loads((tmp_path / "plain" / "plan.json").read_text())["brand"]
    assert plain == {"tier": "uncommon", "opener": False, "end_beat": False}
    assert run(tmp_path / "his", "--source", take, "--brand", "shareefico").returncode == 0
    his = json.loads((tmp_path / "his" / "plan.json").read_text())["brand"]
    assert his["opener"] == {"topic": ""}
    assert his["end_beat"] == {"cta": "@shareefico", "bubble": "FOLLOW @SHAREEFICO"}
    assert run(tmp_path / "bad", "--source", take, "--brand", "someone").returncode != 0


def test_example_files_are_copied_beside_not_over(tmp_path):
    take = tmp_path / "take.mov"
    take.write_bytes(b"\x00")
    dest = tmp_path / "proj"
    assert run(dest, "--source", take, "--example", "snap-reel").returncode == 0
    assert (dest / "plan.example.json").is_file() and (dest / "example-compositor" / "register.js").is_file()
    assert json.loads((dest / "plan.json").read_text())["trim"] is None


def test_refuses_a_folder_that_is_not_empty(tmp_path):
    take = tmp_path / "take.mov"
    take.write_bytes(b"\x00")
    dest = tmp_path / "proj"
    dest.mkdir()
    (dest / "mine.txt").write_text("keep me")
    res = run(dest, "--source", take)
    assert res.returncode != 0 and "not empty" in res.stderr
    assert (dest / "mine.txt").read_text() == "keep me" and len(list(dest.iterdir())) == 1


def test_refuses_a_missing_source(tmp_path):
    res = run(tmp_path / "proj", "--source", tmp_path / "nope.mov")
    assert res.returncode != 0 and not (tmp_path / "proj").exists()


def test_refuses_a_project_inside_the_skill(tmp_path):
    take = tmp_path / "take.mov"
    take.write_bytes(b"\x00")
    res = run(REPO / "my-video", "--source", take)
    assert res.returncode != 0 and "inside the skill" in res.stderr
    assert not (REPO / "my-video").exists()
