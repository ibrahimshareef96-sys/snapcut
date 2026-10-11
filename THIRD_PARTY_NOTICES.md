# Third-party notices

snapcut's own code and text are MIT licensed (see `LICENSE`). Nothing below is relicensed under MIT. Everything
except the Shareefico marks is not included in this repository: it is downloaded by the person who runs snapcut, on
their machine, under its own terms.

## Shareefico marks (in this repository, not MIT)

- `template/compositor/shareefico.js` holds the Shareefico symbol, the five level badges, the pixel mascot sprite and
  the Barakah Blueprint Waveform, as the brand's own code draws them. Copyright Ibrahim Shareef, all rights reserved.
  They are included so his videos render in the house look; they are not licensed for other use (see
  `template/compositor/NOTICE-shareefico.txt`, which travels into every project). For your own videos, turn the
  opener and the end beat off: plan.json `"brand": {"opener": false, "end_beat": false}`.

## Fonts

- **Satoshi**, designed by Deni Anggara, published by Indian Type Foundry. ITF Free Font License (FFL) v2.0,
  downloaded directly from Fontshare (https://www.fontshare.com) by `template/tools/fetch_fonts.sh` for each user,
  who must accept the licence first: https://www.fontshare.com/licenses/itf-ffl. snapcut never redistributes,
  modifies, subsets or converts it.
- **Unbounded**, Copyright 2022 The Unbounded Project Authors (https://github.com/googlefonts/unbounded), and
  **IBM Plex Mono**, Copyright (c) 2017 IBM Corp., with Reserved Font Name "Plex". SIL Open Font License 1.1. Both
  are loaded by the compositor page from Google Fonts (https://fonts.google.com) while it renders; no file is saved.

## Icons (downloaded by `template/tools/icons.py fetch`)

- **Lucide** (lucide-static 1.48.0, https://lucide.dev), ISC License, Copyright (c) 2026 Lucide Icons and
  Contributors. Icons derived from Feather are MIT, Copyright (c) 2013-present Cole Bemis. Licence text:
  https://cdn.jsdelivr.net/npm/lucide-static@1.48.0/LICENSE (each downloaded SVG keeps its licence comment).
- **Brand marks** from Simple Icons (https://simpleicons.org; the project is CC0-1.0). The marks themselves are
  trademarks of their owners. They are fetched only when a project names them, used only to name a tool, never
  recoloured, and their use does not imply endorsement by or affiliation with Anthropic, Moonshot AI, OpenAI or any
  other company. You are responsible for following each owner's brand guidelines. OpenAI's mark is not available
  from Simple Icons and is not used.

## Python packages (installed by pip from `requirements.txt`, not redistributed)

| Package | Licence |
|---|---|
| numpy | BSD-3-Clause (with bundled 0BSD, MIT, Zlib, CC0-1.0 parts) |
| scipy | BSD-3-Clause |
| opencv-python-headless | Apache-2.0 (its wheels include FFmpeg under LGPL-2.1) |
| pillow | MIT-CMU |
| faster-whisper | MIT |
| pyloudnorm | MIT |
| playwright | Apache-2.0 (browsers are installed separately under their own licences) |

Speech models: faster-whisper downloads CTranslate2 conversions of OpenAI Whisper from Hugging Face on first run,
MIT licensed.

## AI-generated media

snapcut can call Higgsfield (https://higgsfield.ai) to generate images and video on the user's own account. Those
outputs are the user's under Higgsfield's terms and the terms of the model provider used; they are not part of
this repository. Higgsfield is a trademark of its owner; this project is not affiliated with or endorsed by it.
