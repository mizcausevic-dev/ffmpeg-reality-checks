# fl05 / fs05 plan: "Why a file will not play" (Phase B scene map)

Running question: the encode ended with exit status 0, so why might the file still not play? One naive command (RGB PNG frames, `scale=-1:333`, `-c:v libx264`) is read with two readers; each chapter finds one thing in it; the closing scenes give the one command and the checks. Palette for the final look: `newsprint` (use `lab` until told). Reader colors: C.cyan = expected/baseline, C.amber = doubt, C.red = the surprise/failure, C.green = verified.

## fl05 (1920x1080, 16 scenes, 965 words)

| # | id | on screen | measured value | source |
|---|----|-----------|----------------|--------|
| 1 | ask | the naive command in a Cmd box; three red stamps appear: `4:4:4`, `593x333`, `moov last`; exit status 0 in a green chip | exit 0, High 4:4:4 Predictive, 593x333, ftyp free mdat moov | composite naive264 (+ff02, ff09, ff03) |
| 2 | rig | the 25 RGB frames as a FrameStrip; two reader cards (ffprobe, raw bytes) plus "control" chip | 25 frames, 1000x562, rgb24 | composite fixture |
| 3 | pixfmt | Duel: RGB in vs yuv420p in; ffprobe profile line for each | High 4:4:4 Predictive yuv444p vs High yuv420p | ff02 default_rgb_input, control_yuv420p_input |
| 4 | fix420 | 2x2 chroma block diagram; `-pix_fmt yuv420p` flag; two Figure tiles for PSNR | 37.04 dB vs 35.4 dB | ff02 |
| 5 | crash | Cmd with scale=-1:333; the sizes 1920x1080 to 1280x720 (ok, green) and 1000x562 to 593x333 (red); encoder message | 593x333, "width not divisible by 2 (593x333)", exit non-zero, nothing written | ff09 clean_16x9, odd_both |
| 6 | either | Row of three cases: 427x240 (width), 592x333 (height), 594x334 (fixed) | 427x240, 592x333, 594x334, 10 frames | ff09 odd_width, odd_height, fixed |
| 7 | hidden | Mirror: the same 593x333 frame with yuv444p (passes) and with yuv420p (refused) | 593x333 exit 0 vs refused | ff09 odd_444 + composite naive264 / strict264 |
| 8 | order | Cells strip of top-level boxes, plain vs faststart, moov highlighted with its byte offset | ftyp,free,mdat,moov; moov at 917,559 of 927,238; 250 frames | ff03 plain, faststart |
| 9 | client | two bars: bytes served to a client that cannot seek (whole file vs under a quarter); request count 3 vs 1 | 927,238 of 927,238; under a quarter; 3 vs 1 requests | ff03 http |
| 10 | hevc | box tree stsd/hev1/hvcC; ffprobe tag and raw FourCC side by side, both hev1 | hev1 on both readers | ff31 def, copy, mkv2mp4 |
| 11 | retag | FrameStrip of 50 frames, none marked; the two FourCC bytes changing hev1 to hvc1 | 0 of 50 frames change; 2 bytes (6.1.1) | ff31 remux |
| 12 | label | three small rows: parameter sets in band survive the retag; Matroska has no tag; naive HEVC = Rext, gbrp, hev1; libx265 refuses odd 4:2:0 | Rext gbrp hev1; refusal message | ff31 rep/repvc/mkv + composite naive265, strict265 |
| 13 | recipe264 | the recipe Cmd; Verdict rows from both readers (profile, pix_fmt, size, box order) vs the naive column | High, yuv420p, 594x334, ftyp moov free mdat, 25 frames | composite recipe264 vs naive264 |
| 14 | recipe265 | recipe plus `-tag:v hvc1`; naive vs recipe columns; "each flag fixes only its own problem" mini table | Main, yuv420p, 594x334, hvc1; fastonly264 leaves 4:4:4 | composite recipe265, fastonly264, nofast264 |
| 15 | sheet | cheat sheet: four ffprobe/box reads with the expected value | yuv420p / even / moov before mdat / hvc1 | all |
| 16 | close | "Not tested" list; end card follows | n/a | n/a |

## fs05 (1080x1920, 10 scenes, 423 words; content kept out of the top 200 px, bottom 420 px, right 140 px)

| # | id | on screen | measured value | source |
|---|----|-----------|----------------|--------|
| 1 | hook | naive command, exit 0 chip, three question marks | exit 0 | composite naive264 |
| 2 | pixfmt | big `4:4:4` Figure, ffprobe profile line, control line | High 4:4:4 Predictive | ff02 |
| 3 | fix420 | `-pix_fmt yuv420p` flag, two PSNR figures | 37.04 dB to 35.4 dB | ff02 |
| 4 | crash | 1000x562 to 593x333, encoder message, red stamp "nothing written" | 593x333 refused | ff09 |
| 5 | hidden | stack: 4:4:4 passes, 4:2:0 refused; then 594x334 fixed | 594x334 | ff09 + composite |
| 6 | order | box strip with moov last and its byte offset | 917,559 of 927,238 | ff03 |
| 7 | client | two bars, whole file vs under a quarter | 927,238 bytes vs under a quarter | ff03 |
| 8 | hevc | hev1 to hvc1 retag, FrameStrip with 0 of 50 marked | 0 of 50 | ff31 |
| 9 | recipe | recipe flags stacked, two readers ticking High / yuv420p / moov first | High, yuv420p, index first | composite recipe264 |
| 10 | close | not tested list | n/a | n/a |

Thumbnails: fl05 `927,238 B` (BYTES SENT, INDEX LAST, red), fs05 `4:4:4` (EXIT 0, STILL BROKEN, red).
