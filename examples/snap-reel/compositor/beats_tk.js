/* Takeovers: the frame morphs into a lime-ringed face bubble over the blurred RGB room ("glass") while a card
   explains the point: the weak prompt, the coding-agent skills and the package that becomes SKILL.md, and the
   call to action (follow, comment SKILL, get the DM). */
'use strict';

const TK = (() => {
  const { W, C, STONES, clamp, lerp, prog, ease, spring, life } = E;
  let TL = null, B = null, WIN = [];
  const MORPH = 0.38;

  function init(tl) {
    TL = tl; B = tl.beats;
    WIN = [
      { name: 'prompt', t0: B.answer2 - 0.05, t1: B.usually - 0.1, bubble: [195, 430, 120] },
      { name: 'skills', t0: B.installing - 0.05, t1: B.claude_code - 0.05, bubble: [195, 430, 120] },
      { name: 'cta', t0: B.all_you - 0.05, t1: B.end, bubble: [540, 450, 132] },
    ];
  }
  /* The active takeover at t and its morph progress p (0 = full frame, 1 = bubble). */
  function at(t) {
    for (const w of WIN) {
      if (t < w.t0 || t > w.t1 + MORPH) continue;
      const p = Math.min(ease.inOutCubic(prog(t, w.t0, MORPH)), 1 - ease.inOutCubic(prog(t, w.t1, MORPH)));
      return { ...w, p };
    }
    return null;
  }

  function card(ctx, x, y, w, h, a, s, o = {}) {
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s); ctx.translate(-(x + w / 2), -(y + h / 2));
    E.withShadow(ctx, 40, 0.55, 14, () => E.fillRR(ctx, x, y, w, h, 30, o.bg || 'rgba(12,14,22,0.94)'));
    E.fillRR(ctx, x, y, w, h, 30, null, o.edge || 'rgba(255,253,244,0.14)', o.lw || 2);
  }
  const endCard = ctx => ctx.restore();

  // ---------- the weak prompt ----------
  function prompt(ctx, t, w) {
    const x = 100, y = 548, cw = 880, ch = 300;
    const L = life(t, w.t0 + 0.2, w.t1 - 0.05, { w: 14, z: 0.62, out: 0.25 });
    if (L.a <= 0) return;
    // the hit on "prompt" bounces the card vertically: a scale wobble widened it past the safe zone
    const bounce = t >= B.prompt ? -14 * Math.exp(-(t - B.prompt) * 7) * Math.sin((t - B.prompt) * 30) : 0;
    ctx.save();
    ctx.translate(0, bounce);
    card(ctx, x, y, cw, ch, L.a, lerp(0.9, 1, Math.min(L.s, 1)), { edge: t >= B.prompt ? E.rgba(C.lime, 0.8) : undefined, lw: t >= B.prompt ? 3 : 2 });
    E.text(ctx, 'YOUR PROMPT', x + 40, y + 62, { font: E.monoFont(24, 500), ls: 3, color: 'rgba(255,253,244,0.6)' });
    E.fillRR(ctx, x + 36, y + 90, cw - 72, 96, 22, 'rgba(255,253,244,0.06)', 'rgba(255,253,244,0.12)', 2);
    const msg = 'edit my video with AI';
    const n = Math.floor(msg.length * prog(t, w.t0 + 0.35, B.prompt - w.t0 - 0.45));
    ctx.font = E.bodyFont(44, 600);
    ctx.fillStyle = C.chalk;
    ctx.fillText(msg.slice(0, n), x + 70, y + 152);
    if (Math.floor(t * 2.4) % 2 === 0) { const cx = x + 72 + ctx.measureText(msg.slice(0, n)).width; ctx.fillRect(cx, y + 116, 4, 48); }
    // quality meter
    const f = 0.16 * ease.outCubic(prog(t, B.isnt - 0.1, 0.5));
    E.text(ctx, 'PROMPT QUALITY', x + 40, y + 236, { font: E.monoFont(22, 500), ls: 3, color: 'rgba(255,253,244,0.6)' });
    E.fillRR(ctx, x + 330, y + 218, 400, 24, 12, 'rgba(255,253,244,0.1)');
    if (f > 0) E.fillRR(ctx, x + 330, y + 218, 400 * f, 24, 12, C.red);
    const st = spring(t - B.good2, 16, 0.5);
    if (st > 0) {
      ctx.save();
      ctx.translate(x + 775, y + 230); ctx.rotate(-0.12); ctx.scale(lerp(1.35, 1, clamp(st)), lerp(1.35, 1, clamp(st)));
      ctx.globalAlpha *= clamp(st * 2);
      E.fillRR(ctx, -70, -30, 140, 60, 12, null, C.red, 5);
      E.text(ctx, 'WEAK', 0, 16, { font: E.headFont(40, 700), align: 'center', color: C.red });
      ctx.restore();
    }
    endCard(ctx);
    ctx.restore();          // the bounce
  }

  // ---------- skills -> package -> SKILL.md ----------
  function terminal(ctx, t, w) {
    const L = life(t, w.t0 + 0.2, B.so + 0.1, { w: 14, z: 0.62, out: 0.3 });
    if (L.a <= 0) return;
    const x = 90, y = 548, cw = 900, ch = 300;
    card(ctx, x, y, cw, ch, L.a, lerp(0.9, 1, L.s), { bg: 'rgba(8,10,14,0.96)' });
    E.fillRR(ctx, x, y, cw, 58, 30, 'rgba(255,253,244,0.05)');
    ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + 40 + i * 30, y + 30, 9, 0, Math.PI * 2); ctx.fill(); });
    const title = t >= B.coding_agent ? 'coding agent'.slice(0, Math.ceil(12 * prog(t, B.coding_agent, 0.35))) : 'terminal';
    E.text(ctx, title, x + cw / 2, y + 38, { font: E.monoFont(24, 500), align: 'center', color: 'rgba(255,253,244,0.75)' });
    [['claude', 0], ['openai', 0.08], ['kimi', 0.16]].forEach(([ic, d], i) => {
      const s = spring(t - B.coding_agent - 0.1 - d, 18, 0.55);
      if (s > 0) { ctx.save(); ctx.translate(x + cw - 150 + i * 44, y + 30); ctx.scale(s, s); E.drawIcon(ctx, ic, 0, 0, 30); ctx.restore(); }
    });
    ctx.font = E.monoFont(34, 500);
    const cmd = '$ install skills';
    const n = Math.ceil(cmd.length * prog(t, B.installing, 0.45));
    ctx.fillStyle = C.chalk; ctx.fillText(cmd.slice(0, n), x + 40, y + 120);
    const f = ease.inOutCubic(prog(t, B.skills - 0.1, 0.9));
    if (f > 0) {
      E.fillRR(ctx, x + 40, y + 150, 700, 26, 13, 'rgba(255,253,244,0.08)');
      E.fillRR(ctx, x + 40, y + 150, 700 * f, 26, 13, C.lime);
      E.text(ctx, `${Math.round(f * 100)}%`, x + 770, y + 172, { font: E.monoFont(28, 500), color: C.lime });
    }
    if (f >= 1) {
      const s = spring(t - (B.skills + 0.8), 20, 0.55);
      ctx.save(); ctx.globalAlpha *= clamp(s * 2);
      BR.badge(ctx, x + 60, y + 238, 20, '#1FAF5A', 'check', 1, s);
      E.text(ctx, 'skills installed', x + 96, y + 250, { font: E.monoFont(32, 500), color: C.chalk });
      ctx.restore();
    }
    endCard(ctx);
  }

  const ITEMS = [
    { kind: 'caption', from: [190, 790] }, { kind: 'ring', from: [920, 600] }, { kind: 'gem', from: [150, 900] },
    { kind: 'spark', from: [930, 860] }, { kind: 'clap', from: [540, 1080] },
  ];
  function item(ctx, kind, x, y, s, a) {
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(x, y); ctx.scale(s, s);
    if (kind === 'caption') {
      E.fillRR(ctx, -95, -38, 190, 76, 18, 'rgba(10,12,18,0.92)', E.rgba(C.lime, 0.8), 3);
      E.text(ctx, 'Aa', -48, 17, { font: E.headFont(46, 700), align: 'center' });
      E.text(ctx, 'CAPS', 32, 13, { font: E.monoFont(24, 500), align: 'center', color: C.lime });
    } else if (kind === 'ring') {
      ctx.lineWidth = 10; ctx.strokeStyle = C.magenta; ctx.shadowColor = C.magenta; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 1.6); ctx.stroke();
    } else if (kind === 'gem') {
      ctx.fillStyle = STONES[3].col; ctx.shadowColor = STONES[3].col; ctx.shadowBlur = 26;
      ctx.beginPath(); ctx.moveTo(0, -46); ctx.lineTo(38, -14); ctx.lineTo(24, 40); ctx.lineTo(-24, 40); ctx.lineTo(-38, -14); ctx.closePath(); ctx.fill();
    } else if (kind === 'spark') {
      ctx.fillStyle = '#FFF3D0'; ctx.shadowColor = '#FFD27A'; ctx.shadowBlur = 30;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const r = i % 2 ? 16 : 52, an = (i / 8) * Math.PI * 2; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
      ctx.closePath(); ctx.fill();
    } else {
      E.drawIcon(ctx, 'clapperboard', 0, 0, 96);
    }
    ctx.restore();
  }
  function packageScene(ctx, t) {
    if (t < B.so - 0.1 || t > B.easy + 0.3) return;
    const bx = 540, by = 740;
    const L = life(t, B.so + 0.05, B.easy - 0.05, { w: 13, z: 0.6, out: 0.18 });
    if (L.a <= 0) return;
    BR.monoLabel(ctx, 'EVERYTHING IN THIS VIDEO', 330, 440, B.packaged - 0.1, t, L.a, C.lime);
    // items fly into the open box, one after another
    const n = ITEMS.length, span = B.thing - B.packaged;
    ITEMS.forEach((it, i) => {
      const t0 = B.packaged + (i / n) * span;
      const u = prog(t, t0, 0.55);
      if (u <= 0) return;
      const e = ease.inOutCubic(u);
      const x = lerp(it.from[0], bx, e), y = lerp(it.from[1], by - 60, e) - Math.sin(e * Math.PI) * 180;
      item(ctx, it.kind, x, y, lerp(1.1, 0.45, e), (1 - prog(u, 0.85, 0.15)) * L.a);
    });
    // the box (2.5D): the open top is a parallelogram; its two flaps fold shut on "thing"
    const close = clamp(ease.outBack(prog(t, B.thing + 0.1, 0.4), 1.3), 0, 1.08);
    ctx.save();
    ctx.globalAlpha *= L.a;
    ctx.translate(bx, by); ctx.scale(L.s, L.s);
    const bw = 300, bh = 200, dp = 70;                 // width, front height, top depth
    const top = -bh / 2;
    const quad = (pts, fill, stroke) => {
      ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); }
    };
    // inside of the box (seen through the open top)
    quad([[-bw / 2, top], [bw / 2, top], [bw / 2 + 40, top - dp], [-bw / 2 + 40, top - dp]], '#140F22');
    // front and side faces
    E.withShadow(ctx, 36, 0.5, 14, () => quad([[-bw / 2, top], [bw / 2, top], [bw / 2, top + bh], [-bw / 2, top + bh]], '#4A3A7C'));
    quad([[bw / 2, top], [bw / 2 + 40, top - dp], [bw / 2 + 40, top - dp + bh], [bw / 2, top + bh]], '#3A2C62');
    E.fillRR(ctx, -bw / 2 + 30, top + 40, 120, 26, 8, 'rgba(255,253,244,0.18)');
    // flaps hinged on the front and back edges of the top: open = folded outward (front one hangs over the
    // front face, back one tilts away) so the dark inside shows; shut = both lie flat, meeting in the middle
    const k = close;
    const fTip = [lerp(-12, 20, k), lerp(top + dp * 0.8, top - dp / 2, k)];
    const bTip = [lerp(70, 20, k), lerp(top - dp - dp * 0.95, top - dp / 2, k)];
    quad([[-bw / 2 + 40, top - dp], [bw / 2 + 40, top - dp], [bw / 2 + bTip[0], bTip[1]], [-bw / 2 + bTip[0], bTip[1]]], '#6A56A8', 'rgba(255,253,244,0.12)');
    quad([[-bw / 2, top], [bw / 2, top], [bw / 2 + fTip[0], fTip[1]], [-bw / 2 + fTip[0], fTip[1]]], '#5B4896', 'rgba(255,253,244,0.12)');
    if (k > 0.95) quad([[-22, top], [22, top], [42, top - dp * 0.5], [-2, top - dp * 0.5]], C.lime);
    if (k > 0.95) E.fillRR(ctx, -22, top, 44, bh, 4, C.lime);
    ctx.restore();
  }
  function skillCard(ctx, t) {
    if (t < B.easy - 0.1) return;
    const L = life(t, B.easy - 0.05, B.claude_code - 0.25, { w: 13, z: 0.55, out: 0.2 });
    if (L.a <= 0) return;
    const x = 540, y = 700, w = 330, h = 330;
    ctx.save();
    ctx.globalAlpha *= L.a;
    ctx.translate(x, y); ctx.scale(L.s, L.s);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; E.glow(ctx, 0, 0, 360, C.lime, 0.28 * Math.exp(-(t - B.easy) * 1.6)); ctx.restore();
    E.withShadow(ctx, 40, 0.5, 14, () => {
      ctx.beginPath();
      ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2 - 50, -h / 2); ctx.lineTo(w / 2, -h / 2 + 50); ctx.lineTo(w / 2, h / 2); ctx.lineTo(-w / 2, h / 2); ctx.closePath();
      ctx.fillStyle = '#F4F1E8'; ctx.fill();
    });
    ctx.fillStyle = '#D9D4C6';
    ctx.beginPath(); ctx.moveTo(w / 2 - 50, -h / 2); ctx.lineTo(w / 2 - 50, -h / 2 + 50); ctx.lineTo(w / 2, -h / 2 + 50); ctx.closePath(); ctx.fill();
    E.fillRR(ctx, -w / 2 + 24, -h / 2 + 30, 170, 48, 12, C.lime);
    E.text(ctx, 'SKILL.md', -w / 2 + 109, -h / 2 + 64, { font: E.monoFont(26, 500), align: 'center', color: C.ink });
    [0.8, 0.6, 0.9, 0.5, 0.7].forEach((k, i) => E.fillRR(ctx, -w / 2 + 24, -h / 2 + 108 + i * 30, (w - 48) * k, 12, 6, 'rgba(10,12,18,0.18)'));
    const inst = prog(t, B.install, 0.55);
    if (inst > 0) {
      E.fillRR(ctx, -w / 2 + 24, h / 2 - 34, w - 48, 14, 7, 'rgba(10,12,18,0.15)');
      E.fillRR(ctx, -w / 2 + 24, h / 2 - 34, (w - 48) * ease.inOutCubic(inst), 14, 7, '#1FAF5A');
    }
    ctx.restore();
    // chip: "EASY · 1 FILE"
    const k = spring(t - B.skill1, 16, 0.55);
    if (k > 0) {
      ctx.save(); ctx.globalAlpha *= L.a * clamp(k * 2);
      ctx.translate(x + 250, y - 150); ctx.rotate(0.08); ctx.scale(k, k);
      E.fillRR(ctx, -110, -32, 220, 64, 32, C.lime);
      E.text(ctx, 'EASY · 1 FILE', 0, 10, { font: E.monoFont(24, 500), align: 'center', color: C.ink });
      ctx.restore();
    }
    if (inst >= 1) BR.badge(ctx, x + 175, y + 140, 30, '#1FAF5A', 'check', L.a, spring(t - B.install - 0.55, 18, 0.5));
  }

  // ---------- call to action ----------
  function cta(ctx, t, w) {
    const out = w.t1 - 0.05;
    // 1 follow
    const L1 = life(t, B.all_you + 0.1, B.send - 0.15, { w: 14, z: 0.6, out: 0.25 });
    if (L1.a > 0) {
      const y = 660, pressed = t >= B.all_you + 0.95;
      const dip = pressed ? 1 - 0.08 * Math.exp(-(t - B.all_you - 0.95) * 10) : 1;
      ctx.save(); ctx.globalAlpha *= L1.a;
      const s1 = lerp(0.9, 1, Math.min(L1.s, 1.02));          // no overshoot past the safe zone
      ctx.translate(540, y); ctx.scale(s1, s1);
      E.text(ctx, '1', -400, 14, { font: E.monoFont(34, 500), color: C.lime });
      E.text(ctx, '@shareefico', -350, 16, { font: E.bodyFont(46, 700) });
      ctx.save(); ctx.translate(250, 0); ctx.scale(dip, dip);
      E.fillRR(ctx, -115, -38, 230, 76, 18, pressed ? 'rgba(255,253,244,0.16)' : C.igBlue);
      E.text(ctx, pressed ? 'Following' : 'Follow', pressed ? 12 : 0, 13, { font: E.bodyFont(36, 700), align: 'center' });
      if (pressed) BR.badge(ctx, -78, 0, 16, '#1FAF5A', 'check', 1, spring(t - B.all_you - 0.95, 20, 0.5));
      ctx.restore();
      ctx.restore();
    }
    // 2 comment SKILL
    const L2 = life(t, B.write - 0.1, out, { w: 14, z: 0.6 });
    if (L2.a > 0) {
      const y = 800;
      ctx.save(); ctx.globalAlpha *= L2.a;
      const s2 = lerp(0.9, 1, Math.min(L2.s, 1.02));
      ctx.translate(540, y); ctx.scale(s2, s2);
      E.text(ctx, '2', -400, 14, { font: E.monoFont(34, 500), color: C.lime });
      E.fillRR(ctx, -340, -52, 750, 104, 52, 'rgba(22,24,32,0.95)', 'rgba(255,253,244,0.18)', 2);
      const g = ctx.createLinearGradient(-320, -30, -260, 30);
      g.addColorStop(0, '#FEDA75'); g.addColorStop(0.5, '#D62976'); g.addColorStop(1, '#4F5BD5');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(-296, 0, 30, 0, Math.PI * 2); ctx.fill();
      const kw = 'SKILL';
      const n = Math.max(0, Math.min(kw.length, Math.floor((t - B.skill_kw) / 0.055) + 1));
      if (t < B.skill_kw) E.text(ctx, 'Add a comment…', -240, 14, { font: E.bodyFont(38, 500), color: 'rgba(255,253,244,0.4)' });
      else {
        E.text(ctx, kw.slice(0, n), -240, 18, { font: E.headFont(52, 700), color: C.lime });
        if (n < kw.length || Math.floor(t * 2.4) % 2 === 0) {
          ctx.font = E.headFont(52, 700);
          ctx.fillStyle = C.chalk; ctx.fillRect(-236 + ctx.measureText(kw.slice(0, n)).width, -24, 4, 50);
        }
      }
      const ready = t >= B.skill_kw + 0.3, tap = t >= B.skill_kw + 0.6;
      const k = tap ? 1 - 0.12 * Math.exp(-(t - B.skill_kw - 0.6) * 10) : 1;
      ctx.save(); ctx.translate(340, 0); ctx.scale(k, k);
      E.text(ctx, 'Post', 0, 14, { font: E.bodyFont(38, 700), align: 'center', color: ready ? C.igBlue : 'rgba(0,149,246,0.4)' });
      ctx.restore();
      ctx.restore();
    }
    // 3 the DM arrives
    const L3 = life(t, B.send - 0.05, null, { w: 13, z: 0.62 });
    if (L3.a > 0) {
      const u = t - B.send;
      const px = lerp(880, 960, ease.inCubic(prog(u, 0, 0.5))), py = lerp(800, 600, ease.outCubic(prog(u, 0, 0.5)));
      if (u < 0.5) { ctx.save(); ctx.translate(px, py); ctx.rotate(-0.5); E.drawIcon(ctx, 'send', 0, 0, 70, 1 - prog(u, 0.35, 0.15)); ctx.restore(); }
      const y = lerp(560, 660, L3.s);
      ctx.save(); ctx.globalAlpha *= L3.a * clamp(prog(u, 0.12, 0.2));
      ctx.translate(540, y);
      E.text(ctx, '3', -400, 14, { font: E.monoFont(34, 500), color: C.lime });
      E.withShadow(ctx, 30, 0.5, 10, () => E.fillRR(ctx, -340, -56, 750, 112, 28, 'rgba(250,250,252,0.97)'));
      const g = ctx.createLinearGradient(-320, -30, -260, 30);
      g.addColorStop(0, '#FEDA75'); g.addColorStop(0.5, '#D62976'); g.addColorStop(1, '#4F5BD5');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(-292, 0, 32, 0, Math.PI * 2); ctx.fill();
      E.text(ctx, 'shareefico', -236, -8, { font: E.bodyFont(34, 700), color: '#111' });
      E.text(ctx, 'sent you the skill', -236, 32, { font: E.bodyFont(32, 500), color: '#555' });
      E.fillRR(ctx, 230, -30, 160, 60, 30, C.lime);
      E.text(ctx, 'SKILL', 310, 11, { font: E.headFont(32, 700), align: 'center', color: C.ink });
      ctx.restore();
    }
  }

  /* Draw the takeover content (after the glass and the bubble are drawn). */
  function draw(ctx, t, w) {
    if (!w) return;
    const a = clamp((w.p - 0.4) / 0.6);
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    if (w.name === 'prompt') prompt(ctx, t, w);
    if (w.name === 'skills') { terminal(ctx, t, w); packageScene(ctx, t); skillCard(ctx, t); }
    if (w.name === 'cta') {                   // a touch larger so the steps read on a phone (stays inside x 65-1015)
      ctx.translate(540, 730); ctx.scale(1.08, 1.08); ctx.translate(-540, -730);
      cta(ctx, t, w);
    }
    ctx.restore();
  }

  return { init, at, draw, WIN: () => WIN };
})();
