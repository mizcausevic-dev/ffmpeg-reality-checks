# fl07 / fs07 "AV1": scene plan (phase A2: both builds measured)

Running question: **I typed the same -crf for libsvtav1 and libaom-av1. What did each encoder actually do with -crf, -b:v, the preset and the keyframes?** Answer in one line: the number after -crf is not a shared scale (and -crf 0 means lossless in libaom but "not set, so 35" in libsvtav1); -b:v 0 changes nothing in either; a real -b:v is ignored by libsvtav1 and obeyed by libaom; the preset is a big size and quality lever in libsvtav1; and libsvtav1 puts a keyframe every 161 frames by default while libaom puts one only at frame 0, which decides how much you must decode to seek. Palette: `phosphor` (kicker "Deep dive 07", fs07 tag "Short 07"). Look: one big measured number per scene (`Figure`), `Cmd` for every command, `Verdict` for the controls.

Evidence: `episodes/fl07/evidence-6.1.1.json` (container run) and `episodes/fl07/evidence-8.1.2.json` (PC run), each written by `node episodes/fl07/fixture/run.mjs`. fs07 adds no measurement of its own: it imports the fl07 fixture (like fs01 imports fl01). Builds: ffmpeg 6.1.1 (Ubuntu 3ubuntu5) with libsvtav1 1.7.0 and libaom v3.8.2 (both read from the encoders' own stderr/verbose output), 2 cores, fixture time 80 to 85 s; ffmpeg 8.1.2 (gyan.dev full build, Windows) with SVT-AV1 4.1.0-259-gec17f8382; its libaom version is not printed, so `ev.libs.aom` is null and the scenes never name it. Exact bytes hold only on the build measured; the tests assert relations on any build and exact bytes only on 6.1.1 or 8.1.2. A failed encode is recorded as an outcome (`outcome: error`, message, no file) and does not stop the run. Re-run the assertions against a saved file with `FL07_EVIDENCE=<path> node --test episodes/fl07/test/fl07.test.mjs`.

Sources (all synthetic lavfi, stored as FFV1): `clean` testsrc2 320x180, 25 fps, 50 frames; `noisy` the same with deterministic hash noise on luma (as ff30); `long` testsrc2 160x90, 25 fps, 400 frames (16 s). Settings used unless stated: libsvtav1 `-preset 8`, libaom-av1 `-cpu-used 8`, long clip `-preset 12` / `-cpu-used 8`, `-crf 30`.

## Readers and control
| claim family | reader 1 | reader 2 | control |
|---|---|---|---|
| bytes | ffprobe packet sizes | ffmpeg `-c copy -f ivf`, then our OBU walker in Node (temporal delimiters not counted); equal byte total and packet count for every encode | container adds bytes on top of the payload |
| quality | ffmpeg `psnr` and `ssim` filters against the lossless source | our own PSNR from decoded raw frames in Node (agree within 0.02 dB on all 25 encodes that finished), plus decoded-frame md5 | libaom `-crf 0` is lossless: decoded md5 equals the source, PSNR infinite, SSIM 1.0, identical packets to `-aom-params lossless=1` |
| identity | packet md5 (`-c copy -f md5`) | decoded frame md5 | `-crf 30` vs `-crf 30 -b:v 0` |
| keyframes | ffprobe packet flag K | our OBU walker: frame_type of the first frame header in each temporal unit (and the sequence-header positions) | `-g 25` gives exactly 16 keyframes at 0, 25, ... 375 in both encoders |
| seeking | ffprobe `-read_intervals 12%+#1` landing packet | last keyframe at or before frame 300 from the OBU walk | `ffmpeg -ss 12` returns exactly frame 300 (md5 of the decoded frame) in every file |

## Measured results (6.1.1 | 8.1.2)
| claim | ffmpeg 6.1.1 (SVT-AV1 1.7, libaom 3.8.2) | ffmpeg 8.1.2 (SVT-AV1 4.1) | holds on both? |
|---|---|---|---|
| `-crf 0` libaom | 236102 B vs 41459 B at crf 30 (5.7 times); decoded md5 = source; PSNR inf; SSIM 1.0000 | 233918 B vs 41340 B (5.7 times); SSIM 1.0000, PSNR inf, frames equal source | yes |
| `-crf 0` libsvtav1 | 49746 B, SSIM 0.9946, PSNR 43.94 dB; same packets as no -crf; log "CRF / 35" | 60254 B, SSIM 0.9885, PSNR 40.90 dB; same packets as no -crf; log "CRF / 35" | yes (headline) |
| `-crf 30` clean, libsvtav1 | 61302 B, SSIM 0.9967 | 82283 B, SSIM 0.9919 | size differs by build (+48 percent vs libaom on 6.1.1, +99 percent on 8.1.2) |
| `-crf 30` clean, libaom | 41459 B, SSIM 0.9971 | 41340 B, SSIM 0.9971 | yes |
| same crf, noisy | libsvtav1 621923 B (SSIM 0.9506), libaom 515938 B (0.9268) | libsvtav1 708469 B (0.9501), libaom 511644 B (0.9269) | libsvtav1 bigger in both |
| `-crf 63` / `-crf 64` | libsvtav1 63: 6154 B (SSIM 0.9428); 64 fails in both, exit 222, "out of range [0 - 63]" svt, "[-1 - 63]" aom | 63: 5700 B (SSIM 0.9293); 64 fails in both with the same messages (exit code 4294967262 on Windows, no file) | yes |
| `-b:v 0` next to `-crf 30` | identical packets and frames in both encoders | identical packets and frames in both encoders | yes |
| `-b:v 500k` next to `-crf 30`, libsvtav1 | ignored: the crf 30 file, byte for byte (61302 B) | **error**: "Svt[error]: Target Bitrate only supported when --rc is 1/2 (VBR/CBR). Current --rc: 0", exit 4294967274 on Windows, no file | **no: a build difference** (new scene bvSvt) |
| `-b:v 500k` next to `-crf 30`, libaom | obeyed: noisy 515938 B to 201811 B (minus 61 percent), SSIM 0.9268 to 0.7286; clean it goes up, 41459 B to 45503 B | obeyed: noisy 511644 B to 223154 B (minus 56 percent), SSIM 0.9269 to 0.7503; clean 41340 B to 44486 B | yes |
| preset (libsvtav1, crf 30), clean | p4 45764 / p8 61302 / p12 95105 B; p12 +55 percent vs p8, SSIM 0.9967 to 0.9904 | p4 55893 / p8 82283 / p12 129910 B; p12 +58 percent, SSIM 0.9919 to 0.9833 | yes (relation: bigger and worse) |
| preset, noisy | p8 621923 B to p12 729503 B, SSIM 0.9506 vs 0.9507 | p8 708469 B to p12 746977 B, SSIM 0.9501 vs 0.9410 | bigger and no better |
| default keyframes (400 frames, 25 fps) | libsvtav1 0, 161, 322; libaom 0 only | the same | yes |
| `-g 25` | 16 keyframes in both | 16 keyframes in both | yes |
| seek to frame 300 (12 s), frames to decode | libsvtav1 140 (lands on 161), libaom 301, `-g 25` 1 | the same | yes |
| price of `-g 25` | libaom 145674 B to 172376 B (+18 percent); libsvtav1 424215 B to 428652 B (+1 percent) | libaom 142453 B to 169099 B (+19 percent); libsvtav1 539175 B to 563657 B (+5 percent) | libaom pays about a fifth; libsvtav1 little |
| repeatability | every CRF encode that ran twice gave identical packets (at least 12 encodes ran twice) | same | yes |

Removed from the A1 plan: the "numbers to check on 8.1.2" table (all measured now), the no-crf `-b:v` row (libsvtav1 103507 B, not repeatable) is kept out of the scenes.

## fl07 (landscape 1920x1080, 17 scenes, 1025 words, estimated 340.8 s)
Builds are named on screen in every scene that shows a number (`6.1.1` and `8.1.2` rows or tiles; SVT-AV1 1.7 and 4.1 in bvSvt, price, close).
| id | on screen | measured value |
|---|---|---|
| hook | Figure "CRF 35" for typed `-crf 0`, two tiles: libaom lossless, libsvtav1 lossy | SSIM 1 vs 0.9885 (8.1.2) |
| ask | five cards: same number, zero, bitrate, preset, keyframes | none (structure); both builds named |
| readers | two reader pairs and the lossless control | bytes agree, PSNR agrees |
| scale | Cmd `-crf 30` in both encoders, four bars | 61302 / 41459 B (6.1.1), 82283 / 41340 B (8.1.2) |
| aomZero | Cmd libaom `-crf 0`, four bars, Verdict lossless | 236102 / 233918 B vs 41459 / 41340 B |
| svtZero | three log boxes (`-crf 0`, no -crf, `-crf 30`), two build tiles | CRF / 35; 49746 B and 60254 B |
| range | scale 0 to 63 with 64 out, both error messages | 6154 B (6.1.1) at 63; "[0 - 63]", "[-1 - 63]" |
| b0 | md5 pairs, both encoders, per build | d285a135 and 27fbf812 (6.1.1); 266d45db and f6f06265 (8.1.2) |
| bvSvt (build difference) | Cmd `-b:v 500k`; 6.1.1 IGNORED vs 8.1.2 ERROR; the `Svt[error]` line | 61302 B unchanged; error text, no file |
| bvAom | four bars, libaom obeys, both builds | 515938 to 201811 B; 511644 to 223154 B |
| preset | six bars p4 / p8 / p12 per build | +55 and +58 percent; SSIM 0.9967 to 0.9904, 0.9919 to 0.9833 |
| presetNoisy | four bars p8 / p12 per build | 621923 to 729503 B; 708469 to 746977 B |
| keyframes | 400-frame tracks: libsvtav1 default, libaom default, both `-g 25` | 0, 161, 322; 0; 16 |
| seek | frame 300: spans of frames to decode | 140, 301, 1 |
| price | bars of `-g 25` cost per encoder and build | +18, +19 percent (libaom); +1, +5 percent (libsvtav1) |
| sheet | four cards: lossless, bitrate, preset, keyframes | summary |
| close | what was measured (two builds) and what was not | 6.1.1, SVT-AV1 1.7, libaom 3.8.2; 8.1.2, SVT-AV1 4.1 |

## fs07 (vertical 1080x1920, 10 scenes, 424 words, estimated 135.1 s by the character estimator)
The estimator counts characters and undercounts spelled letters (102 single-letter tokens against about 20 in fs01), so the real narration should come out longer; check the 150 to 179.9 s gate after narration.
| id | on screen | measured value |
|---|---|---|
| hook | Big "CRF 35", libaom lossless vs libsvtav1 lossy; both builds named | SSIM 1 vs 0.9885 |
| aomZero | Cmd, four bars, control note | 41459, 236102, 41340, 233918 B |
| svtZero | Cmd, log note "CRF / 35", two build tiles | 49746 B and 60254 B |
| scale | four bars `-crf 30` | 61302, 41459, 82283, 41340 B |
| b0 | md5 pair per build, note | d285a135, 266d45db |
| bvSvt | Cmd, libaom bars, 6.1.1 ignored vs 8.1.2 error | 511644 to 223154 B |
| preset | three bars on 6.1.1, notes for both builds | +55 and +58 percent |
| keyframes | four 400-frame tracks | 0, 161, 322; 0; 16 |
| seek | three bars, price notes for both builds | 140, 301, 1; +18, +1; +19, +5 percent |
| close | four rules, not-tested note naming both builds | |

## Not tested
ffmpeg builds other than 6.1.1 and 8.1.2; SVT-AV1 versions other than 1.7.0 and 4.1 and libaom other than v3.8.2 (the 8.1.2 libaom version is not printed); librav1e; hardware encoders (av1_nvenc, av1_qsv, av1_vaapi); real footage (only synthetic testsrc2, with and without hash noise); resolutions above 320x180 and clips longer than 16 s; 10-bit and 4:4:4; two-pass and `-aom-params`/`-svtav1-params` tuning beyond lossless=1; libaom `-cpu-used` below 6 (cpu-used 4 vs 8 was a 2 percent size difference on 100 clean frames in a probe, not part of the fixture); SVT-AV1 presets below 4; film grain; AV1 decoders other than the default one (libdav1d); real players and browsers; thread counts other than the 2-core container (6.1.1) and the PC (8.1.2).
