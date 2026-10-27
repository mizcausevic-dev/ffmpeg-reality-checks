# FF82 distribution kit: ffmpeg blackdetect: Why the Default Settings Miss a Fade to Black

All numbers below come from the synthetic fixture in `episodes/ff82/fixture/` (experiment.mjs, run.mjs) and its tests, measured on ffmpeg 6.1.1; also run on 8.1.2 with the same results (the same times, and the same 3.96 s end for a clip that ends in black; the tests pass in 3 of 3 runs).

## YouTube

### Title options (≤ 60 chars), ranked

1. `ffmpeg blackdetect Misses a Fade to Black by Default` : the measured finding.
2. `What Do blackdetect pix_th, pic_th and d Really Mean?` : the question people ask.
3. `ffmpeg blackdetect: When Does Black Start in a Fade?` : the start result.
4. `ffmpeg blackdetect Explained With a Known Ramp` : what the settings are.

### Description

blackdetect is the usual way to find black frames and fades to black with ffmpeg. Where does it say the black starts on a fade? What do pix_th, pic_th and d change? We write raw frames in Node with known luma levels, let ffmpeg print black_start, black_end and black_duration, and compare with a luma scan in Node.

Source (raw yuv420p, 160 x 90, 25 fps, written byte by byte, no encoder in the way): fadeOut, 125 frames: 1 s of gray (luma 180), a 2 s linear fade down to luma 16, 1 s of black, then gray again; fadeEnd, the same but ending in the black (100 frames); partial, 200 frames in which the top 90, 88, 86, 81, 72 and 54 of 90 rows are black; levels, runs of flat frames at luma 16, 24, 32, 36, 37, 38, 39, 40, 48, 64 and 100. The fade also goes through libx264 -crf 23.

Readers: ffmpeg (blackdetect=d=..:pix_th=..:pic_th=.. , the black_start, black_end and black_duration in the log) and Node (decodes the frames, counts the pixels at or below 16 + 219 * pix_th, calls a frame black when that share reaches pic_th, joins runs and keeps those at least d seconds long). The two agree on every stretch of every run. Control: the luma Node reads back is the luma it wrote.

Results on ffmpeg 6.1.1: with no options blackdetect prints nothing for the fade, because the black lasts 1.28 s and the default d is 2. With d 0.5 to 1.2 it prints start 2.72, end 4, duration 1.28; d 1.5 prints nothing. pix_th is not a share of 255: a pixel is black at or below luma 16 + 219 * pix_th (37 at the default 0.1). The start is the first frame at or below that level: 2.96 (pix_th 0), 2.84 (0.05), 2.72 (0.1), 2.44 (0.2), 2.2 (0.3), 1.64 (0.5), against a fade that began at 1.0 s. pic_th is the share of black pixels: 88 black rows of 90 (0.978) is not black at the default 0.98 and is at 0.97; a fully black picture counts at pic_th 1. Flat frames at luma 37 are black at the default and luma 38 are not. A clip that ends inside the black is closed at the last frame (3.96, one frame before the end). After libx264 crf 23 the fade starts at the same time.

The 12 tests pass on ffmpeg 6.1.1.

Chapters
<!-- chapters:start -->
00:00 The question
00:12 A fade written byte by byte
00:27 The default says nothing
00:43 What pix_th means
01:04 What pic_th means
01:18 The edges
01:32 What to check
<!-- chapters:end -->

Limits: synthetic gray frames and one fade, 160 x 90, raw yuv420p input, limited range, ffmpeg 6.1.1. The exact times are the build specific part; the tests assert relations on other builds. Not tested: real footage, other encoders, full range (yuvj420p) input, other builds.

Fixture, tests and video source: github.com/mizcausevic-dev/ffmpeg-reality-checks

> This episode uses synthetic test frames generated in Node. No real footage and no real product.

Miz Causevic, Kinetic Gain LLC

### Tags (15)

ffmpeg, ffmpeg tutorial, blackdetect, ffmpeg blackdetect, fade to black, detect black frames, pix_th, pic_th, black_start, black_duration, ffmpeg black detection, ffmpeg filter, video analysis, ffmpeg null muxer, ffmpeg reality checks

### Pinned comment (≤ 300 chars)

Synthetic test: blackdetect called a pixel black at luma <= 16 + 219 x pix_th (37 by default). On a 2 s fade to black the default settings print nothing: the black lasts 1.28 s and d is 2. github.com/mizcausevic-dev/ffmpeg-reality-checks Which d do you use?
