import html
import re
from pathlib import Path

import pytest

import brand
import plan_check

REPO = Path(__file__).resolve().parent.parent
PAGES = [REPO / "template" / "compositor" / "index.html", REPO / "examples" / "snap-reel" / "compositor" / "index.html"]


# ---------- the one network door ----------

@pytest.mark.parametrize("page", PAGES, ids=lambda p: p.parent.parent.name)
def test_every_compositor_page_asks_for_exactly_the_allowed_stylesheet(page):
    hrefs = [html.unescape(h) for h in re.findall(r'<link[^>]+href="([^"]+)"', page.read_text())]
    assert hrefs == [brand.FONT_CSS]


@pytest.mark.parametrize("method,url,ok", [
    ("GET", brand.FONT_CSS, True),
    ("GET", "https://fonts.gstatic.com/s/unbounded/v8/abc.woff2", True),
    ("POST", brand.FONT_CSS, False),
    ("GET", brand.FONT_CSS + "&x=1", False),
    ("GET", "https://fonts.googleapis.com/css2?family=Roboto", False),
    ("GET", "https://fonts.gstatic.com.evil.example/s/x.woff2", False),
    ("GET", "http://fonts.gstatic.com/s/x.woff2", False),
    ("GET", "https://example.com/", False),
])
def test_only_the_brand_fonts_may_load(method, url, ok):
    assert brand.font_request_allowed(method, url) is ok


class FakeRoute:
    """Stands in for Playwright's Route: records what the gate did."""

    def __init__(self, url, method="GET", status=200, fails=0):
        self.request = type("Req", (), {"url": url, "method": method})()
        self.status, self.fails, self.did, self.fetch_args, self.calls = status, fails, None, None, 0

    def abort(self):
        self.did = "abort"

    def fetch(self, **kw):
        self.fetch_args = kw
        self.calls += 1
        if self.calls <= self.fails:
            raise OSError("offline")
        return type("Resp", (), {"status": self.status})()

    def fulfill(self, response):
        self.did = ("fulfill", response.status)


@pytest.mark.parametrize("url,method,status,fails,did", [
    (brand.FONT_CSS, "GET", 200, 0, ("fulfill", 200)),
    ("https://fonts.gstatic.com/s/unbounded/v8/a.woff2", "GET", 200, 0, ("fulfill", 200)),
    (brand.FONT_CSS, "GET", 302, 0, "abort"),                      # a redirect is never followed
    ("https://fonts.gstatic.com/s/x.woff2", "GET", 301, 0, "abort"),
    (brand.FONT_CSS, "GET", 200, 2, ("fulfill", 200)),             # a hiccup is retried
    (brand.FONT_CSS, "GET", 200, 99, "abort"),                     # offline: the page names the missing face
    ("https://example.com/leak?words=hello", "GET", 200, 0, "abort"),
    (brand.FONT_CSS, "POST", 200, 0, "abort"),
])
def test_the_gate_fetches_allowed_fonts_without_following_redirects(url, method, status, fails, did):
    route = FakeRoute(url, method, status, fails)
    brand.gate(route)
    assert route.did == did
    if route.fetch_args is not None:
        assert route.fetch_args == {"max_redirects": 0}


# ---------- caption rows ----------

def test_rows_hold_at_most_15_characters_in_order():
    words = "UNTIL IT TAKES TWO MINUTES. THEN DO IT AGAIN TOMORROW".split()
    rows = brand.wrap_rows(words)
    assert [i for row in rows for i in row] == list(range(len(words)))
    assert all(len(" ".join(words[i] for i in row)) <= 15 for row in rows)
    assert [" ".join(words[i] for i in row) for row in rows][:2] == ["UNTIL IT TAKES", "TWO MINUTES."]


def test_a_word_longer_than_a_row_gets_its_own_row():
    rows = brand.wrap_rows(["A", "CONGRATULATIONS!!", "B"])
    assert rows == [[0], [1], [2]]


def test_rows_are_measured_in_capitals():
    # "STRAßENBAHNEN X" is 15 characters as typed, but 16 on screen ("ß" becomes "SS"), so it must wrap
    assert brand.wrap_rows(["STRAßENBAHNEN", "X"]) == [[0], [1]]


def test_markup_from_older_plans_is_dropped():
    assert brand.display_words("TO *answer* the ~SKILL~") == ["TO", "answer", "the", "SKILL"]


def test_an_empty_list_has_no_rows():
    assert brand.wrap_rows([]) == []


# ---------- plan.json "brand" ----------

def test_no_brand_means_the_defaults():
    s = brand.settings({})
    assert s == {"tier": "uncommon", "level": 2, "opener": {"topic": ""},
                 "end_beat": {"cta": "@shareefico", "bubble": "FOLLOW @SHAREEFICO"}}
    assert brand.problems({}) == []


def test_level_picks_the_tier_and_switches_turn_parts_off():
    s = brand.settings({"brand": {"level": 4, "opener": False, "end_beat": False}})
    assert (s["tier"], s["level"], s["opener"], s["end_beat"]) == ("epic", 4, None, None)


def test_text_is_tidied():
    s = brand.settings({"brand": {"opener": {"topic": "  AI   Maxxing 101 "},
                                  "end_beat": {"cta": " Comment  \"SKILL\" ", "bubble": "comment skill"}}})
    assert s["opener"]["topic"] == "AI Maxxing 101"
    assert s["end_beat"] == {"cta": 'Comment "SKILL"', "bubble": "COMMENT SKILL"}


@pytest.mark.parametrize("b,expect", [
    ("rare", "brand must be an object"),
    ({"tier": "mythic"}, "brand.tier must be one of"),
    ({"level": 6}, "brand.level must be a whole number 1 to 5"),
    ({"level": 2.0}, "brand.level must be a whole number 1 to 5"),
    ({"level": True}, "brand.level must be a whole number 1 to 5"),
    ({"tier": "rare", "level": 2}, "brand.tier rare is level 3, not 2"),
    ({"opener": True}, "brand.opener must be"),
    ({"opener": {"topic": 3}}, "brand.opener.topic must be text"),
    ({"opener": {"topic": "x" * 41}}, "at most 40"),
    ({"end_beat": "yes"}, "brand.end_beat must be"),
    ({"end_beat": {"cta": ""}}, "brand.end_beat.cta must be text"),
    ({"end_beat": {"bubble": "FOLLOW FOR MORE AI TOOLS NOW"}}, "at most 24"),
    ({"handle": "@me"}, "brand has unknown keys ['handle']"),
    ({"end-beat": False}, "brand has unknown keys ['end-beat']"),
    ({"opener": {"topics": "x"}}, "brand.opener has unknown keys ['topics']"),
    ({"end_beat": {"handle": "@me"}}, "brand.end_beat has unknown keys ['handle']"),
])
def test_each_brand_problem_is_named(b, expect):
    found = plan_check.problems({"brand": b})
    assert any(expect in p for p in found), found


def test_an_empty_or_blank_topic_is_no_topic():
    assert brand.problems({"brand": {"opener": {"topic": ""}}}) == []
    assert brand.problems({"brand": {"opener": {"topic": "   "}}}) == []
    assert brand.settings({"brand": {"opener": {"topic": "   "}}})["opener"] == {"topic": ""}


def test_the_topic_is_counted_as_shown_in_sentence_case():
    assert brand.problems({"brand": {"opener": {"topic": "Straße " * 5 + "Build"}}}) == []   # 40 shown


def test_the_end_beat_is_the_last_50_frames_at_25_fps():
    assert brand.end_beat_start(180, 30) == 4.0
    assert brand.end_beat_start(181, 30) == pytest.approx(121 / 30)


# ---------- the brand bundle ----------

def test_the_bundle_knows_the_same_tiers_in_the_same_order():
    js = (REPO / "template" / "compositor" / "shareefico.js").read_text()
    tiers = re.findall(r'\{ id: "(\w+)", level: (\d)', js)
    assert [t for t, _ in tiers] == list(brand.TIERS)
    assert [int(n) for _, n in tiers] == [1, 2, 3, 4, 5]
