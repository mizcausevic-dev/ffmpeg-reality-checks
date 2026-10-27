# FF84 distribution kit: FFmpeg Encoder Lowpass: mp3 and aac Lose the Top at 64 kbit/s, libopus Keeps 20 kHz

All numbers below come from the synthetic fixture in `episodes/ff84/fixture/` (experiment.mjs, run.mjs) and its tests, measured on ffmpeg 6.1.1; also run on 8.1.2, where the tests pass (3 of 3 runs) with one difference: libopus with -vbr off at 64 kbit/s drops two tones (15.6 and 15.7 kHz) there.

## YouTube

### Title options (≤ 60 chars), ranked

1. `FFmpeg mp3 and aac Lose the Top, Opus Keeps 20 kHz` : the measured finding.
2. `FFmpeg Audio Cutoff by Codec and Bit Rate, Measured` : the question people ask.
3. `Why FFmpeg mp3 and aac Lose High Frequencies` : the problem people search.
4. `FFmpeg libopus Cutoff: 20 kHz at Every Bit Rate` : the surprise.

### Description

You encode at 64, 96, 128, 192 or 256 kbit/s and the top of the spectrum goes missing. Where exactly, and does it depend on the codec? We build a staircase of pure tones in Node, encode it with libmp3lame, the native aac encoder and libopus, decode it, and measure each tone.

Stimulus (WAV written by Node, stereo, 48000 Hz, float): 151 tones, each 0.25 s at amplitude 0.5: 1, 2 and 4 kHz, 6 to 9.5 kHz in 500 Hz steps, then 10 to 23.9 kHz in 100 Hz steps. The cutoff is the highest tone still within 3 dB of the 1 kHz tone.

Readers: (1) Node measures each decoded tone at its own frequency with a Goertzel filter; (2) ffmpeg reads the RMS of each tone with astats. They return the same cutoff for every encode, except in the known positive.

Controls: with no encoder both readers return all 151 tones, 23.9 kHz. Known positive: libopus with cutoff 12000 ends at 11.9 kHz (Node) and 12.0 kHz (ffmpeg); cutoff 8000 ends at 7.5 kHz.

Results, stereo, cutoff in kHz at 64, 96, 128, 192, 256 kbit/s:
libmp3lame: 11.2, 15.0, 16.5, 18.7, 19.5 (a cliff: the next 100 Hz step is at least 31 dB down).
aac: 12.0, 15.7, 17.2, 19.5, 21.7.
libopus: 20.0 at every bit rate with the default variable bit rate. With -vbr off at 64 kbit/s it is 20.0 on 6.1.1; on 8.1.2 two tones (15.6 and 15.7 kHz) are missing and every tone from 15.8 to 20.0 passes, so the unbroken run ends at 15.5 although nothing is cut off there (the astats reader still sees the energy). The OpusHead header holds the channel count and the 48000 Hz input rate, no cutoff. Opus is variable bit rate by default: the 64k label spent 109.5 kbit/s on these tones.

Mono: with aac, mono at k/2 ends exactly where stereo at k does, 5 pairs of 5 (mono 32 to 128: 12.0, 15.7, 17.2, 19.5, 21.7). With libmp3lame only 1 of 5 pairs is equal (128 stereo and 64 mono, 16.5); mono 96 ends at 20.2 against 18.7 for stereo 192.

The cutoff option: at 128 kbit/s cutoff 20000 moves libmp3lame from 16.5 to 19.5 kHz and aac from 17.2 to 20.2 kHz.

The tests pass on ffmpeg 6.1.1.

Chapters
<!-- chapters:start -->
00:00 The question
00:18 Two readers, two controls
00:39 libmp3lame
00:56 The native aac encoder
01:11 libopus
01:28 Channels and dash cutoff
01:46 What to check
<!-- chapters:end -->

Limits: synthetic stepped tones, one 0.25 s tone per frequency, ffmpeg 6.1.1 with libmp3lame, the native aac encoder and libopus. The exact cutoffs are encoder behavior of this build. Not tested: builds other than 6.1.1 and 8.1.2, real music, other sample rates, variable bit rate modes of libmp3lame and aac, libopus below 64 kbit/s.

Fixture, tests and video source: github.com/mizcausevic-dev/ffmpeg-reality-checks

> This episode uses synthetic test audio written by Node and encoded by ffmpeg. No real music and no real product.

Miz Causevic, Kinetic Gain LLC

### Tags (15)

ffmpeg, ffmpeg tutorial, ffmpeg mp3 bitrate, ffmpeg aac bitrate, ffmpeg libopus, ffmpeg lowpass, ffmpeg cutoff, audio bandwidth, audio encoding, mp3 vs aac vs opus, audio frequency cutoff, video engineering, ffmpeg reality checks, ffmpeg audio quality, libmp3lame

### Pinned comment (≤ 300 chars)

Synthetic stereo tone staircase, 151 tones. Cutoff at 64 kbit/s: mp3 11.2, aac 12.0, libopus 20.0 kHz. At 256: mp3 19.5, aac 21.7, libopus 20.0. aac mono k/2 equals stereo k (5 of 5); mp3 1 of 5. cutoff 20000 at 128: mp3 19.5, aac 20.2. github.com/mizcausevic-dev/ffmpeg-reality-checks
