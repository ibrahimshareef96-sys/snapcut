/* snapcut compositor engine: constants, math, springs, drawing and rich-text helpers, asset loading.
   Every visual is a pure function of output time t (seconds), so any frame renders the same on its own. */
'use strict';

const E = (() => {
  const W = 1080, H = 1920, FPS = 30;
  const SRC = 1440 / 1080;                  // fg frames and the plate are 1440x2560; layout space is 1080x1920
  const SAFE = { x0: 65, x1: 1015, y0: 269, y1: 1248 };
  const C = {
    ink: '#050D0A', chalk: '#FFFDF4', lime: '#D7FD64', magenta: '#FF3DCB', cyan: '#39E6FF', purple: '#9B5CFF',
    red: '#FF4D4D', gold: '#FFC857', igBlue: '#0095F6', card: 'rgba(10,14,20,0.82)', edge: 'rgba(255,253,244,0.14)',
  };
  const STONES = [                          // the six Infinity Stones, in the order the words light them
    { name: 'SPACE', col: '#3D8BFF' }, { name: 'MIND', col: '#FFD23F' }, { name: 'REALITY', col: '#FF2E4D' },
    { name: 'POWER', col: '#A54DFF' }, { name: 'TIME', col: '#2BE36B' }, { name: 'SOUL', col: '#FF8A1F' },
  ];
  const FONT = { head: "'Clash Display'", serif: "'Instrument Serif'", mono: "'Plex Mono'", body: "'Satoshi'" };

  // ---------- math ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, p) => a + (b - a) * p;
  const prog = (t, t0, dur) => clamp((t - t0) / dur);
  const ease = {
    outCubic: p => 1 - Math.pow(1 - clamp(p), 3),
    inCubic: p => Math.pow(clamp(p), 3),
    inOutCubic: p => { p = clamp(p); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; },
    outExpo: p => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(p))),
    inExpo: p => (p <= 0 ? 0 : Math.pow(2, 10 * (clamp(p) - 1))),
    outBack: (p, s = 1.7) => { p = clamp(p); return 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2); },
  };
  /* Damped spring step response: 0 before u = 0, settles at 1 (w rad/s, z damping; z < 1 overshoots). */
  function spring(u, w = 14, z = 0.6) {
    if (u <= 0) return 0;
    if (z >= 1) return 1 - Math.exp(-w * u) * (1 + w * u);
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * u) * (Math.cos(wd * u) + (z * w / wd) * Math.sin(wd * u));
  }
  /* On screen from t0 to t1: springs in, eases out. a = opacity, s = spring scale factor. */
  function life(t, t0, t1, o = {}) {
    const s = spring(t - t0, o.w || 15, o.z || 0.58);
    const out = t1 == null ? 0 : ease.inCubic(prog(t, t1, o.out || 0.22));
    return { s, out, on: t >= t0 && (t1 == null || t <= t1 + (o.out || 0.22)), a: clamp(Math.min(s * 2.5, 1) * (1 - out)) };
  }
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const noise1 = (x, seed = 0) => {               // smooth 1-D value noise in -1..1
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return lerp(hash(i + seed * 57.3) * 2 - 1, hash(i + 1 + seed * 57.3) * 2 - 1, u);
  };

  // ---------- drawing ----------
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); }
  function fillRR(ctx, x, y, w, h, r, fill, stroke, lw = 2) {
    rr(ctx, x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }
  /* Canvas shadows ignore the transform; scale them by it so a design looks the same at any zoom. */
  function withShadow(ctx, blur, alpha, dy, fn, color = '0,0,0') {
    ctx.save();
    const m = ctx.getTransform(), k = Math.hypot(m.a, m.b);
    ctx.shadowColor = `rgba(${color},${alpha})`;
    ctx.shadowBlur = blur * k;
    ctx.shadowOffsetY = dy * k;
    fn();
    ctx.restore();
  }
  function hexToRgb(hex) {
    let h = String(hex).trim();
    if (/^#[0-9a-f]{3}$/i.test(h)) h = '#' + [...h.slice(1)].map(c => c + c).join('');
    if (!/^#[0-9a-f]{6}$/i.test(h)) throw new Error(`colour "${hex}" is not #RRGGBB or #RGB`);
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgba = (hex, a) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${clamp(a)})`; };
  /* Soft radial light of colour hex (#RRGGBB), peak opacity a, radius r. */
  function glow(ctx, x, y, r, hex, a, mid = 0.35) {
    if (a <= 0 || r <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(hex, a));
    g.addColorStop(mid, rgba(hex, a * 0.45));
    g.addColorStop(1, rgba(hex, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // ---------- rich text: Clash caps, *serif accent*, ~LIME KEYWORD~ ----------
  function parseRich(s) {
    const out = [], re = /(\*[^*]+\*|~[^~]+~)/g;
    let last = 0, m;
    while ((m = re.exec(s))) {
      if (m.index > last) out.push({ text: s.slice(last, m.index), kind: 'head' });
      out.push({ text: m[0].slice(1, -1), kind: m[0][0] === '*' ? 'accent' : 'kw' });
      last = m.index + m[0].length;
    }
    if (last < s.length) out.push({ text: s.slice(last), kind: 'head' });
    return out;
  }
  const headFont = (px, wt = 600) => `${wt} ${px}px ${FONT.head}`;
  const serifFont = px => `italic 400 ${px}px ${FONT.serif}`;
  const monoFont = (px, wt = 500) => `${wt} ${px}px ${FONT.mono}`;
  const bodyFont = (px, wt = 600) => `${wt} ${px}px ${FONT.body}`;
  const tokFont = (tk, px, acc) => (tk.kind === 'accent' ? serifFont(px * acc) : headFont(px, tk.kind === 'kw' ? 700 : 600));
  const tokText = tk => (tk.kind === 'accent' ? tk.text : tk.text.toUpperCase());
  const tracked = tk => tk.kind !== 'accent';
  function richWidth(ctx, tokens, px, acc = 1.14, tracking = 0) {
    let w = 0;
    for (const tk of tokens) {
      ctx.font = tokFont(tk, px, acc);
      ctx.letterSpacing = tracked(tk) ? `${tracking}px` : '0px';
      w += ctx.measureText(tokText(tk)).width;
    }
    ctx.letterSpacing = '0px';
    return w;
  }
  /* Left edge x, alphabetic baseline y. style: {fill, accent, kw, stroke} overrides for the caption showcase. */
  function drawRich(ctx, tokens, x, y, px, o = {}) {
    let cx = x;
    for (const tk of tokens) {
      ctx.font = tokFont(tk, px, o.acc || 1.14);
      ctx.letterSpacing = tracked(tk) ? `${o.tracking || 0}px` : '0px';
      const txt = tokText(tk);
      const fill = tk.kind === 'accent' ? (o.accent || C.lime) : tk.kind === 'kw' ? (o.kw || C.lime) : (o.fill || C.chalk);
      if (o.stroke) {
        ctx.lineWidth = o.stroke; ctx.strokeStyle = fill; ctx.lineJoin = 'round';
        ctx.strokeText(txt, cx, y);
      } else {
        ctx.fillStyle = fill;
        ctx.fillText(txt, cx, y);
      }
      cx += ctx.measureText(txt).width;
    }
    ctx.letterSpacing = '0px';
    return cx - x;
  }
  function text(ctx, str, x, y, o = {}) {
    ctx.save();
    ctx.font = o.font || headFont(40);
    ctx.letterSpacing = `${o.ls || 0}px`;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'alphabetic';
    ctx.fillStyle = o.color || C.chalk;
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.shadow) { ctx.shadowColor = o.shadow[0]; ctx.shadowBlur = o.shadow[1]; ctx.shadowOffsetY = o.shadow[2] || 0; }
    ctx.fillText(str, x, y);
    ctx.restore();
  }
  function textWidth(ctx, str, f, ls = 0) {
    ctx.save(); ctx.font = f; ctx.letterSpacing = `${ls}px`;
    const w = ctx.measureText(str).width;
    ctx.restore();
    return w;
  }

  // ---------- assets ----------
  const cache = new Map();
  async function loadFonts(list) {
    for (const f of list) {
      const bytes = Uint8Array.from(atob(f.b64), ch => ch.charCodeAt(0));
      const face = new FontFace(f.family, bytes.buffer, { weight: f.weight || 'normal', style: f.style || 'normal' });
      await face.load();
      document.fonts.add(face);
    }
    await document.fonts.ready;
    const probe = [[headFont(40), 'Clash'], [serifFont(40), 'Instrument'], [monoFont(20), 'Plex'], [bodyFont(20), 'Satoshi']];
    const bad = probe.filter(([f]) => !document.fonts.check(f));
    if (bad.length) throw new Error('fonts not usable: ' + bad.map(b => b[1]).join(', '));
  }
  function image(url) {
    let p = cache.get(url);
    if (!p) {
      p = new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => im.decode().then(() => res(im), () => res(im));
        im.onerror = () => rej(new Error('image failed to load: ' + url));
        im.src = url;
      });
      cache.set(url, p);
      while (cache.size > 120) cache.delete(cache.keys().next().value);
    }
    return p;
  }
  const icons = Object.create(null);         // no prototype: an icon named "constructor" is just a missing icon
  /* tools/icons.py has already refused anything that is not a plain SVG. The real boundary is below: the icon is
     only ever drawn as an <img> from a data: URL, where scripts and external loads never run. */
  async function loadIcon(name, svg, fill) {
    if (/<\s*(\w+:)?(script|foreignObject)\b|javascript:|\son[a-z]+\s*=/i.test(svg)) throw new Error(`icon ${name} is not a plain SVG`);
    if (fill && !/^#[0-9a-f]{6}$/i.test(fill)) throw new Error(`icon ${name}: fill must be #RRGGBB`);
    const doc = new DOMParser().parseFromString(svg.replace(/currentColor/g, fill || '#FFFDF4'), 'image/svg+xml');
    const root = doc.documentElement;
    if (root.nodeName !== 'svg') throw new Error(`icon ${name} is not an SVG`);
    if (!root.getAttribute('viewBox')) {                 // keep the artwork filling the box when it is resized
      const w = parseFloat(root.getAttribute('width')), h = parseFloat(root.getAttribute('height'));
      if (w > 0 && h > 0) root.setAttribute('viewBox', `0 0 ${w} ${h}`);
    }
    root.setAttribute('width', '512');
    root.setAttribute('height', '512');
    root.removeAttribute('style');
    if (fill && root.getAttribute('fill') !== 'none') root.setAttribute('fill', fill);
    const s = new XMLSerializer().serializeToString(root);
    icons[name] = await image('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s));
  }
  function drawIcon(ctx, name, cx, cy, size, alpha = 1) {
    const im = icons[name];
    if (!im || alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    const k = size / Math.max(im.width, im.height);
    ctx.drawImage(im, cx - im.width * k / 2, cy - im.height * k / 2, im.width * k, im.height * k);
    ctx.restore();
  }

  return {
    W, H, FPS, SRC, SAFE, C, STONES, FONT, clamp, lerp, prog, ease, spring, life, hash, noise1, rr, fillRR,
    withShadow, glow, hexToRgb, rgba, parseRich, headFont, serifFont, monoFont, bodyFont, richWidth, drawRich,
    text, textWidth, loadFonts, image, loadIcon, drawIcon, icons,
  };
})();
