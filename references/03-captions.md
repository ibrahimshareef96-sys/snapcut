# 03 Captions

The caption engine is `compositor/captions.js`. You control it from `plan.json` phrases; you rarely touch the code.

## A phrase

```json
{"lines": [["THE MOST ASKED", "l"], ["QUESTION", "m"]]}
```

- `lines` is one to three `[text, size]` lines, stacked and centred. Two is the norm.
- Write the words exactly as spoken. Punctuation is kept on screen and ignored when matching. Everything shows in
  capitals.
- A line holds at most 15 characters, spaces and punctuation included. A longer line is wrapped at word boundaries
  into rows of 15 when the timeline is built (a single word longer than that gets its own row and shrinks to fit).
- Sizes: `s` 58 px, `m` 84 px (the house size), `l` 112 px, `xl` 150 px (font size on a 1080 wide frame). A row
  wider than the safe zone shrinks to fit, and a block taller than 330 px shrinks as a whole, so size by emphasis,
  not by length: `l` and `xl` only read as bigger on short rows (a full 15-character row shrinks to about 90 to
  100 px whatever its size letter). Big type is for one or two power words a minute, never more.
- A row rises in on its first spoken word; the phrase leaves just before the next one arrives, so two phrases never
  share the screen.

## How it looks (the house look, 11 Oct 2026)

- Satoshi Black capitals in bone (`#F4F1EA`), letter-spacing -0.02em, under the light caption shadow
  (`0 2px 12px rgba(0,0,0,.55)`) and a soft dark pool.
- **The word being said lights up in the video's tier colour** (plan.json `brand.tier`, default uncommon
  `#34D07F`) from its first sound until the next word starts. There is no markup for it: every word is timed.
- Letters are packed tight but never touch: each glyph is measured at the size it is shown, and any pair whose ink
  comes closer than 2.5 px is opened just enough (up to 12 px). `render.py glyphs` lists the tightest pairs and
  fails if one stayed closer. This is for Latin, Greek and Cyrillic capitals: words in a script whose letters join
  or stack (Arabic, Hebrew, Devanagari, combining accents, emoji) are drawn whole, shaped by the browser, and a row
  of right-to-left words runs right to left. Satoshi has no Arabic letters, so those fall back to a system face.
- Signs with nothing spoken (`&`, a dash) are shown but never lit.
- Rows rise on the brand's `ui` spring with their letters closing in, never through a mask, so no letter is ever cut
  off on any frame.
- The block's bottom row sits at or above y 1212 (inside the safe zone's floor of 1248, shadow included).

Markup from plans written before 11 Oct 2026 (`*accent*`, `~KEYWORD~`) is accepted and ignored.

## Rules that keep it readable

- One breath per phrase. Split where the speaker pauses, not mid-idea.
- 3 to 15 characters per line. One to three rows per phrase; the build notes a phrase that wraps to more.
- Numbers as digits (`2 DAYS`, not `TWO DAYS`) only when that is how the viewer should read them: add
  `"two": "2"` to `word_fixes` and write `2` in the phrase. Without the fix, the phrase must say `TWO`.
- Keep the face clear: the mouth sits at least 40 px above the caption block. Bottom placement suits a medium shot;
  a close selfie with the face low in frame needs `"captions": {"position": "top"}`. `render.py facecheck` decides
  it for you. At the top, a phrase that starts during the level tag opener sits under the opener.

## Style flips

`look.caption_flips` makes the phrase on screen cycle through three other styles (every word in the tier colour, a
bone outline with the spoken word filled, a tier outline) every 0.13 s for `dur` seconds from a beat, then settle
back. It is loud: use it once, on a word about captions or style.

## The chat bubble

One phrase may be `{"dm": "...", "header": "NEW MESSAGE", "sub": "..."}`. Its words are typed into a message card
(graphite surface, Satoshi) as they are spoken, the current word in the tier colour, with typing dots until the last
one. Good for a viewer's question at the top of the video. Keep `sub` factual; never invent a sender's name.

## Changing the look

The palette and the families are at the top of `compositor/engine.js` (`C` and `FONT`). `C.accent` is the video's
tier colour, set from plan.json `brand.tier`; changing the tier changes every highlight, the opener's label and its
badge at once. The opener and the end beat live in `compositor/brand.js`. To use other fonts, add their files to the
font cache and their entries to `FONTS` in `tools/render.py` (family name, weight range, style, file), then point
`FONT` at them. Check their licence allows embedding in video before you ship them.
