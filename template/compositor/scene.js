/* Scene layers: virtual camera, the room (plate + living LED light + the person), the optional AI studio shot,
   the takeover "glass" background and the face bubble (PiP) that the full frame morphs into. */
'use strict';

const S = (() => {
  const { W, H, SRC, C, clamp, lerp, prog, ease, spring, noise1 } = E;
  let TL = null, P = null, B = null, TRACK = null;
  const img = {};

  async function init(tl, paths, track) {
    TL = tl; P = paths; B = tl.beats; TRACK = track;
    if (TL.studio && !P.studio) {
      throw new Error('the timeline has a studio shot but project.json has none: rerun tools/build_timeline.py');
    }
    img.base = await E.image(P.plateBase);
    img.lights = await E.image(P.plateLights);
    img.blur = await E.image(P.plateBlur);
  }

  // ---------- time mapping ----------
  function segAt(t) {
    let seg = TL.segments[0];
    for (const s of TL.segments) if (s.out_in <= t + 1e-6) seg = s;
    return seg;
  }
  const srcTime = t => { const s = segAt(t); return s.src_in + (t - s.out_in); };
  const fgUrl = si => `${P.fg}/f${String(si).padStart(5, '0')}.webp`;
  // live background mode (project.json room.background "live"): each frame's own room, set per frame by main.js
  const bgUrl = si => (P.bg ? `${P.bg}/b${String(si).padStart(5, '0')}.jpg` : null);
  let liveBg = null;
  const setBg = im => { liveBg = im; };
  function studioFrame(t) {
    const k = Math.round((srcTime(t) - TL.studio.src_t0) * TL.studio.fps);
    return clamp(k, 0, P.studioFrames - 1);
  }
  const studioUrl = k => `${P.studio}/s${String(k).padStart(4, '0')}.jpg`;
  // the studio shot is optional (project.json "studio"); its cut out hides in the white-out 0.14 s after t_out
  const inStudio = t => !!TL.studio && t >= TL.studio.t_in && t < TL.studio.t_out + 0.14;

  // ---------- camera ----------
  const LOOK = () => TL.look || {};
  function shake(t) {
    let x = 0, y = 0, r = 0;
    for (const [t0, amp, dur] of LOOK().shakes || []) {
      const u = t - t0;
      if (u < 0 || u > dur) continue;
      const k = amp * Math.exp(-u * 5.5) * (1 - u / dur);
      x += noise1(u * 38, t0) * k; y += noise1(u * 41, t0 + 3) * k; r += noise1(u * 27, t0 + 7) * k * 0.0012;
    }
    return { x, y, r };
  }
  /* Scale that keeps a shaken picture covering the frame (no edge ever shows during a hit). */
  const shakeCover = sh => 1 + (2 * (Math.abs(sh.x) + Math.abs(sh.y))) / W + Math.abs(sh.r) * 1.2;
  function zoomAt(t) {
    let hard = 1, soft = 1;
    for (const p of TL.punches) {
      if (p.hard) { if (p.t <= t + 1e-6) hard = p.z; continue; }
      const u = t - p.t;
      if (u < -0.04 || u > 1.5) continue;
      const up = spring(u + 0.04, 20, 0.62), down = ease.inOutCubic(prog(u, 0.5, 0.95));
      soft *= 1 + (p.z - 1) * up * (1 - down);
    }
    const pu = LOOK().push;                                   // a slow push-in that builds tension, then drops
    const push = pu && t < pu[1] ? 1 + pu[2] * ease.inCubic(prog(t, pu[0], pu[1] - pu[0])) : 1;
    return Math.min(TL.camera.base_zoom * hard * soft * push, 1.46);
  }
  function crop(n, t, zOverride) {
    const Z = zOverride || zoomAt(t);
    const cam = TL.camera, i = clamp(n, 0, cam.cx.length - 1);
    const w = W / Z, h = H / Z;
    const x0 = Z >= 1 ? clamp(cam.cx[i] - (W / 2) / Z, 0, W - w) : cam.cx[i] - (W / 2) / Z;
    const y0 = Z >= 1 ? clamp(cam.cy[i] - cam.face_y / Z, 0, H - h) : cam.cy[i] - cam.face_y / Z;
    return { x0, y0, Z };
  }
  /* Map a layout-space point of the source frame to the screen for this frame's camera. */
  function toScreen(n, t, lx, ly) {
    const c = crop(n, t);
    return [(lx - c.x0) * c.Z, (ly - c.y0) * c.Z];
  }
  function faceScreen(n, t) {
    const cam = TL.camera, i = clamp(n, 0, cam.cx.length - 1);
    const [x, y] = toScreen(n, t, cam.cx[i], cam.cy[i]);
    return { x, y, h: cam.fh[i] * crop(n, t).Z };
  }

  // ---------- the RGB room ----------
  /* LED light layer: pulses and drifts in hue like a streamer's RGB kit, flares on hits. */
  function lightGain(t) {
    let g = 0.85 + 0.12 * Math.sin(t * 1.7) + 0.06 * noise1(t * 0.9, 11);
    for (const [t0, a] of LOOK().flares || []) {              // the LEDs flare on hit words
      const u = t - t0;
      if (u >= 0 && u < 1.2) g += a * Math.exp(-u * 3.2);
    }
    const st = LOOK().stutter;                                 // the lights stutter before a big moment
    if (st && t > st[0] && t < st[1]) {
      const k = prog(t, st[0], st[1] - st[0]);
      g *= 1 - 0.7 * k * (noise1(t * 22, 5) > 0.1 ? 1 : 0.15);
    }
    return Math.max(0, g);
  }
  const hueAt = t => {
    const hk = LOOK().hue_kick;
    return 18 * Math.sin(t * 0.45) + (hk != null && t > hk ? 30 * Math.exp(-(t - hk) * 1.5) : 0);
  };

  /* ctx.transform (not setTransform) so the camera composes with whatever the caller set up: the shake in
     drawRoom, the bubble's clip in drawBubble. */
  function drawPlate(ctx, t, c, dim = 1) {
    ctx.save();
    ctx.transform(c.Z, 0, 0, c.Z, -c.x0 * c.Z, -c.y0 * c.Z);
    ctx.drawImage(liveBg || img.base, 0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = clamp(lightGain(t) * dim, 0, 1.6) / 1.6 * 1.0;
    ctx.filter = `hue-rotate(${hueAt(t).toFixed(1)}deg)`;
    ctx.drawImage(img.lights, 0, 0, W, H);
    if (lightGain(t) > 1.6) { ctx.globalAlpha = clamp((lightGain(t) - 1.6) / 1.6); ctx.drawImage(img.lights, 0, 0, W, H); }
    ctx.filter = 'none';
    ctx.restore();
  }
  function drawFg(ctx, fg, c) {
    ctx.save();
    ctx.transform(c.Z, 0, 0, c.Z, -c.x0 * c.Z, -c.y0 * c.Z);
    ctx.drawImage(fg, 0, 0, W, H);
    ctx.restore();
  }
  /* The room shot: plate, graphics behind the person, the person, graphics in front. */
  function drawRoom(ctx, n, t, fg, behind, front) {
    const sh = shake(t);
    const c = crop(n, t);
    ctx.save();
    ctx.translate(W / 2 + sh.x, H / 2 + sh.y); ctx.rotate(sh.r); ctx.scale(shakeCover(sh), shakeCover(sh));
    ctx.translate(-W / 2, -H / 2);
    drawPlate(ctx, t, c);
    if (behind) behind(ctx, t, n);
    drawFg(ctx, fg, c);
    ctx.restore();
    if (front) front(ctx, t, n);
  }

  // ---------- studio ----------
  function drawStudio(ctx, t, frame) {
    const u = t - TL.studio.t_in;
    const k = 1 + 0.07 * (1 - spring(u, 9, 0.75)) + 0.035 * prog(u, 0, TL.studio.t_out - TL.studio.t_in);
    const sh = shake(t);
    ctx.save();
    const kc = k * shakeCover(sh);
    ctx.translate(540 + sh.x, 900 + sh.y); ctx.rotate(sh.r); ctx.scale(kc, kc); ctx.translate(-540, -900);
    ctx.drawImage(frame, 0, 0, W, H);
    ctx.restore();
    return k;
  }
  /* Where the tracked prop (project.json studio.track: a glove, a mug) is on screen for the studio frame shown at t.
     Without a track: the centre of the frame, ok false. tipX/tipY is the prop's top edge (a fingertip for a snap). */
  function propAt(t) {
    const centre = { x: 540, y: 900, tipX: 540, tipY: 860, ok: false };
    if (!TL.studio) return centre;                            // no studio shot in this take
    const kf = (TRACK && (TRACK[studioFrame(t)] || TRACK[TRACK.length - 1])) || { x: 540, y: 900, tx: 540, ty: 860, ok: false };
    const u = t - TL.studio.t_in;
    const k = 1 + 0.07 * (1 - spring(u, 9, 0.75)) + 0.035 * prog(u, 0, TL.studio.t_out - TL.studio.t_in);
    return { x: 540 + (kf.x - 540) * k, y: 900 + (kf.y - 900) * k, tipX: 540 + (kf.tx - 540) * k, tipY: 900 + (kf.ty - 900) * k, ok: kf.ok };
  }

  // ---------- takeovers ----------
  /* The takeover background: the blurred room under a graphite scrim and a fine bone dot grid (no coloured glows:
     the house look keeps colour for the tier accent). */
  function drawGlass(ctx, t) {
    ctx.drawImage(img.blur, 0, 0, W, H);
    ctx.fillStyle = 'rgba(21,21,28,0.72)';
    ctx.fillRect(0, 0, W, H);
    // fine dot grid
    ctx.save();
    ctx.fillStyle = 'rgba(244,241,234,0.05)';
    for (let y = 300; y < 1250; y += 36) for (let x = 72; x < 1010; x += 36) ctx.fillRect(x, y, 2, 2);
    ctx.restore();
  }
  /* Morph between the full room frame (p = 0) and the face bubble at (px, py, pr) (p = 1). */
  function drawBubble(ctx, n, t, fg, p, px, py, pr, ring = C.accent) {
    const cam = TL.camera, i = clamp(n, 0, cam.cx.length - 1);
    const zFull = zoomAt(t);
    const zPip = (pr * 2) / (cam.fh[i] * 1.7);
    const e = ease.inOutCubic(p);
    const Z = Math.exp(lerp(Math.log(zFull), Math.log(zPip), e));
    const full = crop(n, t);
    const fx0 = (cam.cx[i] - full.x0) * full.Z, fy0 = (cam.cy[i] - full.y0) * full.Z;    // face on screen, full frame
    const cx = lerp(fx0, px, e), cy = lerp(fy0, py, e);
    const R = lerp(1500, pr, e);
    const c = { Z, x0: cam.cx[i] - cx / Z, y0: cam.cy[i] - cy / Z };
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    drawPlate(ctx, t, c);
    drawFg(ctx, fg, c);
    ctx.restore();
    if (e > 0.6) {
      ctx.save();
      ctx.globalAlpha = (e - 0.6) / 0.4;
      ctx.lineWidth = 5; ctx.strokeStyle = ring;
      ctx.beginPath(); ctx.arc(cx, cy, R + 2.5, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    return { cx, cy, R };
  }

  return {
    init, segAt, srcTime, fgUrl, bgUrl, setBg, studioFrame, studioUrl, inStudio, zoomAt, crop, toScreen, faceScreen, shake,
    drawRoom, drawPlate, drawFg, drawStudio, propAt, drawGlass, drawBubble, lightGain,
  };
})();
