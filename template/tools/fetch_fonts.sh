#!/usr/bin/env bash
# Download snapcut's caption font from its official source into the per-user cache (never into the repo).
#   Satoshi: Indian Type Foundry, ITF Free Font License, fetched straight from Fontshare.
# Unbounded and IBM Plex Mono (SIL OFL 1.1) are not downloaded: the compositor page loads them from Google Fonts at
# render time (tools/brand.py FONT_CSS).
# Usage: tools/fetch_fonts.sh [--accept-fontshare-ffl]
# An agent must ask its user before passing --accept-fontshare-ffl: downloading means accepting the FFL.
set -euo pipefail

DEST="${SNAPCUT_FONT_DIR:-${SNAPCUT_CACHE:-$HOME/.cache/snapcut}/fonts}"
FS="https://api.fontshare.com/v2/fonts/download"
ACCEPT_FFL="${SNAPCUT_ACCEPT_FFL:-0}"
[[ "${1:-}" == "--accept-fontshare-ffl" ]] && ACCEPT_FFL=1
CURL=(curl -fsSL --retry 3 --proto '=https' --proto-redir '=https' --max-time 180 --max-filesize 50000000)

command -v curl >/dev/null || { echo "curl is required" >&2; exit 1; }
command -v unzip >/dev/null || { echo "unzip is required" >&2; exit 1; }

sha256() { if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }

# --- Fontshare (ITF FFL): the user must accept the licence ---
if [[ "$ACCEPT_FFL" != "1" ]]; then
  cat >&2 <<'MSG'
Satoshi is licensed by Indian Type Foundry under the ITF Free Font License (FFL).
Read it first: https://www.fontshare.com/licenses/itf-ffl
Downloading it means accepting it, so only the person who will use the font can decide.
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
fontshare satoshi Satoshi_Complete 4b55120bbdf3ce511dd8ff1f3ca1a615be2af2bee4f383c3ca0ba378ee9a7c14
echo "fonts ready in $DEST"
