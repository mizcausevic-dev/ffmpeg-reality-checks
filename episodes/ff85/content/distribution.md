# FF85 distribution kit: FFmpeg 10-bit to 8-bit Banding: format=yuv420p Already Dithers, Only sws_dither=none Changes It

All numbers below come from the synthetic fixture in `episodes/ff85/fixture/` (experiment.mjs, run.mjs) and its tests, measured on ffmpeg 6.1.1; also run on 8.1.2, where the tests pass (3 of 3 runs): plain format=yuv420p gives the same bytes, and sws_dither=none rounds instead of truncating (65 values, mean error +0.125).

## YouTube

### Title options (≤ 60 chars), ranked

1. `FFmpeg 10-bit to 8-bit: format=yuv420p Already Dithers` : the measured finding.
2. `FFmpeg sws_dither Does Nothing for yuv420p, Measured` : the surprise.
3. `FFmpeg 10-bit to 8-bit Banding: Does Dither Help?` : the question people ask.
4. `FFmpeg error_diffusion Flag: Same Bytes as Default` : the flag people try.

### Description

You convert a 10 bit gradient to 8 bit with format=yuv420p and worry about banding. Does the converter dither, and do sws_dither and the error_diffusion flag change anything? We build the ramp in Node, convert it, and read the bytes two ways.

Stimulus (raw yuv420p10le written by Node, 1024 x 16): luma 384 + (x >> 2), so 256 ten bit levels of 4 pixels each (an 8 bit level is 4 ten bit levels, 16 pixels wide), chroma flat at 512. A full ramp (luma = x, 1024 levels) and four flat tiles (10 bit 400 to 403, which is 100.0, 100.25, 100.5 and 100.75 in 8 bit) are used as well.

Readers: (1) Node reads the raw Y plane of each output: distinct values, run lengths, error against value/4, error of every 2 x 2 block mean; (2) ffmpeg gives framemd5 of each output and, in a second run, averages every 2 x 2 block with extractplanes=y and scale with flags=area (gray16le). Both give the same md5 classes and the same block means. Control: yuv420p10le to yuv420p10le keeps 256 levels, 0 pixels differ.

Plain format=yuv420p does not truncate: 65 distinct values (not 64), a mean run of 5.31 pixels in row 0 (maximum 14), mean error 0.000, and the mean of every 2 x 2 block equals the ideal value/4 exactly. The dither cell is 2 x 2: on tiles worth 100.25, 100.5 and 100.75 one, two and three pixels of every four step up to 101.

sws_dither=none on 6.1.1 truncates: 64 distinct values, flat bands of exactly 16 pixels, every pixel equal to floor(value / 4), mean error -0.375, 2 x 2 block error 0.75. On 8.1.2 it rounds: 65 distinct values, mean run 15.75 pixels, every pixel is value / 4 rounded to nearest (halves up), mean error +0.125, largest error 0.5, 2 x 2 block error 0.5. The default is byte-identical on both builds (md5 6b3cbff3).

The other options give the same bytes as the default: sws_dither=auto, bayer, ed, a_dither, x_dither and flags=+error_diffusion all produce the same md5 (6b3cbff3). Only none differs.

Known positive: with rgb8 output the same eight spellings give five different outputs (default = auto = bayer; none; ed = flags=+error_diffusion; a_dither; x_dither), seen by both readers, so the identical yuv420p bytes are not a blind reader.

A full ramp of 1024 levels ends with 256 distinct values in the default, with none and with ed. Dither mixes two neighbours, it adds no level.

The 13 tests pass on ffmpeg 6.1.1.

Chapters
<!-- chapters:start -->
00:00 The question
00:19 Two readers, two controls
00:36 Plain format
00:56 Dither off
01:13 The other options
01:26 Known positive
01:38 What to check
<!-- chapters:end -->

Limits: a synthetic gray ramp, same size conversion (no scaling), ffmpeg 6.1.1. Which dither is applied is behavior of this build. Not tested: builds other than 6.1.1 and 8.1.2, real footage, scaled output, lossy encoding after the conversion, other pixel formats than yuv420p and rgb8.

Fixture, tests and video source: github.com/mizcausevic-dev/ffmpeg-reality-checks

> This episode uses a synthetic gray ramp written by Node and converted by ffmpeg. No real footage and no real product.

Miz Causevic, Kinetic Gain LLC

### Tags (15)

ffmpeg, ffmpeg tutorial, ffmpeg 10 bit to 8 bit, ffmpeg banding, ffmpeg dither, sws_dither, ffmpeg error diffusion, ffmpeg yuv420p10le, ffmpeg gradient banding, ffmpeg scale filter, swscale, video engineering, ffmpeg reality checks, 10 bit video, ffmpeg format yuv420p

### Pinned comment (≤ 300 chars)

Synthetic 10 bit ramp to 8 bit. format=yuv420p already dithers (2 x 2 cell): 65 values, 2 x 2 means exact. sws_dither=none: flat 16 px bands (6.1.1 truncates, 8.1.2 rounds). bayer, ed, a_dither, +error_diffusion: same bytes as default. rgb8: 5 outputs from 8. github.com/mizcausevic-dev/ffmpeg-reality-checks
