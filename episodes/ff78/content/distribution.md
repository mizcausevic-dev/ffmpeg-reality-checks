# FF78 distribution kit: MP3 Encoder Delay: 1105 Samples Late Without the Xing Tag

All numbers below come from the synthetic fixture in `episodes/ff78/fixture/` (experiment.mjs, run.mjs) and its tests, measured on ffmpeg 6.1.1; 8.1.2 pending.

## YouTube

### Title options (≤ 60 chars), ranked

1. `MP3 Encoder Delay: 1105 Samples Late Without Xing` : the measured finding.
2. `Why Does My Decoded MP3 Start 1105 Samples Late?` : the question people ask.
3. `MP3 Xing and Info Tag: Delay 576, Padding 1404` : what the bytes say.
4. `ffmpeg -ss -c copy on MP3: The Cut Starts 3981 Late` : the copy cut.

### Description

You encode one second of sound to MP3 and decode it. Does the sound come back where it started? We put a known impulse in, encode it with libmp3lame, and read where it lands in the decoded samples and what the file header says.

Source (written byte by byte in Node, 44100 Hz mono 16 bit, exactly 44100 samples): one impulse of 29000 at sample 4410, a 1000 Hz cosine burst from sample 4410 for 35280 samples, and 40 impulses whose gaps (800 + 10 k samples) name each impulse. Encodes: libmp3lame at 128 kbit/s CBR and at -q:a 2 VBR, each with the default Xing/Info tag and with -write_xing 0 (8 files).

Readers: the decoded samples (ffmpeg to s16le, Node finds the peak, the half-level onset or the gap pattern); the file bytes (Node walks all 41 frame headers, reads the Info or Xing frame count and the encoder delay and padding fields); ffprobe start_time and duration.

Control: the same wav through pcm_s16le returns the impulse at sample 4410 and the tone onset at 4410, 44100 samples.

Without the tag (-write_xing 0): the impulse and the tone both come back at sample 5515, 1105 samples late, in CBR and in VBR. 40 frames of 1152 samples decode to 46080 samples for 44100 in.

With the tag (the default): the impulse is back at 4410 and exactly 44100 samples come out. The first frame (417 bytes at 128 kbit/s) holds no sound: it is an Info frame (Xing in VBR) with 40 frames, and the three bytes 24 05 7c hold two 12 bit fields, delay 576 (0x240) and padding 1404 (0x57c). ffprobe reports start_time 0.025057 s = 1105 / 44100.

The arithmetic: the decoder skips the header delay plus 529 (528 + 1, a decoder constant), 576 + 529 = 1105 samples at the start, and trims the padding minus 529 at the end, 1404 - 529 = 875. 46080 - 1105 - 875 = 44100. For every tagged file the decoded length equals frames x 1152 minus delay minus padding.

Copy and cut: -c copy of the whole file gives the same 44100 samples (same hash) and the same fields. But -ss 0.5 -c copy writes a new tag with delay 3567 (bytes de f5 7c): the decoder drops 3567 + 529 = 4096 samples, and the cut starts 3981 samples late (requested sample 22050, first decoded sample is source sample 26031). It is 3189, 3585 and 3225 late for -ss 0.1, 0.3 and 0.7, and 5133 late with -ss after -i. A re-encode of the cut starts exactly at 22050. A copy with -write_xing 0 starts at 21935, 115 samples early, whole frames.

The 15 tests pass on ffmpeg 6.1.1.

Chapters
<!-- chapters:start -->
00:00 The question
00:14 One impulse, one tone
00:30 Without the Xing tag
00:48 With the tag: delay 576
01:05 The arithmetic
01:21 Copy and cut
01:39 What to check
<!-- chapters:end -->

Limits: one second of mono 44100 Hz sound, an impulse, a tone and a gap-coded impulse train, libmp3lame at 128 kbit/s CBR and q2 VBR written by ffmpeg 6.1.1, decoded by ffmpeg's own decoder. The copy-cut numbers are the build specific part. Not tested: other builds, real players, other encoders, real music, stereo, other sample rates.

Fixture, tests and video source: github.com/mizcausevic-dev/ffmpeg-reality-checks

> This episode uses synthetic test signals generated in Node. No real music and no real product.

Miz Causevic, Kinetic Gain LLC

### Tags (15)

ffmpeg, ffmpeg tutorial, mp3 encoder delay, mp3 gapless, mp3 padding, xing header, lame tag, libmp3lame, ffmpeg mp3 decode, ffmpeg write_xing, mp3 stream copy, ffmpeg -ss copy mp3, audio engineering, ffmpeg reality checks, mp3 1105 samples

### Pinned comment (≤ 300 chars)

Synthetic test: an impulse at sample 4410 returns at 5515 without the Xing tag (1105 late), at 4410 with it. Tag: delay 576, padding 1404, decoder adds 529. -ss 0.5 -c copy writes delay 3567: 3981 late. github.com/mizcausevic-dev/ffmpeg-reality-checks Do you keep the tag?
