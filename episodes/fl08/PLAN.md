# fl08 / fs08 "colordetect": scene plan (phase A2, with the 8.1.2 results and the pure-label construction)

Running question: **A file says what its color range is. Can ffmpeg 8's `colordetect` look at the pixels and tell me whether it is right?** Answer in one line: the tag is a label that decides the RGB you see; `colordetect` reads the pixels (luma only) and can only prove "full range" (and "opaque" or "straight" alpha), never "limited"; on 6.1.1 the same proof is `signalstats` YMIN/YMAX; and writing a pc tag is a relabel on 6.1.1 but, on 8.1.2 with FFV1, the output option `-color_range pc` alone or `-vf setparams=range=pc` alone converts the pixels (a pure label needs both).

Palette: riso (Alfa Slab One, DM Sans, DM Mono). Colour roles: cyan token = baseline, amber = doubt ("undetermined"), red = surprise or failure, green = verified. No teal, no glow, no emoji, no em dash, flags lowercase.

Cross-links (context only, not re-measured here): ff17 (matrix tags), ff26 (`-color_range pc` relabels or converts), ff44 (HDR to SDR).

Fixture: `episodes/fl08/fixture/experiment.mjs` (exports `runExperiment(dir)`), `run.mjs` (prints, writes `episodes/fl08/evidence.json` on 6.x, `evidence-v8.json` on 8.x), `facts.mjs` and `gen-facts.mjs` (the generated E block of on-screen numbers in both Scenes.tsx files), tests in `episodes/fl08/test/fl08.test.mjs` and `episodes/fs08/test/fs08.test.mjs`. fs08 imports from fl08 like fs01 does from fl01. All clips are written byte by byte from Node (raw yuv420p or rgba on stdin), encoded as FFV1 in Matroska with bitexact flags; every file encodes to identical bytes twice. Run time on this container: about 10 s.

Tagging in the fixture: three families, because `probe-pc.mjs` (run on the PC, 8.1.2, output in `out/probe-pc-v8.utf8.txt`) showed that FFV1 rejects a pc label written one way only. `content_tag` (the label) is written with `-vf setparams=range=T -color_range T`: the frames and the encoder both say T, and the probe found this pure (bytes untouched, tag read back, 256 levels for the full ramp) on 6.1.1 and 8.1.2. `content_tag_opt` uses the output option `-color_range T` alone (relabel on 6.1.1; on 8.1.2 it converts tv to pc). `content_tag_vf` uses `-vf setparams=range=T` alone (pure on 6.1.1; on 8.1.2 FFV1 converts a pc frame to limited, 0..255 becomes 16..235, and ffprobe reads tv). tv is pure by all three on both builds. The committed `evidence-v8.json` is from the earlier fixture (there `content_pc` was setparams alone, which `facts.mjs` reads as the vf family); the PC rerun replaces it with the three families.

## Readers and controls
| role | reader | build |
|---|---|---|
| pixels 1 | raw bytes (`-f rawvideo`, same pixel format, min and max per plane in Node) | both |
| pixels 2 | `signalstats` YMIN/YMAX/UMIN/UMAX/VMIN/VMAX per frame; alpha through `format=rgba,alphaextract,format=yuvj420p,signalstats` | both |
| the claim | `ffprobe` stream `color_range` (what the FILE says) | both |
| the inference | `colordetect` log block (what 8.x GUESSES from pixels) | 8.x only, skipped otherwise |
| consequence | `-pix_fmt rgb24` of the same file, green channel of the first row | both |
| control (range) | a 0..255 ramp must read 0..255 on both pixel readers; a 16..235 ramp must read 16..235 | both |
| control (alpha) | opaque red must read alpha 255 everywhere; (255,0,0,128) must show a channel above its alpha | both |
| control (colordetect) | the 0..255 ramp must come out "full" | 8.x |

## Question and measured results
Clips: range 256x16, 3 frames, yuv420p; alpha 64x16, 3 frames, rgba. "6.1.1" is `evidence.json` (this container, regenerated with the A2 fixture); "8.1.2" is `evidence-v8.json` (the PC, second run, from the earlier fixture; the third PC run replaces it).

| # | claim | 6.1.1 | 8.1.2 |
|---|---|---|---|
| 1 | the pixel readers agree and see the control | raw = signalstats on all range clips (Y, Cb, Cr min and max, per frame); 0..255, 16..235, alpha 255 | same |
| 2 | the label (`setparams=range=T` plus `-color_range T`) is stored faithfully | ffprobe: tv, pc; untagged = **unknown** | untagged = **tv**; tv = tv; the pc label: pure by the probe (full ramp), to be confirmed by the fixture rerun for the 16..235 and 64..191 ramps |
| 3 | the label never changes a byte | raw Y/Cb min and max identical under none, tv, pc for 0..255, 16..235, 64..191 | the probe: identical for the 0..255 ramp; the fixture rerun confirms the other two. The film says "on 6.1.1" for the bytes claim |
| 4 | the tag can disagree with the pixels | tagged tv holding 0..255; tagged pc holding 16..235 | tagged tv holding 0..255 |
| 5 | the tag decides the RGB you see | 16..235: tv and untagged G 0..255 (220 levels), pc 16..235; 0..255: tv and untagged 220 of 256 (17 columns black, 21 white), pc 256; 64..191: tv 55..203, pc 64..191 | tv and untagged: the same numbers (220 of 256, 17 and 21, 55..203); the pc label: 256 levels for the full ramp by the probe; the film says "on 6.1.1" |
| 6 | untagged is read as tv by the RGB conversion | yes, every content | yes, every content |
| 7 | the output option `-color_range pc` alone | relabels: bytes stay 16..235 and 64..191, tag pc | converts: 16..235 becomes 0..255, 64..191 becomes 56..204, tag pc (same as ff26) |
| 7b | `-vf setparams=range=pc` alone (FFV1) | pure label: bytes stay, tag pc (all three ramps) | converts to limited: 0..255 becomes 16..235, 16..235 becomes 30..218, 64..191 becomes 71..180; ffprobe reads **tv** |
| 8 | `colordetect` exists | no: `No such filter: 'colordetect'`, exit 8, libavfilter 9.12.100 | yes; mode `color_range`, `alpha_mode` or `all`; one block at the end of the run |
| 9 | signalstats recipe: any sample outside 16..235 proves full, nothing proves limited | 0..255: full; 16..235 and 64..191: undetermined; ONE sample at 236 in the last of 3 frames: full; ONE at 15 in the first: full; only 16 and 235: undetermined; Cb 0..254 with luma 16..235: undetermined by luma, full by chroma | same readings (pixel readers) |
| 10 | colordetect range verdict | n/a | 0..255 (tagged tv or untagged): `JPEG / full range`; 16..235, 64..191, only 16 and 235: `undetermined`; 236 once or 15 once: full; Cb 0..254 with luma inside: undetermined; **never "limited"** on any clip or mode |
| 11 | colordetect does not echo the tag | n/a | 16..235 converted to 0..255 and tagged pc by the option: full (pixels); 64..191 converted to 56..204 and tagged pc: undetermined |
| 12 | colordetect leaves no trace | n/a | 0 metadata keys with `metadata=print`, no frame side data, the tag afterwards is still tv; the verdict exists only in the log |
| 13 | alpha from pixels (rgba) | opaque red: opaque; (255,0,0,128): straight; (128,0,0,128): undetermined; (64,0,0,128): undetermined; (128,0,0,127): straight; all zero: undetermined; ramp with rgb 255: straight; ramp with rgb = alpha/2: undetermined; ONE bad pixel in 1 of 3 frames: straight (1 pixel evidence) | colordetect says exactly what the pixel proof says for every alpha clip |
| 14 | the pixel format changes the verdict | n/a | the same straight picture is `straight` as rgba and `undetermined` as yuva420p; the white ramp stays straight in both |
| 15 | ffprobe cannot tell a straight file from a premultiplied-looking one | identical pix_fmt (bgra), identical stream metadata, no alpha field | same |
| 16 | determinism | every FFV1 file identical across two encodes; fixture identical across 3 runs | n/a |

Dropped from the film (measured, but not a build-agnostic claim): the overlay composite of a premultiplied-looking pixel over gray 128 differs from the straight one on 6.1.1 (red 192 against 128) and does not differ on 8.1.2. The cause is unexplained (and `unpremultiply` gave rounding noise), so the film says only, in the "not tested" scene, that overlay handled premultiplied alpha differently on the two builds and that it is unexplained.

## What still needs the PC (8.1.2), in one run
`node episodes/fl08/fixture/run.mjs` then `node --test episodes/fl08/test/fl08.test.mjs`, then `node episodes/fl08/fixture/gen-facts.mjs` (rewrites the E block of both Scenes.tsx; the drift tests fail until it is run). This produces a new `evidence-v8.json` with the three families (label `content_pc`, option `content_pc_opt`, vf `content_pc_vf`), and settles:
- the label (`setparams=range=pc` plus `-color_range pc`) leaves the bytes of the 16..235 and 64..191 ramps unchanged on 8.1.2 (asserted by the tests; the film says "on 6.1.1" for the "same bytes under every tag" claim until this is seen);
- the RGB conversion of a label-tagged pc ramp on 8.1.2 (asserted for the full ramp and the 16..235 ramp; the film says "on 6.1.1" for "tagged pc stays 16..235");
- colordetect on the label-tagged pc ramps (asserted: full, undetermined, undetermined, the same as the luma recipe);
- the 8.1.2 numbers of the vf family, which the film now speaks (0..255 becomes 16..235, ffprobe says tv).
If the PC shows a surprise, the tag and consequence scenes get a build label rather than a rewrite.

## fl08 (landscape 1920x1080, 18 scenes, 1038 words)
| id | on screen | measured value | build |
|---|---|---|---|
| hook | Figure "220 of 256", a 256-column strip: the file and shown as RGB with 17 black and 21 white columns | 220 of 256, 17 and 21 | 6.1.1 and 8.1.2 |
| ask | three cards: the tag (ffprobe), the pixels (signalstats), a guess (colordetect, 8.x) | structure | both |
| readers | raw bytes and signalstats on the 0..255 and 16..235 ramps (control) | 0..255, 16..235 | 6.1.1 |
| tag | Cmd `setparams=range=pc -color_range pc`; three bars 16..235, same bytes for no tag, tv, pc; untagged reads unknown on 6.1.1 and tv on 8.1.2 | 16..235 x 3; unknown; tv | 6.1.1 (bytes), both (untagged) |
| consequence | 16..235 shown as RGB: tv 0..255, pc 16..235; tiles 220 of 256, 256 of 256, untagged read as tv | 0..255; 16..235; 220; 256; 17 and 21 | 6.1.1, 220 also 8.1.2 |
| option | Cmd `-color_range pc`: relabel on 6.1.1, convert on 8.1.2, bars for 16..235 and 64..191; a line that `-vf setparams=range=pc` alone also converts on 8.1.2 (0..255 to 16..235, ffprobe says tv) | 16..235 and 64..191; 0..255 and 56..204; 16..235; tv | 6.1.1 and 8.1.2 |
| missing | terminal on 6.1.1 (`No such filter`, exit 8) next to the 8.1.2 log block; tiles 0 metadata keys, no side data, tag still tv | exit 8; 0 keys | 6.1.1 and 8.1.2 |
| recipe | Cmd signalstats; bars 0..255 proven full, 16..235 nothing proven | 0..255; 16..235; 236 in 1 of 3 | 6.1.1 |
| full | Cmd colordetect; bar 0..255; log block "JPEG / full range"; chips tagged tv and no tag | full | 8.1.2 |
| limited | bars 16..235, 64..191, only 16 and 235, all "undetermined"; "It never says limited" | undetermined x 3 | 8.1.2 |
| single | two film strips: Y max per frame 235, 235, 236 and Y min 15, 16, 16; chips "full" | 236, 15 | 8.1.2 |
| chroma | Y bar inside, Cb bar 0..254 outside; colordetect undetermined against recipe full | 0..254 | 8.1.2 and 6.1.1 |
| notecho | two panels: 16..235 converted to 0..255 (full), 64..191 converted to 56..204 (undetermined), both tagged pc | 0..255; 56..204 | 8.1.2 |
| alpha | five swatches: opaque, straight, premultiplied-looking, dark, all zero; one bad pixel in 1 of 3 frames | 255,0,0,255; 255,0,0,128; 128,0,0,128; 64,0,0,128; 0,0,0,0 | 8.1.2 |
| yuva | rgba straight against yuva420p undetermined; ffprobe identical metadata, 0 alpha fields | straight; undetermined; 0 | 8.1.2 and 6.1.1 |
| decide | four cards: tag = ffprobe; full on 6.1.1 = signalstats; full on 8.0 and later = colordetect; limited = none | structure | both |
| sheet | witnesses table: ffprobe, signalstats, colordetect | structure | both |
| close | measured and not tested lists, end card | structure | both |

## fs08 (vertical 1080x1920, 11 scenes, 429 words; body inside x 60..940, y 220..1360; the caption bar owns y 1380..1500)
| id | on screen | measured value | build |
|---|---|---|---|
| hook | huge "220 of 256", two strips, 17 and 21 columns | 220 of 256 | both |
| tag | Cmd `setparams=range=pc -color_range pc`; bars 16..235 for no tag and tv; "same bytes" note | 16..235 | 6.1.1 |
| consequence | 16..235 stretched to 0..255 (tv), as is (pc); no tag read as tv | 0..255, 16..235 | 6.1.1 |
| option | `-color_range pc`: 6.1.1 relabel (16..235, 64..191), 8.1.2 convert (0..255, 56..204) | as listed | both |
| missing | no filter on 6.1.1, then the signalstats recipe with the 236 sample in 1 of 3 frames | exit 8; 236 | 6.1.1 |
| full | colordetect on the 0..255 ramp: "JPEG / full range", tagged tv or untagged | full | 8.1.2 |
| limited | 16..235, 64..191, only 16 and 235: undetermined; never limited | undetermined | 8.1.2 |
| luma | Y inside, Cb 0..254 outside: undetermined against recipe full | 0..254 | 8.1.2 |
| notecho | converted ramps tagged pc: 0..255 full, 56..204 undetermined | as listed | 8.1.2 |
| alpha | four swatches and "one bad pixel in 1 of 3 frames: straight" | as listed | 8.1.2 |
| close | end card (engine); the rule is spoken over it | structure | both |

## Not tested
Real footage; any encoder other than FFV1 (lossy codecs move pixel values, so signalstats and colordetect on a lossy file see decoder output, not the source); 10-bit and HDR clips; `limited` detection in any form other than the filter's own log; players and browsers (what they do with a tag); other builds than 6.1.1 and 8.1.2 (7.x, 8.0, 8.2 and later); the `colordetect` options beyond `mode`; alpha on formats other than rgba and yuva420p; premultiplied files from real tools; why overlay handles premultiplied-looking alpha differently on 6.1.1 and 8.1.2; the label-tagged (pure) pc family on 8.1.2 for the 16..235 and 64..191 ramps until the PC rerun; other containers and codecs (the probe shows nut and mov store no range label for FFV1 and rawvideo, and rawvideo in Matroska is pure with setparams alone). Context films: ff17, ff26, ff44.
