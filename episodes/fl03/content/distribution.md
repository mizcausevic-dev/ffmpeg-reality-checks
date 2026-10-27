# FL03 distribution kit: Why FFmpeg Colors Shift: Wrong Label or Lost Pixels, Six Tests

All numbers below come from the synthetic fixtures in `episodes/fl03/fixture/` (experiment.mjs re-runs the fixtures of ff17, ff22, ff26, ff44, ff76 and ff85 live, plus the recipe check; run.mjs writes the evidence) and the tests in `episodes/fl03/test/`, measured on ffmpeg 6.1.1.

## YouTube

### Title options (≤ 60 chars), ranked

1. `Why FFmpeg Colors Shift: Wrong Label or Lost Pixels` : the measured finding.
2. `FFmpeg Colors Look Wrong? Check Label and Pixels` : the question people ask.
3. `FFmpeg Green 255 Becomes 215: The Matrix Tag` : the surprise.
4. `FFmpeg -colorspace bt709 Changes Only the Tag` : the flag people trust.

### Description

A pure green pixel (255) comes out of one plain FFmpeg command as 215 in some players. A 1 pixel red line turns purple. A 100 nit HDR white lands at luma 127, not 235. Six causes, one question: is it the label, or the pixels? This film re-runs six earlier experiments live on synthetic clips and ends with a command that two readers check.

Sources: FFmpeg's Default Output Is BT.601, With No Tag. FFmpeg yuv420p Turns a 1-Pixel Red Line Purple. FFmpeg -color_range pc: 6.1.1 Relabels Black as 16, 8.1.2 Converts. FFmpeg HDR to SDR: a Plain Conversion Puts 100 Nit White at 127, Not 235. FFmpeg Black and White: gray and hue Match, the Mixer Follows Its Weights, 8.1 Changes gray on HD. FFmpeg 10-bit to 8-bit Banding: format=yuv420p Already Dithers, Only sws_dither=none Changes It. The short cut of this film: "FFmpeg Colors Shift: Is It the Label or the Pixels?".

Readers: ffprobe reads the label; the decoded RGB, the raw plane or signalstats read the pixels. Every reader first sees a case where the effect is real. All numbers: ffmpeg 6.1.1.

Matrix: the default output has no matrix tag and BT.601 pixels. Read as BT.709, pure green falls from 255 to 215 and red gains a green channel of 23 (worst error 40). Gray never moves. Converted with scale=out_color_matrix=bt709 and tagged, the file reads right within 1 level (23 off as BT.601). -colorspace bt709 alone writes only the label on 6.1.1: the pixels stay BT.601 and the file is off by 40.

Black and white: format=gray stores red 76, green 150, blue 29. hue=s=0 stores 81, 145, 41 in video range (white 235 against 255) and shows 76, 150, 29: the same picture. colorchannelmixer with the BT.709 weights gives 54, 182, 18. On a BT.709 file format=gray gives 55 and 183 for red and green, the BT.601 mixer 76 and 149: green is 34 levels off.

Range: the default writes black at Y 16 and white at 235 with no range tag. -color_range pc on 6.1.1 keeps the same bytes and flips the tag to pc, so a player that follows the tag shows black as 16. Controls: flag 1 on limited bytes shows black 16; flag 0 on full bytes crushes 8 and 247. -pix_fmt yuvj420p gives Y 0 and 255.

HDR to SDR: a 10 bit PQ clip, ten grey patches from 0 to 10000 nits. A plain -pix_fmt yuv420p puts 100 nit white at Y 127.3 (an SDR white is 235) and the 50 nit patch 67.5 codes too dark; the PQ tags survive. colorspace=all=bt709:iall=bt2020 keeps the same pixels and rewrites the tags to bt709. zscale is exact from 0 to 100 nits and puts 203 nits and above on 255; with tonemap=hable 203 nits sits at 182.

Chroma: a 1 pixel red line on blue, libx264 -crf 0. yuv444p keeps it red; in yuv420p the vertical line becomes 150, 21, 149. Y stays near 81.

Bit depth: a 10 bit ramp to 8 bit. format=yuv420p already dithers: 65 values, not 64. sws_dither=none gives 64 flat bands of 16 pixels. The 6 other spellings (bayer, ed, a_dither, x_dither, auto, flags=+error_diffusion) are byte for byte the default. On rgb8 output the 8 spellings give 5 different files.

Label or pixels: -colorspace bt709, -color_range pc and colorspace=all=bt709:iall=bt2020 each changed a tag over pixels identical to the default.

The command, checked: ffmpeg -i in.png -vf scale=out_color_matrix=bt709:out_range=tv,format=yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:v libx264 out.mp4. On a fresh card of 6 patches ffprobe says yuv420p, bt709, tv; the decoded worst error is 1 (23 if read as BT.601); black is Y 16 and white 235 by raw luma and by signalstats. The plain command, read as BT.709, is off by 40.

The source films also ran ffmpeg 8.1.2, with other behaviour for -colorspace, -color_range pc, format=gray and sws_dither=none; not re-run here.

Chapters
<!-- chapters:start -->
00:00 The question
00:22 Two readers, one control
00:37 Matrix: the default
00:58 Matrix: the tag
01:19 Black and white: stored or seen
01:38 Black and white: the weights
01:58 Range: 16 or 0
02:21 Range: both directions
02:42 Transfer: HDR to SDR
03:04 Transfer: the fix and the lie
03:27 Chroma: lost detail
03:48 Bit depth: the false alarm
04:11 Label or pixels?
04:32 The command, checked
05:05 Cheat sheet
05:22 Builds
05:37 Not tested
<!-- chapters:end -->

Limits: synthetic clips, ffmpeg 6.1.1. Not tested: real footage, real players, HLG, Dolby Vision, other encoders, scaled output, other builds.

Fixture, tests and video source: github.com/mizcausevic-dev/ffmpeg-reality-checks

> This film uses synthetic clips generated by ffmpeg. No real footage and no real product.

Miz Causevic, Kinetic Gain LLC

### Tags (15)

ffmpeg, ffmpeg tutorial, ffmpeg colors wrong, ffmpeg color matrix, bt601 vs bt709, color_range pc, yuv420p, chroma subsampling, hdr to sdr, tonemap, ffmpeg dither, ffprobe, video engineering, command line, ffmpeg reality checks

### Pinned comment (≤ 300 chars)

Synthetic clips, ffmpeg 6.1.1. -colorspace bt709 alone, -color_range pc and colorspace iall each changed only a tag (pixels identical). yuv420p turned a 1 px red line to 150,21,149. Checked command: ffprobe bt709/tv, error 1, black 16, white 235. github.com/mizcausevic-dev/ffmpeg-reality-checks
