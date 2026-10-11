/* snapcut compositor engine: constants, math, springs, drawing and text helpers, asset loading.
   Every visual is a pure function of output time t (seconds), so any frame renders the same on its own.
   The look is the Shareefico "Ranked" brand (approved 11 Oct 2026): graphite and bone, one tier colour per video,
   Satoshi for words, Unbounded for level labels and the handle, IBM Plex Mono for mono labels. */
'use strict';

const E = (() => {
  const W = 1080, H = 1920, FPS = 30;
  const SRC = 1440 / 1080;                  // fg frames and the plate are 1440x2560; layout space is 1080x1920
  const SAFE = { x0: 65, x1: 1015, y0: 269, y1: 1248 };
  /* The palette. `accent` is the video's tier colour (plan.json brand.tier, set once by setTier at init): the spoken
     caption word, the opener's label, keyword highlights. ground/surface/surface2/line are the graphite tokens,
     bone the main text, muted/faint secondary text, ink the graphite used for text on a tier fill. magenta, cyan,
     purple, red, gold and igBlue are effect colours for beat code (a REC dot, a like heart), never the house look. */
  let ACCENT = '#34D07F';
  const C = {
    ground: '#15151C', surface: '#24242F', surface2: '#34323D', line: '#3A3A47',
    bone: '#F4F1EA', muted: '#A6A4B0', faint: '#8D8A97', ink: '#15151C',
    get accent() { return ACCENT; },
    magenta: '#FF3DCB', cyan: '#39E6FF', purple: '#9B5CFF', red: '#FF4D4D', gold: '#F5A524', igBlue: '#0095F6',
    card: '#24242F', edge: 'rgba(244,241,234,0.14)',
    // Names kept for beat files written before 11 Oct 2026 (the snap reel example): `lime` now gives the tier
    // colour and `chalk` bone, so old beats render in the house look.
    get lime() { return ACCENT; },
    chalk: '#F4F1EA',
  };
  const STONES = [                          // the six Infinity Stones, in the order the words light them
    { name: 'SPACE', col: '#3D8BFF' }, { name: 'MIND', col: '#FFD23F' }, { name: 'REALITY', col: '#FF2E4D' },
    { name: 'POWER', col: '#A54DFF' }, { name: 'TIME', col: '#2BE36B' }, { name: 'SOUL', col: '#FF8A1F' },
  ];
  const FONT = { head: "'Satoshi'", body: "'Satoshi'", label: "'Unbounded'", mono: "'IBM Plex Mono'" };

  /* The video's tier from the brand bundle (compositor/shareefico.js): sets C.accent. */
  function setTier(id) {
    ACCENT = window.Shareefico.tier(id).colour;
    return ACCENT;
  }

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
  /* The brand springs (stiffness, damping at mass 1), as step responses of time: press 600/50, ui 400/30 (about 3%
     overshoot: panels, type, figures), badge 260/18 (about 12%: badges only), progress 120/20. */
  const SPRINGS = Object.freeze({ press: [600, 50], ui: [400, 30], badge: [260, 18], progress: [120, 20] });
  function brandSpring(u, name = 'ui') {
    const [k, c] = SPRINGS[name];
    return spring(u, Math.sqrt(k), c / (2 * Math.sqrt(k)));
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
  /* The caption shadow token, 0 2px 12px rgba(0,0,0,.55): under captions and type on footage. */
  const captionShadow = (ctx, fn) => withShadow(ctx, 12, 0.55, 2, fn);
  function hexToRgb(hex) {
    let h = String(hex).trim();
    if (/^#[0-9a-f]{3}$/i.test(h)) h = '#' + [...h.slice(1)].map(c => c + c).join('');
    if (!/^#[0-9a-f]{6}$/i.test(h)) throw new Error(`colour "${hex}" is not #RRGGBB or #RGB`);
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgba = (hex, a) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${clamp(a)})`; };
  /* Soft radial light of colour hex (#RRGGBB), peak opacity a, radius r. For effects in beat code; the house look
     has no glows (a soft dark pool behind type is the one gradient it uses). */
  function glow(ctx, x, y, r, hex, a, mid = 0.35) {
    if (a <= 0 || r <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(hex, a));
    g.addColorStop(mid, rgba(hex, a * 0.45));
    g.addColorStop(1, rgba(hex, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // ---------- type ----------
  /* Satoshi carries three weights on a canvas: Black 900 (heads, captions), ExtraBold 800 (small heads, buttons),
     Medium 500 (body). Any other weight asked for snaps to the nearest of them, so old beat code stays on brand. */
  const satoshi = wt => (wt >= 850 ? 900 : wt >= 650 ? 800 : 500);
  const headFont = (px, wt = 900) => `${satoshi(wt)} ${px}px ${FONT.head}`;
  const bodyFont = (px, wt = 500) => `${satoshi(wt)} ${px}px ${FONT.body}`;
  /* Unbounded 700/800: level labels in capitals (+0.08em tracking) and the @handle (lower case). */
  const labelFont = (px, wt = 700) => `${wt >= 750 ? 800 : 700} ${px}px ${FONT.label}`;
  /* IBM Plex Mono 500/600: prompts, code, mono labels in capitals. */
  const monoFont = (px, wt = 500) => `${wt >= 550 ? 600 : 500} ${px}px ${FONT.mono}`;
  /* Kept for beat files written before 11 Oct 2026: the serif accent face is retired; it draws Satoshi Medium. */
  const serifFont = px => bodyFont(px, 500);
  function text(ctx, str, x, y, o = {}) {
    ctx.save();
    ctx.font = o.font || headFont(40);
    ctx.letterSpacing = `${o.ls || 0}px`;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'alphabetic';
    ctx.fillStyle = o.color || C.bone;
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
  /* The largest size (from px down to min) at which str fits maxW; f(px) builds the font. */
  function fitSize(ctx, str, f, px, maxW, min = 12, ls = 0) {
    let s = px;
    while (s > min && textWidth(ctx, str, f(s), ls * s) > maxW) s -= 1;
    return s;
  }

  // ---------- assets ----------
  const cache = new Map();
  /* Satoshi arrives as base64 from render.py (the Fontshare file in the user's cache). Unbounded and IBM Plex Mono
     come from the Google Fonts stylesheet in index.html, the only network request the renderer allows; they are
     loaded here before the first frame, and a missing face stops the render instead of drawing a fallback. */
  const WEB_FACES = [['700 40px Unbounded', 'Unbounded 700'], ['800 40px Unbounded', 'Unbounded 800'],
    ["500 30px 'IBM Plex Mono'", 'IBM Plex Mono 500'], ["600 30px 'IBM Plex Mono'", 'IBM Plex Mono 600']];
  const SAMPLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 @ · . , ! ? \' " - :';
  async function loadFonts(list) {
    for (const f of list) {
      const bytes = Uint8Array.from(atob(f.b64), ch => ch.charCodeAt(0));
      const face = new FontFace(f.family, bytes.buffer, { weight: f.weight || 'normal', style: f.style || 'normal' });
      await face.load();
      document.fonts.add(face);
    }
    const missing = [];
    for (const [spec, name] of WEB_FACES) {
      const faces = await document.fonts.load(spec, SAMPLE).catch(() => []);
      if (!faces.length) missing.push(name);
    }
    await document.fonts.ready;
    const satoshiOk = [...document.fonts].some(f => f.family.replace(/['"]/g, '') === 'Satoshi' && f.status === 'loaded');
    if (!satoshiOk) missing.push('Satoshi');
    if (missing.length) {
      throw new Error('fonts not usable: ' + missing.join(', ') + ' (Satoshi: tools/fetch_fonts.sh; Unbounded and '
        + 'IBM Plex Mono load from Google Fonts, so the render needs an internet connection)');
    }
  }
  /* Load the glyphs a string needs before any frame draws it (a web font downloads each script subset on first use;
     a frame must never be drawn while one is still on its way). */
  async function loadGlyphs(spec, str) {
    if (str) await document.fonts.load(spec, str);
  }
  function image(url) {
    let p = cache.get(url);
    if (!p) {
      p = new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => im.decode().then(() => res(im), () => res(im));
        im.onerror = () => rej(new Error('image failed to load: ' + url.slice(0, 120)));
        im.src = url;
      });
      cache.set(url, p);
      while (cache.size > 120) cache.delete(cache.keys().next().value);
    }
    return p;
  }
  /* An SVG string (a brand mark from compositor/shareefico.js) as an image, drawn only as an <img>. */
  const svgImage = svg => image('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  const icons = Object.create(null);         // no prototype: an icon named "constructor" is just a missing icon
  /* tools/icons.py has already refused anything that is not a plain SVG. The real boundary is below: the icon is
     only ever drawn as an <img> from a data: URL, where scripts and external loads never run. */
  async function loadIcon(name, svg, fill) {
    if (/<\s*(\w+:)?(script|foreignObject)\b|javascript:|\son[a-z]+\s*=/i.test(svg)) throw new Error(`icon ${name} is not a plain SVG`);
    if (fill && !/^#[0-9a-f]{6}$/i.test(fill)) throw new Error(`icon ${name}: fill must be #RRGGBB`);
    const doc = new DOMParser().parseFromString(svg.replace(/currentColor/g, fill || C.bone), 'image/svg+xml');
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
    W, H, FPS, SRC, SAFE, C, STONES, FONT, setTier, clamp, lerp, prog, ease, spring, SPRINGS, brandSpring, life,
    hash, noise1, rr, fillRR, withShadow, captionShadow, glow, hexToRgb, rgba, headFont, bodyFont, labelFont,
    monoFont, serifFont, text, textWidth, fitSize, loadFonts, loadGlyphs, image, svgImage, loadIcon, drawIcon, icons,
  };
})();
