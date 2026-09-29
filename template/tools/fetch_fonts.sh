#!/usr/bin/env bash
# Download snapcut's caption fonts from their official sources into the per-user cache (never into the repo).
#   Clash Display + Satoshi: Indian Type Foundry, ITF Free Font License, fetched straight from Fontshare.
#   Instrument Serif + IBM Plex Mono: SIL OFL 1.1, pinned to a google/fonts commit and checksum-verified.
# Usage: tools/fetch_fonts.sh [--accept-fontshare-ffl]
# An agent must ask its user before passing --accept-fontshare-ffl: downloading means accepting the FFL.
set -euo pipefail

DEST="${SNAPCUT_FONT_DIR:-${SNAPCUT_CACHE:-$HOME/.cache/snapcut}/fonts}"
GF_SHA="23e54b51ddffbc7713c583748e3bd86f62b1fa4a"   # google/fonts main @ 2026-09-24
GF="https://raw.githubusercontent.com/google/fonts/${GF_SHA}/ofl"
FS="https://api.fontshare.com/v2/fonts/download"
ACCEPT_FFL="${SNAPCUT_ACCEPT_FFL:-0}"
[[ "${1:-}" == "--accept-fontshare-ffl" ]] && ACCEPT_FFL=1
CURL=(curl -fsSL --retry 3 --proto '=https' --proto-redir '=https' --max-time 180 --max-filesize 50000000)

command -v curl >/dev/null || { echo "curl is required" >&2; exit 1; }
command -v unzip >/dev/null || { echo "unzip is required" >&2; exit 1; }

sha256() { if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }

fetch_pinned() {  # <url> <out> <sha256>
  local url="$1" out="$2" want="$3" got
  [[ -f "$out" && "$(sha256 "$out")" == "$want" ]] && return 0
  "${CURL[@]}" -o "$out.part" "$url"
  got="$(sha256 "$out.part")"
  if [[ "$got" != "$want" ]]; then rm -f "$out.part"; echo "checksum mismatch for $url (got $got)" >&2; exit 1; fi
  mv "$out.part" "$out"
}

# --- OFL fonts (Google Fonts repo, pinned) ---
mkdir -p "$DEST/instrument-serif" "$DEST/ibm-plex-mono"
fetch_pinned "$GF/instrumentserif/InstrumentSerif-Regular.ttf" "$DEST/instrument-serif/InstrumentSerif-Regular.ttf" 498efd461f6ddfcb7a111bf9a565709d2085d48201d501ead960d93e84ffbb88
fetch_pinned "$GF/instrumentserif/InstrumentSerif-Italic.ttf"  "$DEST/instrument-serif/InstrumentSerif-Italic.ttf"  08939b8bdf534afec24ae0ef5e03f948940cd9a8fe08e7fecbad040e62327385
fetch_pinned "$GF/instrumentserif/OFL.txt"                     "$DEST/instrument-serif/OFL.txt"                     129ed7618959716959f2941fdd5b49e0ad6e6c1d78726761786a00253d865521
fetch_pinned "$GF/ibmplexmono/IBMPlexMono-Regular.ttf"  "$DEST/ibm-plex-mono/IBMPlexMono-Regular.ttf"  6a3412f058c7d8dfd9170c41e85ade48e5156ecb89356110ca57a0a27734af46
fetch_pinned "$GF/ibmplexmono/IBMPlexMono-Medium.ttf"   "$DEST/ibm-plex-mono/IBMPlexMono-Medium.ttf"   a9b4c49bb299e05b5f6c481e7fb5e78943d2793249a0c8874ab574a2d1ea6755
fetch_pinned "$GF/ibmplexmono/OFL.txt"                  "$DEST/ibm-plex-mono/OFL.txt"                  7e6b2818edbd8f6a01ae80641cc8f16a51080d08fb4e532be3a0b6f74adb07da

# --- Fontshare fonts (ITF FFL): the user must accept the licence ---
if [[ "$ACCEPT_FFL" != "1" ]]; then
  cat >&2 <<'MSG'
Clash Display and Satoshi are licensed by Indian Type Foundry under the ITF Free Font License (FFL).
Read it first: https://www.fontshare.com/licenses/itf-ffl
Downloading them means accepting it, so only the person who will use the fonts can decide.
AI agents: ask your user; do not pass the flag yourself. The user re-runs with --accept-fontshare-ffl.
MSG
  exit 2
fi

fontshare() {  # <slug> <zip-root> <sha256 as of 2026-09-29>
  local slug="$1" root="$2" known="$3" dir="$DEST/$slug" tmp got
  [[ -f "$dir/.complete" ]] && return 0
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' RETURN
  "${CURL[@]}" -o "$tmp/f.zip" "$FS/$slug"
  got="$(sha256 "$tmp/f.zip")"
  if [[ "$got" != "$known" && "${SNAPCUT_ALLOW_CHANGED_FONTS:-0}" != "1" ]]; then
    echo "$slug: the Fontshare zip differs from the one checked on 2026-09-29 (got $got)." >&2
    echo "ITF may have updated the font. Check https://www.fontshare.com, then re-run with SNAPCUT_ALLOW_CHANGED_FONTS=1." >&2
    exit 1
  fi
  mkdir -p "$tmp/x"
  # the official files as shipped: no subsetting, no format conversion (FFL s.02)
  unzip -q -o -j "$tmp/f.zip" "$root/Fonts/OTF/*.otf" "$root/Fonts/TTF/*.ttf" "$root/License/FFL.txt" -d "$tmp/x"
  if [[ -n "$(find "$tmp/x" -type l)" ]]; then echo "$slug: the zip contains links; refusing it" >&2; exit 1; fi
  mkdir -p "$dir"
  cp "$tmp/x/"* "$dir/"
  touch "$dir/.complete"
}
fontshare clash-display ClashDisplay_Complete 69a2aab7008e165bf73c6d4bac9cd8b1245570eda525a00487c096015b3344cc
fontshare satoshi       Satoshi_Complete      4b55120bbdf3ce511dd8ff1f3ca1a615be2af2bee4f383c3ca0ba378ee9a7c14
echo "fonts ready in $DEST"
