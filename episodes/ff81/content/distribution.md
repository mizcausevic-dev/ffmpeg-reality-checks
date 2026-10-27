# FF81 distribution kit: ffmpeg Scene Score: a 16-Frame Cross-Fade Scores 1/16 of a Hard Cut

All numbers below come from the synthetic fixture in `episodes/ff81/fixture/` (experiment.mjs, run.mjs) and its tests, measured on ffmpeg 6.1.1; also run on 8.1.2, where the tests pass (3 of 3 runs; exact numbers are asserted on 6.1.1 only, relations on 8.1.2); one difference: after libx264 crf 23 the noise first frame scores 0.191 there, not 0.164.

## YouTube

### Title options (≤ 60 chars), ranked

1. `ffmpeg Scene Score: a 16-Frame Fade Scores 1/16 of a Cut` : the measured finding.
2. `What Does select gt(scene) Really Score?` : the question people ask.
3. `ffmpeg select scene: Why Slow Cross-Fades Slip Through` : the fade result.
4. `ffmpeg lavfi.scene_score Explained, Frame by Frame` : what the score is.

### Description

select='gt(scene,T)' is the usual way to find cuts with ffmpeg. What score does a hard cut get, a cross-fade, a slow drift, noisy flat frames? We write raw frames in Node, let ffmpeg print lavfi.scene_score for every frame, and compare with the pixel difference computed in Node.

Source (raw yuv420p, 160 x 90, 25 fps, 60 frames, written byte by byte, no encoder in the way): picture A for frames 0 to 29, then picture B (a hard cut); cross-fades of 2, 4, 8, 16 and 32 frames from frame 30; a drift of 2 levels a frame; flat gray with fresh noise from frame 30; a one frame flash; two cuts four frames apart. The cut and the noise clips also go through libx264 -crf 23.

Readers: ffmpeg (select='gte(scene,0)' with metadata=print for every score; select='gt(scene,T)' with metadata=print for the frames that pass, T = 0, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5) and Node (mean absolute luma difference of neighbouring frames, mafd; model score = min(mafd, |mafd - previous mafd|) / 100). The two agree to 6 decimals on all 720 frames of the 12 clips.

Results on ffmpeg 6.1.1: the hard cut scores 0.773139 (mean luma difference 77.31, over 100) and is the only frame selected at every threshold from 0.05 to 0.5. A cross-fade of L frames scores cut / L on its first frame and about 0 after: 0.387, 0.193, 0.0966, 0.0484, 0.0240 for L = 2, 4, 8, 16, 32; at T = 0.1 fades of 8 or more frames are never selected. A drift of 2 levels a frame scores 0.02 once. Noise: 0.198 on the first noisy frame, 0.067 on the second, under 0.01 after, although two noisy frames differ by 26.5 on average and flat against noisy by 19.8. A flash scores 0.773 going in and 0 coming back; two cuts four frames apart both score 0.773. After libx264 crf 23 the cut scores 0.7735 and the noise first frame 0.164. select='eq(n,0)+gt(scene,0.4)' keeps frames 0 and 30.

The 12 tests pass on ffmpeg 6.1.1.

Chapters
<!-- chapters:start -->
00:00 The question
00:20 Frames written byte by byte
00:40 A hard cut
00:60 Two cuts and a flash
00:80 Cross-fades
00:100 Drift, noise, a lossy encode
00:120 What to check
<!-- chapters:end -->

Limits: two synthetic pictures, 60 frames of 160 x 90, raw yuv420p input, ffmpeg 6.1.1. The scale of the score (the mean difference over 100) is the build specific part; the tests assert that the score is a constant multiple of the model on other builds. Not tested: real footage, other encoders, other builds.

Fixture, tests and video source: github.com/mizcausevic-dev/ffmpeg-reality-checks

> This episode uses synthetic test frames generated in Node. No real footage and no real product.

Miz Causevic, Kinetic Gain LLC

### Tags (15)

ffmpeg, ffmpeg tutorial, scene detection, ffmpeg select scene, scene_score, ffmpeg gt(scene), cross-fade detection, ffmpeg cut detection, lavfi.scene_score, video scene change, ffmpeg thumbnails, ffmpeg metadata print, frame difference, ffmpeg select filter, ffmpeg reality checks

### Pinned comment (≤ 300 chars)

Synthetic test: select scene score = min(luma difference, its change) / 100. A hard cut scores 0.773; a 16-frame cross-fade only 0.048 (1/16), so it is missed at T 0.1. A flash scores 0.773 in, 0 out. github.com/mizcausevic-dev/ffmpeg-reality-checks What threshold do you use?
