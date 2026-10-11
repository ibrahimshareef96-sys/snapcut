/* The house package around every reel (the Shareefico "Ranked" brand, approved 11 Oct 2026), set by plan.json
   "brand" (tools/brand.py):
     level tag opener   first 2 s, top left in the safe zone: the tier badge, "UNCOMMON · LVL 2" in Unbounded and the
                        topic in Satoshi Medium on a graphite plate. f0-8 slides 24 px in from the left and fades in
                        on the ui spring, holds to f42, f42-50 leaves the way it came.
     end beat           last 2 s: f0-6 the picture dims to 40%; from f4 the symbol and the handle (or a keyword call
                        to action) rise on the ui spring; f10 the pixel mascot rises at the bottom centre, its feet
                        on the safe zone's floor, and at f16 its bone bubble pops open (pixels step, no tween). It
                        blinks every 12 frames and holds to the last frame.
   Frame numbers are the brand's, at 25 fps; they are kept in seconds so the 30 fps compositor plays them at the same
   speed. Marks come from compositor/shareefico.js, copied from the brand's own code and never redrawn: the symbol
   (one bone colour, no shadow), the level badge and the pixel mascot (cell for cell from his sprite). */
'use strict';

const BRAND = (() => {
  const { W, SAFE, C, clamp, prog, ease, brandSpring } = E;
  const F = n => n / 25;                                   // brand frames (25 fps) to seconds
  const OPEN = { in: F(8), hold: F(42), out: F(50), slide: 24 };
  const END = { dim: F(6), rise: F(4), mascot: F(10), bubble: F(16), blink: F(12), lift: 40, depth: 0.6 };
  // compact and tucked into the corner (it slides in from the safe zone's left edge), so it sits beside his head
  const TAG = { x: SAFE.x0 + 24, y: SAFE.y0 + 20, badge: 72, padX: 20, padY: 16, gap: 16, r: 16 };
  const LABEL_PX = 26, TOPIC_PX = 30, TOPIC_MIN = 20;
  const SYMBOL_H = 150, SYMBOL_TOP = 520, CTA_PX = 68, CTA_MAX_W = 820;
  const CELL = 6, SPRITE_W = 20 * CELL, SPRITE_H = 24 * CELL;
  const FEET = SAFE.y1 - 14;                               // the mascot stands inside the safe zone
  const BUBBLE_PX = 30, BUBBLE_PAD = 24, BUBBLE_H = 66;
  let cfg = null;
  const img = {};
  let tag = null, cta = null, bubble = null;

  const tierLabel = () => `${cfg.tier.toUpperCase()} · LVL ${cfg.level}`;
  const handle = s => s.startsWith('@');

  async function init(tl) {
    cfg = tl.brand || null;
    tag = cta = bubble = null;
    if (!cfg) return;
    const SF = window.Shareefico;
    const ctx = document.createElement('canvas').getContext('2d');
    if (cfg.opener) {
      img.badge = await E.svgImage(SF.LevelBadge({ tier: cfg.tier, size: TAG.badge }));
      await E.loadGlyphs(E.labelFont(LABEL_PX), tierLabel());
      await E.loadGlyphs(E.bodyFont(TOPIC_PX), cfg.opener.topic);
      tag = layoutTag(ctx);
    }
    if (cfg.end_beat) {
      img.symbol = await E.svgImage(SF.Symbol({ ink: C.bone, size: SYMBOL_H }));
      for (const f of ['idle', 'blink']) img[f] = await E.svgImage(SF.PixelMascot({ frame: f, cell: CELL }));
      const e = cfg.end_beat;
      await E.loadGlyphs(handle(e.cta) ? E.labelFont(CTA_PX, 800) : E.headFont(CTA_PX), e.cta);
      await E.loadGlyphs(E.monoFont(BUBBLE_PX, 600), e.bubble);
      cta = layoutCta(ctx);
      bubble = layoutBubble(ctx);
    }
  }

  // ---------- level tag opener ----------
  function layoutTag(ctx) {
    const label = tierLabel(), topic = cfg.opener.topic;
    const badgeW = Math.round(img.badge.width * TAG.badge / img.badge.height);
    const textX = TAG.padX + badgeW + TAG.gap;
    const maxText = SAFE.x1 - 36 - TAG.x - textX - TAG.padX;
    const labelLs = 0.08 * LABEL_PX;
    const labelW = E.textWidth(ctx, label, E.labelFont(LABEL_PX), labelLs);
    const topicPx = topic ? E.fitSize(ctx, topic, px => E.bodyFont(px), TOPIC_PX, maxText, TOPIC_MIN) : 0;
    const topicW = topic ? Math.min(maxText, E.textWidth(ctx, topic, E.bodyFont(topicPx))) : 0;
    const h = TAG.badge + 2 * TAG.padY;
    return {
      label, topic, badgeW, textX, labelLs, topicPx, h,
      w: Math.ceil(textX + Math.max(labelW, topicW) + TAG.padX),
      labelY: topic ? TAG.padY + 28 : Math.round(h / 2 + LABEL_PX * 0.36),
      topicY: TAG.padY + 64,
    };
  }
  function drawOpener(ctx, t) {
    if (!tag || t < 0 || t >= OPEN.out) return;
    const k = brandSpring(t, 'ui');
    const out = ease.inCubic(prog(t, OPEN.hold, OPEN.out - OPEN.hold));
    const a = clamp(k) * (1 - out);
    if (a <= 0.002) return;
    const x = TAG.x - OPEN.slide * (1 - k) - OPEN.slide * out, y = TAG.y;
    ctx.save();
    ctx.globalAlpha *= a;
    E.fillRR(ctx, x, y, tag.w, tag.h, TAG.r, C.ground);
    ctx.drawImage(img.badge, x + TAG.padX, y + TAG.padY, tag.badgeW, TAG.badge);
    E.text(ctx, tag.label, x + tag.textX, y + tag.labelY, { font: E.labelFont(LABEL_PX), color: C.accent, ls: tag.labelLs });
    if (tag.topic) E.text(ctx, tag.topic, x + tag.textX, y + tag.topicY, { font: E.bodyFont(tag.topicPx), color: C.muted });
    ctx.restore();
  }
  /* For captions placed at the top: the opener's bottom edge while it is on screen at t, else null. */
  const openerBottom = t => (tag && t < OPEN.out ? TAG.y + tag.h : null);

  // ---------- end beat ----------
  function layoutCta(ctx) {
    const str = cfg.end_beat.cta;
    const isHandle = handle(str);
    const shown = isHandle ? str : str.toUpperCase();
    const font = px => (isHandle ? E.labelFont(px, 800) : E.headFont(px));
    const px = E.fitSize(ctx, shown, font, CTA_PX, CTA_MAX_W, 28);
    // clear space under the symbol: a quarter of its height, then the cap height
    return { str: shown, font: font(px), y: SYMBOL_TOP + SYMBOL_H + Math.round(SYMBOL_H / 4) + Math.round(px * 0.74) };
  }
  function layoutBubble(ctx) {
    const str = cfg.end_beat.bubble;
    const ls = 0.06 * BUBBLE_PX;
    const tw = E.textWidth(ctx, str, E.monoFont(BUBBLE_PX, 600), ls);
    const w = Math.ceil((tw + 2 * BUBBLE_PAD) / CELL) * CELL;
    const tailBottom = FEET - SPRITE_H - 2 * CELL;          // clear of the mascot's head at its spring overshoot
    const y = tailBottom - 2 * CELL - BUBBLE_H;
    return { str, ls, w, x: Math.round(W / 2 - w / 2), y, textY: y + Math.round((BUBBLE_H + BUBBLE_PX * 0.7) / 2) };
  }
  const endStart = () => (cfg && cfg.end_beat ? cfg.end_beat.t0 : Infinity);
  const inEndBeat = t => t >= endStart();

  function drawBubble(ctx) {
    const b = bubble, u = CELL, cx = W / 2;
    ctx.fillStyle = C.bone;                                   // stepped corners: one cell notched at each corner
    ctx.fillRect(b.x + u, b.y, b.w - 2 * u, BUBBLE_H);
    ctx.fillRect(b.x, b.y + u, b.w, BUBBLE_H - 2 * u);
    ctx.fillRect(cx - u, b.y + BUBBLE_H, 2 * u, u);           // the tail steps down toward the mascot
    ctx.fillRect(cx - u / 2, b.y + BUBBLE_H + u, u, u);
    E.text(ctx, b.str, cx, b.textY, { font: E.monoFont(BUBBLE_PX, 600), color: C.ground, align: 'center', ls: b.ls });
  }
  function drawMascot(ctx, u) {
    const k = brandSpring(u - END.mascot, 'ui');
    if (k <= 0) return;
    const x = Math.round(W / 2 - SPRITE_W / 2);
    // rises out of its own floor line: whole cells, so it moves like a sprite
    const y = FEET - SPRITE_H + Math.round(((1 - k) * SPRITE_H) / CELL) * CELL;
    const frame = Math.floor((u - END.mascot) / END.blink) % 2 ? img.blink : img.idle;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - CELL, SAFE.y0, SPRITE_W + 2 * CELL, FEET - SAFE.y0);
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(frame, x, y, SPRITE_W, SPRITE_H);
    ctx.restore();
    if (u >= END.bubble) drawBubble(ctx);
  }
  function drawEnd(ctx, t, ink) {
    if (!cta || !inEndBeat(t)) return;
    const u = t - endStart();
    if (!ink) {                                               // the picture (and anything on it) dims to 40%
      ctx.save();
      ctx.fillStyle = E.rgba(C.ground, END.depth * ease.outCubic(prog(u, 0, END.dim)));
      ctx.fillRect(0, 0, W, E.H);
      ctx.restore();
    }
    const k = brandSpring(u - END.rise, 'ui');
    if (k > 0) {
      const dy = (1 - k) * END.lift;
      ctx.save();
      ctx.globalAlpha *= clamp(k * 2);
      const sw = Math.round(img.symbol.width * SYMBOL_H / img.symbol.height);
      ctx.drawImage(img.symbol, Math.round(W / 2 - sw / 2), SYMBOL_TOP + dy, sw, SYMBOL_H);
      E.text(ctx, cta.str, W / 2, cta.y + dy, { font: cta.font, color: C.bone, align: 'center' });
      ctx.restore();
    }
    drawMascot(ctx, u);
  }

  /* ink: false (the real frame), 'all' (graphics only: the safe-zone check), 'front' (the face check). */
  function draw(ctx, t, ink) {
    if (!cfg) return;
    drawOpener(ctx, t);
    drawEnd(ctx, t, !!ink);
  }

  /* Sound locked to the motion: a swish as the tag slides in, a whoosh as the symbol rises, a pop for the bubble. */
  function cues() {
    if (!cfg) return [];
    const ev = [];
    if (cfg.opener) ev.push({ t: 0.02, kind: 'swish', gain: 0.35 });
    if (cfg.end_beat) {
      ev.push({ t: endStart() + END.rise, kind: 'whoosh', gain: 0.4 });
      ev.push({ t: endStart() + END.bubble, kind: 'pop', gain: 0.45 });
    }
    return ev;
  }

  return { init, draw, cues, openerBottom, inEndBeat, endStart };
})();
