# FL02 distribution kit: FFmpeg Gapless Audio: AAC Join, MP3 Delay and Opus Pre-skip

All numbers below come from the synthetic fixture in `episodes/fl02/fixture/` (experiment.mjs, run.mjs; it imports the fixtures of ff08, ff46, ff78 and ff79) and its tests, measured on ffmpeg 6.1.1 (the 8.1.2 build has not been run on these tests yet).

## YouTube

### Title options (≤ 60 chars), ranked

1. `FFmpeg Gapless Audio: AAC Join, MP3 Delay, Opus Pre-skip` : the measured finding, all three codecs.
2. `Why an FFmpeg AAC Join Leaves a Gap: 2112 Samples` : the question people ask.
3. `FFmpeg -ss -c copy on MP3 Starts 3981 Samples Late` : the copy cut.
4. `MP3 Xing, Opus Pre-skip, AAC Edit List Explained` : the three notes a decoder reads.

### Description

Join two AAC files with -c copy and two clicks you placed 200 samples apart across the seam come out 2112 samples apart. Cut an MP3 with -ss and -c copy and it starts 3981 samples late. This film follows one question through four earlier films: where does my audio really start after an encode, a join or a cut, and who tells the decoder?

Short cut of this film (vertical, under 3 minutes): FFmpeg AAC Join: 2112 Samples at the Seam, Not 200 (Gapless Audio).
Source films, in the order of this film: MP3 Encoder Delay: 1105 Samples Late Without the Xing Tag. Opus Pre-Skip 312: Rewrite One Header Field, the Click Moves 312 Samples. FFmpeg itsoffset Moves Audio 1.000 s: MP4 Keeps It in an Edit List. FFmpeg AAC Join Adds Extra Samples at the Seam.

Everything is synthetic: impulses and clicks written byte by byte in Node (44100 Hz and 48000 Hz, mono, 16 bit), a 4 s clip for the offset test, encoded by ffmpeg. Readers: the decoded samples (Node finds the click), the file bytes (MP3 frame walk and Info tag fields, OpusHead, mp4 edit lists and sample tables, mkv blocks) and ffprobe. Every control passes the same wav through pcm and gets the exact position back.

MP3 without the tag (-write_xing 0): an impulse at sample 4410 returns at 5515, 1105 samples late, and 46080 samples come out for 44100 in. With the tag (the default) it is back at 4410 with 44100 samples. The tag says delay 576 and padding 1404; the decoder skips 576 + 529 = 1105 and trims 875.

Opus: the OpusHead pre-skip is 312 samples (6.5 ms) in ogg, mkv and .opus, and the click at 4800 decodes at 4800. Rewrite only that field (page checksum fixed): pre-skip 0 puts the click at 5112, 312 late; 1000 puts it at 4112, 688 early.

AAC in mp4: the priming is the edit list, 2000 ms from media time 1024. The file decodes to 89088 samples; with edit lists ignored, 90112. The same box moves tracks: -itsoffset 1 on the audio is an empty edit of 1000 ms, and -itsoffset -1 skips the first 48000 samples (144000 decode in mp4, 192000 in mkv).

The copy join (176 packets) has an edit list of 4024 ms from media time 0 and decodes 180224 samples, 3824 more than the 176400 asked: 2 x (1024 priming + 888 padding). With a click 100 samples after the start and 100 before the end of each file, the seam is 2112 = 200 + 888 + 1024; a decode and re-encode join with no trim still leaves 1088.

Cuts: -ss 0.5 -c copy on the MP3 writes delay 3567, so the decoder drops 4096 and the cut starts 3981 samples late; a re-encode starts at 22050. Opus copy cuts land on 960-sample packets (20 ms): mkv with -ss before -i starts 960 early, after -i exact; ogg after -i starts 960 late; a re-encode starts at 24000.

The recipe for a join, run on a fresh pair: ffmpeg -i a.m4a -i b.m4a -filter_complex "[0:a]atrim=duration=2[x];[1:a]atrim=duration=2[y];[x][y]concat=n=2:v=0:a=1" -c:a aac -b:a 128k join.m4a. The clicks come out at 100, 88100, 88300 and 176300 (seam 200, like the pcm control); the bytes say an edit list of 4000 ms and 174 packets, and ffprobe says 4 s.

All 29 tests pass on ffmpeg 6.1.1.

Chapters
<!-- chapters:start -->
00:00 The question
00:20 The rule
00:38 MP3 without the tag
01:03 MP3 with the tag
01:27 Opus pre-skip
01:48 Lie to the decoder
02:07 AAC in an mp4
02:28 The edit list moves audio
02:50 The copy join
03:10 The seam
03:31 Cutting MP3
03:50 Cutting Opus
04:10 Which command
04:26 The recipe, measured
04:49 Cheat sheet
05:08 Not tested
<!-- chapters:end -->

Limits: synthetic clicks and impulses, one mono layout per codec, libmp3lame, libopus and the native aac encoder of ffmpeg 6.1.1, decoded by ffmpeg's own decoders. The AAC recipe costs a second encode; its sound quality was not measured. Not tested: other builds, real players, other encoders, real music, stereo, other sample rates, copy joins of MP3 and Opus.

Fixture, tests and video source: github.com/mizcausevic-dev/ffmpeg-reality-checks

> This film uses synthetic clicks and tones generated in Node and ffmpeg. No real music and no real product.

Miz Causevic, Kinetic Gain LLC

### Tags (15)

ffmpeg, ffmpeg tutorial, gapless audio, aac priming, mp3 encoder delay, opus pre-skip, ffmpeg concat aac, c copy audio gap, edit list, xing header, ffmpeg atrim, audio engineering, ffprobe, command line, ffmpeg reality checks

### Pinned comment (≤ 300 chars)

Synthetic clicks, ffmpeg 6.1.1. A -c copy join of two AAC files puts the clicks 2112 samples apart, not 200 (200 + 888 padding + 1024 priming). Trim each input, concat, encode once: 200. github.com/mizcausevic-dev/ffmpeg-reality-checks Which gapless trap bit you?
