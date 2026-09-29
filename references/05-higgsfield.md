# 05 AI shots with Higgsfield (optional)

Three pieces of a snapcut edit can come from an image or video model. They are optional; an edit without them is
complete. They need the Higgsfield MCP server connected to your agent, and the user's own Higgsfield account.

**Before any generation:** tell the user what you will generate, with which model, and what it costs (pass
`get_cost: true` first; it returns the price without generating). Wait for their yes. Keep the job ids in the
project notes so a good result can be found again.

## Uploading references

Uploading sends frames of the person, their room or a clip of the take to Higgsfield. Say which files will go up
and get the user's yes first, even when they already said yes to the generation itself.

1. `media_upload` with `files: [{filename, content_type}]` returns an upload URL per file.
2. PUT each file to its URL. `tools/hf_put.py MAP_JSON SRC_DIR` does it safely: plain names of images and videos
   inside `SRC_DIR` only, 500 MB at most each, never your home folder or `/` as `SRC_DIR`, and https to
   `upload.higgsfield.ai` only. `MAP_JSON` is `[[filename, upload_url], ...]`.
3. `media_confirm` with `type` (`image` or `video`) and the `media_ids`.
4. Reference them in a generation as `medias: [{"role": "image_references", "value": "<media id>"}]`
   (`video_references` for a clip).

Generation calls return job ids; `jobs_wait` with `jobs: [{index, job_id}]` polls them (it returns after about
10 s with `timed_out: true` while jobs are still running; call it again). Download results into the work folder's
`hf/` subfolder with `curl -fsSL --proto '=https' --proto-redir '=https' -o <file> <url>`, then check each one with
`ffprobe` (or open the image) before any tool reads it. Keep the downloaded originals: the edit re-renders the
clips into frames, which drops the provenance data Higgsfield embeds, so the originals are the record of what was
generated, and the platform's AI label (below) is how the viewer is told.

## 1. The restyled room (plate mode)

A tripod take that starts with the room empty (or any sharp frame of the room) can get a cinematic makeover: the
same room, same camera, relit like a night-time streamer setup.

1. Export the reference frame: `ffmpeg -ss <empty_frame_t> -i <take> -frames:v 1 -q:v 2 ref_room.jpg`.
2. Generate with an image editor model (`gpt_image_2_5` kept the layout best in our tests; `nano_banana_pro` also
   works), 9:16, `resolution: "2k"`:

   > Edit this exact photo. Keep the camera angle, framing, lens and every object exactly where it is: [list the
   > room's big objects: desk, monitors, lamp, shelves, the chair]. Change ONLY the lighting and mood: it is now
   > night, the curtains are closed and dark, no sunlight or window shadows at all. The room is lit like a
   > professional streamer setup with cinematic RGB lights: a purple and magenta LED strip hidden behind [an
   > object] washing the wall with a soft gradient, a teal-cyan LED strip under [an edge] glowing on the floor, a
   > vertical neon light bar on [a wall], gentle haze. Dark, moody, contrasty, rich colour, cinematic.
   > Photorealistic. No people, no text, no logos.

3. Save it as `<work>/hf/room_plate.png`, set `room.background` to `"plate"`, `room.plate` to `"hf/room_plate.png"`
   and `room.empty_frame_t`, then `build_base.py reference`, `build_base.py plate`. The plate step aligns the image
   to the real camera (it needs 40 or more feature matches; it tells you if the model moved things too much).
4. Match the rim colours (`room.rim_left`, `rim_right`, `rim_top`) to the plate's lights.

## 2. The studio cutaway

For a take that says something like "what if I put myself in a studio": a few seconds where the person is shown in
a different place, doing exactly the motion they did in the take, then a cut back. **This regenerates the person's
face and body with a model. Only do it when the person in the take asks for it, and show them the still before
spending on the video.**

1. **Drive clip:** cut the take's section that the cutaway replaces, from a little before the in beat to a little
   after the out beat: `ffmpeg -ss <drive_t0> -i <take> -t 6 -c:v libx264 -crf 16 -an drive.mp4`. `drive_t0` goes
   into project.json `studio.drive_t0`.
2. **References:** a sharp frame of the face and one or two frames of the pose, from the take.
3. **Studio still** (`gpt_image_2_5`, 9:16, 2k; it placed hands on the correct side more reliably than
   `nano_banana_pro` in our tests):

   > Photoreal cinematic film still, vertical 9:16, WIDE FULL-BODY shot. The person from the reference photos
   > (reproduce their face EXACTLY as photographed: same [hair, beard, glasses, skin tone], same eyes, nose, mouth
   > and face shape, no beautification, no slimming) sits upright on [a chair] in the centre of a very dark, moody
   > film studio. They wear the same [clothing] as in the photos. Whole body visible, small in frame, camera at
   > chest height, 35mm lens, centred. [The pose from the pose reference.] [Any prop, on which hand: say "their
   > RIGHT hand (the hand on the LEFT side of the image)".] Lighting: near-black studio, one soft key light from
   > front-left, cool rim light on the shoulders and head, light haze, a glossy dark floor with a reflection,
   > background falling to black with a few soft out-of-focus practical lights. Photorealistic, subtle film grain.
   > No text, no logos, no watermark.

   Compare the face with the references before going on. If it is not them, regenerate; do not "fix" a face.
4. **Motion transfer:** `generate_video` with `model: "hf_mult_motion_control"`, `resolution: "1080p"`, the still
   as `image_references` and the drive clip as `video_references`:

   > The seated person in the image performs exactly the body, arm, hand and head motion of the person in the
   > video [including the key gesture]. Keep the wide full-body framing, the dark studio, the chair [and the prop].

   If the tool suggests a preset, decline it with `declined_preset_id` to keep the exact motion transfer.
5. Save it as `<work>/hf/studio.mp4` and fill project.json `studio`: `clip`, `drive_t0`, `in_event` and `out_event`
   (plan.json beats or events: the cutaway runs between them), `fps` (24 for Higgsfield video). If the prop has a
   clear colour, add `studio.track` so graphics can follow it.

## 3. Explosion plates

VFX elements on pure black, screen-blended over the frame on the beat named `snap` (plan.json `events`). Generate
two with different models and layer them: they fill each other's gaps.

> Visual effects element on a pure black background, locked-off camera, no people, no objects, no text. At 0.5
> seconds a blinding white-gold point of light at the centre erupts into [the effect: an energy explosion, an
> expanding spherical shockwave ring, streaks of energy in six colours radiating outward, anamorphic lens flare,
> glowing sparks and embers], then the light fades to drifting embers over black. Cinematic, high contrast.

Models that worked: `seedance_2_5` (`mode: "t2v"`, 1080p, 5 s, 9:16, `generate_audio: false`) and `kling3_0`
(`mode: "pro"`, `sound: "off"`, 5 s, 9:16). Save them in `<work>/hf/` and list them in project.json
`explosion.plates` with the second their burst peaks (`lead`), a `scale` above 1 so the edges never show, and an
`alpha`.

## Rules for AI material

- No real people other than the consenting user, no recognisable characters, no brand logos in prompts.
- Label the video as containing AI-generated shots where the platform asks (Instagram and TikTok both have a label).
- Output belongs to the user under Higgsfield's terms; the provider of each model may add its own terms.
