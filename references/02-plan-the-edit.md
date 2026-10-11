# 02 Plan the edit: project.json and plan.json

Two files describe a video. `project.json` says where things are and which effects run. `plan.json` is the creative
plan for this take, written from the transcript. All times in `plan.json` are **source seconds** (the raw take's
clock, as `transcribe.py` prints it); the tools convert them to output time after the cuts.

## plan.json

```json
{
  "trim": [11.05, 67.80],
  "last_word_t": 66.9,
  "cuts": [[18.75, 19.07], [35.45, 35.93]],
  "word_fixes": {"cloud": "claude"},
  "onset_fixes": [{"word": "with", "start": 26.65, "onset": 27.49}],
  "events": {"clap": 24.99, "snap": 30.53},
  "wipe_events": ["snap"],
  "end": 66.85,
  "beats": {"studio": {"word": "studio"}, "like_this": {"word": "like", "after": 22.5}},
  "phrases": [
    {"dm": "Ibrahim, how do you get AI to edit videos like this?", "header": "NEW MESSAGE", "sub": "the most asked question"},
    {"lines": [["TODAY I'M GOING", "m"], ["TO ANSWER", "l"]]}
  ],
  "captions": {"position": "bottom"},
  "brand": {"tier": "uncommon", "opener": false, "end_beat": false},
  "camera": {"base_zoom": 1.15, "face_y": 650, "punch": 1.12, "hits": {"like_this": 1.14}},
  "look": {
    "shakes": [{"beat": "snap", "amp": 26, "dur": 1.3}],
    "light_flares": [{"beat": "snap", "offset": 0.15, "gain": 1.1}],
    "stutter": {"from": "or_all", "to": "clap"},
    "push": {"from": "or_all", "to": "clap", "amount": 0.11},
    "hue_kick": "snap",
    "caption_flips": [{"beat": "captions", "dur": 0.75}],
    "sfx": [{"beat": "clap", "kind": "boom", "gain": 0.9}]
  }
}
```

| Key | Required | Meaning |
|---|---|---|
| `trim` | yes | `[start, end]`: the part of the take that becomes the video. Start just before the first word, end after the last breath. |
| `last_word_t` | no | Ignore transcribed words after this second (a stray "okay" while reaching for the phone). |
| `cuts` | no | `[[from, to], ...]` removed inside the trim, usually the long pauses. Keep about 0.12 s of air on each side of a cut; never cut inside a word. Each cut alternates the zoom (`camera.punch`), so a jump cut reads as a camera change. |
| `word_fixes` | no | `{"heard": "meant"}` for names Whisper mishears. Applied when matching your phrases to the transcript and to the words typed in the chat bubble; caption text is always what you write in the phrase. Only for spelling, never to change what was said. |
| `onset_fixes` | no | When a caption appears before its word is heard: `{"word", "start", "onset"}`, where `start` is that word's start in `data/words_refined.json` (matched within 0.03 s) and `onset` is the true start, found by listening or from the pause list. A fix that matches no word stops the build. |
| `events` | no | Named moments measured on the audio, not words: a clap, a snap (use the transient list `transcribe.py` prints). They become beats. |
| `wipe_events` | no | Events that white out the frame; the caption on screen leaves with them. |
| `end` | no | Source second of the end card or last beat; becomes beat `end`. |
| `beats` | no | Named word moments for graphics and sound: `{"key": {"word": "studio", "after": 22.5}}` is the first "studio" spoken at or after 22.5 s. Beat keys are what `beats.js` reads as `B.key` (output seconds). A beat word that is not found stops the build. |
| `phrases` | yes | The captions, in spoken order. **Every spoken word in the trim must be in exactly one phrase, in order**; the build names the first word that breaks this. See 03-captions.md for the markup and sizes. |
| `phrases[].dm` | no | One phrase may be `{"dm": "..."}`: the words are typed into a chat bubble as they are spoken instead of shown as captions. `header` and `sub` are the bubble's two small lines; `sub` must be true (no invented names or numbers). |
| `captions.position` | no | `"bottom"` (default) or `"top"`. `render.py facecheck` tells you which the take needs. At the top, a phrase that starts in the first 2 s sits under the level tag opener. |
| `brand.tier` / `brand.level` | no | The level the video teaches: `common`, `uncommon`, `rare`, `epic`, `legendary`, or `1` to `5` (give one; they must agree if you give both). Default uncommon (LVL 2). Its colour lights the spoken caption word and the opener. |
| `brand.opener` | no | The level tag for the first 2 s, top left: `{"topic": "..."}` (at most 40 characters, sentence case; empty shows the level alone) or `false`. Off unless given (the badge is Ibrahim Shareef's mark; `--brand shareefico` turns it on for his projects). |
| `brand.end_beat` | no | The last 2 s: `{"cta": "@yourhandle", "bubble": "FOLLOW @YOURHANDLE"}` or `false`. `cta` (at most 24 characters) is a handle (starts with @, set in Unbounded) or a keyword call to action (`Comment "SKILL"`, set in Satoshi capitals); `bubble` is the pixel mascot's line, at most 24 characters, in capitals. Both are required: there is no default handle. Off unless given. It draws Ibrahim Shareef's symbol and pixel mascot (his marks, not MIT), so it is for his videos (`--brand shareefico` writes `@shareefico`); for your own, leave it `false` or swap `compositor/shareefico.js` for your own marks; the last word must end 0.1 s before the end beat starts, and the build names the trim end that makes room. |
| `camera.base_zoom` | no | 1.0 to about 1.2. Above 1 the camera can reframe and follow the face; 1.0 shows the full frame and cannot move. |
| `camera.face_y` | no | Where the face centre sits on screen (layout pixels, 0 to 1920). Only reachable when zoom leaves room to move. |
| `camera.punch` | no | The zoom the cuts alternate to (about 1.06 to 1.12). |
| `camera.hits` | no | `{"beat": zoom}` soft punch-ins on hit words (1.04 to 1.16). One every few seconds at most. |
| `look.shakes` | no | Camera shake on a beat: `amp` in pixels (6 small, 16 a clap, 26 an explosion), `dur` seconds, optional `offset`. |
| `look.light_flares` | no | The room lights flare on a beat: `gain` 0.5 to 1.1. |
| `look.stutter` | no | The room lights flicker from one beat to another (tension before a big moment). |
| `look.push` | no | A slow push-in from one beat to another, `amount` about 0.1, released on the second beat. |
| `look.hue_kick` | no | A beat after which the room lights swing in hue and settle. |
| `look.caption_flips` | no | The caption flips through three other styles (all in the tier colour, bone outline, tier outline) for `dur` seconds from a beat (on the word "captions", say). |
| `look.sfx` | no | Sound cues that need no graphic: `{"beat", "kind", "gain", "offset", "align"}`. Kinds in 04-beats-catalog.md. |

### Writing the plan from the transcript

1. `transcribe.py` prints each run of words with its start time and the pause after it, then the sharp transients.
2. Pick the trim. Pick the cuts from the pauses (over about 0.35 s between thoughts). Short takes need few cuts;
   do not turn the person into a jump-cut machine.
3. Split the words into caption phrases of one breath each, two lines at most, 3 to 15 characters per line (a longer
   line is wrapped into rows of 15 for you, and the build notes a phrase that ends up with more than three rows).
   No accent markup is needed: the word being said lights up by itself.
4. Pick the level the video teaches (`brand.tier`) and the opener's topic, and leave about 2.1 s of picture after the
   last word for the end beat (or turn it off).
5. Name a beat for every word a graphic or a sound lands on. Use `after` when the word repeats.
6. Build the timeline. It first lists every shape problem in plan.json at once, then prints the segment count, the
   output duration, the brand line (level, opener, end beat) and any mismatch, naming the word and the second. Fix
   and rebuild until it passes.
   `build_timeline.py --no-cuts` builds the same plan without the cuts, to hear the take uncut.

Words in any language and script match (accents, Arabic, and so on); punctuation is ignored.

## project.json

`scripts/new_project.py` writes this; edit it to turn effects on.

| Key | Meaning |
|---|---|
| `title` | Used in the deliverable file names. |
| `source` | The take. 9:16 vertical, SDR. Absolute, or relative to the project folder. |
| `work`, `out` | Heavy media and deliverables (see 01-setup.md). |
| `cover_t` | Output second of the cover frame `deliver.py` exports. |
| `vocab` | Names and brand words, comma separated: biases Whisper toward their spelling. |
| `whisper_model`, `language` | Default `large-v3-turbo`, `en`. |
| `matte` | `{"start", "end"}` source seconds. Default: the trim plus 0.5 s either side. |
| `room` | The room behind the person: `background` `"live"` or `"plate"`, and the relight settings. Every key is documented at the top of `tools/relight.py`. |
| `room.empty_frame_t` | Plate mode: a source second where the room is empty (the person has not sat down yet). Without it, a masked median of the take stands in. |
| `room.plate` | Plate mode: the restyled room image in the work folder (05-higgsfield.md). Null uses the real room. |
| `studio` | Optional AI cutaway: `{"clip", "drive_t0", "in_event", "out_event", "fps", "track"}`. It plays from the `in_event` beat to the `out_event` beat; `drive_t0` is the source second the clip's motion was driven from (05-higgsfield.md). `"enabled": false` turns it off. |
| `studio.track` | Optional coloured prop to follow in the studio clip (a glove, a mug): `{"hsv_lo": [h,s,v], "hsv_hi": [h,s,v], "region": [x0,y0,x1,y1], "min_area": 600}` in OpenCV HSV (hue 0 to 180) and 1080x1920 pixels. Beat code reads it with `S.propAt(t)`. |
| `explosion.plates` | Optional VFX clips on black, screen-blended over the frame on the beat named `snap`: `{"file", "start", "dur", "lead", "fps", "scale", "alpha"}`. `lead` is how far into the clip the burst peaks. |
| `icons` | Each name maps to `{"lucide": "terminal", "fill": "#34D07F"}`, `{"brand": "claude"}` or `{"file": "path.svg", "fill": null}`. Run `tools/icons.py fetch` after changing it. House fills: bone `#F4F1EA`, or the video's tier colour (common `#A3ACB9`, uncommon `#34D07F`, rare `#3B82F6`, epic `#A26BFA`, legendary `#F5A524`). |
| `images` | `{"name": "path.png"}` extra images the beat code gets as `img.name`. |
