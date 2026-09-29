/* Captions: kinetic type (stacked Clash Display capitals, one serif-italic accent per phrase) with the accent in
   lime, anchored in the Instagram safe zone (bottom by default) over a soft dark pool. Lines rise out of their
   own mask on their first spoken word, letters closing in as they land. On plan.look.caption_flips beats the
   phrase flips through caption styles. A viewer's question can be typed as a chat bubble instead ({"dm": ...}). */
'use strict';

const CAP = (() => {
  const { W, SAFE, C, clamp, lerp, prog, ease, spring } = E;
  const SIZES = { s: 58, m: 90, l: 124, xl: 168 };
  const ACC = 1.14, INK = 36, MAX_W = SAFE.x1 - SAFE.x0 - 2 * INK;
  const BOTTOM = SAFE.y1 - INK, TOP = SAFE.y0 + INK + 20, MAX_BLOCK = 330, IN_DUR = 0.5, TRACK = 9, CX = W / 2;
  let TL = null, B = null;
  const layouts = new Map();                // keyed by the phrase object: two phrases can share a t_in after a cut
  function init(tl) { TL = tl; B = tl.beats; layouts.clear(); }
  const POS = () => (TL.captions && TL.captions.position) || 'bottom';

  function row(ctx, ln) {
    const tokens = E.parseRich(ln.text);
    let px = SIZES[ln.size] || SIZES.m;
    let w = E.richWidth(ctx, tokens, px, ACC);
    if (w > MAX_W) { px *= MAX_W / w; w = MAX_W; }
    const accent = tokens.some(k => k.kind !== 'head');
    const gaps = tokens.filter(k => k.kind !== 'accent').reduce((a, k) => a + [...k.text].length, 0);
    return { tokens, px, w, lineH: px * (accent ? 1.02 : 0.9), gaps, t: ln.t, accent };
  }
  function layout(ctx, ph) {
    const key = ph;
    if (layouts.has(key)) return layouts.get(key);
    let rows = ph.lines.map(ln => row(ctx, ln));
    const total = rows.reduce((a, r) => a + r.lineH, 0);
    if (total > MAX_BLOCK) {
      const k = MAX_BLOCK / total;
      rows = rows.map(r => ({ ...r, px: r.px * k, w: r.w * k, lineH: r.lineH * k }));
    }
    // plan.json captions.position: 'bottom' (default, anchored on the safe zone's bottom edge) or 'top' (for takes
    // filmed with the face low in the frame; render.py facecheck says which one a take needs)
    const height = rows.reduce((a, r) => a + r.lineH, 0);
    let y = POS() === 'top' ? TOP : BOTTOM - height;
    const top = y;
    rows = rows.map(r => { const o = { ...r, top: y, base: y + r.lineH * 0.82, x: CX - r.w / 2 }; y += r.lineH; return o; });
    const L = { rows, top, bottom: top + height, width: Math.max(...rows.map(r => r.w)) };
    layouts.set(key, L);
    return L;
  }

  /* Caption style flips (plan.look.caption_flips): 0 house, 1 lime serif, 2 outline, 3 RGB split. */
  function styleAt(t) {
    for (const [t0, dur] of (TL.look && TL.look.caption_flips) || []) {
      const u = t - t0;
      if (u >= 0 && u < dur) return 1 + Math.floor(u / 0.13) % 3;
    }
    return 0;
  }

  function drawRow(ctx, r, t, tOut, exitDur, style) {
    const tin = t - r.t;
    const inP = ease.outExpo(prog(tin, 0, IN_DUR));
    const outP = ease.inCubic(prog(t, tOut, exitDur));
    if (inP <= 0 || outP >= 1) return;
    const rise = (1 - inP) * r.lineH * 0.95, lift = outP * r.lineH * 0.5;
    const tracking = Math.min((1 - inP) * TRACK, Math.max(0, (MAX_W - r.w) / Math.max(1, r.gaps)));
    const extra = tracking * r.gaps, ox = r.x - extra / 2;
    const pop = Math.min(r.accent ? 1 + 0.06 * (1 - spring(tin, 10, 0.5)) : 1, MAX_W / (r.w + extra));
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox - 40, r.top - r.lineH * 0.3 - lift, r.w + extra + 80, r.lineH * 1.45);
    ctx.clip();
    ctx.globalAlpha *= 1 - outP;
    const oy = r.base + rise - lift;
    ctx.translate(CX, oy); ctx.scale(pop, pop); ctx.translate(-CX, -oy);
    const o = { acc: ACC, tracking };
    if (style === 1) Object.assign(o, { fill: C.lime, accent: C.chalk });
    if (style === 2) Object.assign(o, { stroke: 3.2, fill: C.chalk, accent: C.lime, kw: C.lime });
    if (style === 3) {
      ctx.globalCompositeOperation = 'lighter';
      E.drawRich(ctx, r.tokens, ox - 6, oy, r.px, { ...o, fill: '#FF2E6E', accent: '#FF2E6E', kw: '#FF2E6E' });
      E.drawRich(ctx, r.tokens, ox + 6, oy, r.px, { ...o, fill: '#2EC8FF', accent: '#2EC8FF', kw: '#2EC8FF' });
      ctx.globalCompositeOperation = 'source-over';
    }
    E.withShadow(ctx, 26, 0.6, 5, () => E.drawRich(ctx, r.tokens, ox, oy, r.px, o));
    ctx.restore();
  }

  function pool(ctx, L, a) {
    if (a <= 0) return;
    const cy = (L.top + L.bottom) / 2;
    const rx = Math.min((SAFE.x1 - SAFE.x0) / 2, L.width / 2 + 150);
    const ry = Math.min((L.bottom - L.top) / 2 + 110, SAFE.y1 - cy, cy - SAFE.y0);
    ctx.save();
    ctx.translate(CX, cy); ctx.scale(rx, ry);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, `rgba(3,5,10,${0.56 * a})`); g.addColorStop(0.55, `rgba(3,5,10,${0.34 * a})`); g.addColorStop(1, 'rgba(3,5,10,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function draw(ctx, t, inkOnly) {
    for (const ph of TL.phrases) {
      const ex = ph.exit ?? 0.2;
      if (t < ph.t_in - 0.05 || t > ph.t_out + ex) continue;
      const L = layout(ctx, ph);
      if (!inkOnly) pool(ctx, L, Math.min(prog(t, ph.t_in - 0.05, 0.25), 1 - prog(t, ph.t_out, ex)));
      const style = styleAt(t);
      for (const r of L.rows) drawRow(ctx, r, t, ph.t_out, ex, style);
    }
    drawDM(ctx, t);
  }

  // ---------- the question, typed as a chat bubble ----------
  function drawDM(ctx, t) {
    const dm = TL.dm;
    if (!dm) return;                                     // the DM bubble is optional ({"dm": ...} in plan.phrases)
    const t0 = dm.t_open, t1 = dm.t_close;              // set by build_timeline so captions never sit under it
    if (t < t0 || t > t1 + 0.3) return;
    const L = E.life(t, t0, t1, { w: 13, z: 0.62, out: 0.28 });
    const x = 110, w = 860, y = 842;
    ctx.save();
    ctx.globalAlpha *= L.a;
    const s = 0.86 + 0.14 * L.s;
    ctx.translate(x + 60, y + 380); ctx.scale(s, s); ctx.translate(-(x + 60), -(y + 380));
    // header: a DM from "a viewer" (no invented name or avatar)
    E.fillRR(ctx, x, y, w, 360, 44, 'rgba(18,20,28,0.92)', 'rgba(255,253,244,0.12)', 2);
    ctx.save();
    const g = ctx.createLinearGradient(x, y, x + 60, y + 60);
    g.addColorStop(0, '#FEDA75'); g.addColorStop(0.5, '#D62976'); g.addColorStop(1, '#4F5BD5');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x + 58, y + 58, 26, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    E.text(ctx, dm.header || 'NEW MESSAGE', x + 100, y + 52, { font: E.monoFont(22), color: 'rgba(255,253,244,0.7)', ls: 3 });
    if (dm.sub) E.text(ctx, dm.sub, x + 100, y + 80, { font: E.bodyFont(22, 500), color: 'rgba(255,253,244,0.45)' });
    // the words appear as they are spoken; the current word in lime. A long question shrinks until it fits four
    // lines, so it never runs out of the card or the safe zone.
    const words = dm.words;
    let px = 50;
    for (; px > 28; px -= 2) {
      ctx.font = E.bodyFont(px, 700);
      let lines = 1, lx = x + 40;
      for (const wd of words) {
        const ww = ctx.measureText(wd.w + ' ').width;
        if (lx + ww > x + w - 40) { lines++; lx = x + 40; }
        lx += ww;
      }
      if (lines <= 4) break;
    }
    ctx.font = E.bodyFont(px, 700);
    let cx = x + 40, cy = y + 160;
    const lineH = Math.round(px * 1.24);
    words.forEach((wd, i) => {
      const shown = t >= wd.t - 0.03;
      const wW = ctx.measureText(wd.w + ' ').width;
      if (cx + wW > x + w - 40) { cx = x + 40; cy += lineH; }
      if (shown) {
        const next = words[i + 1];
        const active = t < (next ? next.t - 0.03 : dm.t_end + 0.2);
        const pop = spring(t - wd.t + 0.03, 22, 0.6);
        ctx.save();
        ctx.globalAlpha *= clamp(pop * 2);
        ctx.fillStyle = active ? C.lime : C.chalk;
        ctx.fillText(wd.w, cx, cy + (1 - pop) * 10);
        ctx.restore();
      }
      cx += wW;
    });
    // typing dots while words are still coming
    if (t < dm.t_end) {
      for (let i = 0; i < 3; i++) {
        const a = 0.35 + 0.65 * Math.max(0, Math.sin(t * 9 - i * 0.9));
        ctx.fillStyle = `rgba(255,253,244,${0.5 * a})`;
        ctx.beginPath(); ctx.arc(x + w - 110 + i * 24, y + 60, 7, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  /* For render.py facecheck: the share of each phrase's screen time where its block covers the face (M.faceBox,
     forehead to mouth; the camera moves, so it is sampled every 0.1 s). */
  function faceReport(ctx) {
    return TL.phrases.map(ph => {
      const L = layout(ctx, ph);
      const x0 = CX - L.width / 2, x1 = CX + L.width / 2;
      let hits = 0, n = 0;
      for (let t = ph.t_in; t <= ph.t_out; t += 0.1, n++) {
        const f = M.faceBox(Math.round(t * E.FPS));
        if (f && x0 < f.x1 && f.x0 < x1 && L.top < f.y1 && f.y0 < L.bottom) hits++;
      }
      return { t_in: ph.t_in, text: ph.lines.map(l => l.text).join(' / '), overlap: n ? hits / n : 0 };
    });
  }

  return { init, draw, faceReport, SIZES };
})();
