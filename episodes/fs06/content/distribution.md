# FS06 distribution kit: FFmpeg 8 Made Some PNGs 78% Bigger: the -pred Default Changed

All numbers below come from the synthetic fixture in `episodes/fl06/fixture/` (experiment.mjs, run.mjs) and its tests, measured on ffmpeg 6.1.1 (Ubuntu build) and ffmpeg 8.1.2 (Windows full build from gyan.dev). The two evidence files are `episodes/fl06/evidence-6.1.1.json` and `episodes/fl06/evidence-8.1.2.json`.

## YouTube

### Title options (≤ 60 chars), ranked

1. `FFmpeg 8 Made Some PNGs 78% Bigger: -pred Default Changed` : the measured finding.
2. `Why Is My FFmpeg PNG a Different Size After Upgrading?` : the question people ask.
3. `FFmpeg PNG Gradient 135338 to 2229 Bytes, Same Command` : the number.
4. `FFmpeg -pred: none to paeth, 0 of 96 Files Match` : the hash angle.

### Description

Same ffmpeg command, same picture, two builds: a test image is 30324 bytes on ffmpeg 6.1.1 (an Ubuntu build) and 26482 on ffmpeg 8.1.2 (the Windows full build). The -pred default of the png encoder went from none to paeth. In under three minutes. #Shorts

Readers: the file size with ffmpeg's own decode of the pixels, and our own PNG parser in Node that reads the filter byte of every row. Control: a PNG built with known filter bytes. All 112 files decode to the same pixels on both builds. The 360 rows of testsrc2 are all filter 0 on 6.1.1; on 8.1.2 row 0 is filter 1 and 359 rows are filter 4, and all 16 images split the same way.

Sizes with no -pred: smooth gradient 135338 to 2229 bytes (98.4 percent smaller), noisy color field 166220 to 101688 (38.8 percent smaller), flat color runs 4346 to 6581 (51.4 percent bigger), four-color noise 24081 to 42956 (78.4 percent bigger).

The hash moves too: 96 files written with an explicit -pred have the same filters on both builds (96 of 96) and the same bytes in none (0 of 96). -pred none on testsrc2 is 30324 bytes on one build and 31461 on the other.

Pin -pred, try mixed, measure your own images, and hash the decoded pixels (ffmpeg -i in.png -map 0:v -c:v rawvideo -pix_fmt rgb24 -f md5 -) for a cache key.

The full film (about six minutes): Why FFmpeg 8 PNG files differ.

#Shorts

Chapters
<!-- chapters:start -->
00:00 The question
00:17 The picture
00:31 The default
00:49 The rows
01:03 Smooth content
01:15 Photo-like content
01:25 Flat content
01:43 The hash moves
02:02 What to type
02:16 Not tested
<!-- chapters:end -->

Limits: synthetic images, two builds (6.1.1 Ubuntu build and 8.1.2 Windows full build). Not tested: other builds, real photographs, indexed color, other PNG tools, which library writes the bytes.

Fixture, tests and video source: github.com/mizcausevic-dev/ffmpeg-reality-checks

> This Short uses synthetic images generated in Node and ffmpeg. No real photos and no real product.

Miz Causevic, Kinetic Gain LLC

### Tags (15)

ffmpeg, ffmpeg tutorial, ffmpeg shorts, ffmpeg png, png filter, png predictor, paeth filter, ffmpeg 8, png file size, lossless image, zlib, command line, shorts, ffprobe, ffmpeg reality checks

### Pinned comment (≤ 300 chars)

Synthetic images, ffmpeg 6.1.1 and 8.1.2: same command, same pixels, but the png -pred default went from none to paeth. Gradient 135338 to 2229 bytes, flat runs 4346 to 6581. Pin -pred, hash pixels. Full film and fixtures: github.com/mizcausevic-dev/ffmpeg-reality-checks
