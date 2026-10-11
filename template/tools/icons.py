"""The icons a project uses: fetch them once into the per-user cache, then hand them to the compositor.

project.json "icons" maps the name the beat files draw (E.drawIcon(ctx, name, ...)) to one of:
  {"lucide": "terminal", "fill": "#34D07F"}   a Lucide icon (ISC licence), stroked in the fill colour
  {"brand": "claude"}                          a Simple Icons brand mark in its owner's own colour; never recolour
                                               a brand mark (their trademark rules), and use one only to name a tool
  {"file": "assets/logo.svg", "fill": null}    your own SVG (path relative to the project folder)

Brand logos and Lucide files are downloaded, never shipped in the repo (see THIRD_PARTY_NOTICES).
OpenAI has no public mark to fetch: write "OpenAI" or "Codex" as text, or supply your own file.

Usage: python3 icons.py fetch
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

import config

LUCIDE = "https://cdn.jsdelivr.net/npm/lucide-static@1.48.0/icons/{}.svg"
BRAND = "https://cdn.simpleicons.org/{}"
SLUG = re.compile(r"[a-z0-9][a-z0-9-]{0,63}")                 # used with fullmatch: no trailing newline sneaks in
HEX = re.compile(r"#[0-9A-Fa-f]{6}")
# A plain icon has no scripts, no embedded HTML, no event handlers, no entities, no styles that import, and no links
# out (an href is fine only when it points inside the icon, "#id"). Namespaced tags (<x:script>) count too.
UNSAFE = re.compile(r"<\s*(\w+:)?(script|foreignObject|iframe|embed|object)\b|javascript:|&#|<!ENTITY|<!DOCTYPE"
                    r"|\son[a-z]+\s*=|@import|url\(\s*['\"]?(?!#)|href\s*=\s*['\"](?!#)", re.I)
MAX_BYTES = 200_000


def spec_of(name: str, spec: object) -> dict:
    if not isinstance(spec, dict) or sum(k in spec for k in ("lucide", "brand", "file")) != 1:
        sys.exit(f'icons.{name}: give exactly one of "lucide", "brand" or "file"')
    fill = spec.get("fill")
    if fill is not None and not HEX.fullmatch(str(fill)):
        sys.exit(f"icons.{name}: fill must look like #RRGGBB or be null")
    for kind in ("lucide", "brand"):
        if kind in spec and not SLUG.fullmatch(str(spec[kind])):
            sys.exit(f"icons.{name}: '{spec[kind]}' is not a valid {kind} icon name")
    if "brand" in spec and fill is not None:
        sys.exit(f"icons.{name}: brand marks keep their owner's colour; remove the fill")
    return spec


def cached(spec: dict) -> Path:
    kind = "lucide" if "lucide" in spec else "brand"
    return config.cache() / "icons" / kind / f"{spec[kind]}.svg"


PROLOGUE = re.compile(r"^\s*(<\?xml[^>]*\?>\s*)?(<!--.*?-->\s*)*", re.S)   # xml header, licence comments


def check_svg(text: str, where: str) -> str:
    body = PROLOGUE.sub("", text, count=1)
    if len(text.encode()) > MAX_BYTES or not body.startswith("<svg") or UNSAFE.search(text):
        sys.exit(f"{where} is not a plain SVG icon; refusing to use it")
    return text


def fetch() -> None:
    for name, raw in (config.project().get("icons") or {}).items():
        spec = spec_of(name, raw)
        if "file" in spec:
            continue
        dest = cached(spec)
        if dest.is_file():
            continue
        url = (LUCIDE if "lucide" in spec else BRAND).format(spec.get("lucide") or spec.get("brand"))
        # curl, not urllib: python.org builds on macOS ship without CA certificates until a manual step
        res = subprocess.run(["curl", "-fsSL", "--proto", "=https", "--proto-redir", "=https", "--max-time", "20",
                              "--max-filesize", str(MAX_BYTES), url], capture_output=True)
        if res.returncode:
            sys.exit(f"cannot download {url}: {res.stderr.decode().strip() or 'curl exit ' + str(res.returncode)}")
        body = res.stdout.decode("utf-8", "replace")
        dest.parent.mkdir(parents=True, exist_ok=True)
        part = dest.with_suffix(".part")
        part.write_text(check_svg(body, url))
        part.replace(dest)
        print(f"{name} <- {url}")
    print(f"icons ready in {config.cache() / 'icons'}")


def load() -> dict:
    """{name: {svg, fill}} for the compositor. Fails, naming the fix, when an icon has not been fetched."""
    out = {}
    for name, raw in (config.project().get("icons") or {}).items():
        spec = spec_of(name, raw)
        path = config.resolve(spec["file"]) if "file" in spec else cached(spec)
        if not path.is_file():
            sys.exit(f"icon '{name}' is missing ({path}); run: python3 tools/icons.py fetch")
        out[name] = {"svg": check_svg(path.read_text(), str(path)), "fill": spec.get("fill")}
    return out


if __name__ == "__main__":
    if sys.argv[1:] != ["fetch"]:
        sys.exit(__doc__)
    fetch()
