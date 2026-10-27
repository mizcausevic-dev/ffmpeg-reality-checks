# FL06 distribution kit: FFmpeg 8 PNG Size Changed: -pred Default none to paeth, Same Pixels

All numbers below come from the synthetic fixture in `episodes/fl06/fixture/` (experiment.mjs, run.mjs) and its tests, measured on ffmpeg 6.1.1 (Ubuntu build) and ffmpeg 8.1.2 (Windows full build from gyan.dev). The two evidence files are `episodes/fl06/evidence-6.1.1.json` and `episodes/fl06/evidence-8.1.2.json`.

## YouTube

### Title options (≤ 60 chars), ranked

1. `FFmpeg 8 PNG Default Changed: none to paeth, Same Pixels` : the measured finding.
2. `Why FFmpeg PNGs Changed Size After the 8.1 Upgrade` : the question people ask.
3. `FFmpeg PNG: 98.4% Smaller on Gradients, 78.4% Bigger on Flat` : the two sides of the change.
4. `Same FFmpeg PNG Command, Different Hash: 0 of 96 Match` : the cache and hash angle.

### Description

Run the same ffmpeg command to write a PNG on ffmpeg 6.1.1 (an Ubuntu build) and on ffmpeg 8.1.2 (the Windows full build from gyan.dev). A test image is 30324 bytes on one and 26482 on the other, and every pixel is identical. On flat colors the new file is bigger. This film finds out why, with two readers and a control.

Short cut of this film (vertical, under 3 minutes): Why FFmpeg 8 PNG files differ.

Everything is synthetic: two lavfi sources (testsrc2 and mandelbrot at 640x360) and 14 images made in Node from a seeded generator (320x180: a smooth gradient, a noisy color field, hard bands, flat color runs, black marks on white, four-color noise, white noise, one grey, and rgba, 16-bit rgb and grey versions). Every encode was run 3 times with identical bytes.

Readers: reader 1 is the file size and the pixels as ffmpeg decodes them (hashed with -c:v rawvideo -f md5). Reader 2 is our own PNG parser in Node: it checks the chunks, inflates the IDAT stream and reads the filter byte at the start of every row (0 none, 1 sub, 2 up, 3 avg, 4 paeth). Control: a PNG built in Node with chosen filter bytes (rows cycling 0 to 4 read back as 36 rows of each).

The default: the help text of -h encoder=png says -pred default none on 6.1.1 and default paeth on 8.1.2. In the files, the 360 rows of testsrc2 are all filter 0 on 6.1.1; on 8.1.2 row 0 is filter 1 and the other 359 are filter 4. The same split holds on all 16 images.

The picture: all 112 files (16 images x 7 variants) decode to the same pixels on both builds, by both readers.

The size: the same command, no -pred. Smooth gradient 135338 to 2229 bytes (98.4 percent smaller). Noisy color field 166220 to 101688 (38.8 percent), testsrc2 30324 to 26482 (12.7 percent), mandelbrot 161639 to 145654 (9.9 percent). Flat color runs 4346 to 6581 (51.4 percent bigger), four-color noise 24081 to 42956 (78.4 percent bigger). White noise is 173623 bytes on both, in every mode.

On 8.1.2, -pred mixed gives 26203 bytes on testsrc2 (the smallest of the six modes) and 4461 on flat runs against 6581 for the default; -pred none gives 4197 there. A 16-bit gradient is the exception: mixed 4751, up 3402. -compression_level is not a rescue: on 6.1.1 the gradient with no filter is 135338 bytes at level 9, and on 8.1.2 the noisy field is 101688 at level 6 and 109444 at level 9.

Cause two: 96 files written with an explicit -pred have the same filter histogram on both builds (96 of 96) and the same bytes in none of them (0 of 96); the 16 default files match in none either. Even -pred none on testsrc2 is 30324 bytes on 6.1.1 and 31461 on 8.1.2. We did not find which part of the build writes the difference.

Recipe: set -pred yourself (try mixed, measure, try none for flat art) and hash the decoded pixels, not the file: ffmpeg -i in.png -map 0:v -c:v rawvideo -pix_fmt rgb24 -f md5 -

Chapters
<!-- chapters:start -->
00:00 The question
00:22 Four questions
00:43 Two readers and a control
01:04 What a PNG filter is
01:26 The default, by the help text
01:43 The default, by the file
02:02 The picture
02:18 Smooth content
02:34 Photo-like content
02:53 Flat content
03:13 Nothing to predict
03:26 Mixed
03:49 Compression level
04:14 Other pixel formats
04:39 Cause two: the bytes
05:07 What to type
05:26 Cheat sheet
05:42 Not tested
<!-- chapters:end -->

Limits: synthetic images, two builds (6.1.1 Ubuntu build and 8.1.2 Windows full build), ffmpeg's own png encoder and decoder. Not tested: other builds, real photographs, indexed color, 1-bit, interlaced PNG, APNG, other PNG tools, which library writes the bytes.

Fixture, tests and video source: github.com/mizcausevic-dev/ffmpeg-reality-checks

> This film uses synthetic images generated in Node and ffmpeg. No real photos and no real product.

Miz Causevic, Kinetic Gain LLC

### Tags (15)

ffmpeg, ffmpeg tutorial, ffmpeg png, png filter, png predictor, paeth filter, ffmpeg 8, ffmpeg pred, png file size, png optimization, lossless image, zlib, command line, ffprobe, ffmpeg reality checks

### Pinned comment (≤ 300 chars)

Synthetic images, ffmpeg 6.1.1 and 8.1.2. Same command, same pixels, but -pred default went from none to paeth: gradient 135338 to 2229 bytes, flat runs 4346 to 6581. 96 explicit -pred files: 0 identical bytes across builds. Hash pixels, not files. github.com/mizcausevic-dev/ffmpeg-reality-checks
