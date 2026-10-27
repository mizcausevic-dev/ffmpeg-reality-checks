# fl03 / fs03 scene plan (phase A)

Running question: when colors shift, is it the LABEL (the tag the file carries) or the PIXELS (the numbers in the frames)? Six source films are the evidence; the closing recipe shows how to tell, with two readers and a control.
Order: matrix (ff17), gray (ff76, the matrix again), range (ff26), transfer (ff44), then the two things that are really lost or only look lost: chroma (ff22) and bit depth (ff85). Palette for the later pass: riso. All values below are read live from `fixture/experiment.mjs` evidence (ffmpeg 6.1.1).

Visual language to carry through (Phase B): a pair of "readers" always on screen, LABEL strip (ffprobe) on one side, PIXELS strip (decoded values) on the other. A scene turns the label strip amber when it lies and red when the pixels are wrong. Semantic roles: C.cyan = expected/baseline, C.amber = doubt, C.red = surprise/failure, C.green = verified.

## fl03: long film, 1920x1080, 17 scenes, 971 words (about 6:34 at 148 wpm; with the 0.6 s lead and 10.5 s end card hold about 6:45)

| # | id | on screen | measured value shown | source |
|---|----|-----------|----------------------|--------|
| 1 | ask | Hero: a pure green swatch (0,255,0) next to the same swatch after one plain command (0,215,0); below, the red line and the 127 white as small chips | green 255 to 215; line 150,21,149; white Y 127 not 235 | ff17, ff22, ff44 |
| 2 | rig | Two reader cards (LABEL: ffprobe, PIXELS: decoded) and a "control first" tick | ffmpeg 6.1.1 | all |
| 3 | matrix | Four patches (red, green, blue, gray) read as BT.601 against BT.709; numbers under each | green 255 to 215, red gains G 23, gray fixed | ff17 |
| 4 | tag | Three files in a row: converted + tagged (error 1), same file read as 601 (23), `-colorspace bt709` alone (label green, pixels 601, error 40) | 1, 23, 40 | ff17 |
| 5 | gray | `format=gray` and `hue=s=0` stored numbers side by side, then the screen row identical | 76/150/29 vs 81/145/41; seen 76/150/29 | ff76 |
| 6 | weights | Mixer 709 weights, BT.709 file: gray 55/183 against 601 mixer 76/149, green gap bar | 54/182/18; 55/183; 149; 34 | ff76 |
| 7 | range | A black-to-white bar with the 16 to 235 band marked; `-color_range pc` flips the tag, bytes unchanged (md5 equal) | black 16, white 235 | ff26 |
| 8 | flags | Two controls as a mirror: flag 1 on limited bytes (black 16), flag 0 on full bytes (8 and 247 crushed); yuvj420p as the fix | 16; 8 to 0, 247 to 255; 0 and 255 | ff26 |
| 9 | hdr | Ten PQ patches 0 to 10000 nits against their SDR targets; 100 nit white bar at 127 beside 235 | 127.3 vs 235; 67.5 codes (50 nit) | ff44 |
| 10 | hdrfix | Three commands as three bars: iall relabel (same pixels, tags bt709), zscale (203 nits and up on 255), zscale + tonemap=hable (203 nits at 182) | 255; 182 | ff44 |
| 11 | chroma | Blue frame, 1 px red line: 444 stays red, 420 gives 150,21,149, Y stays 81 | 150,21,149; Y 81 | ff22 |
| 12 | bands | 256-step 10 bit ramp to 8 bit: default 65 values, `sws_dither=none` 64 bands of 16 px; seven spellings one checksum; rgb8 five outputs | 65, 64, 16, 6 other spellings, 5 | ff85 |
| 13 | verdict | Sort board: LABEL ONLY (3 commands, pixels identical), WRONG PLACE (HDR, mixer), LOST (chroma), FALSE ALARM (dither) | 3 of 3 label-only | cross-film (new, checked in `labelOnly`) |
| 14 | recipe | The recommended command, then the fresh card of 6 patches read by both readers, control row (plain command) below | bt709/tv; error 1; 23 as 601; black 16, white 235; plain 40 | new recipe check |
| 15 | cheat | One-screen cheat sheet: symptom, command, what to check (six rows) | 16 or 0 | all |
| 16 | builds | 6.1.1 measured here against 8.1.2 as recorded in the source films (no numbers shown for 8.1.2) | none | ff17, ff26, ff76, ff85 notes |
| 17 | notest | The "not tested" list | none | all |

End card after scene 17 (default 10 s).

## fs03: short cut, 1080x1920, 11 scenes, 425 words (about 2:52 at 148 wpm; endCard seconds 4, total about 2:57)

Safe zone: nothing in the top 200 px, the bottom 420 px or the right 140 px. One idea chain: "label or pixels?" with the same two reader cards, stacked vertically.

| # | id | on screen | measured value shown | source |
|---|----|-----------|----------------------|--------|
| 1 | ask | Green swatch 255 becoming 215 | 255, 215 | ff17 |
| 2 | rig | Two stacked reader cards | ffmpeg 6.1.1 | all |
| 3 | matrix | Plain command: no tag, BT.601 pixels; `-colorspace bt709` alone: tagged, same pixels, error 40 | 215, 40 | ff17 |
| 4 | range | Default black 16 and white 235; `-color_range pc` same bytes, tag pc, black shows 16 | 16, 235 | ff26 |
| 5 | hdr | 100 nit white at 127 not 235; iall relabel: same pixels, tags bt709 | 127, 235 | ff44 |
| 6 | verdict | Three commands, three tags changed, pixels identical (a diff of zero) | 3 | cross-film |
| 7 | chroma | Red line through 420 becomes 150,21,149; Y stays 81 | 150,21,149; 81 | ff22 |
| 8 | bands | 65 values not 64; only `sws_dither=none` truncates; six other spellings one checksum | 65, 64, 6 | ff85 |
| 9 | gray | BT.709 file: `format=gray` green 183, 601 mixer 149 | 183, 149, 34 | ff76 |
| 10 | recipe | The recommended command, ffprobe line, error 1, black 16, white 235, plain command 40 | 1, 16, 235, 40 | new recipe check |
| 11 | notest | Check the label and the pixels together; not tested list; pointer to the long cut | none | all |

## Notes for phase B

- Scene ids are shared between the cuts where the content is the same (matrix, range, hdr, verdict, chroma, bands, gray, recipe, notest); the claim table in `fixture/claims.mjs` is keyed by scene id, so a scene must keep its id and its narration numbers stay tied to the evidence.
- Captions carry digits; narration spells numbers. The test `every digit in the captions is a measured value too` guards the captions.
- `thumb`: fl03 `255 to 215` / `GREEN, ONE COMMAND LATER` (red); fs03 `same pixels` / `ONLY THE LABEL MOVED` (amber).
- `palette` is `lab` in both script.json files until the riso palette lands.
