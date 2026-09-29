/* Visual effects: an explosion (AI plates from project.json explosion + drawn shockwaves, streaks, flare, embers),
   flashes, RGB channel split and glitch slices. All deterministic in t. */
'use strict';

const FX = (() => {
  const { W, H, C, STONES, clamp, lerp, prog, ease, hash, noise1 } = E;
  let P = null;
  const scratch = document.createElement('canvas');
  scratch.width = W; scratch.height = H;
  const sctx = scratch.getContext('2d');

  function init(paths) { P = paths; }
  /* P.plates: [{dir, frames, lead, fps}] from project.json "explosion": each plate's own frame sequence
     (p0000.jpg ...), and `lead` = how far into the plate its burst happens, so every burst lands on the hit. */
  const plateUrl = (pl, k) => `${pl.dir}/p${String(k).padStart(4, '0')}.jpg`;

  /* Which explosion plate frames the hit needs at t (so main.js can preload them), one per plate. */
  function plateFrames(t, hit) {
    const u = t - hit;
    if (!P.plates || !P.plates.length || u < -0.02 || u > 2.6) return [];
    return P.plates.map(pl => plateUrl(pl, clamp(Math.round((u + pl.lead) * (pl.fps || 24)), 0, pl.frames - 1)));
  }

  /* White-gold flash that peaks at t0 and holds white briefly (used to cut studio -> room under it). */
  function flash(ctx, t, t0, o = {}) {
    const rise = o.rise ?? 0.05, hold = o.hold ?? 0.06, fall = o.fall ?? 0.45;
    const u = t - t0;
    if (u < -rise || u > hold + fall) return 0;
    const a = u < 0 ? ease.inCubic(1 + u / rise) : u < hold ? 1 : 1 - ease.outCubic((u - hold) / fall);
    ctx.save();
    ctx.globalAlpha = clamp(a * (o.max ?? 1));
    ctx.fillStyle = o.color || '#FFF8E8';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    return a;
  }

  function ring(ctx, x, y, r, width, col, a) {
    if (a <= 0 || r <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp(a);
    ctx.strokeStyle = col; ctx.lineWidth = width;
    ctx.shadowColor = col; ctx.shadowBlur = width * 3;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  /* Anamorphic lens flare: a long horizontal streak, a core, and a few ghosts along the axis. */
  function flare(ctx, x, y, a, col = '#BFD9FF', len = 1400) {
    if (a <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(x - len / 2, y, x + len / 2, y);
    g.addColorStop(0, E.rgba(col, 0)); g.addColorStop(0.5, E.rgba(col, 0.9 * a)); g.addColorStop(1, E.rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - len / 2, y - 5, len, 10);
    ctx.globalAlpha = 0.5 * a;
    ctx.fillRect(x - len / 2, y - 16, len, 32);
    ctx.globalAlpha = 1;
    E.glow(ctx, x, y, 170, '#FFFFFF', 0.9 * a);
    const dx = W / 2 - x, dy = H / 2 - y;
    [[0.6, 40, '#A54DFF'], [1.2, 70, '#39E6FF'], [1.6, 26, '#FFD23F']].forEach(([k, r, c]) => E.glow(ctx, x + dx * k, y + dy * k, r, c, 0.35 * a));
    ctx.restore();
  }

  /* Deterministic particle field: embers thrown from (x, y) at t0 with drag and gravity, stone-coloured. */
  function embers(ctx, t, t0, x, y, o = {}) {
    const u = t - t0;
    if (u < 0 || u > (o.life || 3.2)) return;
    const n = o.n || 180;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const ang = hash(i * 3.1 + 1) * Math.PI * 2;
      const sp = (o.speed || 1500) * (0.25 + hash(i * 7.3 + 2) ** 1.6);
      const drag = 2.4;
      const d = sp * (1 - Math.exp(-drag * u)) / drag;
      const px = x + Math.cos(ang) * d + noise1(u * 1.5 + i, 3) * 30 * u;
      const py = y + Math.sin(ang) * d + 60 * u * u - 40 * u;
      const lifeK = hash(i * 5.7 + 3) * 0.6 + 0.4;
      const settle = u < 0.6 ? 1 : 0.55 + 0.45 * Math.exp(-(u - 0.6) * 2);    // bright burst, then soft drifting embers
      const a = clamp(1 - u / ((o.life || 3.2) * lifeK)) * (0.55 + 0.45 * Math.sin(u * 20 + i)) * settle;
      if (a <= 0) continue;
      const col = i % 3 === 0 ? STONES[i % 6].col : (i % 3 === 1 ? '#FFD9A0' : '#FFFFFF');
      const r = 1.6 + hash(i * 9.1) * 3.4;
      ctx.globalAlpha = a;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      if (u < 0.5) {       // motion streak while fast
        const vx = Math.cos(ang) * sp * Math.exp(-drag * u), vy = Math.sin(ang) * sp * Math.exp(-drag * u);
        ctx.strokeStyle = col; ctx.lineWidth = r * 0.9; ctx.globalAlpha = a * 0.6;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - vx * 0.03, py - vy * 0.03); ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* Six stone-coloured light rays from the snap point. */
  function rays(ctx, t, t0, x, y) {
    const u = t - t0;
    if (u < 0 || u > 0.8) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    STONES.forEach((s, i) => {
      const ang = -Math.PI / 2 + (i - 2.5) * 0.52 + 0.1 * Math.sin(u * 3 + i);
      const len = 2400 * ease.outExpo(u / 0.35);
      const a = (u < 0.12 ? 0.8 : 0.8 * Math.exp(-(u - 0.12) * 4.5));
      const wdt = 34 * (1 - u / 0.8) + 6;
      const g = ctx.createLinearGradient(x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      g.addColorStop(0, E.rgba('#FFFFFF', a)); g.addColorStop(0.2, E.rgba(s.col, a)); g.addColorStop(1, E.rgba(s.col, 0));
      ctx.strokeStyle = g; ctx.lineWidth = wdt; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(ang) * len * 0.6, y - Math.sin(ang) * len * 0.6); ctx.stroke();
    });
    ctx.restore();
  }

  /* The explosion plates, screen-blended and centred on the snap point. */
  function plates(ctx, t, snap, x, y, imgs) {
    const u = t - snap;
    if (u < -0.02 || u > 2.6) return;
    // main.js preloads the plate frames around the "snap" beat; a frame missing here means the plates are drawn at
    // another time than they were loaded for, which would drop the explosion without a word
    const frames = plateFrames(t, snap).map(url => {
      if (!imgs[url]) throw new Error(`explosion plate frame not loaded (${url}): draw FX.plates at B.snap`);
      return imgs[url];
    });
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    // full strength into the white-out, then a fast decay so the face is clear for the next line
    const fade = u < 0.12 ? 1 : 0.85 * Math.exp(-(u - 0.12) * 3.6);
    frames.forEach((im, i) => {
      const pl = P.plates[i];
      const k = pl.scale || 1.3;
      ctx.globalAlpha = (pl.alpha ?? 1) * fade;
      ctx.drawImage(im, x - (W * k) / 2, y - (H * k) / 2, W * k, H * k);
    });
    ctx.restore();
  }

  /* RGB channel split of the current canvas: green stays, red shifts left and blue right by d px. */
  const chan = document.createElement('canvas');
  chan.width = W; chan.height = H;
  const cctx = chan.getContext('2d');
  function channelShift(ctx, d) {
    if (d < 0.5) return;
    sctx.globalCompositeOperation = 'copy';
    sctx.drawImage(ctx.canvas, 0, 0);
    sctx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.globalCompositeOperation = 'copy';
    ctx.drawImage(scratch, 0, 0);
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgb(0,255,0)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    for (const [dx, tint] of [[-d, 'rgb(255,0,0)'], [d, 'rgb(0,0,255)']]) {
      // the unshifted frame goes underneath first, so the d-px strip the shift uncovers keeps its own colour
      // instead of turning into a solid red/blue bar when the tint multiplies over transparency
      cctx.globalCompositeOperation = 'copy';
      cctx.drawImage(scratch, 0, 0);
      cctx.globalCompositeOperation = 'source-over';
      cctx.drawImage(scratch, dx, 0);
      cctx.globalCompositeOperation = 'multiply';
      cctx.fillStyle = tint;
      cctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(chan, 0, 0);
      ctx.restore();
    }
  }

  /* Horizontal glitch slices of the current canvas. */
  function glitch(ctx, t, amt) {
    if (amt <= 0.01) return;
    sctx.globalCompositeOperation = 'copy';
    sctx.drawImage(ctx.canvas, 0, 0);
    sctx.globalCompositeOperation = 'source-over';
    const n = Math.floor(3 + amt * 9);
    for (let i = 0; i < n; i++) {
      const seed = Math.floor(t * 24) * 13 + i;
      if (hash(seed) > amt) continue;
      const y = hash(seed + 1) * H, h = 8 + hash(seed + 2) * 90 * amt;
      const dx = (hash(seed + 3) - 0.5) * 120 * amt;
      ctx.drawImage(scratch, 0, y, W, h, dx, y, W, h);
    }
  }

  function vignette(ctx, a) {
    if (a <= 0) return;
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  return { init, plateFrames, flash, ring, flare, embers, rays, plates, channelShift, glitch, vignette, scratch, sctx };
})();
