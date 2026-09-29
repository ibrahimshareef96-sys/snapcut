import json
from pathlib import Path

import pytest

import plan_check

EXAMPLE = Path(__file__).resolve().parent.parent / "examples" / "snap-reel" / "plan.json"


def test_the_worked_example_is_clean():
    assert plan_check.problems(json.loads(EXAMPLE.read_text())) == []


def test_an_empty_plan_has_no_shape_problems():
    assert plan_check.problems({}) == []


@pytest.mark.parametrize("plan,expect", [
    ({"beats": {"hit": {"after": 3}}}, 'beats.hit: "word" is required'),
    ({"beats": {"hit": {"word": "hi", "after": "3"}}}, '"after" must be a number'),
    ({"beats": ["hit"]}, "beats must be an object"),
    ({"events": {"clap": "24.9"}}, "events.clap must be a number"),
    ({"onset_fixes": [{"word": "with", "start": 26.6}]}, 'onset_fixes[0] needs'),
    ({"end": "66"}, '"end" must be a number'),
    ({"phrases": [{"dm": ""}]}, "phrases[1].dm must be the question"),
    ({"phrases": [{"lines": []}]}, 'phrases[1] needs "lines"'),
    ({"phrases": [{"lines": [["HELLO", "huge"]]}]}, "size one of s, m, l, xl"),
    ({"phrases": [{"lines": ["HELLO"]}]}, "each line is [text, size]"),
    ({"look": {"shakes": [{"amp": 10}]}}, 'look.shakes[0] needs "beat"'),
    ({"look": {"sfx": [{"beat": "clap", "kind": "kaboom"}]}}, "look.sfx[0].kind must be one of"),
    ({"look": {"push": {"from": "a"}}}, 'look.push needs "from" and "to"'),
    ({"camera": {"hits": {"clap": "big"}}}, "camera.hits.clap must be a zoom"),
])
def test_each_problem_is_named(plan, expect):
    found = plan_check.problems(plan)
    assert any(expect in p for p in found), found


def test_all_problems_are_reported_together():
    plan = {"beats": {"a": {}}, "phrases": [{"lines": []}], "look": {"shakes": [{}]}}
    assert len(plan_check.problems(plan)) == 3
