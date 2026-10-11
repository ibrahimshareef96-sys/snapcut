# 07 Pitfalls, and what to do about each

| Symptom | Cause | Fix |
|---|---|---|
| The room swims or wobbles behind the person | `room.background` is `"plate"` on a handheld take | Use `"live"` (the default). Plate mode needs a tripod. |
| `plate alignment failed: only N matches` | The image model moved or restyled the room's objects | Regenerate the plate with the object list in the prompt (05-higgsfield.md), or set `room.plate` to null. |
| Captions sit on the mouth or eyes | The face is low in the frame (a close selfie) | `"captions": {"position": "top"}` in plan.json; `render.py facecheck` confirms. |
| `camera.face_y` changes nothing | `base_zoom` is 1.0, so the frame cannot move | Raise `base_zoom` to about 1.08 to give the camera room. |
| `render failed: fonts not usable: Unbounded 700, ...` | No internet: the page loads Unbounded and IBM Plex Mono from Google Fonts | Connect and run it again. Satoshi alone missing means `tools/fetch_fonts.sh` has not run. |
| `the end beat plays over the last 2.0 s and the last word ends ... too late` | The trim ends right after the last word | Set the trim end the message names (the take must run that long), or `"brand": {"end_beat": false}`. |
| facecheck flags the first 2 s | The level tag opener (top left) covers the forehead of a face framed high | Move the face down with `camera.face_y` (and `base_zoom` above 1 so the frame can move). |
| `the source is 1920x1080; snapcut edits 9:16 vertical takes` | A landscape or square take | Crop it to 9:16 first, keeping the face: `ffmpeg -i in.mov -vf "crop=ih*9/16:ih" -c:a copy out.mov` (move the crop's x offset if the face is off centre). |
| `the source is HDR (HLG or PQ)` | iPhone "HDR Video" is on | Re-shoot with HDR off (Settings, Camera, Record Video), or convert to SDR with a tone-mapping tool you trust before starting. snapcut does not tone-map. |
| The take was shot at 60 or 24 fps | snapcut edits at 30 fps | The matte and the frames are resampled to 30 fps; the audio keeps its own clock. Tested on 30 fps takes; check the first stills of a 60 fps take closely. |
| Frame counts come out doubled on an external drive | macOS writes `._` sidecar files on exFAT drives | Already handled (the tools skip `._*` files). Do not delete them by hand mid-render. |
| `frames X..Y are outside the matte` | The trim grew after `vision.py` ran | Rerun `tools/vision.py`, then `build_base.py frames`. |
| `onset fixes that matched no word` | The transcript was redone and a start time moved | Update `onset_fixes[].start` to the new time `transcribe.py` printed. |
| `plan/transcript mismatch at word N` | A phrase has a word the speaker did not say, or misses one | Make the phrase match the transcript word for word; misheard spelling goes in `word_fixes`. |
| `cannot start Chromium` | Playwright's browser is not installed | `python3 -m playwright install chromium`, or set `SNAPCUT_CHROME`. |
| `cannot download ... icons` | No network, or a proxy blocks jsDelivr or Simple Icons | Fetch once on a network that allows it; icons are cached in `~/.cache/snapcut/icons`. |
| `fonts missing` | `fetch_fonts.sh` stopped at the Fontshare licence | Ask the user; rerun with `--accept-fontshare-ffl` only after they accept. |
| Python cannot verify certificates on macOS | python.org builds ship without CA certificates | snapcut downloads with `curl`, which uses the system's; nothing to do. |
| `swiftc failed` | No Xcode command line tools | `xcode-select --install`. |
| Not on a Mac | Apple Vision is macOS only | The matte and face track have no drop-in replacement in this version. Run the vision step on a Mac and copy `<work>/matte/` and `data/facetrack_raw.jsonl` over. The other steps are plain Python, ffmpeg and Chromium and should run on Linux, but only macOS is tested. |
| A graphic flickers or jumps between frames | `beats.js` keeps state or uses randomness | Make `draw` a pure function of `t` (04-beats-catalog.md). |
| The render is slow | Motion blur renders five sub-frames near each beat | Normal. Iterate on stills; render the video once at the end. |
| A loud cue makes the voice dip | The limiter holds the combined peak | Lower that cue's gain, or move it off speech. |
