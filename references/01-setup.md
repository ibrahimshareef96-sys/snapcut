# 01 Setup

Run these checks once per machine. Each line says what to do if it fails.

## What it runs on

- **macOS 12 or later** for the person matte and face track (`tools/vision.py` uses Apple Vision through a small
  Swift tool). Every other step is plain Python and runs anywhere, but without a matte there is no edit; see
  07-pitfalls.md for other systems.
- **Python 3.10 or later**, **ffmpeg** with libx264 and HEVC decoding, **curl** and **unzip**.
- Free disk in the work folder: about **1 GB per minute of footage** (measured: live mode writes 230 MB of frames
  for 16 s). On an exFAT drive, the format most external drives ship with, every small file takes at least one
  512 KB block, so plan for about **4 GB per minute** there. Plus about 1.5 GB once for the Whisper model.

## Checks

```bash
python3 --version                      # 3.10+
ffmpeg -version | head -1              # any recent build; on macOS: brew install ffmpeg
swiftc --version                       # missing: xcode-select --install
python3 -m venv ~/.venvs/snapcut && source ~/.venvs/snapcut/bin/activate   # optional, keeps the packages apart
python3 -m pip install -r <skill>/requirements.txt
```

Installing is the user's machine and disk: tell them what you are about to install (the packages, about 200 MB of
Chromium, a 1.5 GB speech model on the first transcription) and go ahead only with their yes.

## Headless Chromium (the renderer)

The compositor is a web page; `tools/render.py` drives it frame by frame through Playwright.

```bash
python3 -m playwright install chromium
```

That downloads Chromium into Playwright's cache (about 200 MB). If a Chromium or Chrome binary is already on the
machine, skip the download and point snapcut at it instead:

```bash
export SNAPCUT_CHROME="/path/to/chrome-headless-shell"
```

## Fonts

Captions use four families: Clash Display and Satoshi (Indian Type Foundry, ITF Free Font License, from Fontshare),
Instrument Serif and IBM Plex Mono (SIL Open Font License, from the Google Fonts repository). None of them ship in
this repository. `tools/fetch_fonts.sh` downloads them into the per-user cache:

```bash
bash tools/fetch_fonts.sh                          # the OFL fonts, checksum-verified; stops at the Fontshare step
bash tools/fetch_fonts.sh --accept-fontshare-ffl   # only after the user has read and accepted the FFL
```

The ITF licence says that downloading the fonts means accepting it
(https://www.fontshare.com/licenses/itf-ffl). **Ask the user before passing the accept flag.** Never commit the font
files, subset them or convert their format; the licence forbids all three.

## Where things are kept

| What | Where | Change it with |
|---|---|---|
| One video's code and small JSON | the project folder from `new_project.py` | its first argument |
| Heavy media (matte, frames, renders) | project.json `work` (default `<project>/work`) | `--work` or edit project.json |
| Deliverables | project.json `out` (default `<project>/deliverables`) | `--out` or edit project.json |
| Fonts and fetched icons | `~/.cache/snapcut` | `SNAPCUT_CACHE` (fonts alone: `SNAPCUT_FONT_DIR`) |

Put `work` on an external drive when the internal one is tight; the tools check the drive is mounted before they
write anything.

## AI shots (optional)

The Higgsfield pieces (a restyled room plate, an AI studio cutaway, explosion plates) need the Higgsfield MCP
server connected to your coding agent and the user's own Higgsfield account and credits. Everything else works
without it. See 05-higgsfield.md.

## First-run downloads

- `transcribe.py` pulls the Whisper model (`large-v3-turbo` by default, about 1.5 GB) from Hugging Face the first time.
  A smaller one: `"whisper_model": "small"` in project.json (about 0.5 GB, faster, more misheard names).
- `icons.py fetch` pulls each icon named in project.json once (Lucide from jsDelivr, brand marks from Simple Icons).
