# FL08 distribution kit: FFmpeg colordetect: What It Can and Cannot Tell About Color Range

All numbers below come from the synthetic fixture in `episodes/fl08/fixture/` (experiment.mjs, run.mjs) and its tests, measured on ffmpeg 6.1.1 (evidence.json) and ffmpeg 8.1.2 (evidence-v8.json).

## YouTube

### Title options (≤ 60 chars), ranked

1. `FFmpeg colordetect: Full Range Yes, Limited Never` : the measured finding.
2. `Tagged TV: 256 Gray Levels Become 220 in FFmpeg` : the surprise.
3. `FFmpeg -color_range pc Converts Pixels on 8.1.2` : the build difference.
4. `How to Check Video Color Range With ffprobe and ffmpeg` : the how-to.

### Description

A gray ramp has 256 levels. Tag the file tv, convert it to RGB, and 220 come out: 17 columns turn black and 21 turn white, and not one byte of the file changed. This film asks what a video's color range really is, who can tell you, and what the new colordetect filter (ffmpeg 8.0) can and cannot prove.

Short cut of this film (vertical, under 3 minutes): FFmpeg colordetect: It Can Prove Full Range, Never Limited.

Everything is synthetic: 256x16 luma ramps (0..255, 16..235, 64..191) and outlier clips, 3 frames each, written byte by byte in Node and stored as FFV1 in Matroska; alpha clips 64x16 in rgba. Readers: raw plane bytes and signalstats (they agree on every clip), ffprobe for the tag, colordetect on 8.1.2. Control: the 0..255 ramp reads 0..255 and the 16..235 ramp reads 16..235 on both pixel readers.

The tag (written with -vf setparams=range=pc plus -color_range pc) is only a label: on 6.1.1 the 16..235 ramp is the same bytes untagged, tagged tv and tagged pc. ffprobe says unknown for an untagged file on 6.1.1 and tv on 8.1.2. What the tag changes is the conversion to RGB (6.1.1): tagged tv the ramp becomes 0..255, tagged pc it stays 16..235; the full ramp tagged tv keeps 220 of 256 levels (17 columns black, 21 white). The output option -color_range pc only relabels on 6.1.1, but on 8.1.2 it converts: 16..235 becomes 0..255 and 64..191 becomes 56..204. On 8.1.2, -vf setparams=range=pc alone also converts: 0..255 becomes 16..235 and ffprobe says tv.

ffmpeg 6.1.1 has no colordetect (No such filter, exit code 8). The recipe there is signalstats: any sample below 16 or above 235 proves full range, one sample at 236 in 1 of 3 frames is enough, and nothing inside proves limited.

colordetect on 8.1.2 (mode=all prints one block at the end of the run and writes nothing to the frames): the 0..255 ramp is JPEG / full range, tagged tv or untagged; 16..235, 64..191 and a ramp of only 16 and 235 are undetermined; one sample at 236 or at 15 makes it full range. It looks at luma only: Cb across 0..254 with luma 16..235 stays undetermined. It does not echo the tag: a 64..191 ramp converted to 56..204 and tagged pc stays undetermined. Alpha: opaque is opaque, red with alpha 128 is straight, premultiplied-looking pixels, dark pixels and all zero are undetermined, one bad pixel in 1 of 3 frames makes it straight; the same straight picture as yuva420p is undetermined. ffprobe gives identical metadata for a straight and a premultiplied-looking file.

Chapters
<!-- chapters:start -->
00:00 The surprise
00:24 The question
00:46 The readers
01:08 The tag
01:36 What the tag changes
02:02 A build difference
02:35 The filter
03:02 The 6.1.1 recipe
03:26 colordetect: full
03:41 colordetect: limited
04:01 One sample
04:11 Luma only
04:28 Pixels, not the label
04:53 Alpha mode
05:13 Pixel format
05:28 Which command
05:48 Cheat sheet
06:02 Not tested
<!-- chapters:end -->

Limits: synthetic ramps and alpha frames, FFV1 in Matroska, ffmpeg 6.1.1 and 8.1.2 only. Not tested: real footage, lossy codecs, 10-bit and HDR, players, other builds. The overlay filter handled premultiplied alpha differently on the two builds and that is not explained here.

Fixture, tests and video source: github.com/mizcausevic-dev/ffmpeg-reality-checks

> This film uses synthetic ramps and frames generated in Node and ffmpeg. No real footage and no real product.

Miz Causevic, Kinetic Gain LLC

### Tags (15)

ffmpeg, ffmpeg tutorial, colordetect, ffmpeg 8, color range, full range vs limited range, tv range pc range, ffprobe, signalstats, ffmpeg color_range, alpha mode, premultiplied alpha, video engineering, command line, ffmpeg reality checks

### Pinned comment (≤ 300 chars)

Synthetic ramps, ffmpeg 6.1.1 and 8.1.2. A 0..255 ramp tagged tv keeps 220 of 256 levels as RGB. colordetect proves full range and never limited, and it reads pixels, not the tag. Where are your files mislabeled? github.com/mizcausevic-dev/ffmpeg-reality-checks
