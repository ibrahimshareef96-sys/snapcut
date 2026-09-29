/* Snap reel: plug this video's beat modules into the compositor and list its sound cues.
   Load order in index.html: engine, fx, scene, captions, main, kit, then beats_room, beats_studio, beats_tk, register. */
'use strict';

SNAPCUT.room.push(BR);
SNAPCUT.studio = BS;
SNAPCUT.takeover = TK;

SNAPCUT.cues.push(B => {
  const ev = [];
  const add = (t, kind, gain = 1, align = 'start') => ev.push({ t, kind, gain, align });
  add(0.1, 'swoosh', 0.5);
  [0, 1, 2, 3, 4, 5, 6].forEach(i => add(B.asked - 0.1 + i * 0.07, 'pop', 0.45));
  add(B.two_days, 'tick', 0.6);
  for (let i = 0; i < 10; i++) add(B.ibrahim + i * 0.3, 'key', 0.18);
  add(B.edit, 'whoosh', 0.5);
  add(B.like_this_q, 'shutter', 0.8);
  add(B.captions, 'swish', 0.7);
  [0.13, 0.26, 0.39, 0.52].forEach(d => add(B.captions + d, 'tick', 0.4));
  add(B.motion, 'whoosh', 0.8);
  add(B.graphics, 'whoosh', 0.6);
  [0, 0.07, 0.14].forEach(d => add(B.appear + d, 'pop', 0.6));
  add(B.like_this_mg, 'impact', 0.8);
  add(B.clap, 'riser', 0.9, 'end');                 // builds from "or all of a sudden" and lands on the clap
  add(B.clap, 'boom', 0.9);
  add(B.studio, 'lightson', 0.7);
  ['glove', 'of_t', 'thanos', 'in_t', 'my', 'hand'].forEach((k, i) => add(B[k], 'chime', 0.45 + i * 0.06));
  add(B.snap, 'charge', 0.9, 'end');
  add(B.snap, 'snapboom', 1.0);
  add(B.that_good, 'swish', 0.5);
  [0, 0.09, 0.18].forEach(d => add(B.same_tools + d, 'pop', 0.55));
  add(B.dont, 'error', 0.6);
  add(B.answer2, 'whoosh', 0.6);
  for (let i = 0; i < 12; i++) add(B.answer2 + 0.35 + i * 0.09, 'key', 0.3);
  add(B.prompt, 'thud', 0.7);
  add(B.good2, 'stamp', 0.8);
  add(B.installing - 0.05, 'whoosh', 0.6);
  for (let i = 0; i < 10; i++) add(B.installing + i * 0.045, 'key', 0.3);
  add(B.skills + 0.8, 'chime', 0.6);
  for (let i = 0; i < 5; i++) add(B.packaged + (i / 5) * (B.thing - B.packaged) + 0.5, 'pop', 0.5);
  add(B.thing + 0.15, 'thud', 0.7);
  add(B.easy, 'sparkle', 0.8);
  add(B.install + 0.55, 'chime', 0.6);
  [B.claude_code, B.codex, B.kimi_code, B.whatever].forEach(t => add(t, 'pop', 0.7));
  add(B.all_you, 'whoosh', 0.6);
  add(B.all_you + 0.95, 'tap', 0.7);
  for (let i = 0; i < 5; i++) add(B.skill_kw + i * 0.055, 'key', 0.5);
  add(B.skill_kw + 0.6, 'tap', 0.7);
  add(B.send, 'send', 0.8);
  add(B.send + 0.2, 'notify', 0.8);
  add(B.end + 0.05, 'swoosh', 0.5);
  return ev;
});
