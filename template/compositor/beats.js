/* This video's beats. The agent rewrites this file for every take (references/04-beats-catalog.md): each graphic
   springs in on the word it illustrates, B.<key> being that word's output time from plan.json "beats".
   The snap reel's full set (<skill>/examples/snap-reel/compositor/) shows DM bubbles, tool tiles, takeovers, a studio shot
   and a snap explosion built this way. */
'use strict';

const BEATS = (() => {
  let B = null;
  function init(tl) { B = tl.beats; }

  /* layer 'behind' draws under the person (the RGB-room shots), 'front' over them. */
  function draw(ctx, t, layer) {
    if (layer === 'front') {
      // Example: KIT.viewfinder(ctx, t, B.like_this, B.like_this + 1.0);
      // Example: KIT.tiles(ctx, t, [{icon: 'claude', label: 'CLAUDE CODE', x: 195, y: 470, t0: B.claude}], B.claude + 3);
    } else {
      // Example: KIT.hero(ctx, 'CAPTIONS', 540, 520, 165, B.captions, B.captions + 1.5, t, {stroke: 5});
    }
  }
  return { init, draw };
})();

SNAPCUT.room.push(BEATS);
// Sound cues for these beats (kinds: the list at the top of tools/sfx_kit.py):
// SNAPCUT.cues.push(B => [{t: B.captions, kind: 'swish', gain: 0.7}]);
