# FF86 distribution kit: FFmpeg overlay on yuv420p: Odd x and y Round Down to Even, and the 4:4:4 Fix Smears the Chroma

All numbers below come from the synthetic fixture in `episodes/ff86/fixture/` (experiment.mjs, run.mjs) and its tests, measured on ffmpeg 6.1.1 (other builds are listed under not tested).

## YouTube

### Title options (≤ 60 chars), ranked

1. `FFmpeg overlay on yuv420p: Odd x and y Round Down` : the measured finding.
2. `FFmpeg overlay format=yuv444 Smears the Chroma` : the common fix, measured.
3. `Where Does FFmpeg overlay Put a Card at x=1?` : the question people ask.
4. `FFmpeg overlay: 16 Offsets Give Only 4 Frames` : the surprise.

### Description

You overlay a logo at an odd x or y on yuv420p video. Does it land where you asked, and where does its color go when the chroma planes are half the size? We build a gray base and a colored card in Node, overlay it at 16 offsets, and read the planes two ways.

Stimulus (raw yuv420p written by Node): a flat gray base of 64 x 32 (Y 128, U 128, V 128) and a card of 8 x 8 with its own color (Y 50, U 200, V 60). The card is overlaid at x and y from 0 to 3, which makes 16 offsets, in four setups: plain overlay (yuv420p out), overlay=format=yuv444 (yuv420p out), overlay=format=yuv422 (yuv420p out), and overlay=format=yuv444 with yuv444p out as the known positive.

Readers: (1) Node reads the raw Y, U and V planes of every output: the box of the card in each plane, the centre of its color, the card pixels whose chroma is off by more than 2 levels, the background pixels that picked up chroma. (2) ffmpeg gives a framemd5 of every output and splits the planes with extractplanes into row and column profiles (scale with flags=area, gray output), which give the boxes again. Both agree on the checksums, the equality classes and the luma boxes. Control: even offsets are honored exactly.

Plain overlay on yuv420p rounds an odd x or y down to even, in Y, U and V together: x=1 gives 0 and x=3 gives 2, the same for y. The 16 offsets give 4 different frames. Luma and chroma move together, so 0 card pixels carry the wrong color and 0 background pixels pick any up. The card is up to 1 pixel from the request.

overlay=format=yuv444 places the luma exactly at all 16 offsets, 16 different frames. But the output is converted back to yuv420p and the chroma is smeared: 28 to 60 of the 64 card pixels have the wrong chroma and 32 to 84 background pixels pick some up. At offset 1,1 the U plane reaches 208 where the card has 200, and 124 beside it where the base has 128. The chroma centre stays within 0.25 luma pixels of the luma centre.

overlay=format=yuv422 rounds x down but honors y: 8 different frames, 16 to 48 card pixels with the wrong chroma.

Known positive: format=yuv444 with yuv444p out is exact at every offset in Y, U and V, in both readers, 16 different frames.

Negative offsets: plain overlay shows 6 of 8 luma columns at x=-1 and x=-2, and 4 at x=-3 (3, 3 and 2 of 4 chroma columns).

The 11 tests pass on ffmpeg 6.1.1.

Chapters
<!-- chapters:start -->
00:00 The question
00:19 Two readers, two controls
00:37 Plain overlay
00:55 The usual fix
01:16 Half way
01:27 Exact, and the edge
01:44 What to do
<!-- chapters:end -->

Limits: a synthetic gray base and a flat colored card, no scaling, no alpha, ffmpeg 6.1.1. The rounding is the behavior of this build. Not tested: other builds, real footage, other pixel formats, scaled or alpha overlays, hardware overlays.

Fixture, tests and video source: github.com/mizcausevic-dev/ffmpeg-reality-checks

> This episode uses a synthetic gray base and a colored card written by Node and overlaid by ffmpeg. No real footage and no real product.

Miz Causevic, Kinetic Gain LLC

### Tags (15)

ffmpeg, ffmpeg tutorial, ffmpeg overlay, ffmpeg overlay filter, ffmpeg overlay position, ffmpeg yuv420p, ffmpeg chroma subsampling, ffmpeg logo overlay, ffmpeg watermark, ffmpeg format yuv444, ffmpeg odd offset, video engineering, ffmpeg reality checks, ffmpeg overlay x y, chroma 4:2:0

### Pinned comment (≤ 300 chars)

Synthetic base 64 x 32, card 8 x 8. Plain overlay on yuv420p rounds odd x and y down to even in Y, U and V together: 16 offsets, 4 frames, 0 wrong pixels. format=yuv444 then yuv420p: luma exact, 28 to 60 of 64 card pixels get wrong chroma. github.com/mizcausevic-dev/ffmpeg-reality-checks
