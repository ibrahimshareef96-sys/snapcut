"""The house look's rules that the timeline needs (the Shareefico "Ranked" brand, approved 11 Oct 2026).

- Caption rows hold at most 15 characters; longer plan lines are wrapped at word boundaries.
- Every video teaches one level: a tier (common, uncommon, rare, epic, legendary = level 1 to 5) whose colour lights
  the spoken caption word, the opener's label and its badge. The colours live in compositor/shareefico.js.
- The level tag opener runs for the first 2 s (50 frames at 25 fps); the end beat for the last 2 s.
- The renderer may fetch exactly one thing from the network: the Google Fonts stylesheet below and the font files
  it names (Unbounded for labels and the handle, IBM Plex Mono for the mascot's bubble).

Pure functions only: nothing here reads project files, so tests/test_brand.py checks the rules on their own.

plan.json "brand" (every key optional):
  {"tier": "uncommon" | "level": 2,
   "opener": {"topic": "Shrink step one"} | false,
   "end_beat": {"cta": "@shareefico", "bubble": "FOLLOW @SHAREEFICO"} | false}
"""
from __future__ import annotations

import re

TIERS = ("common", "uncommon", "rare", "epic", "legendary")    # level 1 to 5
DEFAULT_TIER = "uncommon"
MAX_ROW = 15                    # characters per caption row
OPENER_S = 50 / 25              # level tag opener: 50 frames at 25 fps
END_S = 50 / 25                 # end beat: 50 frames at 25 fps
END_CLEAR_S = 0.1               # the last word ends at least this long before the end beat starts
MAX_TOPIC = 40
MAX_CTA = 24
MAX_BUBBLE = 24                 # the pixel mascot's bubble
HANDLE = "@shareefico"
BUBBLE = "FOLLOW @SHAREEFICO"
FONT_CSS = ("https://fonts.googleapis.com/css2?family=Unbounded:wght@700;800"
            "&family=IBM+Plex+Mono:wght@500;600&display=swap")
FONT_FILES = "https://fonts.gstatic.com/s/"
FETCH_TRIES = 3


def font_request_allowed(method: str, url: str) -> bool:
    """The one network door the renderer opens: GET of the brand stylesheet and of the font files it names."""
    return method == "GET" and (url == FONT_CSS or url.startswith(FONT_FILES))


def gate(route) -> None:
    """The renderer's network route handler (render.py): every request is refused except an allowed font GET, which
    is fetched without following redirects (a redirect would leave the allowed URLs unchecked) and handed back."""
    req = route.request
    if not font_request_allowed(req.method, req.url):
        route.abort()
        return
    resp = None
    for _ in range(FETCH_TRIES):  # a font server hiccup should not stop a render: try again before giving up
        try:
            resp = route.fetch(max_redirects=0)
            break
        except Exception:  # noqa: BLE001 (any network failure): after the last try the page names the missing face
            continue
    if resp is None or 300 <= resp.status < 400:
        route.abort()
    else:
        route.fulfill(response=resp)


def display_words(text: str) -> list[str]:
    """A plan caption line as shown: markup from older plans (*accent*, ~KEYWORD~) is accepted and dropped."""
    return re.sub(r"[*~]", "", text).split()


def wrap_rows(words: list[str], limit: int = MAX_ROW) -> list[list[int]]:
    """Greedy rows of at most `limit` characters (capitals, spaces included), as lists of word indices. A single
    word longer than the limit gets a row of its own (the compositor shrinks it to fit the width)."""
    rows: list[list[int]] = []
    cur: list[int] = []
    for i, w in enumerate(words):
        if cur and len(" ".join(words[j] for j in cur + [i]).upper()) > limit:
            rows.append(cur)
            cur = []
        cur.append(i)
    if cur:
        rows.append(cur)
    return rows


KEYS = {"brand": {"tier", "level", "opener", "end_beat"}, "opener": {"topic"}, "end_beat": {"cta", "bubble"}}


def _text(value: object, name: str, limit: int, out: list[str], caps: bool = True) -> None:
    """Text of at most `limit` characters as shown (capitals unless caps is False)."""
    if not isinstance(value, str) or not value.strip():
        out.append(f"brand.{name} must be text")
        return
    shown = " ".join(value.split())
    if len(shown.upper() if caps else shown) > limit:
        out.append(f"brand.{name} is {len(shown)} characters; at most {limit}")


def _unknown(obj: dict, kind: str, out: list[str]) -> None:
    """A misspelt key would silently fall back to a default (the author's handle on someone else's video)."""
    extra = sorted(set(obj) - KEYS[kind])
    if extra:
        where = "brand" if kind == "brand" else f"brand.{kind}"
        out.append(f"{where} has unknown keys {extra}; it takes {sorted(KEYS[kind])}")


def problems(plan: dict) -> list[str]:
    """Shape problems in plan.json "brand", all at once."""
    b = plan.get("brand")
    if b is None:
        return []
    if not isinstance(b, dict):
        return ['brand must be an object: {"tier": "uncommon", "opener": {...}, "end_beat": {...}}']
    out: list[str] = []
    _unknown(b, "brand", out)
    tier, level = b.get("tier"), b.get("level")
    if tier is not None and tier not in TIERS:
        out.append(f"brand.tier must be one of {', '.join(TIERS)}, not {tier!r}")
    if level is not None and (type(level) is not int or level not in range(1, 6)):
        out.append(f"brand.level must be a whole number 1 to 5, not {level!r}")
    elif tier in TIERS and level is not None and TIERS.index(tier) + 1 != level:
        out.append(f"brand.tier {tier} is level {TIERS.index(tier) + 1}, not {level}: give one of them")
    opener = b.get("opener", {})
    if opener is not False and not isinstance(opener, dict):
        out.append('brand.opener must be {"topic": "..."} or false')
    elif isinstance(opener, dict):
        _unknown(opener, "opener", out)
        topic = opener.get("topic")
        if not (topic is None or (isinstance(topic, str) and not topic.strip())):   # empty or blank: no topic
            _text(topic, "opener.topic", MAX_TOPIC, out, caps=False)                  # shown in sentence case
    end = b.get("end_beat", {})
    if end is not False and not isinstance(end, dict):
        out.append('brand.end_beat must be {"cta": "...", "bubble": "..."} or false')
    elif isinstance(end, dict):
        _unknown(end, "end_beat", out)
        for key, limit in (("cta", MAX_CTA), ("bubble", MAX_BUBBLE)):
            if key in end:
                _text(end[key], f"end_beat.{key}", limit, out)
    return out


def settings(plan: dict) -> dict:
    """plan.json "brand" resolved with the defaults (call problems() first). No times: the timeline adds them."""
    b = plan.get("brand") or {}
    tier = b.get("tier") or (TIERS[b["level"] - 1] if b.get("level") else DEFAULT_TIER)
    opener = b.get("opener", {})
    end = b.get("end_beat", {})
    return {
        "tier": tier,
        "level": TIERS.index(tier) + 1,
        "opener": None if opener is False else {"topic": " ".join((opener.get("topic") or "").split())},
        "end_beat": None if end is False else {"cta": " ".join((end.get("cta") or HANDLE).split()),
                                               "bubble": " ".join((end.get("bubble") or BUBBLE).split()).upper()},
    }


def end_beat_start(frames: int, fps: int) -> float:
    """Output second the end beat starts: the last 50 frames at 25 fps, frame-aligned at the compositor's rate."""
    return (frames - round(END_S * fps)) / fps
