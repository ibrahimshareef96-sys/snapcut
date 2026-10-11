/* @ds-bundle: {"format":4,"namespace":"Shareefico","components":[{"name":"Symbol"},{"name":"LevelBadge"},{"name":"AchievementBadge"}]} */
/* Shareefico brand bundle. Plain functions, no React, no network. The marks are generated from the same code that drew
   the brand files (tools/brand_symbol.py, tools/bb_mic.py, tools/bb_wave.py) by tools/ds_bundle.py; do not edit the
   DATA block by hand. Everything returns strings or small controllers, so any page or video engine can use it.
   Exports: Symbol, LevelBadge, AchievementBadge, Waveform, waveformBars, PixelMascot, pixelFrames, glyphs, spring,
   springs, tiers, tier, escape, prefersReducedMotion. */
(function () {
  "use strict";
  var DATA = {"symbol":"<svg role=\"img\" aria-label=\"Shareefico symbol: cap, glasses and beard\" viewBox=\"6 8 70 90\" width=\"70\" height=\"90\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M27 41C27 21 38 11 50 11C62 11 73 21 73 41Z\" fill=\"{{cap}}\"/><rect x=\"9\" y=\"35\" width=\"38\" height=\"8.5\" rx=\"4.25\" fill=\"{{cap}}\"/><rect x=\"31\" y=\"47\" width=\"16\" height=\"12\" rx=\"3.5\" fill=\"none\" stroke=\"{{ink}}\" stroke-width=\"4.4\"/><rect x=\"53\" y=\"47\" width=\"16\" height=\"12\" rx=\"3.5\" fill=\"none\" stroke=\"{{ink}}\" stroke-width=\"4.4\"/><path d=\"M47 52H53\" stroke=\"{{ink}}\" stroke-width=\"4.4\"/><path fill-rule=\"evenodd\" d=\"M28 63V68C28 85 38 95 50 95C62 95 72 85 72 68V63H67C67 66 63.5 69 58 69C55 69 52.5 68.3 50 67C47.5 68.3 45 69 42 69C36.5 69 33 66 33 63ZM40.115 78.792L38.615 88.792A1.4 1.4 0 0 0 41.385 89.208L42.885 79.208A1.4 1.4 0 0 0 40.115 78.792ZM48.6 80.0L48.6 92.0A1.4 1.4 0 0 0 51.4 92.0L51.4 80.0A1.4 1.4 0 0 0 48.6 80.0ZM57.115 79.208L58.615 89.208A1.4 1.4 0 0 0 61.385 88.792L59.885 78.792A1.4 1.4 0 0 0 57.115 79.208Z\" fill=\"{{ink}}\"/></svg>","badges":{"common":"<svg role=\"img\" aria-label=\"Shareefico common badge: the cap, glasses and beard symbol in a hexagon whose rim and cap take the common colour\" viewBox=\"-4 -4 108 120\" width=\"108\" height=\"120\" xmlns=\"http://www.w3.org/2000/svg\"><defs><linearGradient id=\"r5-rim-common\" x1=\"0.2\" y1=\"0\" x2=\"0.8\" y2=\"1\"><stop offset=\"0\" stop-color=\"#BDC3CD\"/><stop offset=\"0.55\" stop-color=\"#A3ACB9\"/><stop offset=\"1\" stop-color=\"#6F757E\"/></linearGradient><radialGradient id=\"r5-field-common\" cx=\"0.5\" cy=\"0.38\" r=\"0.7\"><stop offset=\"0\" stop-color=\"#292A32\"/><stop offset=\"1\" stop-color=\"#15151C\"/></radialGradient></defs><polygon points=\"50.00,2.00 96.77,29.00 96.77,83.00 50.00,110.00 3.23,83.00 3.23,29.00\" fill=\"url(#r5-rim-common)\" stroke=\"url(#r5-rim-common)\" stroke-width=\"5\" stroke-linejoin=\"round\"/><polygon points=\"50.00,11.00 88.97,33.50 88.97,78.50 50.00,101.00 11.03,78.50 11.03,33.50\" fill=\"url(#r5-field-common)\" stroke=\"#15151C\" stroke-width=\"3\" stroke-linejoin=\"round\"/><polygon points=\"50.00,15.00 85.51,35.50 85.51,76.50 50.00,97.00 14.49,76.50 14.49,35.50\" fill=\"none\" stroke=\"#A3ACB9\" stroke-opacity=\"0.45\" stroke-width=\"1\" stroke-linejoin=\"round\"/><g transform=\"translate(14.00 17.84) scale(0.72)\"><path d=\"M27 41C27 21 38 11 50 11C62 11 73 21 73 41Z\" fill=\"#A3ACB9\"/><rect x=\"9\" y=\"35\" width=\"38\" height=\"8.5\" rx=\"4.25\" fill=\"#A3ACB9\"/><rect x=\"31\" y=\"47\" width=\"16\" height=\"12\" rx=\"3.5\" fill=\"none\" stroke=\"#F4F1EA\" stroke-width=\"4.4\"/><rect x=\"53\" y=\"47\" width=\"16\" height=\"12\" rx=\"3.5\" fill=\"none\" stroke=\"#F4F1EA\" stroke-width=\"4.4\"/><path d=\"M47 52H53\" stroke=\"#F4F1EA\" stroke-width=\"4.4\"/><path fill-rule=\"evenodd\" d=\"M28 63V68C28 85 38 95 50 95C62 95 72 85 72 68V63H67C67 66 63.5 69 58 69C55 69 52.5 68.3 50 67C47.5 68.3 45 69 42 69C36.5 69 33 66 33 63ZM40.115 78.792L38.615 88.792A1.4 1.4 0 0 0 41.385 89.208L42.885 79.208A1.4 1.4 0 0 0 40.115 78.792ZM48.6 80.0L48.6 92.0A1.4 1.4 0 0 0 51.4 92.0L51.4 80.0A1.4 1.4 0 0 0 48.6 80.0ZM57.115 79.208L58.615 89.208A1.4 1.4 0 0 0 61.385 88.792L59.885 78.792A1.4 1.4 0 0 0 57.115 79.208Z\" fill=\"#F4F1EA\"/></g></svg>","uncommon":"<svg role=\"img\" aria-label=\"Shareefico uncommon badge: the cap, glasses and beard symbol in a hexagon whose rim and cap take the uncommon colour\" viewBox=\"-4 -4 108 120\" width=\"108\" height=\"120\" xmlns=\"http://www.w3.org/2000/svg\"><defs><linearGradient id=\"r5-rim-uncommon\" x1=\"0.2\" y1=\"0\" x2=\"0.8\" y2=\"1\"><stop offset=\"0\" stop-color=\"#6DDDA3\"/><stop offset=\"0.55\" stop-color=\"#34D07F\"/><stop offset=\"1\" stop-color=\"#238D56\"/></linearGradient><radialGradient id=\"r5-field-uncommon\" cx=\"0.5\" cy=\"0.38\" r=\"0.7\"><stop offset=\"0\" stop-color=\"#192F2A\"/><stop offset=\"1\" stop-color=\"#15151C\"/></radialGradient></defs><polygon points=\"50.00,2.00 96.77,29.00 96.77,83.00 50.00,110.00 3.23,83.00 3.23,29.00\" fill=\"url(#r5-rim-uncommon)\" stroke=\"url(#r5-rim-uncommon)\" stroke-width=\"5\" stroke-linejoin=\"round\"/><polygon points=\"50.00,11.00 88.97,33.50 88.97,78.50 50.00,101.00 11.03,78.50 11.03,33.50\" fill=\"url(#r5-field-uncommon)\" stroke=\"#15151C\" stroke-width=\"3\" stroke-linejoin=\"round\"/><polygon points=\"50.00,15.00 85.51,35.50 85.51,76.50 50.00,97.00 14.49,76.50 14.49,35.50\" fill=\"none\" stroke=\"#34D07F\" stroke-opacity=\"0.45\" stroke-width=\"1\" stroke-linejoin=\"round\"/><g transform=\"translate(14.00 17.84) scale(0.72)\"><path d=\"M27 41C27 21 38 11 50 11C62 11 73 21 73 41Z\" fill=\"#34D07F\"/><rect x=\"9\" y=\"35\" width=\"38\" height=\"8.5\" rx=\"4.25\" fill=\"#34D07F\"/><rect x=\"31\" y=\"47\" width=\"16\" height=\"12\" rx=\"3.5\" fill=\"none\" stroke=\"#F4F1EA\" stroke-width=\"4.4\"/><rect x=\"53\" y=\"47\" width=\"16\" height=\"12\" rx=\"3.5\" fill=\"none\" stroke=\"#F4F1EA\" stroke-width=\"4.4\"/><path d=\"M47 52H53\" stroke=\"#F4F1EA\" stroke-width=\"4.4\"/><path fill-rule=\"evenodd\" d=\"M28 63V68C28 85 38 95 50 95C62 95 72 85 72 68V63H67C67 66 63.5 69 58 69C55 69 52.5 68.3 50 67C47.5 68.3 45 69 42 69C36.5 69 33 66 33 63ZM40.115 78.792L38.615 88.792A1.4 1.4 0 0 0 41.385 89.208L42.885 79.208A1.4 1.4 0 0 0 40.115 78.792ZM48.6 80.0L48.6 92.0A1.4 1.4 0 0 0 51.4 92.0L51.4 80.0A1.4 1.4 0 0 0 48.6 80.0ZM57.115 79.208L58.615 89.208A1.4 1.4 0 0 0 61.385 88.792L59.885 78.792A1.4 1.4 0 0 0 57.115 79.208Z\" fill=\"#F4F1EA\"/></g></svg>","rare":"<svg role=\"img\" aria-label=\"Shareefico rare badge: the cap, glasses and beard symbol in a hexagon whose rim and cap take the rare colour\" viewBox=\"-4 -4 108 120\" width=\"108\" height=\"120\" xmlns=\"http://www.w3.org/2000/svg\"><defs><linearGradient id=\"r5-rim-rare\" x1=\"0.2\" y1=\"0\" x2=\"0.8\" y2=\"1\"><stop offset=\"0\" stop-color=\"#72A5F9\"/><stop offset=\"0.55\" stop-color=\"#3B82F6\"/><stop offset=\"1\" stop-color=\"#2858A7\"/></linearGradient><radialGradient id=\"r5-field-rare\" cx=\"0.5\" cy=\"0.38\" r=\"0.7\"><stop offset=\"0\" stop-color=\"#1A243B\"/><stop offset=\"1\" stop-color=\"#15151C\"/></radialGradient></defs><polygon points=\"50.00,2.00 96.77,29.00 96.77,83.00 50.00,110.00 3.23,83.00 3.23,29.00\" fill=\"url(#r5-rim-rare)\" stroke=\"url(#r5-rim-rare)\" stroke-width=\"5\" stroke-linejoin=\"round\"/><polygon points=\"50.00,11.00 88.97,33.50 88.97,78.50 50.00,101.00 11.03,78.50 11.03,33.50\" fill=\"url(#r5-field-rare)\" stroke=\"#15151C\" stroke-width=\"3\" stroke-linejoin=\"round\"/><polygon points=\"50.00,15.00 85.51,35.50 85.51,76.50 50.00,97.00 14.49,76.50 14.49,35.50\" fill=\"none\" stroke=\"#3B82F6\" stroke-opacity=\"0.45\" stroke-width=\"1\" stroke-linejoin=\"round\"/><g transform=\"translate(14.00 17.84) scale(0.72)\"><path d=\"M27 41C27 21 38 11 50 11C62 11 73 21 73 41Z\" fill=\"#3B82F6\"/><rect x=\"9\" y=\"35\" width=\"38\" height=\"8.5\" rx=\"4.25\" fill=\"#3B82F6\"/><rect x=\"31\" y=\"47\" width=\"16\" height=\"12\" rx=\"3.5\" fill=\"none\" stroke=\"#F4F1EA\" stroke-width=\"4.4\"/><rect x=\"53\" y=\"47\" width=\"16\" height=\"12\" rx=\"3.5\" fill=\"none\" stroke=\"#F4F1EA\" stroke-width=\"4.4\"/><path d=\"M47 52H53\" stroke=\"#F4F1EA\" stroke-width=\"4.4\"/><path fill-rule=\"evenodd\" d=\"M28 63V68C28 85 38 95 50 95C62 95 72 85 72 68V63H67C67 66 63.5 69 58 69C55 69 52.5 68.3 50 67C47.5 68.3 45 69 42 69C36.5 69 33 66 33 63ZM40.115 78.792L38.615 88.792A1.4 1.4 0 0 0 41.385 89.208L42.885 79.208A1.4 1.4 0 0 0 40.115 78.792ZM48.6 80.0L48.6 92.0A1.4 1.4 0 0 0 51.4 92.0L51.4 80.0A1.4 1.4 0 0 0 48.6 80.0ZM57.115 79.208L58.615 89.208A1.4 1.4 0 0 0 61.385 88.792L59.885 78.792A1.4 1.4 0 0 0 57.115 79.208Z\" fill=\"#F4F1EA\"/></g></svg>","epic":"<svg role=\"img\" aria-label=\"Shareefico epic badge: the cap, glasses and beard symbol in a hexagon whose rim and cap take the epic colour\" viewBox=\"-4 -4 108 120\" width=\"108\" height=\"120\" xmlns=\"http://www.w3.org/2000/svg\"><defs><linearGradient id=\"r5-rim-epic\" x1=\"0.2\" y1=\"0\" x2=\"0.8\" y2=\"1\"><stop offset=\"0\" stop-color=\"#BC94FB\"/><stop offset=\"0.55\" stop-color=\"#A26BFA\"/><stop offset=\"1\" stop-color=\"#6E49AA\"/></linearGradient><radialGradient id=\"r5-field-epic\" cx=\"0.5\" cy=\"0.38\" r=\"0.7\"><stop offset=\"0\" stop-color=\"#29213B\"/><stop offset=\"1\" stop-color=\"#15151C\"/></radialGradient></defs><polygon points=\"50.00,2.00 96.77,29.00 96.77,83.00 50.00,110.00 3.23,83.00 3.23,29.00\" fill=\"url(#r5-rim-epic)\" stroke=\"url(#r5-rim-epic)\" stroke-width=\"5\" stroke-linejoin=\"round\"/><polygon points=\"50.00,11.00 88.97,33.50 88.97,78.50 50.00,101.00 11.03,78.50 11.03,33.50\" fill=\"url(#r5-field-epic)\" stroke=\"#15151C\" stroke-width=\"3\" stroke-linejoin=\"round\"/><polygon points=\"50.00,15.00 85.51,35.50 85.51,76.50 50.00,97.00 14.49,76.50 14.49,35.50\" fill=\"none\" stroke=\"#A26BFA\" stroke-opacity=\"0.45\" stroke-width=\"1\" stroke-linejoin=\"round\"/><g transform=\"translate(14.00 17.84) scale(0.72)\"><path d=\"M27 41C27 21 38 11 50 11C62 11 73 21 73 41Z\" fill=\"#A26BFA\"/><rect x=\"9\" y=\"35\" width=\"38\" height=\"8.5\" rx=\"4.25\" fill=\"#A26BFA\"/><rect x=\"31\" y=\"47\" width=\"16\" height=\"12\" rx=\"3.5\" fill=\"none\" stroke=\"#F4F1EA\" stroke-width=\"4.4\"/><rect x=\"53\" y=\"47\" width=\"16\" height=\"12\" rx=\"3.5\" fill=\"none\" stroke=\"#F4F1EA\" stroke-width=\"4.4\"/><path d=\"M47 52H53\" stroke=\"#F4F1EA\" stroke-width=\"4.4\"/><path fill-rule=\"evenodd\" d=\"M28 63V68C28 85 38 95 50 95C62 95 72 85 72 68V63H67C67 66 63.5 69 58 69C55 69 52.5 68.3 50 67C47.5 68.3 45 69 42 69C36.5 69 33 66 33 63ZM40.115 78.792L38.615 88.792A1.4 1.4 0 0 0 41.385 89.208L42.885 79.208A1.4 1.4 0 0 0 40.115 78.792ZM48.6 80.0L48.6 92.0A1.4 1.4 0 0 0 51.4 92.0L51.4 80.0A1.4 1.4 0 0 0 48.6 80.0ZM57.115 79.208L58.615 89.208A1.4 1.4 0 0 0 61.385 88.792L59.885 78.792A1.4 1.4 0 0 0 57.115 79.208Z\" fill=\"#F4F1EA\"/></g></svg>","legendary":"<svg role=\"img\" aria-label=\"Shareefico legendary badge: the cap, glasses and beard symbol in a hexagon whose rim and cap take the legendary colour\" viewBox=\"-4 -4 108 120\" width=\"108\" height=\"120\" xmlns=\"http://www.w3.org/2000/svg\"><defs><linearGradient id=\"r5-rim-legendary\" x1=\"0.2\" y1=\"0\" x2=\"0.8\" y2=\"1\"><stop offset=\"0\" stop-color=\"#F8BE61\"/><stop offset=\"0.55\" stop-color=\"#F5A524\"/><stop offset=\"1\" stop-color=\"#A77018\"/></linearGradient><radialGradient id=\"r5-field-legendary\" cx=\"0.5\" cy=\"0.38\" r=\"0.7\"><stop offset=\"0\" stop-color=\"#34291D\"/><stop offset=\"1\" stop-color=\"#15151C\"/></radialGradient></defs><polygon points=\"50.00,2.00 96.77,29.00 96.77,83.00 50.00,110.00 3.23,83.00 3.23,29.00\" fill=\"url(#r5-rim-legendary)\" stroke=\"url(#r5-rim-legendary)\" stroke-width=\"5\" stroke-linejoin=\"round\"/><polygon points=\"50.00,11.00 88.97,33.50 88.97,78.50 50.00,101.00 11.03,78.50 11.03,33.50\" fill=\"url(#r5-field-legendary)\" stroke=\"#15151C\" stroke-width=\"3\" stroke-linejoin=\"round\"/><polygon points=\"50.00,15.00 85.51,35.50 85.51,76.50 50.00,97.00 14.49,76.50 14.49,35.50\" fill=\"none\" stroke=\"#F5A524\" stroke-opacity=\"0.45\" stroke-width=\"1\" stroke-linejoin=\"round\"/><g transform=\"translate(14.00 17.84) scale(0.72)\"><path d=\"M27 41C27 21 38 11 50 11C62 11 73 21 73 41Z\" fill=\"#F5A524\"/><rect x=\"9\" y=\"35\" width=\"38\" height=\"8.5\" rx=\"4.25\" fill=\"#F5A524\"/><rect x=\"31\" y=\"47\" width=\"16\" height=\"12\" rx=\"3.5\" fill=\"none\" stroke=\"#F4F1EA\" stroke-width=\"4.4\"/><rect x=\"53\" y=\"47\" width=\"16\" height=\"12\" rx=\"3.5\" fill=\"none\" stroke=\"#F4F1EA\" stroke-width=\"4.4\"/><path d=\"M47 52H53\" stroke=\"#F4F1EA\" stroke-width=\"4.4\"/><path fill-rule=\"evenodd\" d=\"M28 63V68C28 85 38 95 50 95C62 95 72 85 72 68V63H67C67 66 63.5 69 58 69C55 69 52.5 68.3 50 67C47.5 68.3 45 69 42 69C36.5 69 33 66 33 63ZM40.115 78.792L38.615 88.792A1.4 1.4 0 0 0 41.385 89.208L42.885 79.208A1.4 1.4 0 0 0 40.115 78.792ZM48.6 80.0L48.6 92.0A1.4 1.4 0 0 0 51.4 92.0L51.4 80.0A1.4 1.4 0 0 0 48.6 80.0ZM57.115 79.208L58.615 89.208A1.4 1.4 0 0 0 61.385 88.792L59.885 78.792A1.4 1.4 0 0 0 57.115 79.208Z\" fill=\"#F4F1EA\"/></g></svg>"},"achievement":"<svg role=\"img\" aria-label=\"{{label}}\" viewBox=\"-4 -4 108 120\" width=\"108\" height=\"120\" xmlns=\"http://www.w3.org/2000/svg\"><defs><linearGradient id=\"{{id}}-rim\" x1=\"0.2\" y1=\"0\" x2=\"0.8\" y2=\"1\"><stop offset=\"0\" stop-color=\"{{rimLight}}\"/><stop offset=\"0.55\" stop-color=\"{{rim}}\"/><stop offset=\"1\" stop-color=\"{{rimDark}}\"/></linearGradient><radialGradient id=\"{{id}}-field\" cx=\"0.5\" cy=\"0.38\" r=\"0.7\"><stop offset=\"0\" stop-color=\"{{fieldTint}}\"/><stop offset=\"1\" stop-color=\"#15151C\"/></radialGradient></defs><polygon points=\"50.00,2.00 96.77,29.00 96.77,83.00 50.00,110.00 3.23,83.00 3.23,29.00\" fill=\"url(#{{id}}-rim)\" stroke=\"url(#{{id}}-rim)\" stroke-width=\"5\" stroke-linejoin=\"round\"/><polygon points=\"50.00,11.00 88.97,33.50 88.97,78.50 50.00,101.00 11.03,78.50 11.03,33.50\" fill=\"url(#{{id}}-field)\" stroke=\"#15151C\" stroke-width=\"3\" stroke-linejoin=\"round\"/><polygon points=\"50.00,15.00 85.51,35.50 85.51,76.50 50.00,97.00 14.49,76.50 14.49,35.50\" fill=\"none\" stroke=\"{{rim}}\" stroke-opacity=\"0.45\" stroke-width=\"1\" stroke-linejoin=\"round\"/><g transform=\"translate(28.04 34.04) scale(1.83)\" fill=\"none\" stroke=\"{{ink}}\" stroke-width=\"2.1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"{{glyph}}\"/></g></svg>","glyphs":{"check":"M5 12.5l4.5 4.5L19 7.5","bolt":"M13 2.5L5.5 13h6l-1 8.5L18 11h-6l1-8.5z","flag":"M6.5 21V4M6.5 4.5h11l-2.5 4 2.5 4h-11","star":"M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z","chat":"M4.5 5.5h15v10.5H10l-5.5 4z","flame":"M12 3c1 3.6 5 5.6 5 10.2a5 5 0 0 1-10 0c0-2.6 1.4-4.1 2.5-5.1.3 1.7 1.2 2.7 2.5 3.1-.1-3.1-1.4-5.5 0-8.2z","laptop":"M5.5 6.5h13v9h-13zM3 18.5h18","book":"M12 7c-2-1.6-5-2-8-1.5v13c3-.5 6-.1 8 1.5 2-1.6 5-2 8-1.5v-13c-3-.5-6-.1-8 1.5zM12 7v13"},"wave":"<svg role=\"img\" aria-label=\"Barakah Blueprint symbol: the Ba built from audio bars\" viewBox=\"0 0 200 200\" width=\"200\" height=\"200\" xmlns=\"http://www.w3.org/2000/svg\"><rect x=\"40.00\" y=\"58\" width=\"9\" height=\"84\" rx=\"4.5\" fill=\"{{fill}}\"/><rect x=\"52.33\" y=\"70\" width=\"9\" height=\"72\" rx=\"4.5\" fill=\"{{fill}}\"/><rect x=\"64.67\" y=\"112\" width=\"9\" height=\"30\" rx=\"4.5\" fill=\"{{fill}}\"/><rect x=\"77.00\" y=\"100\" width=\"9\" height=\"42\" rx=\"4.5\" fill=\"{{fill}}\"/><rect x=\"89.33\" y=\"120\" width=\"9\" height=\"22\" rx=\"4.5\" fill=\"{{fill}}\"/><rect x=\"101.67\" y=\"94\" width=\"9\" height=\"48\" rx=\"4.5\" fill=\"{{fill}}\"/><rect x=\"114.00\" y=\"114\" width=\"9\" height=\"28\" rx=\"4.5\" fill=\"{{fill}}\"/><rect x=\"126.33\" y=\"104\" width=\"9\" height=\"38\" rx=\"4.5\" fill=\"{{fill}}\"/><rect x=\"138.67\" y=\"96\" width=\"9\" height=\"46\" rx=\"4.5\" fill=\"{{fill}}\"/><rect x=\"151.00\" y=\"96\" width=\"9\" height=\"46\" rx=\"4.5\" fill=\"{{fill}}\"/><path d=\"M100 157L115 172L100 187L85 172Z\" fill=\"{{dot}}\"/></svg>","waveSmall":"<svg role=\"img\" aria-label=\"Barakah Blueprint symbol, small version\" viewBox=\"36 54 128 140\" width=\"128\" height=\"140\" xmlns=\"http://www.w3.org/2000/svg\"><rect x=\"40.00\" y=\"58\" width=\"18\" height=\"84\" rx=\"9.0\" fill=\"{{fill}}\"/><rect x=\"65.50\" y=\"104\" width=\"18\" height=\"38\" rx=\"9.0\" fill=\"{{fill}}\"/><rect x=\"91.00\" y=\"118\" width=\"18\" height=\"24\" rx=\"9.0\" fill=\"{{fill}}\"/><rect x=\"116.50\" y=\"100\" width=\"18\" height=\"42\" rx=\"9.0\" fill=\"{{fill}}\"/><rect x=\"142.00\" y=\"96\" width=\"18\" height=\"46\" rx=\"9.0\" fill=\"{{fill}}\"/><path d=\"M100 154L118 172L100 190L82 172Z\" fill=\"{{dot}}\"/></svg>","bars":{"grid":200,"baseline":142,"width":9,"bars":[{"x":40.0,"top":58},{"x":52.33,"top":70},{"x":64.67,"top":112},{"x":77.0,"top":100},{"x":89.33,"top":120},{"x":101.67,"top":94},{"x":114.0,"top":114},{"x":126.33,"top":104},{"x":138.67,"top":96},{"x":151.0,"top":96}],"dot":{"cx":100,"cy":172,"r":15}},"barsSmall":{"grid":200,"baseline":142,"width":18,"bars":[{"x":40.0,"top":58},{"x":65.5,"top":104},{"x":91.0,"top":118},{"x":116.5,"top":100},{"x":142.0,"top":96}],"dot":{"cx":100,"cy":172,"r":18}},"pixel":{"palette":{"C":"#2f5a3b","c":"#3d7049","D":"#1d3a26","H":"#4a3528","S":"#f1b77c","s":"#dd9c62","G":"#1c1a19","E":"#2b1d15","B":"#3d2b21","T":"#babbb3","P":"#353333","p":"#232222"},"frames":{"idle":["........CCCCCC......",".......CcCCCCCC.....","......CcCCCCCCCC....",".....CCCCCCCCCCC....","..DDDCCCCCCCCCCC....",".....HSSSSSSSSSH....",".....HSSSSSSSSSH....","....sGGGGGSGGGGGs...","....sGSESGGGSESGs...","....sGSESGSGSESGs...",".....GGGGGSGGGGG....",".....BSSSSSSSSSB....",".....BBSSBBBSSBB....",".....BBBBBBBBBBB....",".....BBBBSSSBBBB....",".....BBBBBBBBBBB....","......BBBBBBBBB.....","....TTTBBBBBBBTTT...","...TTTTTTBBBTTTTTT..","...SSTTTTTTTTTTTSS..","...SSTTTTTTTTTTTSS..","......PPPPPPPPP.....","......PPP...PPP.....","......ppp...ppp....."],"blink":["........CCCCCC......",".......CcCCCCCC.....","......CcCCCCCCCC....",".....CCCCCCCCCCC....","..DDDCCCCCCCCCCC....",".....HSSSSSSSSSH....",".....HSSSSSSSSSH....","....sGGGGGSGGGGGs...","....sGSSSGGGSSSGs...","....sGSESGSGSESGs...",".....GGGGGSGGGGG....",".....BSSSSSSSSSB....",".....BBSSBBBSSBB....",".....BBBBBBBBBBB....",".....BBBBSSSBBBB....",".....BBBBBBBBBBB....","......BBBBBBBBB.....","....TTTBBBBBBBTTT...","...TTTTTTBBBTTTTTT..","...SSTTTTTTTTTTTSS..","...SSTTTTTTTTTTTSS..","......PPPPPPPPP.....","......PPP...PPP.....","......ppp...ppp....."],"happy":["........CCCCCC......",".......CcCCCCCC.....","......CcCCCCCCCC....",".....CCCCCCCCCCC....","..DDDCCCCCCCCCCC....",".....HSSSSSSSSSH....",".....HSSSSSSSSSH....","....sGGGGGSGGGGGs...","....sGSESGGGSESGs...","....sGESEGSGESEGs...",".....GGGGGSGGGGG....",".....BSSSSSSSSSB....",".....BBSSBBBSSBB....",".....BBBBBBBBBBB....",".....BBBSSSSSBBB....",".....BBBBSSSBBBB....","......BBBBBBBBB.....","....TTTBBBBBBBTTT...","...TTTTTTBBBTTTTTT..","...SSTTTTTTTTTTTSS..","...SSTTTTTTTTTTTSS..","......PPPPPPPPP.....","......PPP...PPP.....","......ppp...ppp....."],"wave_a":["........CCCCCC......",".......CcCCCCCC.....","......CcCCCCCCCC....",".....CCCCCCCCCCC....","..DDDCCCCCCCCCCC....",".....HSSSSSSSSSH....",".....HSSSSSSSSSH....","....sGGGGGSGGGGGs...","....sGSESGGGSESGs...","....sGESEGSGESEGs...",".....GGGGGSGGGGG....",".....BSSSSSSSSSB....",".....BBSSBBBSSBB....",".....BBBBBBBBBBB....",".....BBBSSSSSBBB....",".....BBBBSSSBBBB.SS.","......BBBBBBBBB..SS.","....TTTBBBBBBBTTTT..","...TTTTTTBBBTTTTTT..","...SSTTTTTTTTTTT....","...SSTTTTTTTTTTT....","......PPPPPPPPP.....","......PPP...PPP.....","......ppp...ppp....."],"wave_b":["........CCCCCC......",".......CcCCCCCC.....","......CcCCCCCCCC....",".....CCCCCCCCCCC....","..DDDCCCCCCCCCCC....",".....HSSSSSSSSSH....",".....HSSSSSSSSSH....","....sGGGGGSGGGGGs...","....sGSESGGGSESGs...","....sGESEGSGESEGs...",".....GGGGGSGGGGG....",".....BSSSSSSSSSB....",".....BBSSBBBSSBB....",".....BBBBBBBBBBB..SS",".....BBBSSSSSBBB..SS",".....BBBBSSSBBBB.S..","......BBBBBBBBB.S...","....TTTBBBBBBBTTTT..","...TTTTTTBBBTTTTTT..","...SSTTTTTTTTTTT....","...SSTTTTTTTTTTT....","......PPPPPPPPP.....","......PPP...PPP.....","......ppp...ppp....."],"point":["........CCCCCC......",".......CcCCCCCC.....","......CcCCCCCCCC....",".....CCCCCCCCCCC....","..DDDCCCCCCCCCCC....",".....HSSSSSSSSSH....",".....HSSSSSSSSSH....","....sGGGGGSGGGGGs...","....sGSSEGGGSSEGs...","....sGSSEGSGSSEGs...",".....GGGGGSGGGGG....",".....BSSSSSSSSSB....",".....BBSSBBBSSBB....",".....BBBBBBBBBBB....",".....BBBBSSSBBBB....",".....BBBBBBBBBBB....","......BBBBBBBBB.....","....TTTBBBBBBBTTT...","...TTTTTTBBBTTTTTTSS","...SSTTTTTTTTTTT....","...SSTTTTTTTTTTT....","......PPPPPPPPP.....","......PPP...PPP.....","......ppp...ppp....."],"think":["........CCCCCC......",".......CcCCCCCC.....","......CcCCCCCCCC....",".....CCCCCCCCCCC....","..DDDCCCCCCCCCCC....",".....HSSSSSSSSSH....",".....HSSSSSSSSSH....","....sGGGGGSGGGGGs...","....sGSEGGGGSEGGs...","....sGSSSGSGSSSGs...",".....GGGGGSGGGGG....",".....BSSSSSSSSSB....",".....BBSSBBBSSBB....",".....BBBBBBBBBBB....",".....BBBBSSSBBBB....",".....BBBBBBBBSSB....","......BBBBBBBSS.....","....TTTBBBBBBTTTT...","...TTTTTTBBBTTTTTT..","...SSTTTTTTTTTTT....","...SSTTTTTTTTTTT....","......PPPPPPPPP.....","......PPP...PPP.....","......ppp...ppp....."],"cheer":["........CCCCCC......",".......CcCCCCCC.....","......CcCCCCCCCC....",".....CCCCCCCCCCC....","..DDDCCCCCCCCCCC....",".....HSSSSSSSSSH....",".....HSSSSSSSSSH....","....sGGGGGSGGGGGs...","....sGSESGGGSESGs...","....sGESEGSGESEGs...",".....GGGGGSGGGGG....",".....BSSSSSSSSSB....",".....BBSSBBBSSBB....",".....BBBBBBBBBBB....",".....BBBSSSSSBBB....","..SS.BBBBSSSBBBB.SS.","..SS..BBBBBBBBB..SS.","...TTTTBBBBBBBTTTT..","...TTTTTTBBBTTTTTT..",".....TTTTTTTTTTT....",".....TTTTTTTTTTT....","......PPPPPPPPP.....","......PPP...PPP.....","......ppp...ppp....."],"walk_a":["........CCCCCC......",".......CcCCCCCC.....","......CcCCCCCCCC....",".....CCCCCCCCCCC....","..DDDCCCCCCCCCCC....",".....HSSSSSSSSSH....",".....HSSSSSSSSSH....","....sGGGGGSGGGGGs...","....sGSESGGGSESGs...","....sGSESGSGSESGs...",".....GGGGGSGGGGG....",".....BSSSSSSSSSB....",".....BBSSBBBSSBB....",".....BBBBBBBBBBB....",".....BBBBSSSBBBB....",".....BBBBBBBBBBB....","......BBBBBBBBB.....","....TTTBBBBBBBTTT...","...TTTTTTBBBTTTTTT..","...SSTTTTTTTTTTTSS..","...SSTTTTTTTTTTTSS..","......PPPPPPPPP.....",".....PPP.....PPP....",".....ppp.....ppp...."],"walk_b":["........CCCCCC......",".......CcCCCCCC.....","......CcCCCCCCCC....",".....CCCCCCCCCCC....","..DDDCCCCCCCCCCC....",".....HSSSSSSSSSH....",".....HSSSSSSSSSH....","....sGGGGGSGGGGGs...","....sGSESGGGSESGs...","....sGSESGSGSESGs...",".....GGGGGSGGGGG....",".....BSSSSSSSSSB....",".....BBSSBBBSSBB....",".....BBBBBBBBBBB....",".....BBBBSSSBBBB....",".....BBBBBBBBBBB....","......BBBBBBBBB.....","....TTTBBBBBBBTTT...","...TTTTTTBBBTTTTTT..","...SSTTTTTTTTTTTSS..","...SSTTTTTTTTTTTSS..","......PPPPPPPPP.....",".......PPP.PPP......",".......ppp.ppp......"]}},"waveTightBox":"36 54 128 137"};
  var own = Object.prototype.hasOwnProperty;

  var TIERS = Object.freeze([
    Object.freeze({ id: "common", level: 1, name: "Watch", colour: "#A3ACB9" }),
    Object.freeze({ id: "uncommon", level: 2, name: "Use", colour: "#34D07F" }),
    Object.freeze({ id: "rare", level: 3, name: "Build", colour: "#3B82F6" }),
    Object.freeze({ id: "epic", level: 4, name: "Build for clients", colour: "#A26BFA" }),
    Object.freeze({ id: "legendary", level: 5, name: "Run it", colour: "#F5A524" })
  ]);
  var HEX = /^#[0-9A-Fa-f]{6}$/;
  var uid = 0;

  function tier(id) {
    for (var i = 0; i < TIERS.length; i++) if (TIERS[i].id === id) return TIERS[i];
    throw new Error("Unknown tier \"" + id + "\". Use one of: " + TIERS.map(function (t) { return t.id; }).join(", "));
  }

  function pick(table, key, what) {
    if (typeof key !== "string" || !own.call(table, key)) {
      throw new Error("Unknown " + what + " \"" + key + "\". Use one of: " + Object.keys(table).join(", "));
    }
    return table[key];
  }

  function colour(value, fallback) {
    if (value === undefined || value === null) return fallback;
    if (!HEX.test(value)) throw new Error("Expected a #RRGGBB colour, got \"" + value + "\"");
    return value;
  }

  /* Escape text for use inside markup or an attribute. Use it for anything that is not a literal. */
  function escape(text) {
    return String(text).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }

  function pixels(size, name) {
    var px = Number(size);
    if (!(px > 0) || !isFinite(px)) throw new Error(name + " must be a positive, finite number of pixels");
    return px;
  }

  /* Set width and height from the viewBox; with no size, the viewBox's own units become pixels. */
  function sized(svg, size) {
    var box = /viewBox="([\d.\s-]+)"/.exec(svg)[1].trim().split(/\s+/).map(Number);
    var h = size === undefined || size === null ? box[3] : pixels(size, "size");
    return svg.replace(/ width="[\d.]+" height="[\d.]+"/,
      ' width="' + Math.round(h * box[2] / box[3]) + '" height="' + Math.round(h) + '"');
  }

  /* Give a copied SVG's ids a per-call prefix, so the same mark can appear many times on one page. */
  function uniqueIds(svg) {
    uid += 1;
    var prefix = "sf" + uid + "-";
    return svg.replace(/ id="/g, ' id="' + prefix).replace(/url\(#/g, "url(#" + prefix);
  }

  /* Blend two #RRGGBB colours (amount 0 keeps a, 1 gives b), as tools/brand_symbol.py mix() does. */
  function mix(a, b, amount) {
    var out = "#";
    for (var i = 1; i < 7; i += 2) {
      var x = parseInt(a.substr(i, 2), 16), y = parseInt(b.substr(i, 2), 16);
      var v = Math.round(x + (y - x) * amount).toString(16).toUpperCase();
      out += v.length < 2 ? "0" + v : v;
    }
    return out;
  }

  /* The symbol (logomark): cap, glasses, beard. One colour by default; `cap` gives the cap a second colour.
     Named symbolMark here so it never shadows the global Symbol; exported as Shareefico.Symbol. */
  function symbolMark(props) {
    var p = props || {};
    var ink = colour(p.ink, "#F4F1EA");
    var cap = colour(p.cap, ink);
    return sized(DATA.symbol.split("{{ink}}").join(ink).split("{{cap}}").join(cap), p.size);
  }

  /* A level badge: the symbol in the tier hexagon (marks/r5-badge-<tier>.svg, ids made unique per call). */
  function LevelBadge(props) {
    var p = props || {};
    var id = p.tier || "legendary";
    tier(id);
    return sized(uniqueIds(DATA.badges[id]), p.size);
  }

  /* An achievement badge: the tier hexagon holding one of the brand's achievement glyphs instead of the symbol. */
  function AchievementBadge(props) {
    var p = props || {};
    var t = tier(p.tier || "rare");
    var glyph = pick(DATA.glyphs, p.glyph === undefined ? "check" : p.glyph, "glyph");
    var rim = p.locked ? "#34323D" : t.colour;
    var values = {
      rim: rim,
      rimLight: mix(rim, "#FFFFFF", 0.28),
      rimDark: mix(rim, "#000000", 0.32),
      fieldTint: mix("#15151C", rim, p.locked ? 0 : 0.14),
      ink: p.locked ? "#8D8A97" : "#F4F1EA",
      glyph: glyph,
      label: escape((p.title || "Achievement") + (p.locked ? ", locked" : "")),
      id: "ach"
    };
    var svg = DATA.achievement;
    Object.keys(values).forEach(function (key) { svg = svg.split("{{" + key + "}}").join(values[key]); });
    return sized(uniqueIds(svg), p.size);
  }

  /* The Waveform (Barakah Blueprint symbol). small: the five-bar version for anything under 64px tall.
     tight: crop the master to its ink (the 200-unit master carries padding). */
  function Waveform(props) {
    var p = props || {};
    var fill = colour(p.fill, "#FFF3D6");
    var dot = colour(p.dot, fill);
    var src = p.small ? DATA.waveSmall : DATA.wave;
    var svg = src.split("{{fill}}").join(fill).split("{{dot}}").join(dot);
    if (p.tight && !p.small) svg = svg.replace('viewBox="0 0 200 200"', 'viewBox="' + DATA.waveTightBox + '"');
    return sized(svg, p.size);
  }

  /* Bar geometry of the Waveform, for engines that animate the bars (200-unit grid, baseline y 142). */
  function waveformBars(small) {
    return JSON.parse(JSON.stringify(small ? DATA.barsSmall : DATA.bars));
  }

  /* The pixel mascot from his videos, drawn cell by cell from its sprite data. frame: one of pixelFrames(). */
  function PixelMascot(props) {
    var p = props || {};
    var name = p.frame === undefined ? "idle" : p.frame;
    var rows = pick(DATA.pixel.frames, name, "frame");
    var cell = p.cell === undefined ? 6 : pixels(p.cell, "cell");
    var w = rows[0].length, h = rows.length, out = [];
    for (var y = 0; y < h; y++) {
      var x = 0;
      while (x < w) {
        var key = rows[y].charAt(x);
        if (key === ".") { x++; continue; }
        var start = x;
        while (x < w && rows[y].charAt(x) === key) x++;
        out.push('<rect x="' + start + '" y="' + y + '" width="' + (x - start) + '" height="1" fill="' + DATA.pixel.palette[key] + '"/>');
      }
    }
    return '<svg role="img" aria-label="The pixel mascot, ' + escape(name) + '" viewBox="0 0 ' + w + " " + h + '" width="' + (w * cell) +
      '" height="' + (h * cell) + '" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">' + out.join("") + "</svg>";
  }

  /* ---------- motion ---------- */

  var SPRINGS = Object.freeze({
    press: Object.freeze({ stiffness: 600, damping: 50, mass: 1 }),
    ui: Object.freeze({ stiffness: 400, damping: 30, mass: 1 }),
    badge: Object.freeze({ stiffness: 260, damping: 18, mass: 1 }),
    progress: Object.freeze({ stiffness: 120, damping: 20, mass: 1 })
  });
  var MAX_STIFFNESS = 20000; // the fixed 1/240 s step stays stable well past this

  function prefersReducedMotion() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
  }

  function number(value, name) {
    if (value === null || value === undefined || value === "" || isNaN(Number(value))) {
      throw new Error(name + " must be a number");
    }
    return Number(value);
  }

  /* A spring that starts from the current value and velocity and can be retargeted at any frame without a jump:
     spring({from, to, velocity, preset or stiffness/damping/mass, instant, onUpdate(value, velocity), onRest()}).
     Returns {set(to), stop(), value(), velocity()}. `instant` only places the first value; with reduced motion
     every move lands at once. stop() works from inside onUpdate; a throwing onUpdate never wedges the spring. */
  function spring(opts) {
    var o = opts || {};
    var cfg = o.preset === undefined ? SPRINGS.ui : pick(SPRINGS, o.preset, "spring preset");
    var k = o.stiffness === undefined ? cfg.stiffness : number(o.stiffness, "stiffness");
    var c = o.damping === undefined ? cfg.damping : number(o.damping, "damping");
    var m = o.mass === undefined ? cfg.mass : number(o.mass, "mass");
    if (!(k > 0 && k <= MAX_STIFFNESS) || !(c >= 0) || !(m > 0)) {
      throw new Error("spring needs 0 < stiffness <= " + MAX_STIFFNESS + ", damping >= 0 and mass > 0");
    }
    var x = o.from === undefined ? 0 : number(o.from, "from");
    var v = o.velocity === undefined ? 0 : number(o.velocity, "velocity");
    var target = o.to === undefined ? x : number(o.to, "to");
    var onUpdate = o.onUpdate || function () {}, onRest = o.onRest || function () {};
    var raf = null, last = null, running = false, STEP = 1 / 240;

    function cancel() {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null; last = null; running = false;
    }
    function rest() {
      cancel();
      x = target; v = 0;
      onUpdate(x, v);
      onRest();
    }
    function frame(now) {
      raf = null;
      if (!running) return;
      var dt = last === null ? 1 / 60 : Math.min((now - last) / 1000, 1 / 20);
      last = now;
      for (var t = 0; t < dt; t += STEP) {
        var h = Math.min(STEP, dt - t);
        v += ((-k * (x - target) - c * v) / m) * h;
        x += v * h;
      }
      if (Math.abs(v) < 0.01 && Math.abs(x - target) < 0.001) { rest(); return; }
      try {
        onUpdate(x, v);
      } finally {
        if (running && raf === null) raf = requestAnimationFrame(frame);
      }
    }
    function start(initial) {
      if (prefersReducedMotion() || (initial && o.instant)) { rest(); return; }
      running = true;
      if (raf === null) { last = null; raf = requestAnimationFrame(frame); }
    }
    start(true);
    return {
      set: function (to) { target = number(to, "spring target"); start(false); },
      stop: cancel,
      value: function () { return x; },
      velocity: function () { return v; }
    };
  }

  var api = Object.freeze({
    version: "1.1.0",
    tiers: TIERS,
    tier: tier,
    springs: SPRINGS,
    Symbol: symbolMark,
    LevelBadge: LevelBadge,
    AchievementBadge: AchievementBadge,
    Waveform: Waveform,
    waveformBars: waveformBars,
    glyphs: function () { return Object.keys(DATA.glyphs); },
    PixelMascot: PixelMascot,
    pixelFrames: function () { return Object.keys(DATA.pixel.frames); },
    escape: escape,
    spring: spring,
    prefersReducedMotion: prefersReducedMotion
  });
  (typeof window !== "undefined" ? window : globalThis).Shareefico = api;
})();
