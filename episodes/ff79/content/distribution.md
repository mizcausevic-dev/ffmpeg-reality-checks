# FF79 distribution kit: Opus Pre-Skip 312: Rewrite One Header Field, the Click Moves 312 Samples

All numbers below come from the synthetic fixture in `episodes/ff79/fixture/` (experiment.mjs, run.mjs) and its tests, measured on ffmpeg 6.1.1; the tests also pass on 8.1.2 with two differences: ffprobe shows the mkv start_time as 0 (6.1.1: -0.007 s), and rewriting the pre-skip in the mkv CodecPrivate no longer moves the click on 8.1.2 (the ogg patch behaves as on 6.1.1).

## YouTube

### Title options (≤ 60 chars), ranked

1. `Opus Pre-Skip 312: Edit the Header, the Click Moves` : the measured finding.
2. `Where Does the First Click of an Opus File Land?` : the question people ask.
3. `ffmpeg -ss -c copy on Opus: 960 Samples Early or Late` : the copy cut.
4. `OpusHead Pre-Skip, CodecDelay, initial_padding Explained` : what the bytes say.

### Description

libopus writes a pre-skip into every Opus file: 312 samples (6.5 ms) at 48000 Hz. What does the decoder do with it, and what happens to the first sound when you cut? We put a known click in, encode it, and read where it comes back.

Source (written byte by byte in Node, 48000 Hz mono 16 bit, exactly 48000 samples): one click of 29000 at sample 4800, and 40 clicks whose gaps (800 + 10 k samples) name each click. Encodes: libopus at 64 kbit/s into ogg (default 1 s pages), ogg with 100 ms pages (-page_duration 100000), mkv and .opus.

Readers: the decoded samples (ffmpeg to s16le, Node finds the click or the gap pattern); the file bytes (Node reads the OpusHead pre-skip, little endian, and in mkv the CodecDelay and SeekPreRoll elements); ffprobe (initial_padding, start_time, duration).

Control: the same wav through pcm_s16le returns the click at 4800 and 48000 samples.

The pre-skip: OpusHead holds 38 01 = 0x0138 = 312 samples in ogg, mkv and .opus; mkv also stores CodecDelay 6500000 ns and SeekPreRoll 80000000 ns; ffprobe shows initial_padding 312, start_time 0 for ogg and -0.007 s for mkv (-6.5 ms rounded to a millisecond). In all four files the decoded click is at 4800 and 48000 samples come out: the decoder removes the pre-skip.

Known positive: rewrite only the pre-skip field (the ogg page CRC recomputed in Node). Pre-skip 0: the click is at 5112 (312 late) and 48312 samples come out. Pre-skip 1000: click at 4112 (688 early), 47312 samples. The click is at 4800 + 312 - pre-skip, in ogg and in mkv. The header decides.

Cuts with -ss 0.5 (source sample 24000): mkv with -c copy and -ss before -i starts at 23040 (960 early); mkv with -ss after -i starts at 24000 (exact); ogg with -ss after -i starts at 24960 (960 late); ogg with 100 ms pages and -ss before -i is exact. A copy lands on a 960 sample (20 ms) packet and keeps the source pre-skip. An ogg with the default 1 s pages and -ss before -i with -c copy cuts nothing: all 48000 samples and all 40 clicks, start_time -0.5 s. A re-encoded cut (-ss before -i and libopus, or -af atrim=start=0.5) starts at 24000, exact; the atrim output decodes 648 samples too many at the end, and so does the copy with -ss after -i on ogg.

The 12 tests pass on ffmpeg 6.1.1.

Chapters
<!-- chapters:start -->
00:00 The question
00:12 One click, three readers
00:28 The pre-skip bytes
00:45 Rewrite the field
01:00 Cutting with stream copy
01:20 Cutting with a re-encode
01:33 What to check
<!-- chapters:end -->

Limits: one second of mono 48000 Hz sound, a click and a gap-coded click train, libopus at 64 kbit/s written by ffmpeg 6.1.1, decoded by ffmpeg's own decoder. The copy-cut numbers and the ogg page behaviour are the build specific part. Not tested: other builds, real players, other encoders, stereo, real music.

Fixture, tests and video source: github.com/mizcausevic-dev/ffmpeg-reality-checks

> This episode uses synthetic test signals generated in Node. No real music and no real product.

Miz Causevic, Kinetic Gain LLC

### Tags (15)

ffmpeg, ffmpeg tutorial, opus, libopus, opus pre-skip, opushead, opus codec delay, ffmpeg opus, ffmpeg -ss copy, ffmpeg atrim, ogg opus, mkv opus, audio engineering, ffmpeg reality checks, opus gapless

### Pinned comment (≤ 300 chars)

Synthetic test: libopus pre-skip is 312 samples (6.5 ms). The decoder trims it: click stays at 4800. Rewrite the field to 0 and the click lands at 5112; to 1000, at 4112. -ss 0.5 -c copy lands 960 early, exact or 960 late. github.com/mizcausevic-dev/ffmpeg-reality-checks Do you check pre-skip?
