/* snapcut compositor entry points, called by tools/render.py through Playwright:
     init(data)             fonts, icons, timeline, assets, then every registered beat module's init
     renderFrame(n, o)      draw output frame n on #out (sub-frames averaged into motion blur where things move fast)
                            o.ink 'all': graphics and text only on a transparent canvas (the safe-zone check);
                            o.ink 'front': the same without the behind-the-person layer (the face check)
     sfxEvents()            the sound cue list: plan.look.sfx plus each beat module's cues
     captionFaceReport()    per phrase, how much of its time the caption block covers the face (render.py facecheck)
     faceBox(n)             the face's eyes-to-mouth box on screen at frame n, null while the face is not shown whole

   Per-video beat files register themselves on SNAPCUT (see compositor/beats.js and references/04-beats-catalog.md):
     SNAPCUT.room.push({init, draw(ctx, t, layer, img)})         layer = 'behind' (under the person) | 'front'
     SNAPCUT.studio = {init, studio(ctx, t, inkOnly), burst(ctx, t, imgs), flash(ctx, t), chroma(t), glitchAmt(t)}
     SNAPCUT.takeover = {init, at(t), draw(ctx, t, w), WIN()}
     SNAPCUT.cues.push((B, TL) => [{t, kind, gain}])              sound cues computed from the beats */
'use strict';

const SNAPCUT = { room: [], studio: null, takeover: null, cues: [] };

const M = (() => {
  const { W, H, FPS, clamp } = E;
  let TL = null, P = null, B = null, out = null, octx = null, buf = null, bctx = null;
  const img = {};
  const MORPH = 0.38;

  /* plan.json beats as a read-only map that throws on a name it does not have: a typo in a beat file must stop the
     render with its name, not become NaN (a graphic stuck on screen for the whole video, or a clip that blanks the
     person). Probe an optional beat with `'name' in B`. */
  function strictBeats(beats) {
    return new Proxy(Object.freeze({ ...beats }), {
      get(target, key) {
        if (typeof key !== 'string' || key in target || key === 'toJSON' || key === 'then') return target[key];
        throw new Error(`unknown beat "${key}": add it to plan.json beats or events, then rebuild the timeline`);
      },
    });
  }

  async function init(data) {
    TL = data.timeline; TL.beats = strictBeats(TL.beats); P = data.paths; B = TL.beats;
    if ((P.plates || []).length && !('snap' in B)) {
      throw new Error('project.json explosion plates play on the beat named "snap": add a "snap" event or beat to plan.json');
    }
    await E.loadFonts(data.fonts);
    for (const [name, ic] of Object.entries(data.icons)) await E.loadIcon(name, ic.svg, ic.fill);
    for (const [name, url] of Object.entries(P.images || {})) img[name] = await E.image(url);
    await S.init(TL, P, data.track);
    FX.init(P); CAP.init(TL);
    for (const mod of [...SNAPCUT.room, SNAPCUT.studio, SNAPCUT.takeover]) if (mod && mod.init) mod.init(TL);
    out = document.getElementById('out');
    octx = out.getContext('2d');
    buf = document.createElement('canvas');
    buf.width = W; buf.height = H;
    bctx = buf.getContext('2d');
    return { frames: TL.frames, duration: TL.duration };
  }

  /* Motion blur (sub-frames over a 180-degree shutter) near every beat, where things move fast. */
  function fast(t) {
    if (Object.values(B).some(x => t >= x - 0.1 && t <= x + 0.6)) return true;
    const tk = SNAPCUT.takeover;
    return !!tk && tk.WIN().some(w => (t >= w.t0 && t <= w.t0 + 0.45) || (t >= w.t1 && t <= w.t1 + 0.45));
  }
  const SAMPLES = 5;

  function reset(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
  }

  const room = (ctx, t, layer) => SNAPCUT.room.forEach(mod => { reset(ctx); mod.draw(ctx, t, layer, img); });

  /* ink: false (the real frame) | 'all' (every graphic and caption, transparent: the safe-zone check) |
     'front' (the same without the behind-the-person layer, which the person hides: the face check) */
  function draw(ctx, t, n, fg, studio, imgs, ink) {
    const inkOnly = !!ink;
    reset(ctx);
    ctx.clearRect(0, 0, W, H);
    const tk = SNAPCUT.takeover, st = SNAPCUT.studio;
    const w = tk ? tk.at(t) : null;
    const studioOn = S.inStudio(t) && studio;
    if (!inkOnly) {
      if (studioOn) { S.drawStudio(ctx, t, studio); if (st) st.studio(ctx, t, false); }
      else if (w) { S.drawGlass(ctx, t); S.drawBubble(ctx, n, t, fg, w.p, ...w.bubble); }
      else S.drawRoom(ctx, n, t, fg, (c, tt) => { c.save(); room(c, tt, 'behind'); c.restore(); }, null);
    } else if (!studioOn && !w) {
      if (ink !== 'front') room(ctx, t, 'behind');
    } else if (studioOn && st) {
      st.studio(ctx, t, true);
    }
    reset(ctx);
    // room graphics also run while a takeover morphs in or out, so a beat that starts then springs in on its word
    const morphing = w && (t < w.t0 + MORPH || t > w.t1);
    if (!studioOn && (!w || morphing)) room(ctx, t, 'front');
    reset(ctx);
    if (w) tk.draw(ctx, t, w);
    if (!inkOnly && st) { reset(ctx); st.burst(ctx, t, imgs); }
    reset(ctx);
    CAP.draw(ctx, t, inkOnly);
    if (inkOnly) return;
    if (st) {
      reset(ctx);
      st.flash(ctx, t);
      FX.channelShift(ctx, st.chroma(t));
      FX.glitch(ctx, t, st.glitchAmt(t));
    }
    reset(ctx);
    FX.vignette(ctx, 0.32);
  }

  async function renderFrame(n, o = {}) {
    const t0 = n / FPS;
    const si = TL.camera.src[clamp(n, 0, TL.camera.src.length - 1)];
    const fg = await E.image(S.fgUrl(si));
    S.setBg(S.bgUrl(si) ? await E.image(S.bgUrl(si)) : null);
    const studio = S.inStudio(t0) || S.inStudio(t0 + 0.5 / FPS) ? await E.image(S.studioUrl(S.studioFrame(t0))) : null;
    const ink = o.ink || (o.inkOnly ? 'all' : false);
    const count = !ink && fast(t0) ? SAMPLES : 1;
    const imgs = {};                          // explosion plate frames for every sub-frame, not just the first
    if ('snap' in B) {
      for (let k = 0; k < count; k++) {
        for (const url of FX.plateFrames((n + (k * 0.5) / count) / FPS, B.snap)) imgs[url] = imgs[url] || await E.image(url);
      }
    }
    reset(octx);
    octx.clearRect(0, 0, W, H);
    for (let k = 0; k < count; k++) {
      draw(bctx, (n + (k * 0.5) / count) / FPS, n, fg, studio, imgs, ink);
      reset(octx);
      octx.globalAlpha = 1 / (k + 1);
      octx.drawImage(buf, 0, 0);
    }
    reset(octx);
    if (n + 1 < TL.frames) {                  // warm the next frame's images while this one is encoded
      const next = TL.camera.src[n + 1];
      E.image(S.fgUrl(next)).catch(() => {});
      if (S.bgUrl(next)) E.image(S.bgUrl(next)).catch(() => {});
    }
    return { si, samples: count };
  }

  function sfxEvents() {
    const ev = [...((TL.look && TL.look.sfx) || [])];
    for (const fn of SNAPCUT.cues) ev.push(...fn(B, TL));
    // align 'end': the sound ENDS on t (a riser landing on a clap); build_audio.py places it
    return ev.filter(e => Number.isFinite(e.t) && e.t >= 0 && e.t <= TL.duration)
      .map(e => ({ t: +e.t.toFixed(4), kind: e.kind, gain: e.gain ?? 1, align: e.align === 'end' ? 'end' : 'start' }))
      .sort((a, b) => a.t - b.t);
  }

  const captionFaceReport = () => CAP.faceReport(bctx);

  /* The brow-to-upper-lip box of the face on screen at output frame n (eyes and nose: what a viewer reads a face by;
     lower-third captions over the chin are fine), or null while the face is not shown whole (a takeover has shrunk
     it into a bubble, or the studio shot is on). */
  function faceBox(n) {
    const t = n / FPS, tk = SNAPCUT.takeover;
    if (S.inStudio(t) || (tk && tk.at(t))) return null;
    const f = S.faceScreen(n, t);
    return { x0: f.x - 0.4 * f.h, x1: f.x + 0.4 * f.h, y0: f.y - 0.5 * f.h, y1: f.y + 0.2 * f.h };
  }

  return { init, renderFrame, sfxEvents, captionFaceReport, faceBox };
})();
