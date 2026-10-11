# snapcut

An Agent Skill that edits a raw vertical talking-head take into a finished Reel, TikTok or Short: the pauses cut,
captions that light up the exact spoken word, motion graphics that land on the words they illustrate, a level tag
opener and a 2-second end beat, the room relit with RGB streamer light, synthesised sound effects, audio mastered to
-14 LUFS. Optional AI shots through Higgsfield: a restyled room, a studio cutaway, explosion plates.

## The look

snapcut renders in the Shareefico "Ranked" house style (11 Oct 2026): graphite and bone, one level colour per video.

- **Captions:** Satoshi Black capitals, at most 15 characters a row, the spoken word in the level colour, a light
  shadow, letters packed tight but never touching (every pair is measured at its shown size).
- **Level tag opener** for the first 2 s: the level badge, "UNCOMMON · LVL 2" in Unbounded and the topic.
- **End beat** for the last 2 s: the picture dims, the symbol and a handle (or a keyword call to action) rise, and
  the pixel mascot pops up with one bubble.

All of it is set in the plan's `"brand"` block: the level (`"tier": "rare"` or `"level": 3`), the opener's topic, the
end beat's handle and bubble. The symbol, badges and pixel mascot are Ibrahim Shareef's marks, so the opener and the
end beat are **off by default**: your videos get the captions and the look with nobody else's handle on them. His
own projects start with `python3 scripts/new_project.py ... --brand shareefico`.

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
- Fonts: `bash template/tools/fetch_fonts.sh` for Satoshi, under the ITF Free Font License from Fontshare;
  downloading it means accepting it, so your agent will ask you first. Unbounded and IBM Plex Mono (SIL OFL) load
  from Google Fonts while rendering, so the render needs an internet connection.
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
| `template/compositor/` | the canvas renderer: camera, room, captions, effects, the graphics kit, the opener and end beat (`brand.js`), the brand marks (`shareefico.js`) |
| `examples/snap-reel/` | the plan and beat files of the reel this was built from (no footage) |
| `scripts/new_project.py` | starts a project folder for one take |
| `tests/` | `python3 -m pytest tests`: icon and upload validation, the sound kit, plan and brand checks, caption rows and the end beat in the timeline, project creation |
| `SECURITY.md` | what leaves your machine, the guards in the code, known limits |

## Licence

The code and docs are MIT (see `LICENSE`). Fonts, brand logos and AI-generated media are not covered by MIT and are
not in this repository; see `THIRD_PARTY_NOTICES.md`. The one exception is `template/compositor/shareefico.js`, the
Shareefico symbol, level badges and pixel mascot: they are in the repository so the house look renders, and they are
not MIT licensed (all rights reserved). Product names and logos belong to their owners, and their use
here does not imply endorsement.

Made by Ibrahim Shareef ([@shareefico](https://www.instagram.com/shareefico/)).
