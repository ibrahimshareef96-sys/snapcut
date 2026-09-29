/* Reusable graphics for beats (see references/04-beats-catalog.md). Every piece springs in on its word and keeps its
   ink, shadows included, inside the Instagram safe zone when placed at the documented positions. */
'use strict';

const KIT = (() => {
  const { SAFE, C, clamp, lerp, prog, ease, spring, life, hash } = E;

  /* App tile: rounded square with an icon (a name loaded in E.icons, or an Image) and an optional label under it.
     An icon name that was never loaded shows its label's initial (o.mono overrides it).
     Keep the centre at least size/2 + 45 px inside the safe zone (spring overshoot + shadow). */
  function tile(ctx, x, y, size, icon, label, a, s = 1, o = {}) {
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(o.rot || 0);
    E.withShadow(ctx, 30, 0.5, 10, () => E.fillRR(ctx, -size / 2, -size / 2, size, size, size * 0.24, o.bg || '#12151D'));
    E.fillRR(ctx, -size / 2, -size / 2, size, size, size * 0.24, null, o.edge || 'rgba(255,253,244,0.16)', 2);
    if (typeof icon === 'string' && E.icons[icon]) E.drawIcon(ctx, icon, 0, 0, size * (o.iconK || 0.56));
    else if (icon && typeof icon === 'object') {
      const k = size * 0.62 / Math.max(icon.width, icon.height);
      ctx.drawImage(icon, -icon.width * k / 2, -icon.height * k / 2, icon.width * k, icon.height * k);
    } else {                                   // no logo (a brand with no public mark, a missing image): its initial
      const mono = ([...String(o.mono || label || icon || '').trim()][0] || '').toUpperCase();
      if (mono) E.text(ctx, mono, 0, size * 0.17, { font: E.headFont(Math.round(size * 0.5)), align: 'center', color: C.chalk });
    }
    if (o.dim) E.fillRR(ctx, -size / 2, -size / 2, size, size, size * 0.24, `rgba(10,10,14,${0.62 * o.dim})`);
    if (label) E.text(ctx, label, 0, size / 2 + 40, { font: E.monoFont(24, 500), align: 'center', ls: 2, color: C.chalk, shadow: ['rgba(0,0,0,0.7)', 12, 2] });
    ctx.restore();
  }

  /* Round badge with a check or a cross. */
  function badge(ctx, x, y, r, col, glyph, a, s = 1) {
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(x, y); ctx.scale(s, s);
    E.withShadow(ctx, 16, 0.5, 4, () => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); });
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = r * 0.22; ctx.lineCap = 'round';
    ctx.beginPath();
    if (glyph === 'x') { ctx.moveTo(-r * 0.35, -r * 0.35); ctx.lineTo(r * 0.35, r * 0.35); ctx.moveTo(r * 0.35, -r * 0.35); ctx.lineTo(-r * 0.35, r * 0.35); }
    else { ctx.moveTo(-r * 0.4, 0); ctx.lineTo(-r * 0.1, r * 0.3); ctx.lineTo(r * 0.42, -r * 0.3); }
    ctx.stroke();
    ctx.restore();
  }

  /* A big word, meant for the 'behind' layer (the person occludes it). Grows from 82% and tightens its tracking,
     so it is never wider than its final width. Size it so the final width is under 880 px. Note: when the head is
     large on screen it covers the middle of the word; prefer it when the word is wider than the head. */
  function hero(ctx, str, x, y, px, t0, t1, t, o = {}) {
    const L = life(t, t0, t1, { w: 11, z: 0.62, out: 0.3 });
    if (!L.on || L.a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= L.a * (o.alpha ?? 1);
    const s = lerp(0.82, 1, Math.min(L.s, 1.04));
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.font = E.headFont(px, 700);
    ctx.textAlign = 'center';
    ctx.letterSpacing = `${-(1 - clamp(L.s)) * 8}px`;
    if (o.stroke) {
      ctx.lineWidth = o.stroke; ctx.strokeStyle = o.col || C.lime; ctx.lineJoin = 'round';
      ctx.shadowColor = E.rgba(o.col || C.lime, 0.7); ctx.shadowBlur = 30;
      ctx.strokeText(str, 0, 0);
    } else {
      const g = ctx.createLinearGradient(0, -px * 0.8, 0, px * 0.1);
      g.addColorStop(0, o.top || '#FFFFFF'); g.addColorStop(1, o.col || C.lime);
      ctx.fillStyle = g;
      ctx.shadowColor = E.rgba(o.col || C.lime, 0.5); ctx.shadowBlur = 32;
      ctx.fillText(str, 0, 0);
    }
    ctx.restore();
  }

  /* A mono label that types on after a short rule (top-left labels, card titles). */
  function monoLabel(ctx, str, x, y, t0, t, a = 1, col = C.chalk) {
    const k = prog(t, t0, 0.55);
    if (k <= 0 || a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    E.withShadow(ctx, 14, 0.65, 2, () => {
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + 30 * Math.min(1, k * 3), y - 9); ctx.stroke();
      ctx.font = E.monoFont(26); ctx.letterSpacing = '3px'; ctx.fillStyle = col;
      ctx.fillText(str.slice(0, Math.ceil(str.length * k)), x + 44, y);
    });
    ctx.restore();
  }

  /* Sparkles popping around a point (a head, a card) on a hit word; spots = [[degrees, radiusK, size], ...]. */
  function sparkles(ctx, t, t0, t1, cx, cy, spots, radius = 330) {
    spots.forEach(([deg, k, size], i) => {
      const L = life(t, t0 + i * 0.05, t1, { w: 18, z: 0.45, out: 0.25 });
      if (L.a <= 0) return;
      const a = (deg * Math.PI) / 180, rad = radius * k;
      const x = cx + Math.cos(a) * rad * 1.15, y = cy + Math.sin(a) * rad;
      const tw = 0.8 + 0.2 * Math.sin((t - t0) * 9 + i * 1.7);
      ctx.save();
      ctx.translate(x, y); ctx.rotate(Math.sin(t * 2 + i) * 0.25); ctx.scale(L.s * tw, L.s * tw);
      E.drawIcon(ctx, 'sparkles', 0, 0, size, L.a);
      ctx.restore();
    });
  }

  /* Camera viewfinder corners + blinking REC, inside the safe zone; they grow outward to their place. */
  function viewfinder(ctx, t, t0, t1) {
    const L = life(t, t0, t1, { w: 20, z: 0.55, out: 0.2 });
    if (L.a <= 0) return;
    const inset = lerp(46, 0, L.s);
    const x0 = SAFE.x0 + 30 + inset, x1 = SAFE.x1 - 30 - inset, y0 = SAFE.y0 + 30 + inset, y1 = SAFE.y1 - 30 - inset, k = 70;
    ctx.save();
    ctx.globalAlpha *= L.a;
    ctx.strokeStyle = C.chalk; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 10;
    [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]].forEach(([x, y, sx, sy]) => {
      ctx.beginPath(); ctx.moveTo(x, y + sy * k); ctx.lineTo(x, y); ctx.lineTo(x + sx * k, y); ctx.stroke();
    });
    if (Math.floor(t * 3) % 2 === 0) { ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(x0 + 40, y0 + 52, 11, 0, Math.PI * 2); ctx.fill(); }
    E.text(ctx, 'REC', x0 + 62, y0 + 62, { font: E.monoFont(28, 500), ls: 3 });
    ctx.restore();
  }

  /* A row of tiles that pop in one after another on their own words: items = [{icon, label, x, y, t0}]. */
  function tiles(ctx, t, items, end, size = 160) {
    items.forEach(it => {
      const L = life(t, it.t0 - 0.03, end, { w: 15, z: 0.52 });
      if (L.a <= 0) return;
      const bob = Math.sin((t - it.t0) * 2.2 + hash(it.x)) * 6;
      tile(ctx, it.x, it.y + bob, size, it.icon, it.label, L.a, L.s, it.o || {});
    });
  }

  return { tile, badge, hero, monoLabel, sparkles, viewfinder, tiles };
})();
