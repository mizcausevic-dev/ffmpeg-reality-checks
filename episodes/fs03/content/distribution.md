# FS03 distribution kit: FFmpeg Colors Shift: Is It the Label or the Pixels?

All numbers below come from the synthetic fixtures in `episodes/fl03/fixture/` (experiment.mjs re-runs the fixtures of ff17, ff22, ff26, ff44, ff76 and ff85 live, plus the recipe check; run.mjs writes the evidence) and the tests in `episodes/fl03/test/`, measured on ffmpeg 6.1.1.

## YouTube

### Title options (≤ 60 chars), ranked

1. `FFmpeg Colors Shift: Label or Pixels?` : the question.
2. `FFmpeg Green 255 Becomes 215 #Shorts` : the surprise.
3. `FFmpeg -color_range pc Only Changes the Tag` : the flag.
4. `Check Your FFmpeg Colors in One Command` : the fix.

### Description

Pure green is 255; one plain FFmpeg command later a player shows 215. Is the file wrong, or only its label? Synthetic clips, two readers, ffmpeg 6.1.1.

The plain command writes no matrix tag and BT.601 pixels; read as BT.709, green falls from 255 to 215 (worst error 40). -colorspace bt709 alone writes the label over the same pixels. -color_range pc keeps the same bytes (black stays 16) and flips the tag. colorspace=all=bt709:iall=bt2020 keeps the pixels (100 nit white at Y 127, not 235) and rewrites the tags to bt709. A 1 pixel red line through yuv420p becomes 150, 21, 149. format=yuv420p already dithers a 10 bit ramp: 65 values, not 64.

The checked command: scale=out_color_matrix=bt709:out_range=tv,format=yuv420p with the three bt709 tags. ffprobe: bt709, tv. Decoded worst error 1, black 16, white 235; the plain command read as BT.709 is off by 40.

Full film (about 6 minutes): "Why FFmpeg Colors Shift: Wrong Label or Lost Pixels, Six Tests". Source films: FFmpeg's Default Output Is BT.601, With No Tag; FFmpeg yuv420p Turns a 1-Pixel Red Line Purple; FFmpeg -color_range pc: 6.1.1 Relabels Black as 16, 8.1.2 Converts; FFmpeg HDR to SDR: a Plain Conversion Puts 100 Nit White at 127, Not 235; FFmpeg Black and White: gray and hue Match, the Mixer Follows Its Weights, 8.1 Changes gray on HD; FFmpeg 10-bit to 8-bit Banding: format=yuv420p Already Dithers, Only sws_dither=none Changes It.

Limits: synthetic clips, ffmpeg 6.1.1. Not tested: real footage, real players, HLG, other encoders, other builds.

Fixture, tests and video source: github.com/mizcausevic-dev/ffmpeg-reality-checks

Miz Causevic, Kinetic Gain LLC

#Shorts

### Tags (15)

ffmpeg, ffmpeg shorts, ffmpeg colors wrong, ffmpeg color matrix, bt709, bt601, color_range pc, yuv420p, hdr to sdr, ffprobe, video engineering, command line, ffmpeg tutorial, color space, ffmpeg reality checks

### Pinned comment (≤ 300 chars)

ffmpeg 6.1.1, synthetic clips. Only a label changed: -colorspace bt709 alone (error 40), -color_range pc (black stays 16), colorspace iall (100 nit white stays at Y 127). Checked command: ffprobe bt709/tv, error 1. github.com/mizcausevic-dev/ffmpeg-reality-checks
