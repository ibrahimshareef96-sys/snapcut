/* Captions (the Ranked look, 11 Oct 2026): Satoshi Black capitals in rows of at most 15 characters (build_timeline.py
   wraps longer plan lines), bone ink with the word being spoken lit in the video's tier colour, the light caption
   shadow (0 2px 12px .55), letters packed tight (-0.02em) but never touching: any pair whose ink comes closer than
   MIN_GAP px is opened just enough, measured glyph by glyph at the size it is shown. Rows rise in on the ui spring
   on their first spoken word (never through a mask, so no letter is ever cut), letters closing in as they land,
   anchored in the Instagram safe zone (bottom by default) over a soft dark pool. A phrase lifts away before the next
   arrives. plan.look.caption_flips cycles three brand styles. A viewer's question can be typed as a chat bubble
   instead ({"dm": ...}). */
'use strict';

const CAP = (() => {
  const { W, SAFE, C, clamp, prog, ease, spring, brandSpring } = E;
  const SIZES = { s: 58, m: 84, l: 112, xl: 150 };
  const LS = -0.02, LINE = 1.0, BASE = 0.85;          // tracking, row pitch and baseline, in em
  const INK = 36, MAX_W = SAFE.x1 - SAFE.x0 - 2 * INK;
  const BOTTOM = SAFE.y1 - INK, TOP = SAFE.y0 + INK + 20, MAX_BLOCK = 330;
  const RISE = 0.35, TRACK = 9, LEAD_IN = 0.03, CX = W / 2;
  const MIN_GAP = 2.5, INK_ALPHA = 64;
  const SH = 520;                                      // scratch height: the tallest row plus its rise and shadow
  const scratch = document.createElement('canvas');
  scratch.width = W; scratch.height = SH;
  const sctx = scratch.getContext('2d');
  let TL = null;
  const layouts = new Map();                // keyed by the phrase object: two phrases can share a t_in after a cut
  const words = new Map();                  // glyph layouts, keyed by size and word
  function init(tl) {
    if (tl.phrases.some(ph => ph.lines.some(ln => !Array.isArray(ln.words)))) {
      throw new Error('data/timeline.json was built before the Ranked captions (11 Oct 2026): run tools/build_timeline.py again');
    }
    TL = tl;
    layouts.clear();
  }
  const POS = () => (TL.captions && TL.captions.position) || 'bottom';
  const capFont = px => E.headFont(px, 900);
  const snap = px => Math.floor(px * 2) / 2;          // sizes on a half-pixel grid, so layouts are reused

  // ---------- glyph layout: tight tracking, no touching letters ----------
  /* A glyph's ink as edge profiles: per pixel row, the leftmost and rightmost inked x (NaN = none). */
  function inkProfile(g, cv, ch, x, f, px) {
    g.clearRect(0, 0, cv.width, cv.height);
    g.font = f; g.letterSpacing = `${LS * px}px`; g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
    g.fillText(ch, x, px * 1.1);
    const d = g.getImageData(0, 0, cv.width, cv.height).data;
    const left = new Float32Array(cv.height).fill(NaN), right = new Float32Array(cv.height).fill(NaN);
    let any = false;
    for (let y = 0; y < cv.height; y++) {
      const row = y * cv.width * 4;
      for (let p = 0; p < cv.width; p++) {
        if (d[row + p * 4 + 3] > INK_ALPHA) {
          if (Number.isNaN(left[y])) left[y] = p;
          right[y] = p;
          any = true;
        }
      }
    }
    return any ? { left, right } : null;
  }
  /* Smallest distance from glyph a's right edge to glyph b's left edge over every pair of rows: a lower bound of
     the true ink gap, so it can only open a pair a little more, never let two letters touch. */
  function inkDistance(a, b) {
    let best = Infinity;
    const n = a.right.length;
    for (let i = 0; i < n; i++) {
      const ra = a.right[i];
      if (Number.isNaN(ra)) continue;
      for (let j = 0; j < n; j++) {
        const lb = b.left[j];
        if (Number.isNaN(lb)) continue;
        const dx = Math.max(0, lb - ra), dy = j - i;
        const dd = dx * dx + dy * dy;
        if (dd < best) best = dd;
      }
    }
    return Math.sqrt(best);
  }
  /* Scripts whose letters join or stack (Arabic, Hebrew, Devanagari, combining accents, emoji) are drawn as whole
     words so the browser shapes them; letter by letter would break the joins. The gap logic is for Latin, Greek
     and Cyrillic capitals. A row whose words are all right-to-left runs right to left. */
  const WHOLE = /[^\u0000-ɏͰ-ӿḀ-ỿ -⁯]|\p{M}/u;
  const RTL = /[֐-ࣿיִ-﷿ﹰ-﻿]/;
  /* Pen positions from the browser's own shaping of the whole word, then any neighbouring pair whose ink is closer
     than MIN_GAP is opened just enough (each glyph re-rasterised at its real offset). */
  function layoutWord(word, px) {
    const key = `${px}/${word}`;
    if (words.has(key)) return words.get(key);
    const f = capFont(px), ls = LS * px;
    if (WHOLE.test(word)) {
      // drawn with no tracking: a tighter spacing would break the joins
      const whole = { chars: [word], xs: [0], width: E.textWidth(sctx, word, f, 0), gaps: [], whole: true };
      words.set(key, whole);
      return whole;
    }
    const cv = document.createElement('canvas');
    const g = cv.getContext('2d', { willReadFrequently: true });
    const pad = 16;
    cv.width = Math.ceil(E.textWidth(g, word, f, ls) + pad * 2 + 40);
    cv.height = Math.ceil(px * 1.5);
    const chars = [...word];
    const pens = chars.map((ch, i) => E.textWidth(g, chars.slice(0, i + 1).join(''), f, ls) - E.textWidth(g, ch, f, ls));
    const xs = [], gaps = [];
    let extra = 0, prev = null;
    chars.forEach((ch, i) => {
      let mask = inkProfile(g, cv, ch, pad + pens[i] + extra, f, px);
      if (i > 0 && mask && prev) {
        let add = 0;
        while (inkDistance(prev, mask) < MIN_GAP && add < 12) {
          add += 0.5;
          mask = inkProfile(g, cv, ch, pad + pens[i] + extra + add, f, px);
        }
        extra += add;
        gaps.push({ pair: chars[i - 1] + ch, min: inkDistance(prev, mask), opened: add });
      }
      xs.push(pens[i] + extra);
      if (mask) prev = mask;
    });
    const last = chars.length - 1;
    const width = last >= 0 ? xs[last] + E.textWidth(g, chars[last], f, ls) - ls : 0;
    const out = { chars, xs, width, gaps };
    words.set(key, out);
    return out;
  }

  // ---------- layout of one phrase ----------
  function rowAt(ctx, row, px) {
    const shown = row.words.map(w => w.w.toUpperCase());
    const lays = shown.map(w => layoutWord(w, px));
    const space = E.textWidth(ctx, ' ', capFont(px), LS * px);
    const w = lays.reduce((a, l) => a + l.width, 0) + space * (lays.length - 1);
    const steps = lays.reduce((a, l) => a + l.chars.length, 0) + lays.length - 1;   // pitch steps, spaces included
    const lettered = shown.filter(s => /\p{L}/u.test(s));
    const rtl = lettered.length > 0 && lettered.every(s => RTL.test(s));
    return { px, lays, space, w, gaps: Math.max(1, steps - 1), t: row.t, words: row.words, rtl };
  }
  /* The row at its plan size, shrunk until it fits the safe zone's width (letter opening is not linear in size,
     so it re-measures instead of trusting one proportional step). */
  function fitRow(ctx, row, start) {
    let r = rowAt(ctx, row, start);
    for (let i = 0; i < 4 && r.w > MAX_W; i++) r = rowAt(ctx, row, snap(r.px * (MAX_W / r.w) * 0.995));
    while (r.w > MAX_W && r.px > 12) r = rowAt(ctx, row, r.px - 0.5);
    return r;
  }
  /* Top of a phrase placed at the top: under the level tag opener while the opener is on screen. */
  function topFor(ph) {
    const below = typeof BRAND !== 'undefined' ? BRAND.openerBottom(ph.t_in) : null;
    return below == null ? TOP : Math.max(TOP, below + 24);
  }
  function layout(ctx, ph) {
    if (layouts.has(ph)) return layouts.get(ph);
    let rows = ph.lines.map(ln => fitRow(ctx, ln, SIZES[ln.size] || SIZES.m));
    const total = rows.reduce((a, r) => a + r.px * LINE, 0);
    if (total > MAX_BLOCK) {
      const k = MAX_BLOCK / total;
      rows = rows.map((r, i) => fitRow(ctx, ph.lines[i], snap(r.px * k)));
    }
    // plan.json captions.position: 'bottom' (default, anchored on the safe zone's bottom edge) or 'top' (for takes
    // filmed with the face low in the frame; render.py facecheck says which one a take needs)
    const height = rows.reduce((a, r) => a + r.px * LINE, 0);
    let y = POS() === 'top' ? topFor(ph) : BOTTOM - height;
    const top = y;
    rows = rows.map(r => { const o = { ...r, top: y, base: y + r.px * BASE, x: CX - r.w / 2 }; y += r.px * LINE; return o; });
    const L = { rows, top, bottom: top + height, width: Math.max(...rows.map(r => r.w)), flat: rows.flatMap(r => r.words) };
    layouts.set(ph, L);
    return L;
  }

  /* Caption style flips (plan.look.caption_flips): 0 house, 1 every word in the tier colour, 2 bone outline with the
     spoken word filled in the tier colour, 3 tier outline with the spoken word filled in bone. */
  function styleAt(t) {
    for (const [t0, dur] of (TL.look && TL.look.caption_flips) || []) {
      const u = t - t0;
      if (u >= 0 && u < dur) return 1 + Math.floor(u / 0.13) % 3;
    }
    return 0;
  }
  /* The word being said: from its start until the next spoken word starts (the last one until just after it
     ends). Signs with nothing spoken ("&", a dash) are never lit. */
  function spoken(L, t) {
    const said = L.flat.filter(w => !w.sign);
    for (let i = 0; i < said.length; i++) {
      const w = said[i], next = said[i + 1];
      if (t >= w.s - 0.02 && t < (next ? next.s - 0.02 : w.e + 0.15)) return w;
    }
    return null;
  }

  function drawRow(ctx, r, t, tOut, exitDur, style, lit) {
    const k = brandSpring(t - r.t + LEAD_IN, 'ui');
    const outP = ease.inCubic(prog(t, tOut, exitDur));
    const a = clamp(k * 2.5) * (1 - outP);
    if (a <= 0.002) return;
    const dy = (1 - k) * RISE * r.px - outP * r.px * 0.5;
    // letters close in as the row lands; never tighter than their layout (the spring's overshoot is not allowed to
    // squeeze a pair), never wider than the safe zone
    const tracking = Math.min(Math.max(0, 1 - k) * TRACK, Math.max(0, (MAX_W - r.w) / r.gaps));
    const sb = Math.ceil(r.px * 1.25) + 24;              // the row's baseline on the scratch canvas
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, W, SH);
    sctx.font = capFont(r.px);
    sctx.letterSpacing = '0px';
    sctx.textBaseline = 'alphabetic';
    sctx.lineJoin = 'round';
    let x = CX - (r.w + tracking * r.gaps) / 2, step = 0;
    const order = r.lays.map((_, i) => i);
    if (r.rtl) order.reverse();                          // the first spoken word sits at the right
    order.forEach(i => {
      const L = r.lays[i];
      const on = r.words[i] === lit;
      const fill = style === 0 ? (on ? C.accent : C.bone) : style === 1 ? C.accent : style === 2 ? (on ? C.accent : null)
        : (on ? C.bone : null);
      const stroke = style === 2 ? C.bone : style === 3 ? C.accent : null;
      L.chars.forEach((ch, j) => {
        const gx = x + L.xs[j] + tracking * step;
        if (fill) { sctx.fillStyle = fill; sctx.fillText(ch, gx, sb); }
        if (stroke) { sctx.lineWidth = 3.2; sctx.strokeStyle = stroke; sctx.strokeText(ch, gx, sb); }
        step++;
      });
      x += L.width + r.space;
      step++;
    });
    ctx.save();
    ctx.globalAlpha *= a;
    // one shadow for the whole row, as CSS draws it: per-letter shadows would darken where neighbours overlap
    E.captionShadow(ctx, () => ctx.drawImage(scratch, 0, Math.round(r.base + dy) - sb));
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
    g.addColorStop(0, `rgba(21,21,28,${0.5 * a})`); g.addColorStop(0.55, `rgba(21,21,28,${0.3 * a})`); g.addColorStop(1, 'rgba(21,21,28,0)');
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
      const style = styleAt(t), lit = spoken(L, t);
      for (const r of L.rows) drawRow(ctx, r, t, ph.t_out, ex, style, lit);
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
    // header: a DM from "a viewer" (no invented name or avatar): a solid surface card, a plain avatar circle
    E.fillRR(ctx, x, y, w, 360, 44, C.surface, C.line, 2);
    ctx.fillStyle = C.surface2;
    ctx.beginPath(); ctx.arc(x + 58, y + 58, 26, 0, Math.PI * 2); ctx.fill();
    E.text(ctx, dm.header || 'NEW MESSAGE', x + 100, y + 52, { font: E.monoFont(22), color: C.muted, ls: 3 });
    if (dm.sub) E.text(ctx, dm.sub, x + 100, y + 80, { font: E.bodyFont(22, 500), color: C.faint });
    // the words appear as they are spoken; the current word in the tier colour. A long question shrinks until it
    // fits four lines, so it never runs out of the card or the safe zone.
    const words = dm.words;
    let px = 50;
    for (; px > 28; px -= 2) {
      ctx.font = E.bodyFont(px, 800);
      let lines = 1, lx = x + 40;
      for (const wd of words) {
        const ww = ctx.measureText(wd.w + ' ').width;
        if (lx + ww > x + w - 40) { lines++; lx = x + 40; }
        lx += ww;
      }
      if (lines <= 4) break;
    }
    ctx.font = E.bodyFont(px, 800);
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
        ctx.fillStyle = active ? C.accent : C.bone;
        ctx.fillText(wd.w, cx, cy + (1 - pop) * 10);
        ctx.restore();
      }
      cx += wW;
    });
    // typing dots while words are still coming
    if (t < dm.t_end) {
      for (let i = 0; i < 3; i++) {
        const a = 0.35 + 0.65 * Math.max(0, Math.sin(t * 9 - i * 0.9));
        ctx.fillStyle = `rgba(244,241,234,${0.5 * a})`;
        ctx.beginPath(); ctx.arc(x + w - 110 + i * 24, y + 60, 7, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  /* For render.py facecheck: the share of each phrase's screen time where its block covers the face (M.faceBox,
     brow to upper lip) or comes within 40 px under the mouth (the house rule: his mouth sits at least 40 px above
     the caption block). The camera moves, so it is sampled every 0.1 s. */
  function faceReport(ctx) {
    return TL.phrases.map(ph => {
      const L = layout(ctx, ph);
      const x0 = CX - L.width / 2, x1 = CX + L.width / 2;
      let hits = 0, n = 0;
      for (let t = ph.t_in; t <= ph.t_out; t += 0.1, n++) {
        const f = M.faceBox(Math.round(t * E.FPS));
        if (f && x0 < f.x1 && f.x0 < x1 && L.top < Math.max(f.y1, f.mouth + 40) && f.y0 < L.bottom) hits++;
      }
      return { t_in: ph.t_in, text: ph.lines.map(l => l.text).join(' / '), overlap: n ? hits / n : 0 };
    });
  }

  /* For render.py glyphs: the tightest letter pairs in every caption word at the size it is shown. */
  function glyphReport(ctx) {
    const rows = [];
    for (const ph of TL.phrases) {
      for (const r of layout(ctx, ph).rows) {
        r.lays.forEach((L, i) => {
          for (const gp of L.gaps) rows.push({ word: r.words[i].w.toUpperCase(), size: r.px, pair: gp.pair, min: gp.min, opened: gp.opened });
        });
      }
    }
    rows.sort((a, b) => a.min - b.min);
    return { minGap: MIN_GAP, pairs: rows.length, below: rows.filter(r => r.min < MIN_GAP - 0.01).length, worst: rows.slice(0, 12) };
  }

  return { init, draw, faceReport, glyphReport, SIZES, MIN_GAP };
})();
