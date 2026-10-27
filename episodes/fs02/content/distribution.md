# FS02 distribution kit: FFmpeg AAC Join: 2112 Samples at the Seam, Not 200 (Gapless Audio)

All numbers below come from the synthetic fixture in `episodes/fl02/fixture/` (experiment.mjs, run.mjs; it imports the fixtures of ff08, ff46, ff78 and ff79) and its tests, measured on ffmpeg 6.1.1 (the 8.1.2 build has not been run on these tests yet).

## YouTube

### Title options (≤ 60 chars), ranked

1. `FFmpeg AAC Join: 2112 Samples at the Seam, Not 200` : the measured finding.
2. `Why Is My Joined AAC File Full of Gaps?` : the question people ask.
3. `FFmpeg -c copy Join Leaves 1912 Extra Samples` : the arithmetic.
4. `FFmpeg Gapless AAC Join Explained` : the format.

### Description

Two AAC files joined with -c copy: the clicks you placed 200 samples apart across the seam come out 2112 apart. Here is where the samples go, in under three minutes. #Shorts

Each file has a click 100 samples after its start and 100 samples before its end (synthetic, 44100 Hz mono, AAC 128k). Readers: the decoded samples, the mp4 bytes (edit list and sample table) and ffprobe. Control: the same files joined as pcm give a seam of exactly 200.

The copy join has an edit list of 4024 ms from media time 0 (the 1024 sample priming note is gone), 176 packets, and decodes 180224 samples, 3824 more than the 176400 asked. The seam is 200 + 888 padding + 1024 priming = 2112. A decode and re-encode join with no trim still leaves 1088.

The fix: ffmpeg -i a.m4a -i b.m4a -filter_complex "[0:a]atrim=duration=2[x];[1:a]atrim=duration=2[y];[x][y]concat=n=2:v=0:a=1" -c:a aac -b:a 128k join.m4a. Clicks at 100, 88100, 88300 and 176300, seam 200, edit list 4000 ms, 174 packets, ffprobe 4 s.

Also in this short: MP3 without the tag returns 1105 samples late (tag: delay 576, decoder adds 529); rewriting the Opus pre-skip (312) to 0 moves the click 312 late and to 1000 moves it 688 early; -ss 0.5 -c copy on an MP3 starts 3981 late.

The full film (about six minutes) is: FFmpeg Gapless Audio: AAC Join, MP3 Delay and Opus Pre-skip. Source films: MP3 Encoder Delay: 1105 Samples Late Without the Xing Tag. Opus Pre-Skip 312: Rewrite One Header Field, the Click Moves 312 Samples. FFmpeg itsoffset Moves Audio 1.000 s: MP4 Keeps It in an Edit List. FFmpeg AAC Join Adds Extra Samples at the Seam.

#Shorts

Chapters
<!-- chapters:start -->
00:00 The seam
00:15 The rule
00:26 MP3 tag
00:43 Opus header
00:58 AAC edit list
01:12 The copy join
01:28 Where it goes
01:39 Cuts too
01:54 The recipe
02:10 Two readers
02:22 What to check
<!-- chapters:end -->

Limits: synthetic clicks, one AAC encoder (native aac, ffmpeg 6.1.1), 128k mono, 44100 Hz. Not tested: other builds, real players, real music, other encoders, the sound quality of the second AAC encode.

Fixture, tests and video source: github.com/mizcausevic-dev/ffmpeg-reality-checks

> This Short uses synthetic clicks generated in Node and ffmpeg. No real music and no real product.

Miz Causevic, Kinetic Gain LLC

### Tags (15)

ffmpeg, ffmpeg tutorial, ffmpeg shorts, gapless audio, aac join, ffmpeg concat, c copy audio gap, aac priming, edit list, ffmpeg atrim, audio engineering, ffprobe, command line, shorts, ffmpeg reality checks

### Pinned comment (≤ 300 chars)

Synthetic clicks, ffmpeg 6.1.1: a -c copy join of two AAC files puts the clicks 2112 samples apart, not 200. Trim each input, concat, encode once: 200. Full film and fixtures: github.com/mizcausevic-dev/ffmpeg-reality-checks
