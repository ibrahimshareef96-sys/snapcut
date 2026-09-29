/* The studio shot and the snap. Practicals flicker on at "studio"; the Infinity Gauntlet gets its label; the six
   stones light one per word ("glove / of / Thanos / in / my / hand"); energy gathers in his fingers; on the snap
   the light explodes (Higgsfield plates + drawn rays, shockwaves, flare), whites out, and drops him back in his
   RGB room, embers still falling. */
'use strict';

const BS = (() => {
  const { W, H, C, STONES, clamp, lerp, prog, ease, spring, life, hash } = E;
  let TL = null, B = null;
  const PRACTICALS = [[74, 527, '#FFC27A', 0], [949, 721, '#FFD9A6', 0.12]];
  const STONE_WORDS = ['glove', 'of_t', 'thanos', 'in_t', 'my', 'hand'];
  const BURST = 0.0, FLASH_PEAK = 0.12;   // seconds after the snap
  function init(tl) { TL = tl; B = tl.beats; }
  const stoneT = i => B[STONE_WORDS[i]];

  /* studio frame coords -> screen for the studio shot's push-in (same transform as S.drawStudio) */
  function toScreen(t, x, y) {
    const u = t - TL.studio.t_in;
    const k = 1 + 0.07 * (1 - spring(u, 9, 0.75)) + 0.035 * prog(u, 0, TL.studio.t_out - TL.studio.t_in);
    return [540 + (x - 540) * k, 900 + (y - 900) * k, k];
  }

  function practicals(ctx, t) {
    PRACTICALS.forEach(([x, y, col, d]) => {
      const u = t - B.studio - d;
      if (u < 0) return;
      const flick = u < 0.35 ? (Math.floor(u * 30) % 3 === 0 ? 0.2 : 1) : 1;
      const a = clamp(u / 0.35) * flick;
      const [sx, sy, k] = toScreen(t, x, y);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      E.glow(ctx, sx, sy, 190 * k, col, 0.55 * a);
      E.glow(ctx, sx, sy, 60 * k, '#FFFFFF', 0.5 * a);
      ctx.restore();
      FX.flare(ctx, sx, sy, 0.35 * a * Math.exp(-u * 0.8), '#FFD2A0', 700);
    });
  }

  function litCount(t) { let n = 0; for (let i = 0; i < 6; i++) if (t >= stoneT(i) - 0.02) n++; return n; }

  function gauntletGlow(ctx, t) {
    const g = S.propAt(t);
    const n = litCount(t);
    if (n === 0) return;
    const pulse = 0.85 + 0.15 * Math.sin(t * 16);
    const gather = ease.inCubic(prog(t, B.snap - 0.35, 0.35));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const pop = Math.exp(-Math.max(0, t - stoneT(i)) * 5);
      E.glow(ctx, g.x + (i - 2.5) * 8, g.y - 10, 90 + 60 * pop + 40 * gather, STONES[i].col, (0.22 + 0.5 * pop) * pulse);
    }
    E.glow(ctx, g.tipX, g.tipY, 60 + 220 * gather, '#FFF3D0', 0.25 + 0.7 * gather);
    ctx.restore();
    // energy lines converging on the fingertips just before the snap
    if (gather > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 24; i++) {
        const ang = hash(i * 3.3) * Math.PI * 2, d0 = 520 * (1 - gather) + 60, d1 = d0 * 0.45;
        const col = STONES[i % 6].col;
        ctx.strokeStyle = E.rgba(col, 0.7 * gather); ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(g.tipX + Math.cos(ang) * d0, g.tipY + Math.sin(ang) * d0);
        ctx.lineTo(g.tipX + Math.cos(ang) * d1, g.tipY + Math.sin(ang) * d1);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function gauntletLabel(ctx, t) {
    const L = life(t, B.glove - 0.04, B.snap - 0.05, { w: 15, z: 0.6, out: 0.12 });
    if (L.a <= 0) return;
    const g = S.propAt(t);
    const lx = 110, ly = 600;
    ctx.save();
    ctx.globalAlpha *= L.a;
    const k = ease.outCubic(prog(t, B.glove, 0.35));
    ctx.strokeStyle = C.chalk; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(g.x - 10, g.y - 40); ctx.lineTo(lerp(g.x - 10, lx + 150, k), lerp(g.y - 40, ly + 18, k)); ctx.stroke();
    ctx.fillStyle = C.chalk; ctx.beginPath(); ctx.arc(g.x - 10, g.y - 40, 7, 0, Math.PI * 2); ctx.fill();
    E.withShadow(ctx, 18, 0.6, 3, () => E.fillRR(ctx, lx, ly - 44, 360, 92, 18, 'rgba(10,12,18,0.86)'));
    E.fillRR(ctx, lx, ly - 44, 360, 92, 18, null, E.rgba(C.gold, 0.7), 2);
    const title = 'INFINITY GAUNTLET';
    E.text(ctx, title.slice(0, Math.ceil(title.length * prog(t, B.glove + 0.05, 0.4))), lx + 22, ly - 6,
      { font: E.monoFont(26, 500), ls: 2, color: C.gold });
    E.text(ctx, `STONES ${litCount(t)}/6`, lx + 22, ly + 30, { font: E.monoFont(22, 400), ls: 2, color: 'rgba(255,253,244,0.75)' });
    ctx.restore();
  }

  function gem(ctx, x, y, s, col, lit, flare) {
    ctx.save();
    ctx.translate(x, y);
    if (lit > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      E.glow(ctx, 0, 0, s * (1.2 + 0.6 * clamp(flare)), col, 0.55 * lit + 0.4 * clamp(flare));
      ctx.restore();
    }
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.62); ctx.lineTo(s * 0.5, -s * 0.2); ctx.lineTo(s * 0.34, s * 0.55); ctx.lineTo(-s * 0.34, s * 0.55); ctx.lineTo(-s * 0.5, -s * 0.2);
    ctx.closePath();
    const g = ctx.createLinearGradient(-s * 0.5, -s * 0.6, s * 0.5, s * 0.6);
    g.addColorStop(0, lit > 0 ? '#FFFFFF' : 'rgba(255,255,255,0.18)');
    g.addColorStop(0.35, lit > 0 ? col : 'rgba(255,255,255,0.08)');
    g.addColorStop(1, lit > 0 ? E.rgba(col, 0.75) : 'rgba(255,255,255,0.04)');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = lit > 0 ? 'rgba(255,255,255,0.8)' : 'rgba(255,253,244,0.35)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }
  function stonesHud(ctx, t) {
    const L = life(t, B.glove - 0.12, B.snap + FLASH_PEAK, { w: 14, z: 0.62, out: 0.1 });
    if (L.a <= 0) return;
    const gather = ease.inCubic(prog(t, B.snap - 0.35, 0.35));
    ctx.save();
    ctx.globalAlpha *= L.a;
    for (let i = 0; i < 6; i++) {
      const x = 540 + (i - 2.5) * 128, y = 420 + 12 * Math.pow(i - 2.5, 2);
      const u = t - stoneT(i);
      const lit = u >= -0.02 ? 1 : 0;
      const flare = lit ? Math.exp(-u * 4) : 0;
      const s = 62 * (lit ? 1 + 0.35 * flare * (1 - spring(u, 18, 0.4)) + 0.2 * flare : 0.86) * lerp(1, 1.15, gather);
      const pull = gather * 0.55;
      const g = S.propAt(t);
      gem(ctx, lerp(x, g.tipX, pull * pull), lerp(y, g.tipY, pull * pull), s, STONES[i].col, lit, flare + gather * 0.6);
      if (lit) E.text(ctx, STONES[i].name, x, y + 70, { font: E.monoFont(19, 500), align: 'center', ls: 2, color: E.rgba(STONES[i].col, 0.95 * (1 - gather)) });
    }
    ctx.restore();
  }

  /* studio overlays (drawn over the Higgsfield frame); inkOnly skips the lighting (practicals, gauntlet glow),
     which belongs to the picture like the room's LEDs, so the safe-zone check measures graphics and text only */
  function studio(ctx, t, inkOnly = false) {
    if (!S.inStudio(t)) return;
    if (!inkOnly) { practicals(ctx, t); gauntletGlow(ctx, t); }
    stonesHud(ctx, t);
    gauntletLabel(ctx, t);
  }

  // ---------- the snap ----------
  let origin = null;
  function snapOrigin() {
    if (!origin) { const g = S.propAt(B.snap - 1 / 30); origin = [g.tipX, g.tipY]; }
    return origin;
  }
  /* Everything of the explosion that sits over the picture (studio or room) and under the captions. */
  function burst(ctx, t, imgs) {
    const u = t - B.snap;
    if (u < -0.02 || u > 3.4) return;
    const [x, y] = snapOrigin();
    FX.plates(ctx, t, B.snap + BURST, x, y, imgs);
    FX.rays(ctx, t, B.snap + BURST, x, y);
    [0, 0.06, 0.13].forEach((d, i) => {
      const v = u - d;
      if (v < 0 || v > 0.9) return;
      const r = 1500 * ease.outCubic(v / 0.9);
      FX.ring(ctx, x, y, r, 14 - i * 3, i === 1 ? '#CFA8FF' : '#FFF1D6', (1 - v / 0.9) * 0.9);
    });
    FX.flare(ctx, x, y, u < 0 ? 0 : Math.exp(-u * 3.2));
    // stone-coloured light spill on the room after the flash
    if (u > FLASH_PEAK) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      STONES.forEach((s, i) => {
        const ang = (i / 6) * Math.PI * 2 + u * 0.6;
        E.glow(ctx, x + Math.cos(ang) * 260, y + Math.sin(ang) * 260, 520, s.col, 0.22 * Math.exp(-(u - FLASH_PEAK) * 1.6));
      });
      ctx.restore();
    }
    FX.embers(ctx, t, B.snap + 0.02, x, y, { n: 220, speed: 1700, life: 3.2 });
  }
  /* the white-out that hides the cut from the studio back to the room */
  function flash(ctx, t) {
    FX.flash(ctx, t, B.snap + FLASH_PEAK, { rise: 0.12, hold: 0.05, fall: 0.6 });
    FX.flash(ctx, t, B.clap, { rise: 0.04, hold: 0.03, fall: 0.35, max: 0.95 });
  }
  const chroma = t => {
    const a = t > B.snap ? 16 * Math.exp(-(t - B.snap - FLASH_PEAK) * 3.2) * (t > B.snap + 0.08 ? 1 : 0) : 0;
    const b = t > B.or_all && t < B.clap + 0.35 ? 10 * ease.inCubic(prog(t, B.or_all, B.clap - B.or_all)) * (t < B.clap ? 1 : Math.exp(-(t - B.clap) * 8)) : 0;
    return a + b;
  };
  const glitchAmt = t => (t > B.clap - 0.35 && t < B.clap ? 0.7 * prog(t, B.clap - 0.35, 0.35) : 0);

  return { init, studio, burst, flash, chroma, glitchAmt, snapOrigin, FLASH_PEAK };
})();
