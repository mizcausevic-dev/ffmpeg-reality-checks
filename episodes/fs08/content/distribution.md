# FS08 distribution kit: FFmpeg colordetect: It Can Prove Full Range, Never Limited

All numbers below come from the synthetic fixture in `episodes/fl08/fixture/` (experiment.mjs, run.mjs) and its tests, measured on ffmpeg 6.1.1 (evidence.json) and ffmpeg 8.1.2 (evidence-v8.json).

## YouTube

### Title options (≤ 60 chars), ranked

1. `FFmpeg colordetect Proves Full Range, Never Limited` : the measured finding.
2. `Tagged TV Turns 256 Gray Levels Into 220` : the surprise.
3. `FFmpeg -color_range pc: Relabel or Convert?` : the build difference.
4. `Is My Video Full Range or Limited? FFmpeg Check` : the question people ask.

### Description

A gray ramp has 256 levels. Tag it tv, convert it to RGB, and 220 survive: 17 columns turn black and 21 turn white, with not one byte changed. Then ffmpeg 8's new colordetect filter, in under three minutes. #Shorts

Synthetic ramps (0..255, 16..235, 64..191), 3 frames each, read two ways: raw plane bytes and signalstats (they agree), plus ffprobe for the tag and colordetect on 8.1.2.

The tag is only a label: on 6.1.1 the 16..235 ramp is identical tagged tv, tagged pc or untagged. Tagged tv it shows as 0..255, tagged pc as 16..235. The output option -color_range pc only relabels on 6.1.1, but on 8.1.2 it converts 16..235 into 0..255.

ffmpeg 6.1.1 has no colordetect (No such filter, exit code 8); there, signalstats proves full range when a sample is below 16 or above 235, and one sample at 236 in 1 of 3 frames is enough. On 8.1.2, colordetect says JPEG / full range for a 0..255 ramp and undetermined for 16..235, and never limited. It reads luma only. A 64..191 ramp converted to 56..204 and tagged pc stays undetermined. Alpha: opaque is opaque, red with alpha 128 is straight, premultiplied-looking pixels stay undetermined.

The full film is on this channel: "FFmpeg colordetect: What It Can and Cannot Tell About Color Range".

#Shorts

Chapters
<!-- chapters:start -->
00:00 The surprise
00:20 The tag
00:37 What the tag changes
00:52 A build difference
01:06 No filter on 6.1.1
01:24 colordetect: full
01:34 colordetect: limited
01:50 Luma only
02:14 Alpha mode
02:25 The rule
<!-- chapters:end -->

Limits: synthetic ramps and alpha frames, FFV1, ffmpeg 6.1.1 and 8.1.2. Not tested: real footage, lossy codecs, players.

Fixture, tests and video source: github.com/mizcausevic-dev/ffmpeg-reality-checks

> This Short uses synthetic ramps generated in Node and ffmpeg. No real footage and no real product.

Miz Causevic, Kinetic Gain LLC

#Shorts

### Tags (15)

ffmpeg, ffmpeg tutorial, ffmpeg shorts, colordetect, ffmpeg 8, color range, full range vs limited range, tv range pc range, ffprobe, signalstats, ffmpeg color_range, video engineering, command line, shorts, ffmpeg reality checks

### Pinned comment (≤ 300 chars)

Synthetic ramps, ffmpeg 6.1.1 and 8.1.2: a 0..255 ramp tagged tv keeps 220 of 256 levels as RGB. colordetect proves full range, never limited. Full film and fixtures: github.com/mizcausevic-dev/ffmpeg-reality-checks
