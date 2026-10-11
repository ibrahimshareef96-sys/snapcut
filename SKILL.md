---
name: snapcut
description: Edit a raw vertical talking-head take (a phone selfie video, 9:16) into a finished Instagram Reel, TikTok or YouTube Short. Cuts the pauses, adds word-synced captions (the spoken word lit in the video's level colour) and motion graphics that land on the spoken word, opens on a level tag and closes on a 2-second end beat with the handle and the pixel mascot, relights the person against their own room with RGB streamer light, synthesises sound effects, masters the audio to -14 LUFS and can add AI shots (a Higgsfield studio cutaway, explosion plates). Use when someone asks to edit a reel or a short from a clip, add animated captions or motion graphics to a talking-head video, cut the silences out of a vertical video, or make a video like the snap reel. Renders locally on macOS with Python, ffmpeg and headless Chromium.
license: MIT
---

# snapcut

snapcut turns one vertical take into a finished short. The person stays exactly as filmed (their real face, their
real voice); everything else is built around the words they say: the cut, the captions, the graphics, the light, the
sound. Every step is a small tool in the project folder, and every creative choice lives in two JSON files the agent
writes for the take, so an edit can be changed and re-rendered in minutes.

It ships in the Shareefico house look ("Ranked", 11 Oct 2026): graphite and bone, one level colour per video, Satoshi
captions, a level tag opener and an end beat with the @shareefico handle and the pixel mascot. Those marks are his:
for anyone else's videos, turn the opener and the end beat off (see "The house look").

The worked example in `examples/snap-reel/` is the reel this skill was built from (a 73 s take cut to 55 s, with a
DM bubble, tool tiles, full-screen takeovers, an AI studio shot and a snap explosion). Read its beat files before
writing your own; they show every technique in use.

## Ground rules

1. **Never regenerate, warp or beautify a real person's face.** The cut-out, an exposure change and a rim light are
   the only things that touch their pixels. The single exception is the optional AI studio shot
   (references/05-higgsfield.md): you may tell the person it exists, but build it only when they ask for it.
2. **Captions are the words spoken, in order, once each.** `build_timeline.py` refuses a plan that skips, adds or
   reorders a word. Fix a misheard name with `word_fixes`, never by rewriting what was said.
3. **Ask the user before you:** accept the Fontshare font licence (`fetch_fonts.sh --accept-fontshare-ffl`), spend
   AI credits (quote the cost first), upload their footage anywhere, or publish anything.
4. **All text and graphics stay inside the Instagram safe zone** (x 65 to 1015, y 269 to 1248 of 1080x1920), shadows
   included. `render.py safecheck` proves it; a render that fails it is not done.
5. **Nothing sits on the face.** `render.py facecheck` proves it.
6. **Brand logos only name a tool.** Never recolour one, never imply endorsement. OpenAI has no public mark to fetch:
   write "OpenAI" or "Codex" as text.
7. **Heavy media goes to the work folder** (about 1 GB per minute of footage, up to 4 GB on an exFAT drive). If the
   internal disk is tight, ask where it should go (an external drive is fine).

## Before the first edit

Run the checks in `references/01-setup.md` once per machine: Python packages, ffmpeg, a headless Chromium, Satoshi
(ask before accepting the Fontshare licence) and, on macOS, the Xcode command line tools for the Vision matte. The
render needs an internet connection: the page loads Unbounded and IBM Plex Mono from Google Fonts.

## The pipeline

Paths below are relative to the project folder unless they start with `<skill>` (this skill's folder).

| Step | Command | What it gives you |
|---|---|---|
| 1. Project | `python3 <skill>/scripts/new_project.py <dir> --source <take> [--work <dir>] [--out <dir>] [--title <t>]` | tools, compositor, `project.json`, a `plan.json` stub |
| 2. Words | `python3 tools/transcribe.py` | the transcript with times and pauses, sharp transients (claps, snaps) |
| 3. Plan | you write `plan.json` (references/02-plan-the-edit.md) | trim, cuts, caption phrases, beats, the level, the look |
| 4. Vision | `python3 tools/vision.py` | person matte + face track (Apple Vision, on this Mac) |
| 5. Timeline | `python3 tools/build_timeline.py` | `data/timeline.json`; fails loudly on any plan/transcript mismatch |
| 6. Base | `python3 tools/build_base.py frames` (plate mode: `reference` and `plate` first) | the person cut out and relit, per frame |
| 7. Assets | `python3 tools/prep_assets.py` then `python3 tools/icons.py fetch` | room layers, AI clips as frames, icons |
| 8. Beats | you write `compositor/beats.js` (references/04-beats-catalog.md) | the graphics, each on its word |
| 9. QA | `python3 tools/render.py stills N ...`, `facecheck`, `safecheck`, `glyphs` | proof, before the long render |
| 10. Sound | `python3 tools/render.py sfx` then `python3 tools/build_audio.py` | cues, voice chain, -14 LUFS mixes |
| 11. Render | `python3 tools/render.py video` | the picture, frame by frame |
| 12. Deliver | `python3 tools/deliver.py` | master, voice-only version, cover, contact sheet |

Steps 5 to 11 are cheap to repeat. Change `plan.json` or `beats.js`, rebuild the timeline, re-check, re-render.
Only step 6 is slow to redo (about a minute per 16 s of footage), and it only needs rerunning when the trim or the
room settings change.

## How to run an edit

1. **Read the transcript out loud in your head.** Find the hook (the first line must earn the second), the pauses
   worth cutting (anything over about 0.35 s between thoughts; keep about 0.12 s of air on each side) and the words
   that deserve a graphic: named tools, numbers, lists, contrasts, a question, a punchline.
2. **Propose before you build.** Show the user the transcript `transcribe.py` printed, then in a few lines: the
   trim, what gets cut, the caption phrases, the beats you plan and which optional pieces you suggest (explosion,
   DM bubble; the AI studio shot is available if they want it). AI shots cost credits and upload their footage; the
   studio shot regenerates their face. Wait for their yes before building.
3. **Write `plan.json`**, run vision and the timeline. Fix every error the timeline prints; they name the word and
   the second.
4. **Write `beats.js`** for this take. Start from `examples/snap-reel/compositor/` and `compositor/kit.js`; keep one
   idea per beat, springing in on its word and gone before the next idea arrives.
5. **Check before rendering.** Render stills on every beat, on the opener (frames 3 and 15) and through the end beat
   (its first frame, +12 and the last), look at them, then run `render.py facecheck`, `render.py safecheck` and
   `render.py glyphs`. All three must pass. Iterate here; it is the cheap loop.
6. **Render, deliver, report**: the deliverable paths, the loudness line from `build_audio.py`, the checks that
   passed, and anything you were unsure about (a word you fixed, a cut that clips a breath).

## Choosing the room

`project.json` "room".background:

- `"live"` (default): each frame's own room, darkened, under a drawn RGB wash in the rim colours. Works on any take,
  handheld included.
- `"plate"`: one still room plate, usually the user's room restyled by an image model (streamer RGB lights, night),
  aligned to the camera. It looks the most cinematic but needs a locked-off camera (tripod); on a handheld take the
  room swims behind the person. Recipe in references/05-higgsfield.md.

## Captions

Satoshi Black capitals, at most 15 characters a row (longer plan lines are wrapped for you), bone with the word being
said lit in the video's level colour, a light shadow, letters tight but never touching. Rows rise in on their first
spoken word, bottom-anchored by default. Close selfies filmed with the face low in frame need
`"captions": {"position": "top"}`; `facecheck` tells you (it also wants the mouth 40 px clear of the block).
Sizing rules: references/03-captions.md.

## The house look

plan.json `"brand"` sets the level the video teaches and the package around it (references/02-plan-the-edit.md):

```json
"brand": {"tier": "uncommon", "opener": {"topic": "AI Maxxing 101"},
          "end_beat": {"cta": "@shareefico", "bubble": "FOLLOW @SHAREEFICO"}}
```

- **Level:** `tier` (common, uncommon, rare, epic, legendary) or `level` 1 to 5, default uncommon (LVL 2). Its
  colour lights the spoken caption word and the opener. Pick the level the video teaches: tool tips and prompts are
  uncommon (LVL 2), building your own tools rare (LVL 3), client builds epic (LVL 4).
- **Level tag opener**, the first 2 s, top left: the badge, "UNCOMMON · LVL 2" and the topic. Keep that corner free
  of beats for those 2 s. `"opener": false` turns it off.
- **End beat**, the last 2 s: the picture dims, the symbol and the handle (or a keyword call to action such as
  `Comment "SKILL"`) rise, and the pixel mascot pops up with one bubble (24 characters at most). The last word must
  end 0.1 s before it starts; the timeline names the trim end that makes room. `"end_beat": false` turns it off.
- The symbol, badges and pixel mascot come from `compositor/shareefico.js` (Ibrahim Shareef's marks, not MIT; see
  `compositor/NOTICE-shareefico.txt`). They are for his videos only: for anyone else, set
  `"brand": {"opener": false, "end_beat": false}`. Unknown keys in `"brand"` are refused, so a typo never falls
  back to his handle.
- **Projects started before 11 Oct 2026** need the new compositor and tools: copy `template/compositor/` and
  `template/tools/` over the project's own (keep its `beats.js`), then rebuild the timeline. An old
  `data/timeline.json` stops the render with that instruction.

## Where to look

| Need | File |
|---|---|
| Install, fonts, Chromium, disk | references/01-setup.md |
| project.json and plan.json, every key | references/02-plan-the-edit.md |
| Caption sizes, style, palette, the house look | references/03-captions.md |
| Beat modules, the kit, sound cues | references/04-beats-catalog.md |
| AI room plate, studio shot, explosion plates | references/05-higgsfield.md |
| Stills, facecheck, safecheck, glyphs, loudness | references/06-qa.md |
| Handheld, HDR, odd frame rates, non-Mac | references/07-pitfalls.md |

## Timing, measured

On an M4 Pro, a 16 s handheld take: transcription 10 s, matte and face track 25 s, base frames 72 s, render about
2 frames per second (3 minutes for 12 s of output). Frames near a beat render slower, because they are motion
blurred from five sub-frames.
