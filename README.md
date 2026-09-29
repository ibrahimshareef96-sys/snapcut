# snapcut

An Agent Skill that edits a raw vertical talking-head take into a finished Reel, TikTok or Short: the pauses cut,
kinetic captions on the exact spoken word, motion graphics that land on the words they illustrate, the room relit
with RGB streamer light, synthesised sound effects, audio mastered to -14 LUFS. Optional AI shots through
Higgsfield: a restyled room, a studio cutaway, explosion plates.

You give your coding agent a clip. It transcribes it, proposes the cut and the graphics, and renders the video on
your machine. Your face and voice stay exactly as filmed.

It was built from one real edit, the snap reel (a 73 s selfie take cut to 55 s, with a DM bubble, tool tiles, an AI
studio shot and a finger-snap explosion). That reel's plan and beat files ship in `examples/snap-reel/` as the
worked example.

## Install

snapcut is a folder with a `SKILL.md` inside. Install it by cloning it where your agent looks for skills.

**Claude Code** (every project on this machine):

```bash
git clone https://github.com/ibrahimshareef96-sys/snapcut.git ~/.claude/skills/snapcut
```

Then type `/snapcut`, or just ask for an edit. For one project only, clone into `.claude/skills/snapcut` in that
repository (use `git submodule add` if you want to commit it).

**OpenAI Codex** (CLI, IDE extension, desktop app):

```bash
git clone https://github.com/ibrahimshareef96-sys/snapcut.git ~/.agents/skills/snapcut
```

Then type `$snapcut`, or pick it from `/skills`.

**Kimi Code CLI**: Kimi reads `~/.claude/skills/`, so the Claude Code install above works for it too. Otherwise:

```bash
git clone https://github.com/ibrahimshareef96-sys/snapcut.git ~/.config/agents/skills/snapcut
```

Then type `/skill:snapcut` in a new session.

**Update** with `git -C <that folder> pull`.

## Requirements

- macOS 12 or later (the person matte uses Apple Vision), with the Xcode command line tools
- Python 3.10+, ffmpeg, curl, unzip
- `python3 -m pip install -r requirements.txt`, then `python3 -m playwright install chromium`
- Fonts: `bash template/tools/fetch_fonts.sh`. Two of the four fonts are under the ITF Free Font License from
  Fontshare, and downloading them means accepting it; your agent will ask you first.
- Optional: the Higgsfield MCP server and your own Higgsfield account, for the AI shots

Details, disk space and first-run downloads: `references/01-setup.md`.

## How an edit goes

1. You: "Edit this into a reel" and a path to the clip.
2. The agent starts a project, transcribes the take and shows you the transcript with its pauses.
3. It proposes the trim, the cuts, the caption phrases and the graphics, and asks before anything that costs
   money or regenerates your face.
4. It builds the timeline, renders stills on every beat and checks that nothing covers your face and nothing leaves
   Instagram's safe zone.
5. It renders the video and hands you the master, a voice-only version, a cover frame and a contact sheet.

On an M4 Pro a 16 s take goes from raw clip to master in about 6 minutes of machine time.

## What is in here

| Path | What |
|---|---|
| `SKILL.md` | the playbook the agent follows |
| `references/` | setup, the plan format, captions, the beats catalog, the Higgsfield recipes, QA, pitfalls |
| `template/tools/` | the pipeline, one small Python tool per step |
| `template/compositor/` | the canvas renderer: camera, room, captions, effects, the graphics kit |
| `examples/snap-reel/` | the plan and beat files of the reel this was built from (no footage) |
| `scripts/new_project.py` | starts a project folder for one take |
| `tests/` | `python3 -m pytest tests`: icon and upload validation, the sound kit, plan checks, project creation |
| `SECURITY.md` | what leaves your machine, the guards in the code, known limits |

## Licence

The code and docs are MIT (see `LICENSE`). Fonts, brand logos and AI-generated media are not covered by MIT and are
not in this repository; see `THIRD_PARTY_NOTICES.md`. Product names and logos belong to their owners, and their use
here does not imply endorsement.

Made by Ibrahim Shareef ([@shareefico](https://www.instagram.com/shareefico/)).
