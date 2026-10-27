# FF87 distribution kit: FFmpeg vstack and hstack with Different Sizes: the Exact Error, Fixes, and What shortest=1 Does

All numbers below come from the synthetic fixture in `episodes/ff87/fixture/` (experiment.mjs, run.mjs) and its tests, measured on ffmpeg 6.1.1; also run on 8.1.2 with the same results (the error lines, the frame counts and the scale2ref names match; only the exit status reads -22 on Windows; the tests pass in 3 of 3 runs).

## YouTube

### Title options (≤ 60 chars), ranked

1. `FFmpeg vstack Different Sizes: The Exact Error` : the measured error text.
2. `FFmpeg hstack Heights Must Match: Fixes Compared` : the fixes, measured.
3. `FFmpeg vstack scale, pad or stretch? Measured` : the choice people face.
4. `FFmpeg vstack shortest=1: 75 Frames Become 50` : the length question.

### Description

You stack two videos with vstack or hstack and the sizes differ. What does ffmpeg say, what fixes it, and what does shortest=1 do to the length? We build the clips with lavfi, stack them, and read the result two ways.

Stimulus (lavfi nullsrc with geq, flat luma and one white 40 x 40 marker, Y 235): A 320 x 240, B 160 x 90, C 320 x 90 (same width as A), D 160 x 240 (same height as A). For the length test: two 160 x 120 clips at 25 fps whose flat luma tells the frame number, A 2 s (luma 16 + 2 N) and B 3 s (luma 235 - 2 N).

Readers: (1) ffmpeg and ffprobe: exit status and the stderr line, width, height and decoded frame count (count_frames), framemd5 of every frame, and cropdetect on a thresholded copy of the part that holds B. (2) Node reads the decoded raw frames: bytes = frames x width x height x 1.5, the md5 of every frame, the boxes of the bright connected pixels, the black pad pixels, the luma of two probe pixels in every frame. Both agree on every case. Control: clips that already match stack fine (A over C is 320 x 330, A beside D is 480 x 240).

The error: vstack of A (width 320) and B (width 160) fails with "Input 1 width 160 does not match input 0 width 320." and exit status 234 on Linux (-22 on Windows, read as 4294967274 by Node), and no file is written; the error lines are identical on 6.1.1 and 8.1.2. hstack of A and B fails on the height: "Input 1 height 90 does not match input 0 height 240." Only the width matters for vstack and only the height for hstack: A over C has heights 240 and 90 and works.

Fixes (marker in the output): scale=320:-2 on B gives 320 x 180, the stack is 320 x 420, the marker is 80 x 80 (still square). scale2ref gives the same frames, md5 for md5 (on 6.1.1 iw is the width of the reference, the second input, and main_w is the input being scaled: w=main_w keeps 160 and fails with the same width error). scale=320:240 stretches B: stack 320 x 480, marker 80 x 106, not square. pad=320:90:80:0 keeps B as it is: stack 320 x 330, marker 40 x 40 lined up with the A marker, 14400 black pixels. scale with force_original_aspect_ratio=decrease, then pad to 320 x 240: stack 320 x 480, marker 80 x 80, 19200 black pixels. hstack with scale=-2:240 on B: 746 x 240, marker 106 x 106.

Length (A 2 s, B 3 s): the default stack has 75 frames, 3 s, and A is held on its last frame (luma 114) for 25 frames. shortest=1 gives 50 frames, 2 s, the same first 50 frames as the default, for vstack and hstack and in either input order. The command line option -shortest changes nothing here: 75 frames, the same bytes as the default.

The 15 tests pass on ffmpeg 6.1.1.

Chapters
<!-- chapters:start -->
00:00 The question
00:15 Two readers, one control
00:34 The error
00:54 Scale
01:18 Pad
01:29 Length
01:47 What to do
<!-- chapters:end -->

Limits: synthetic flat clips, stacking of two inputs, ffmpeg 6.1.1 on Linux (the exit status is the platform value). The scale2ref variable names are the ones of this build. Not tested: builds other than 6.1.1 and 8.1.2, real footage, audio, other pixel formats, xstack, more than two inputs.

Fixture, tests and video source: github.com/mizcausevic-dev/ffmpeg-reality-checks

> This episode uses synthetic flat clips made by ffmpeg lavfi. No real footage and no real product.

Miz Causevic, Kinetic Gain LLC

### Tags (15)

ffmpeg, ffmpeg tutorial, ffmpeg vstack, ffmpeg hstack, ffmpeg stack videos, ffmpeg scale2ref, ffmpeg pad filter, ffmpeg side by side, ffmpeg shortest, ffmpeg filter_complex, ffmpeg different sizes, ffmpeg does not match, video engineering, ffmpeg reality checks, ffmpeg letterbox

### Pinned comment (≤ 300 chars)

Synthetic clips. vstack needs equal widths (Input 1 width 160 does not match input 0 width 320, status 234 on Linux), hstack equal heights. scale keeps the shape (marker 80 x 80), a stretch does not (80 x 106). shortest=1: 75 frames become 50. github.com/mizcausevic-dev/ffmpeg-reality-checks
