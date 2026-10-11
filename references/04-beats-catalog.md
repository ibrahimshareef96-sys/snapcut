# 04 Beats: the graphics and the sounds

A beat is a graphic that lands on a spoken word. You write this take's beats in `compositor/beats.js` (a plain
script, no build step). `compositor/index.html` loads the core first, then `beats.js`; add more files there if a
take needs them, each registering itself on `SNAPCUT`.

## The contract

```js
const BEATS = (() => {
  let B = null;
  function init(tl) { B = tl.beats; }                  // B.key = output seconds of plan.json beat "key"
  function draw(ctx, t, layer, img) {                  // t = output seconds; img = project.json images
    if (layer === 'behind') { /* drawn over the room, under the person: they occlude it */ return; }
    /* 'front': over the person, under the captions */
  }
  return { init, draw };
})();
SNAPCUT.room.push(BEATS);
SNAPCUT.cues.push(B => [{ t: B.studio, kind: 'whoosh', gain: 0.6 }]);
```

- `draw` must be a pure function of `t`: stills are drawn in any order, and frames near a beat are drawn five times
  (sub-frames) for motion blur. No state that changes between calls, no `Date`, no `Math.random` (use `E.hash` / `E.noise1`).
- The canvas is 1080x1920. Output frame `n` is `t = n / 30`.
- Reading a beat that plan.json does not define (`B.claude_cod`) stops the render with its name, so a typo cannot
  leave a graphic on screen for the whole video. Check an optional beat with `'end' in B`.
- Three optional slots exist for bigger set pieces (see the snap reel example): `SNAPCUT.studio` (an AI cutaway with
  its own overlays, flash and burst), `SNAPCUT.takeover` (the frame morphs into a face bubble while a full-screen
  card plays) and more `SNAPCUT.room` modules.

## Motion rules

- **Spring in on the word.** `E.life(t, t0, t1)` gives `{a, s, on}`: alpha, spring scale (overshoots a little, then
  settles) and whether it is live. Start `t0` 0.03 to 0.05 s before the word so the graphic lands with it.
- **Leave before the next idea.** End `t1` before the next beat's graphic arrives; `life` fades it out over 0.22 s.
- **One idea on screen at a time.** Captions already carry the words; a graphic adds a thing to look at (the tool,
  the number, the list), never a second copy of the sentence.
- **Keep it in the safe zone** (`E.SAFE`, x 65 to 1015, y 269 to 1248), overshoot and shadows included. A tile of
  size `s` needs its centre at least `s/2 + 45` px inside.
- **Keep it off the face.** `S.faceScreen(n, t)` returns `{x, y, h}` of the face on screen for frame `n`; place
  graphics beside it. Big words go in the `behind` layer, where the person occludes them.
- **Leave the brand package its room.** The level tag opener holds the top-left corner for the first 2 s and the end
  beat owns the last 2 s (`BRAND.endStart()`); end your graphics before it.
- **Web fonts load per script.** Unbounded and IBM Plex Mono come from Google Fonts, which sends each script's
  letters on first use. If beat code draws them with characters outside plain Latin, load those first in its
  `init`: `E.loadGlyphs(E.monoFont(26), 'the text')` (await it), or the first frame draws a fallback face.
- **The house look.** Graphite surfaces, bone type, the tier colour (`C.accent`) for the one thing that matters.
  No glows, no neon, no gradients, no frosted glass; type on footage gets `E.captionShadow`. Springs: `E.brandSpring(u,
  'ui')` for panels, type and figures, `'badge'` only for badges.

## The kit (`compositor/kit.js`)

| Call | Draws |
|---|---|
| `KIT.tile(ctx, x, y, size, icon, label, a, s, o)` | an app tile: rounded square, an icon name from project.json icons (or an image), a mono label under it. An icon that was never loaded shows the label's initial. `o.dim` greys it, `o.bg` recolours it |
| `KIT.tiles(ctx, t, items, end, size)` | a row of tiles popping in on their own words: `items = [{icon, label, x, y, t0}]` |
| `KIT.badge(ctx, x, y, r, colour, 'check' or 'x', a, s)` | a round check or cross badge |
| `KIT.hero(ctx, str, x, y, px, t0, t1, t, o)` | a huge Satoshi Black word in the tier colour that grows in, for the `behind` layer; `o.col` recolours it, `o.stroke` for an outline version |
| `KIT.monoLabel(ctx, str, x, y, t0, t, a, colour)` | a small IBM Plex Mono label that types on after a short rule |
| `KIT.sparkles(ctx, t, t0, t1, cx, cy, spots, radius)` | sparkle icons popping around a point (needs a `sparkles` icon) |
| `KIT.viewfinder(ctx, t, t0, t1)` | camera corners and a blinking REC inside the safe zone |

## Engine helpers (`E`, `compositor/engine.js`)

| Helper | Use |
|---|---|
| `E.life(t, t0, t1, {w, z, out})` | entrance spring (`w` stiffness, `z` damping) and exit fade |
| `E.brandSpring(u, 'ui')` | the brand springs as step responses: `press`, `ui` (about 3% overshoot), `badge` (about 12%), `progress` |
| `E.spring(u, w, z)`, `E.prog(t, t0, dur)`, `E.ease.outCubic` / `inCubic` / `inOutCubic` / `outExpo` / `outBack` | timing curves |
| `E.text(ctx, str, x, y, {font, align, color, ls, alpha, shadow})` | text; fonts from `E.headFont(px, weight)` (Satoshi 900/800), `E.bodyFont(px, weight)` (Satoshi 500 by default), `E.labelFont(px)` (Unbounded, for level labels in capitals with +0.08em tracking), `E.monoFont(px, weight)` (IBM Plex Mono 500/600). Other Satoshi weights snap to 900, 800 or 500 |
| `E.drawIcon(ctx, name, cx, cy, size, alpha)` | a project.json icon |
| `E.fillRR(ctx, x, y, w, h, r, fill, stroke)`, `E.withShadow(ctx, blur, alpha, dy, fn)`, `E.captionShadow(ctx, fn)` | cards and shadows |
| `E.C` | the palette: `ground` `#15151C`, `surface` `#24242F`, `surface2` `#34323D`, `line` `#3A3A47`, `bone` `#F4F1EA`, `muted` `#A6A4B0`, `faint` `#8D8A97`, `ink` (graphite, for text on a tier fill), `accent` (the video's tier colour). Effect colours for beat code only: `magenta`, `cyan`, `purple`, `red`, `gold`, `igBlue`. Old names still work for older beat files: `lime` is now the tier colour, `chalk` bone |
| `E.hash(x)`, `E.noise1(x, seed)` | deterministic jitter |

## Scene helpers (`S`, `compositor/scene.js`)

| Helper | Use |
|---|---|
| `S.faceScreen(n, t)` | the face on screen: `{x, y, h}` |
| `S.toScreen(n, t, lx, ly)` | a point of the filmed frame (layout pixels) to the screen, through the moving camera |
| `S.propAt(t)` | the tracked prop in the studio clip (project.json studio.track): `{x, y, tipX, tipY, ok}` |
| `S.zoomAt(t)` | the camera zoom right now |

## Effects (`FX`, `compositor/fx.js`)

`FX.flash`, `FX.ring`, `FX.flare`, `FX.embers`, `FX.rays`, `FX.plates` (the explosion clips), `FX.channelShift`,
`FX.glitch`, `FX.vignette`. The snap reel's `beats_studio.js` shows them combined into one explosion.

## Sounds

Every sound is synthesised in `tools/sfx_kit.py`; there are no sample files. A cue is `{t, kind, gain, align}`, from
`SNAPCUT.cues` in a beat file or `look.sfx` in plan.json. `align: 'end'` makes the sound finish on `t` (a riser
landing on a clap). The brand package adds its own three: a swish as the opener slides in, a whoosh as the end
beat's symbol rises and a pop when the mascot's bubble opens.

| Kinds | For |
|---|---|
| `pop` `key` `tick` `tap` `send` `notify` `chime` `sparkle` | a tile landing, typing, a message, a list item, a reveal |
| `whoosh` `swoosh` `swish` | a graphic sweeping in, a transition |
| `shutter` `impact` `thud` `stamp` `error` | a photo, a word slammed in, a verdict, a "no" |
| `riser` `charge` | tension, placed with `align: 'end'` on the hit |
| `boom` `snapboom` `lightson` | a real clap, a finger snap, studio lights coming on |

Gains around 0.4 to 0.8 sit under the voice. The limiter holds the peaks, but a loud cue pulls the voice down with
it for a moment, so keep the big ones (`boom`, `snapboom`) for moments without speech.

## The worked example

`examples/snap-reel/compositor/` (29 Sep 2026, before the house look: its beats keep that reel's own glows and RGB
colours, and its `C.lime` now draws in the tier colour; borrow its techniques, not its colours):

- `beats_room.js`: the DM bubble hook, a viewfinder on "like this?", caption and motion-graphics showcases, tool
  tiles crossed out on "don't", a coding-agent tile row, the end chip.
- `beats_studio.js`: the AI studio cutaway: the prop glow and gem HUD lighting stone by stone on six words, the snap
  burst (plates, rays, shockwave rings, embers), the white flash that hides the cut back to the room.
- `beats_tk.js`: three takeovers where the frame shrinks into a face bubble while a full-screen card plays (a prompt
  card, a terminal installing skills, the call to action).
- `register.js`: how the three modules plug in, and the full sound cue list.

Copy a piece you like into `beats.js`, then change its words, beats and positions for the new take.
