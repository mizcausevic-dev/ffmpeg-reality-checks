# FF80 distribution kit: GIF to MP4: Delay 3 Is 33.33 fps, -r 30 Adds 11% to the Length, fps=30 Drops 2 Frames

All numbers below come from the synthetic fixture in `episodes/ff80/fixture/` (experiment.mjs, run.mjs) and its tests, measured on ffmpeg 6.1.1; also run on 8.1.2, where the tests pass (3 of 3 runs; exact numbers are asserted on 6.1.1 only, relations on 8.1.2).

## YouTube

### Title options (≤ 60 chars), ranked

1. `GIF to MP4: Delay 3 Is 33.33 fps, -r 30 Adds 11% Length` : the measured finding.
2. `What Does ffmpeg Do With GIF Frame Delays?` : the question people ask.
3. `ffmpeg GIF to MP4: 20 Frames Become 100 Frames` : the mixed delay default.
4. `ffmpeg fps=30 vs -r 30 on a GIF: Dropped Frames` : the rate flags compared.

### Description

A GIF stores one delay per frame, in hundredths of a second. What does ffmpeg do with those delays when it writes an mp4, and what do -r, the fps filter and -fps_mode change? We write GIFs byte by byte, convert them, and read every frame time.

Source (written byte by byte in Node, with its own LZW encoder): 48 x 48 pixels, 20 frames, every frame numbered by six blocks. Five constant delays (2, 3, 4, 6 and 10 hundredths), one mix that cycles 2, 3, 4, 6, 10 (sum 100, 1.00 s), and one with delays 0, 1, 2, 1.

Readers: Node reads the delay field of every graphic control block; ffprobe reads rates, packet timestamps and duration; ffmpeg decodes every frame to gray pixels and Node reads the frame number, so each source frame gets an on-screen time in milliseconds. Control: from the gif itself, frame i is on screen for exactly delay i.

Constant delay, default conversion (ffmpeg -i in.gif -pix_fmt yuv420p out.mp4): the mp4 rate is 100 / delay (50, 33.333, 25, 16.667, 10 fps), all 20 frames, duration 20 x delay, each frame on screen for its delay. Delay 3 is 33.333 fps, not 30.

Mixed delays: ffprobe reads the gif as r_frame_rate 100, average 20. The default mp4 is 100 fps with 100 frames (each source frame repeated for its delay), 1.00 s. With -fps_mode passthrough (and vfr, and the old -vsync passthrough) the mp4 has 20 packets with exact timestamps but lasts 0.91 s: the last 10 hundredths delay is stored as 1.

Forcing a rate on the 3 hundredth gif: -r 30 keeps all 20 frames and holds each 33.3 ms, so the clip is 0.667 s (11 percent longer); -vf fps=30 keeps 0.6 s and drops frames 5 and 15 (18 frames). On the mix, -r 30 gives 33.3 ms to the 2, 3 and 4 hundredth frames and 66.7 ms to the 6; fps=30 also drops frames 5 and 15. -r 25 on the 10 hundredth gif: 50 frames, each source frame held 80 or 120 ms in turn.

Delays 0, 1, 2, 1: a delay of 0 is read as 10 hundredths (100 ms), 1 stays 10 ms, 2 stays 20 ms.

The 14 tests pass on ffmpeg 6.1.1.

Chapters
<!-- chapters:start -->
00:00 The question
00:10 The story in four panels
00:29 Gifs written byte by byte
00:49 One delay for every frame
01:02 Different delays in one gif
01:22 Forcing a rate
01:42 What to check
<!-- chapters:end -->

Limits: 48 x 48 two-colour gifs of 20 frames written by Node, converted to h264 yuv420p mp4 by ffmpeg 6.1.1. The default frame rate mode and the passthrough duration are the build specific part; the tests assert relations on other builds. Not tested: browsers, other gif writers, real animations, other builds.

Fixture, tests and video source: github.com/mizcausevic-dev/ffmpeg-reality-checks

> This episode uses synthetic test gifs generated in Node. No real animation and no real product.

Miz Causevic, Kinetic Gain LLC

### Tags (15)

ffmpeg, ffmpeg tutorial, gif to mp4, ffmpeg gif, gif frame delay, ffmpeg fps, ffmpeg -r, fps_mode, ffmpeg vsync, variable frame rate gif, gif delay centiseconds, gif frame rate, ffmpeg convert gif, video frame timestamps, ffmpeg reality checks

### Pinned comment (≤ 300 chars)

Synthetic test: a 3 hundredth GIF is 33.33 fps in the mp4, not 30. -r 30 keeps all 20 frames and makes the clip 0.667 s instead of 0.6; fps=30 keeps 0.6 s and drops frames 5 and 15. Mixed delays: 100 fps, 100 frames. github.com/mizcausevic-dev/ffmpeg-reality-checks Check frame times?
