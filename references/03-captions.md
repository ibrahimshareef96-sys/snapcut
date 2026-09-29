# 03 Captions

The caption engine is `compositor/captions.js`. You control it from `plan.json` phrases; you rarely touch the code.

## A phrase

```json
{"lines": [["THE MOST *asked*", "l"], ["QUESTION", "m"]]}
```

- `lines` is one to three `[text, size]` rows, stacked and centred. Two rows is the norm.
- Write the words exactly as spoken. Punctuation is kept on screen and ignored when matching; capitals are yours.
- Sizes: `s` 58 px, `m` 90 px, `l` 124 px, `xl` 168 px (font size on a 1080 wide frame). A row wider than the
  safe zone shrinks to fit, and a block taller than 330 px shrinks as a whole, so size by emphasis, not by length.
- A row rises in on its first spoken word; the phrase leaves just before the next one arrives, so two phrases never
  share the screen.

## Markup

| Markup | Looks like | Use it for |
|---|---|---|
| `PLAIN CAPS` | Clash Display, bold capitals, cream | most words |
| `*word*` | Instrument Serif italic, lime, a little larger | the one word that carries the phrase (at most one per phrase) |
| `~WORD~` | Clash Display, lime | a keyword: a product, a number, the thing being named |

Write accents in lower case (`*answer*`); the serif is meant to read as a spoken aside against the capitals.

## Rules that keep it readable

- One breath per phrase. Split where the speaker pauses, not mid-idea.
- 3 to 15 characters per row. Longer rows shrink and lose punch.
- One accent per phrase. If everything is lime, nothing is.
- Numbers as digits (`2 DAYS`, not `TWO DAYS`) only when that is how the viewer should read them: add
  `"two": "2"` to `word_fixes` and write `2` in the phrase. Without the fix, the phrase must say `TWO`.
- Keep the face clear: bottom placement suits a medium shot; a close selfie with the face low in frame needs
  `"captions": {"position": "top"}`. `render.py facecheck` decides it for you.

## Style flips

`look.caption_flips` makes the phrase on screen cycle through three other styles (lime fill, outline, RGB split)
every 0.13 s for `dur` seconds from a beat, then settle back. It is loud: use it once, on a word about captions or
style.

## The chat bubble

One phrase may be `{"dm": "...", "header": "NEW MESSAGE", "sub": "..."}`. Its words are typed into a message bubble
as they are spoken, the current word in lime, with typing dots until the last one. Good for a viewer's question at
the top of the video. Keep `sub` factual; never invent a sender's name.

## Changing the look

The palette and the four families are at the top of `compositor/engine.js` (`C` and `FONT`). Changing `C.lime`
changes every accent, keyword, flare and badge at once. To use other fonts, add their files to the font cache and
their entries to `FONTS` in `tools/render.py` (family name, weight range, style, file), then point `FONT` at them.
Check their licence allows embedding in video before you ship them.
