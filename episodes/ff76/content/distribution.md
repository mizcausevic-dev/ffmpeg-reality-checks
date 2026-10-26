# FF76 distribution kit: FFmpeg Black and White: gray and hue Match, the Mixer Follows Its Weights, 8.1 Changes gray on HD

All numbers below come from the synthetic fixture in `episodes/ff76/fixture/` (experiment.mjs, run.mjs) and its tests, measured on ffmpeg 6.1.1 and 8.1.2. The tests pass on both; one result differs by build: format=gray on a BT.709 file keeps the file's luma on 6.1.1 (red 55, green 183) and uses the 601 weights on 8.1.2 (red 76, green 149).

## YouTube

### Title options (≤ 60 chars), ranked

1. `FFmpeg Black and White: gray, hue and colorchannelmixer` : the question, all three filters named.
2. `FFmpeg Grayscale: hue=s=0 Matches gray, the Mixer Does Not` : the measured finding.
3. `FFmpeg format=gray on HD Video: 6.1 and 8.1 Disagree` : the build difference.
4. `FFmpeg format=gray vs hue=s=0: Same Picture, 16 to 235` : the range surprise.

### Description

Three common ways to make video black and white in FFmpeg are format=gray, hue=s=0 and colorchannelmixer with luma weights. Do they give the same picture? We feed pure colour patches and a ramp through each and read back the numbers.

Bench (no real footage): nine flat 16x8 patches (red, green, blue, yellow, white, black, gray 128, cyan, magenta) and a 256 step ramp, built in Node and piped in as raw rgb24, and also converted to yuv420p tagged bt470bg (standard definition) or bt709 (high definition). The methods: format=gray, hue=s=0, colorchannelmixer with .299 .587 .114, colorchannelmixer with .2126 .7152 .0722, eq=saturation=0, and format=gray then yuv420p.

Readers: the first reads the raw bytes ffmpeg writes in its native format and range, parsed in Node, with the format and range taken from ffmpeg's own log. The second adds format=rgb24 to the same graph, so it reads what a screen would show. Control: Node computes the luma of each patch from the weights, and ffmpeg matches it exactly with the 601 weights and within one level with the 709 weights.

What gets stored (rgb source): format=gray writes red 76, green 150, blue 29, yellow 226, white 255, black 0, in full range. hue=s=0 writes 81, 145, 41, 210 in video range, white 235, black 16.

What the screen shows: the video range is stretched back, and hue shows 76, 150, 29, 226, the same as gray. Same picture, different stored numbers.

The mixer: with the 601 weights it matches gray (76, 150, 29, 226). With the 709 weights it gives 54, 182, 18, 236 and white 254.

High definition source (bt709 tag), on 6.1.1: gray and hue follow the file, 55, 183, 19, 236 (hue 54, 182, 18, 236). The 601 mixer stays at 76, 149, 29, 225. The gap: red 21, green 34, blue 10, yellow 11 levels.

Ramp 0 to 255 (rgb source): format=gray keeps 256 levels, hue=s=0 220, mixer 601 194, mixer 709 200 (top level 254). eq=saturation=0 leaves chroma at 127, a faint tint (channel spread up to 4).

The 14 tests pass on ffmpeg 6.1.1.

Chapters
<!-- chapters:start -->
00:00 The question
00:17 What gets stored
00:32 What the screen shows
00:46 The mixer
00:57 A high definition source
01:13 A ramp
01:27 What to write
<!-- chapters:end -->

Limits: one set of 16x8 patches and one ramp, rgb and two YUV matrices, ffmpeg 6.1.1 and 8.1.2 (8.1.2 is the Windows full build). The ramp level counts of the mixers, white 254 under the 709 weights, the eq chroma of 127, and the native format and range each filter outputs are the parts most likely to differ on another build. Not tested: other ffmpeg builds, real footage, other matrices, dithering, 10 bit.

Fixture, tests and video source: github.com/mizcausevic-dev/ffmpeg-reality-checks

> This episode uses synthetic colour patches and a ramp generated in Node. No real footage and no real product.

Miz Causevic, Kinetic Gain LLC

### Tags (15)

ffmpeg, ffmpeg tutorial, ffmpeg black and white, ffmpeg grayscale, ffmpeg format gray, ffmpeg hue saturation 0, ffmpeg colorchannelmixer, ffmpeg desaturate video, ffmpeg bt709, ffmpeg color range, ffmpeg luma weights, ffmpeg eq saturation, ffmpeg video filter, video engineering, ffmpeg reality checks

### Pinned comment (≤ 300 chars)

Synthetic patches and a ramp. gray and hue=s=0 look the same (76 150 29 226) but store different ranges. On a bt709 file gray follows the file on 6.1.1 (green 183) but uses 601 weights on 8.1.2 (green 149). github.com/mizcausevic-dev/ffmpeg-reality-checks Which one do you use?
