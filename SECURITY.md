# Security

snapcut runs on your machine, on your footage. This is what it touches and what it guards against.

## What leaves your machine

- Nothing of yours, by default. Transcription, the person matte and the render all run locally.
- Downloads, once: the Whisper model (Hugging Face), Satoshi (Fontshare, checked against the zip seen on
  2026-09-29), and the icons a project names (Lucide pinned to 1.48.0, Simple Icons). All over https only, redirects
  included.
- While rendering, the compositor page asks Google Fonts for one stylesheet (Unbounded and IBM Plex Mono) and the
  font files it names. Google sees that request and your IP address; nothing about your footage is in it.
- Uploads only when you ask for an AI shot: `tools/hf_put.py` sends images and videos you chose to Higgsfield's
  upload host and nowhere else. The skill tells the agent to ask you before any upload.

## Guards in the code

- The renderer is a local page in headless Chromium started without file-access privileges and with every network
  request blocked except two: a GET of the exact Google Fonts stylesheet in `tools/brand.py` (FONT_CSS) and GETs of
  font files under `https://fonts.gstatic.com/s/`. Those are fetched without following redirects, and a redirect
  is refused, so the door cannot be bounced anywhere else (tests/test_brand.py checks it). It can draw the project's
  frames as images, but beat code cannot fetch other files from your disk, read pixels back from those images, or
  send anything anywhere else.
- Icons are refused unless they are plain SVG (no scripts, embedded HTML, event handlers, entities or links out),
  and they are only ever drawn as images.
- Deliverable file names are sanitised; the tools write only into the project's `data`, `work` and `out` folders,
  and only delete frames they generated.
- The render stops on a beat name the plan does not define, and delivery refuses a picture or audio made from an
  older timeline.

## Known limits

- `project.json` can point at any file on your disk (the source video, images, a table mask). Only run projects
  you wrote or trust.
- The font door is a narrow way out: beat code could put words from the transcript into a font URL that Google's
  servers would log. Run beat files you or your agent wrote, not ones from strangers.
- The fonts Google serves are not pinned: if Google updates Unbounded or IBM Plex Mono, a later render of the same
  project can differ slightly in those labels. The route covers the page's own requests; it does not cover a page
  opening another window, which beat code has no reason to do.
- Python packages are pinned by minimum version, not by hash. Install into a virtual environment if that matters
  to you (references/01-setup.md).
- Simple Icons' CDN is not version-pinned, so a brand icon can change upstream; the SVG check still applies.

## Reporting a problem

Open an issue on GitHub, or for anything sensitive, send a DM to [@shareefico](https://www.instagram.com/shareefico/)
and I'll reply with a private contact.
