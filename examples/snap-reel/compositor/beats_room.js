/* Beats drawn over the RGB-room shots. Each graphic appears on the word it illustrates. `behind` graphics are
   drawn between the plate and Ibrahim (he occludes them); `front` graphics sit over him, inside the safe zone. */
'use strict';

const BR = (() => {
  const { W, H, SAFE, C, STONES, clamp, lerp, prog, ease, spring, life, hash, noise1 } = E;
  let TL = null, B = null;
  function init(tl) { TL = tl; B = tl.beats; }

  // ---------- shared pieces ----------
  const { tile, badge } = KIT;               // app tile and check/cross badge (template/compositor/kit.js)
  /* Big hero word behind him: Clash caps, springs in from a larger scale. */
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

  // ---------- hook: 0 - 3.2 ----------
  function hook(ctx, t, layer) {
    if (t > 3.6) return;
    if (layer === 'front') monoLabel(ctx, 'HOW AI EDITS MY VIDEOS', SAFE.x0 + 36, SAFE.y0 + 62, 0.1, t, 1 - prog(t, 2.9, 0.3));
    if (layer !== 'behind') return;
    // question bubbles around his head: "the most asked question"
    const spots = [[160, 500], [920, 460], [260, 380], [830, 370], [150, 730], [930, 710], [560, 360]];
    const cols = [C.lime, C.magenta, C.cyan, C.purple, C.lime, C.cyan, C.magenta];
    spots.forEach(([x, y], i) => {
      const t0 = B.asked - 0.1 + i * 0.07;
      const L = life(t, t0, 2.9 + i * 0.03, { w: 16, z: 0.5, out: 0.3 });
      if (L.a <= 0) return;
      const drift = (t - t0) * 18;
      ctx.save();
      ctx.globalAlpha *= L.a * 0.95;
      ctx.translate(x, y - drift); ctx.scale(L.s, L.s); ctx.rotate((hash(i) - 0.5) * 0.3);
      E.withShadow(ctx, 24, 0.45, 6, () => E.fillRR(ctx, -58, -44, 116, 88, 30, E.rgba(cols[i], 0.92)));
      ctx.fillStyle = cols[i];
      ctx.beginPath(); ctx.moveTo(-22, 40); ctx.lineTo(-38, 64); ctx.lineTo(0, 42); ctx.fill();
      E.text(ctx, '?', 0, 22, { font: E.headFont(62, 700), align: 'center', color: '#0A0A10' });
      ctx.restore();
    });
    // "past two days": a 48-hour ring
    const L = life(t, B.two_days - 0.05, 3.0, { w: 13, z: 0.6 });
    if (L.a > 0) {
      const x = 880, y = 560, r = 86, fill = ease.outCubic(prog(t, B.two_days, 0.7));
      ctx.save();
      ctx.globalAlpha *= L.a;
      ctx.translate(x, y); ctx.scale(L.s, L.s);
      ctx.fillStyle = 'rgba(8,10,16,0.78)';
      ctx.beginPath(); ctx.arc(0, 0, r + 14, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(255,253,244,0.14)';
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = C.lime; ctx.lineCap = 'round'; ctx.shadowColor = C.lime; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fill); ctx.stroke();
      ctx.shadowBlur = 0;
      E.text(ctx, `${Math.round(48 * fill)}H`, 0, 18, { font: E.headFont(56, 700), align: 'center' });
      ctx.restore();
    }
  }

  // ---------- the question: 3.2 - 7.2 ----------
  function question(ctx, t, layer) {
    if (t < B.ibrahim - 0.3 || t > B.captions) return;
    if (layer === 'behind') {
      // "edit videos": an edit timeline sliding across behind his head
      // leaves as the viewfinder corners and REC arrive on "like this?", so the two never overlap
      const L = life(t, B.edit - 0.05, B.like_this_q - 0.2, { w: 12, z: 0.7, out: 0.2 });
      if (L.a > 0) {
        const y = 370, x0 = 90, wipe = ease.outExpo(prog(t, B.edit - 0.05, 0.6));
        ctx.save();
        ctx.globalAlpha *= L.a;
        E.fillRR(ctx, x0, y - 70, 900, 190, 26, 'rgba(10,12,20,0.86)', 'rgba(255,253,244,0.12)', 2);
        const tracks = [[C.purple, [0, 180, 330, 520, 700]], [C.cyan, [40, 260, 470, 610]], [C.lime, [0, 120, 400]]];
        tracks.forEach(([col, cuts], ti) => {
          cuts.forEach((c, ci) => {
            const w = (cuts[ci + 1] ?? 860) - c - 10;
            E.fillRR(ctx, x0 + 20 + c, y - 50 + ti * 52, Math.max(20, w), 40, 10, E.rgba(col, 0.75 - ti * 0.12));
          });
        });
        const ph = x0 + 20 + ((t - B.edit) * 420) % 860;
        ctx.fillStyle = C.chalk; ctx.fillRect(ph, y - 62, 4, 172);
        ctx.beginPath(); ctx.moveTo(ph - 10, y - 66); ctx.lineTo(ph + 14, y - 66); ctx.lineTo(ph + 2, y - 52); ctx.fill();
        ctx.restore();
      }
      return;
    }
    // "AI": sparkles near the bubble
    [[905, 820, 70, 0], [960, 750, 40, 0.06], [860, 760, 30, 0.12]].forEach(([x, y, s, d]) => {
      const L = life(t, B.ai_q + d, 6.9, { w: 18, z: 0.45 });
      if (L.a > 0) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 2 + d) * 0.3); ctx.scale(L.s, L.s);
        E.drawIcon(ctx, 'sparkles', 0, 0, s, L.a);
        ctx.restore();
      }
    });
    // "like this?": viewfinder corners + REC
    const L = life(t, B.like_this_q - 0.03, 7.1, { w: 20, z: 0.55, out: 0.2 });
    if (L.a > 0) {
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
  }

  // ---------- captions + motion graphics: 7.2 - 12.0 ----------
  function showcase(ctx, t, layer) {
    if (t < B.captions - 0.2 || t > B.or_all + 0.1) return;
    if (layer === 'behind') {
      hero(ctx, 'CAPTIONS', 540, 520, 165, B.captions, B.motion - 0.25, t, { stroke: 5, col: C.lime });
      motionBehind(ctx, t);
    } else {
      motionFront(ctx, t);
    }
  }
  const SHAPES = Array.from({ length: 16 }, (_, i) => ({
    ang: (i / 16) * Math.PI * 2 + hash(i) * 0.3, dist: 330 + hash(i + 20) * 220, kind: i % 4,
    col: [C.lime, C.magenta, C.cyan, C.purple][i % 4], size: 26 + hash(i + 40) * 26, spin: (hash(i + 60) - 0.5) * 6,
  }));
  function motionBehind(ctx, t) {
    if (t < B.motion - 0.05 || t > B.or_all + 0.1) return;
    const out = 1 - ease.inCubic(prog(t, B.or_all - 0.3, 0.35));
    const cx = 540, cy = 620;
    const hit = t >= B.like_this_mg ? Math.exp(-(t - B.like_this_mg) * 4) : 0;
    ctx.save();
    ctx.globalAlpha *= out;
    // rings
    [[C.lime, 170, 0], [C.magenta, 245, 0.08], [C.cyan, 320, 0.16]].forEach(([col, r, d], i) => {
      const s = spring(t - B.motion - d, 12, 0.55);
      if (s <= 0) return;
      const rr = Math.min(r * s * (1 + 0.25 * hit), 318 - i * 4);     // spring overshoot never leaves the safe zone
      ctx.save();
      ctx.strokeStyle = col; ctx.lineWidth = 8 - i * 2; ctx.shadowColor = col; ctx.shadowBlur = 24;
      ctx.setLineDash(i === 1 ? [26, 18] : []);
      ctx.lineDashOffset = -t * 120;
      ctx.beginPath(); ctx.arc(cx, cy, rr, t * (i % 2 ? -0.8 : 0.6), t * (i % 2 ? -0.8 : 0.6) + Math.PI * (1.2 + 0.8 * s)); ctx.stroke();
      ctx.restore();
    });
    // hero words sliding in from each side
    const k1 = ease.outExpo(prog(t, B.motion - 0.05, 0.55)), k2 = ease.outExpo(prog(t, B.graphics - 0.05, 0.55));
    ctx.save();
    ctx.font = E.headFont(190, 700); ctx.textAlign = 'center';
    ctx.fillStyle = C.chalk; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30;
    if (k1 > 0) { ctx.globalAlpha = k1 * out; ctx.fillText('MOTION', lerp(440, 540, k1), 470); }
    if (k2 > 0) {
      ctx.globalAlpha = k2 * out;
      const g = ctx.createLinearGradient(0, 520, 0, 680);
      g.addColorStop(0, C.lime); g.addColorStop(1, C.cyan);
      ctx.fillStyle = g;
      ctx.font = E.headFont(150, 700);
      ctx.fillText('GRAPHICS', lerp(615, 540, k2), 650);
    }
    ctx.restore();
    // shapes flying out from behind him
    SHAPES.forEach((sp, i) => {
      const u = t - B.motion - i * 0.02;
      if (u <= 0) return;
      const ca = Math.cos(sp.ang) * 1.25, sa = Math.sin(sp.ang), m = sp.size + 32;   // shape + its glow
      const lim = Math.min(ca > 0 ? (SAFE.x1 - m - cx) / ca : ca < 0 ? (SAFE.x0 + m - cx) / ca : 1e9,
        sa > 0 ? (SAFE.y1 - 300 - m - cy) / sa : sa < 0 ? (SAFE.y0 + m - cy) / sa : 1e9);
      const d = Math.min(sp.dist * (1 - Math.exp(-4 * u)) * (1 + 0.3 * hit), lim);
      const x = cx + ca * d, y = cy + sa * d;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(u * sp.spin);
      ctx.strokeStyle = sp.col; ctx.fillStyle = sp.col; ctx.lineWidth = 6; ctx.shadowColor = sp.col; ctx.shadowBlur = 16;
      const s = sp.size;
      ctx.beginPath();
      if (sp.kind === 0) { ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.stroke(); }
      else if (sp.kind === 1) { ctx.moveTo(0, -s); ctx.lineTo(s * 0.9, s * 0.6); ctx.lineTo(-s * 0.9, s * 0.6); ctx.closePath(); ctx.stroke(); }
      else if (sp.kind === 2) { ctx.rect(-s * 0.7, -s * 0.7, s * 1.4, s * 1.4); ctx.stroke(); }
      else { ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    });
    ctx.restore();
  }
  function motionFront(ctx, t) {
    if (t < B.appear - 0.1 || t > B.or_all + 0.1) return;
    const out = B.or_all - 0.25;
    // three UI cards pop around him on "appear"
    const cards = [[232, 640, -0.08, 0], [850, 560, 0.07, 0.07], [850, 840, -0.05, 0.14]];
    cards.forEach(([x, y, rot, d], i) => {
      const L = life(t, B.appear + d, out, { w: 17, z: 0.52, out: 0.25 });
      if (L.a <= 0) return;
      const hit = t >= B.like_this_mg ? 1 + 0.12 * Math.exp(-(t - B.like_this_mg) * 6) : 1;
      ctx.save();
      ctx.globalAlpha *= L.a;
      ctx.translate(x, y); ctx.rotate(rot); ctx.scale(L.s * hit, L.s * hit);
      E.withShadow(ctx, 30, 0.5, 10, () => E.fillRR(ctx, -115, -80, 230, 160, 30, 'rgba(14,16,24,0.9)'));
      E.fillRR(ctx, -115, -80, 230, 160, 30, null, 'rgba(255,253,244,0.14)', 2);
      if (i === 0) {           // bar chart
        [0.45, 0.8, 0.6, 1.0].forEach((h, k) => {
          const hh = 90 * h * ease.outBack(prog(t, B.appear + d + k * 0.05, 0.4));
          E.fillRR(ctx, -80 + k * 44, 50 - hh, 30, hh, 8, [C.purple, C.cyan, C.magenta, C.lime][k]);
        });
      } else if (i === 1) {    // toggle
        const on = ease.outCubic(prog(t, B.appear + d + 0.2, 0.25));
        E.fillRR(ctx, -60, -32, 120, 64, 32, on > 0.5 ? C.lime : 'rgba(255,253,244,0.2)');
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(lerp(-28, 28, on), 0, 26, 0, Math.PI * 2); ctx.fill();
      } else {                 // progress ring
        const f = ease.outCubic(prog(t, B.appear + d, 0.8));
        ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(255,253,244,0.15)';
        ctx.beginPath(); ctx.arc(0, 0, 48, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = C.magenta; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0, 0, 48, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke();
        E.text(ctx, `${Math.round(f * 100)}%`, 0, 10, { font: E.headFont(30, 600), align: 'center' });
      }
      ctx.restore();
    });
  }

  // ---------- after the snap: "AI is that good" ----------
  /* A halo pulse behind his head and lime sparkles popping around it. (A hero word behind him read as "TH"
     at this zoom: his head covers it.) Head sits near (540, 560) on screen: the camera centres his face. */
  const SPARKS = [[-150, 0.95, 86], [-120, 0.85, 58], [-60, 0.85, 64], [-30, 0.95, 90], [-172, 0.8, 48], [-8, 0.8, 52], [-90, 0.75, 44]];
  function thatGood(ctx, t, layer) {
    if (t < B.that_good - 0.1 || t > B.right_now + 1.6) return;
    const cx = 540, cy = 560, end = B.right_now + 0.9;
    if (layer === 'behind') {
      const u = t - B.that_good;
      if (u < 0 || u > 1.1) return;
      const r = 200 + 260 * ease.outCubic(u / 1.1);
      ctx.save();
      ctx.globalAlpha *= 1 - u / 1.1;
      ctx.strokeStyle = C.lime; ctx.lineWidth = 10; ctx.shadowColor = C.lime; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.arc(cx, cy, Math.min(r, 255), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      return;
    }
    SPARKS.forEach(([deg, k, size], i) => {
      const L = life(t, B.that_good + i * 0.05, end, { w: 18, z: 0.45, out: 0.25 });
      if (L.a <= 0) return;
      const a = (deg * Math.PI) / 180, rad = 330 * k;
      const x = cx + Math.cos(a) * rad * 1.15, y = cy + Math.sin(a) * rad;
      const tw = 0.8 + 0.2 * Math.sin((t - B.that_good) * 9 + i * 1.7);
      ctx.save();
      ctx.translate(x, y); ctx.rotate(Math.sin(t * 2 + i) * 0.25); ctx.scale(L.s * tw, L.s * tw);
      E.drawIcon(ctx, 'sparkles', 0, 0, size, L.a);
      ctx.restore();
    });
  }

  // ---------- "the same tools" ... "what you want?" ----------
  function tools(ctx, t, layer, img) {
    if (layer !== 'front' || t < B.same_tools - 0.1 || t > B.answer2) return;
    const end = B.answer2 - 0.35;
    // images.higgsfield is optional (project.json); without it, and for OpenAI (no public mark), the tile shows an initial
    const items = [['claude', 'CLAUDE', 175, 470], [img.higgsfield || 'higgsfield', 'HIGGSFIELD', 175, 740],
      ['openai', 'CHATGPT', 905, 600]];
    items.forEach(([icon, label, x, y], i) => {
      const L = life(t, B.same_tools + i * 0.09, end, { w: 16, z: 0.55 });
      if (L.a <= 0) return;
      const dim = ease.outCubic(prog(t, B.dont + i * 0.08, 0.3));
      const jit = dim > 0 && t < B.dont + 0.6 ? Math.sin((t - B.dont) * 60) * 6 * (1 - prog(t, B.dont, 0.6)) : 0;
      tile(ctx, x + jit, y, 150, icon, label, L.a, L.s, { dim, bg: icon === 'openai' ? '#0B0D10' : '#12151D' });
      badge(ctx, x + 62, y - 62, 30, C.red, 'x', L.a * dim, spring(t - B.dont - i * 0.08, 18, 0.5));
    });
    // "what you want?"
    const L = life(t, B.want - 0.05, end, { w: 15, z: 0.5 });
    if (L.a > 0) {
      ctx.save();
      ctx.globalAlpha *= L.a;
      ctx.translate(905, 850); ctx.rotate(0.12); ctx.scale(L.s, L.s);
      E.withShadow(ctx, 24, 0.6, 6, () => E.text(ctx, '?', 0, 60, { font: E.serifFont(210), align: 'center', color: C.lime }));
      ctx.restore();
    }
  }

  // ---------- Claude Code, Codex, Kimi Code, any agent ----------
  function agents(ctx, t, layer) {
    if (layer !== 'front' || t < B.claude_code - 0.1 || t > B.all_you) return;
    const end = B.all_you - 0.35;
    const k = life(t, B.agent2, end, { w: 14, z: 0.6 });
    if (k.a > 0) {                                   // a lime link line through all four, under the tiles
      ctx.save();
      ctx.globalAlpha *= k.a * 0.8;
      ctx.strokeStyle = C.lime; ctx.lineWidth = 3; ctx.setLineDash([10, 12]); ctx.lineDashOffset = -t * 60;
      ctx.beginPath(); ctx.moveTo(195, 470); ctx.lineTo(885, 470); ctx.lineTo(885, 790); ctx.lineTo(195, 790); ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
    const items = [['claude', 'CLAUDE CODE', 195, 470, B.claude_code], ['openai', 'CODEX', 885, 470, B.codex],
      ['kimi', 'KIMI CODE', 195, 790, B.kimi_code], ['terminal', 'ANY AGENT', 885, 790, B.whatever]];
    items.forEach(([icon, label, x, y, t0], i) => {
      const L = life(t, t0 - 0.03, end, { w: 15, z: 0.52 });
      if (L.a <= 0) return;
      const bob = Math.sin((t - t0) * 2.2 + i) * 6;
      const glowA = Math.exp(-Math.max(0, t - t0) * 3) * L.a;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      E.glow(ctx, x, y + bob, 120, i === 0 ? '#D97757' : C.lime, 0.5 * glowA);
      ctx.restore();
      tile(ctx, x, y + bob, 160, icon, label, L.a, L.s, { bg: i === 1 ? '#0B0D10' : '#12151D', iconK: icon === 'kimi' ? 0.6 : 0.56 });
    });
  }

  // ---------- end: persistent keyword chip on the smile ----------
  function endChip(ctx, t, layer) {
    if (layer !== 'front' || t < B.end) return;
    const L = life(t, B.end + 0.05, null, { w: 14, z: 0.6 });
    ctx.save();
    ctx.globalAlpha *= L.a;
    ctx.translate(540, 360); ctx.scale(L.s, L.s);
    const label = 'FOLLOW + COMMENT';
    const w1 = E.textWidth(ctx, label, E.monoFont(28, 500), 3) + 26;
    const w2 = E.textWidth(ctx, 'SKILL', E.headFont(64, 700));
    const w = w1 + w2 + 90;
    E.withShadow(ctx, 30, 0.55, 8, () => E.fillRR(ctx, -w / 2, -52, w, 104, 52, 'rgba(10,12,18,0.9)'));
    E.fillRR(ctx, -w / 2, -52, w, 104, 52, null, E.rgba(C.lime, 0.7), 3);
    E.text(ctx, label, -w / 2 + 40, 10, { font: E.monoFont(28, 500), ls: 3 });
    E.text(ctx, 'SKILL', -w / 2 + 40 + w1, 23, { font: E.headFont(64, 700), color: C.lime });
    ctx.restore();
  }

  function draw(ctx, t, layer, img) {
    hook(ctx, t, layer);
    question(ctx, t, layer);
    showcase(ctx, t, layer);
    thatGood(ctx, t, layer);
    tools(ctx, t, layer, img);
    agents(ctx, t, layer);
    endChip(ctx, t, layer);
  }

  return { init, draw, tile, badge, hero, monoLabel };
})();
