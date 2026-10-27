# fl06 / fs06 "PNG predictor default": plan, evidence and scene tables (phase A2 and phase B)

Running question: **Did the same `ffmpeg ... out.png` command start writing a different file when I upgraded ffmpeg, and does the picture change?**

Answer in one line: the picture never changes (the decoded pixels are identical on 6.1.1 and 8.1.2 for all 112 files), but the file does, for **two separate reasons**:
1. **The default filter moved.** `ffmpeg -h encoder=png` says `-pred` (default none) on 6.1.1 and (default paeth) on 8.1.2. Filter byte 0 on every row became filter 1 on row 0 and filter 4 (paeth) on every other row. The size moves with the content: -98.4 % on a smooth gradient, -38.8 % on a noisy field, -12.7 % on testsrc2, -9.9 % on mandelbrot, unchanged on white noise, but **+51.4 % on flat color runs and +78.4 % on four-color noise**. Upgrading can make a PNG bigger.
2. **The bytes differ across the two builds even with the filter pinned.** 96 files written with an explicit `-pred` have the same filter histogram on both builds (96 of 96) and the same bytes in none (0 of 96); the 16 default files match in none either; even `-pred none` differs (testsrc2 30324 against 31461). So a file hash, a cache key or a reproducible-build check breaks on any upgrade. The film says "different builds" and does not name zlib as the cause: the 8.1.2 configuration line lists zlib, the 6.1.1 line lists none, which is not proof. See "What the PC rerun still has to show".

Fix: set `-pred` yourself (try `mixed`, try `none` for flat art, measure your own images) and hash the decoded pixels (`-c:v rawvideo -pix_fmt <fmt> -f md5`), not the file.

Palette: `newsprint` for both films (Abril display, Libre Franklin sans, Courier Prime mono; gray stock, near-black ink). Roles: cyan (blue ink) = the 6.1.1 baseline, amber = doubt, red = the surprise or the bigger file, green = smaller or verified.

Status: 6.1.1 measured here and 8.1.2 measured on the PC (`evidence-8.1.2.json`); the film numbers all come from those two files. Phase A tests, the film tests and the short tests pass on 6.1.1 (3 runs in a row) and the fixture tests match `evidence-8.1.2.json` (see Tests).

## Files
- `fixture/png.mjs` PNG toolkit in plain Node (chunk parser with CRC, zlib inflate of IDAT, filter byte of every row, unfilter, PNG builder with chosen filter bytes, IDAT chunk sizes, zlib header, md5 of the inflated stream).
- `fixture/experiment.mjs` the measurement (`runExperiment`, `compareEvidence`, `buildOf`). `fixture/run.mjs` prints and writes `evidence.json` (default `out/fl06/evidence.json`). `fixture/compare.mjs A.json B.json` compares two builds (needs only node). `fixture/scene-data.mjs` builds the numbers used on screen from the two evidence files; `fixture/gen-scene-data.mjs` writes them into the `DATA` block of `video/Scenes.tsx` (fl06 and fs06).
- `evidence-6.1.1.json` (this container, with the new fields), `evidence-8.1.2.json` (the PC, ffmpeg 8.1.2-full_build-www.gyan.dev, libavcodec 62.28.102; made before the inflated-stream fields existed).
- `test/fl06.test.mjs` (fixture, 44 tests), `test/film.test.mjs` (script, spoken numbers, DATA block, distribution, outline rows; 13 tests), `test/helpers.mjs`; `episodes/fs06/test/fs06.test.mjs` (10 tests).
- `video/index.tsx`, `video/Scenes.tsx` (fl06, 18 scenes) and `episodes/fs06/video/` (10 scenes); `content/distribution.md` for each; `outline-row.md` for each.
- fs06 adds no measurement: it reads the two fl06 evidence files.

## Readers, control, determinism
- Reader 1: file size, and ffmpeg's own decode of the PNG hashed by ffmpeg (`-c:v rawvideo -pix_fmt <same> -f md5`), compared with the md5 of the source pixels (generated in Node, or hashed from the lavfi source).
- Reader 2: our own parser in Node. It reads the chunks (CRC checked), inflates the IDAT stream, reads the filter byte at the start of every scanline (0 none, 1 sub, 2 up, 3 avg, 4 paeth), undoes the filters itself and hashes the pixels. It never asks ffmpeg anything. The two readers agree on every one of the 16 images x 7 variants and the 3 images x 12 level variants on both builds.
- Control: a PNG built in Node with known filter bytes (rows cycle 0,1,2,3,4 gives [36,36,36,36,36]; all paeth [0,0,0,0,180]; all none [180,0,0,0,0]); the parser reads back exactly the bytes written, and ffmpeg decodes it to the same pixels as the source.
- Determinism: every encode runs 3 times (and once as the single command that goes on screen) and all bytes are identical within a build. Exact sizes are therefore asserted on 6.1.1; on any other build only relations are asserted.
- Fixture runtime on this container: 12 to 22 s (limit 90).

## Measured results, both builds
Default-command sizes in bytes (no `-pred`), 6.1.1 then 8.1.2, then the explicit modes as 6.1.1 / 8.1.2. Images are 320x180 rgb24 made in Node from a seeded PRNG unless stated; testsrc2 and mandelbrot are lavfi at 640x360.

| image | default 6.1.1 -> 8.1.2 | change | none | sub | up | avg | paeth | mixed |
|---|---|---|---|---|---|---|---|---|
| testsrc2 | 30324 -> 26482 | -12.7 % | 30324/31461 | 30363/30890 | 26424/27605 | 35015/35208 | 26458/26482 | 25950/26203 |
| mandelbrot | 161639 -> 145654 | -9.9 % | 161639/163626 | 144772/138516 | 153495/149704 | 149036/143559 | 152164/145654 | 152367/146132 |
| noisy field | 166220 -> 101688 | -38.8 % | 166220/166458 | 108919/102726 | 107295/101175 | 103514/98145 | 107734/101688 | 103514/98145 |
| smooth gradient | 135338 -> 2229 | -98.4 % | 135338/145671 | 3705/3362 | 2234/2191 | 4271/3753 | 2175/2229 | 2175/2229 |
| hard bands | 1059 -> 652 | -38.4 % | 1059/1672 | 1007/1232 | 652/679 | 1057/1300 | 651/652 | 651/652 |
| flat color runs | 4346 -> 6581 | +51.4 % | 4346/4197 | 4645/4461 | 7427/7348 | 9878/9611 | 6868/6581 | 4645/4461 |
| text-like marks | 2448 -> 1039 | -57.6 % | 2448/2084 | 1859/1579 | 1409/1037 | 2616/1893 | 1136/1039 | 1054/854 |
| four-color noise | 24081 -> 42956 | +78.4 % | 24081/22212 | 28154/25472 | 43235/36131 | 51156/44735 | 46106/42956 | 24259/22482 |
| white noise | 173623 -> 173623 | 0 | all six 173623 on both builds | | | | | |
| solid | 625 -> 629 | +0.6 % | 625/625 | 600/600 | 627/628 | 631/631 | 628/629 | 627/628 |
| noisy field rgba | 225431 -> 123991 | -45.0 % | | | | | | |
| noisy field rgb48 | 260074 -> 124616 | -52.1 % | | | | | | |
| noisy field gray | 43879 -> 30097 | -31.4 % | | | | | | |
| gradient rgba | 175045 -> 2809 | -98.4 % | | | | | | |
| gradient rgb48 | 197982 -> 4751 | -97.6 % | | | | | | |
| gradient gray | 5667 -> 1481 | -73.9 % | | | | | | |

The size moves -35 to -98 percent on smooth and photo-like content (noisy field -38.8, gradient -98.4, rgba -45.0, rgb48 -52.1) and +51 to +79 percent on flat runs and few-color noise (+51.4, +78.4).

What the two builds say:
- Help text: `-pred <int> ... Prediction method (from 0 to 5) (default none)` on 6.1.1, `(default paeth)` on 8.1.2.
- 6.1.1: default file = `-pred none` file (same sha-256) on all 16 images; filter histogram [360,0,0,0,0] (testsrc2) or [180,0,0,0,0].
- 8.1.2: histogram of every default file [0,1,0,0,359] (testsrc2) or [0,1,0,0,179]; the default file's size equals its explicit `-pred paeth` size on all 16 images. The 8.1.2 default equals no explicit mode of 6.1.1 in bytes (testsrc2: 26482 against 26458 for 6.1.1 paeth).
- Explicit modes write that filter on every row except the first, which uses sub (1), on both builds. `-pred mixed` picks the same per-row filters on both builds (testsrc2 [0,24,207,1,128], mandelbrot [0,1,9,7,343], flat [0,180,0,0,0]); 25950 B on 6.1.1 and 26203 B on 8.1.2, the smallest of the six on testsrc2 on both.
- On 8.1.2 for flat runs: none 4197, mixed 4461, default 6581. 16-bit gradient: mixed 4751 against up 3402 (mixed is not always best).
- Pixels: the decoded md5 of every file is the same on both builds, per image (testsrc2 `c2c81fdb`, mandelbrot `ad37424e`); the file sha-256 differs (testsrc2 default 6.1.1 `a6ecc3fc`, 8.1.2 `b5b59f97`).
- `-compression_level` (default / none / paeth), 8.1.2: noisy field l1 165335, l6 101688, l9 109444 (level 9 is bigger than level 6); gradient l1 4488, l6 2229, l9 1596; flat l1 10961, l6 6581, l9 5945, with `-pred none` 7254, 4197, 3812. Level 0 stores the data (173598 bytes for all) on both builds. On 6.1.1 a higher level does not rescue the default (gradient default at level 9 135338, paeth at level 1 3449); on 8.1.2 the default already is paeth, so that comparison is made with explicit modes on both builds.

## Cross-build counts (`compare.mjs evidence-6.1.1.json evidence-8.1.2.json`)
- 112 files compared (16 images x 7 variants): decoded pixels identical in all 112.
- 96 explicit `-pred` files: same filter histogram 96 of 96, same bytes 0 of 96.
- 16 default files: same bytes 0 of 16; the 8.1.2 default is byte-identical to no 6.1.1 explicit mode.

## What the PC rerun still has to show (one command, optional)
`node episodes/fl06/fixture/run.mjs out/fl06-pc` on the PC (ffmpeg 8.1.2) writes `evidence.json` with the new fields `reader2.inflatedMd5`, `idatLengths` and `zlibHeader`; `compare.mjs` then prints whether the inflated filtered data match across builds for the explicit modes. Two outcomes:
- inflated streams equal, files differ: the bytes differ only in the deflate stage (compressor, level, IDAT chunk size). Even then the film should say "a different build of the compressor", and name zlib only if the build configuration also shows it.
- inflated streams differ: the filtered data differ too, which would be a third cause (for example the first-row rule or the mixed heuristic) and needs a note in the film. The 96 of 96 histogram match makes this unlikely.
The film and the short are written so that they stay true either way; nothing on screen depends on this run.

## Tests
- `node --test episodes/fl06/test/*.test.mjs episodes/fs06/test/*.test.mjs`: 67 tests on 6.1.1, 62 pass, 5 skip (the `v8` tests, which need the 8.1.2 numbers), 0 fail; 3 runs in a row pass.
- `FL06_EVIDENCE=episodes/fl06/evidence-8.1.2.json node --test episodes/fl06/test/fl06.test.mjs`: 44 tests against the PC evidence, 35 pass, 9 skip (the `v6` tests), 0 fail. This is what the PC run should print.
- A2 fix: the relation "a higher compression level does not rescue a bad predictor" assumed the default is none, so it failed at smooth_gradient on 8.1.2. It now compares explicit modes (`paeth` at level 1 against `none` at level 9), which holds on both builds. The other relation tests were checked for the same assumption: those about the default file read the build's own help line and filter histogram; those that compare default with explicit modes are `v6` or `v8` wrapped.
- `film.test.mjs` ties the film to the evidence: every spoken or captioned number above ten is in the two evidence files or in the derived scene data (percent changes, counts); script limits (14 to 18 scenes, 850 to 1050 words, fullTitle at most 74, thumb label at most 28, duration estimate); the generated `DATA` block of both `Scenes.tsx` equals the block built from the evidence; one scene component per script id; no em dash, emoji or glow; distribution limits (titles 60, pinned comment 300, 15 tags) and numbers; outline rows exist.

## Scene tables (all numbers in the DATA block come from the two evidence files)

### fl06 (landscape 1920x1080, 18 scenes, 1021 words, estimated 383 s of the 330 to 440 s gate)
| id | on screen | measured value |
|---|---|---|
| hook | command box; two panels (6.1.1 and 8.1.2 sizes, default word); pixel md5 line; "flat colors +51.4 % bigger" stamp | 30324 B and 26482 B, md5 c2c81fdb |
| ask | four question cards; the two builds as legend chips | structure; libavcodec 60.31.102 and 62.28.102 |
| readers | reader 1 and reader 2 columns, the control PNG with its histogram | [36,36,36,36,36] for the built PNG |
| filters | the five filters as tiles with neighbor pixels a, b, c; a row of bytes before and after | structure |
| help | two terminals with the `-h encoder=png` line, the words none and paeth | (default none), (default paeth) |
| rows | barcode of 360 rows per build, one stripe per filter byte | [360,0,0,0,0] and [0,1,0,0,359] |
| pixels | grid of 16 x 7 = 112 files lit green; the md5 under four readers | 112 files, c2c81fdb |
| gradient | two bars to scale | 135338 -> 2229, -98.4 % |
| photo | three bar pairs | 166220 -> 101688 (-38.8), 30324 -> 26482 (-12.7), 161639 -> 145654 (-9.9) |
| flat | two bar pairs, the 8.1.2 bar red; a drawn row of flat runs (labelled "drawn, not measured") | 4346 -> 6581 (+51.4), 24081 -> 42956 (+78.4) |
| noise | white noise, six equal bars | 173623 on all |
| mixed | per-row histogram for testsrc2, best-of-six marker | [0,24,207,1,128]; 25950 and 26203; 16-bit exception |
| level | `-compression_level` 1, 6, 9 with default, none, paeth | see levels above |
| formats | rgba, rgb48, gray pairs | 225431 -> 123991, 260074 -> 124616, 43879 -> 30097 |
| upgrade | 96-square strips: filters same 96 of 96, bytes same 0 of 96; the `-pred none` pair | 30324 against 31461 |
| decide | the two commands: pin `-pred`, hash the pixels; try mixed and none | commands only |
| sheet | one-screen cheat sheet of the content table and the commands | summary of the above |
| close | not-tested list, end card | 6.1.1 and 8.1.2 |

### fs06 (vertical 1080x1920, 10 scenes, 421 words, engine estimate 159.0 s of the 150 to 179.9 s gate; speech at 2.79 words per second is about 151 s plus lead and end card)
| id | on screen | measured value |
|---|---|---|
| hook | two stacked panels with the sizes; the md5 note; "So what did change?" | 30324 B, 26482 B, c2c81fdb |
| pixels | grid of 112 squares; the md5 | 112 files, c2c81fdb |
| help | two command boxes with the default highlighted; "none > paeth" | (default none), (default paeth) |
| rows | two row-filter bars (360 x filter 0; 1 x filter 1 and 359 x filter 4) | [360,0,0,0,0], [0,1,0,0,359] |
| gradient | big -98.4 %, two bars | 135338 -> 2229 |
| photo | big -38.8 %, two bars | 166220 -> 101688 |
| flat | +51.4 % and +78.4 % with two bar pairs, 8.1.2 bars red | 4346 -> 6581, 24081 -> 42956 |
| upgrade | two grids of 96 squares: same filters 96 of 96 (filled), same bytes 0 of 96 (empty); the `-pred none` pair | 30324, 31461 |
| decide | two commands, one note, one verified line | commands only |
| close | not-tested list, measured note | 6.1.1 and 8.1.2 |

Render notes (the orchestrator renders): stills `node tools/ship.mjs --series /home/claude/ffmpeg-reality-checks fl06 --stills --skip-tests --no-narration` (and fs06); the long film runs 18 scenes whose reveal timing is in seconds from the scene start (a few scenes are sped up with `speed(Scene, k)` so every reveal is visible by the middle of the scene); the short reveals are fractions of the scene length (finished by about 52 % of it).

## Not tested
- Any ffmpeg build other than 6.1.1 (Ubuntu package) and 8.1.2 (Windows full build, gyan.dev). The change is placed between those two versions only; which release changed the default is not tested.
- Which library or setting makes the bytes differ across builds (see the PC rerun); a build with another zlib (zlib-ng, libdeflate) can change bytes for the same filter bytes, but this is not shown here.
- Real photographs, screenshots or scans; every image here is synthetic and small (320x180, plus lavfi 640x360).
- Indexed color (pal8), 1-bit, gray with alpha, 16-bit gray; interlaced PNG; APNG or PNG sequences; metadata chunks other than a look at the chunk list.
- Other PNG tools (libwebp, oxipng, zopfli, pngquant, browsers) and other decoders than ffmpeg and our own parser.
- `-compression_level` 2 to 5, 7 and 8; thread counts; very large images.
- Whether a given player, color management system or cache keys on the file hash; the film only shows that the hash changes and the pixels do not.
