# FF83 distribution kit: FFmpeg silencedetect Finds 1 of 5 Gaps: What n and d Really Do

All numbers below come from the synthetic fixture in `episodes/ff83/fixture/` (experiment.mjs, run.mjs) and its tests, measured on ffmpeg 6.1.1; also run on 8.1.2, where the tests pass (3 of 3 runs; exact numbers are asserted on 6.1.1 only, relations on 8.1.2).

## YouTube

### Title options (≤ 60 chars), ranked

1. `FFmpeg silencedetect: Default Finds 1 of 5 Gaps` : the measured finding.
2. `FFmpeg silencedetect Not Working? Check n and d` : the question people ask.
3. `FFmpeg silencedetect n=-50dB vs n=0.001, Explained` : the spelling confusion.
4. `FFmpeg silencedetect Peak vs RMS: Why a Gap Is Missed` : the mechanism.

### Description

You run silencedetect with its default settings on a clip with five gaps and it reports one. Is the filter broken? We build a synthetic tone in Node, write the gaps ourselves, and read the report two ways.

Clip (WAV written by Node, mono, 48000 Hz, 16 bit, 12 s): a 440 Hz tone with five gaps. A is 1.0 to 3.5 s of digital zero (2.5 s), B is 4.5 to 5.0 s of digital zero (0.5 s), C, D and E are 1 s of uniform noise at 6.0, 8.0 and 10.0 s, with loudest samples of -49.1, -53.9 and -66.2 dBFS (rms -53.9, -58.7 and -71.0 dBFS).

Readers: what ffmpeg prints (silence_start, silence_end, silence_duration and the exit status), and the raw samples read back in Node (runs of samples with |x| below the threshold that last at least d). They agree on start and end in every ordinary case. Control: a tone with no gap gives no report from either reader.

The default is n=-60dB and d=2, so it reports 1 of the 5 gaps: A. With d=1: A and E. With d=0.5: A, B and E (a gap exactly as long as d counts). With d=0.5001: B is gone again. With n=-50dB (d=0.3): A, B, D, E. C stays out at -50dB although its rms is -53.9 dBFS, because n is compared with each sample and its loudest sample is -49.1 dBFS; n=-40dB takes it.

Spellings: n=0.001 gives the same report as n=-60dB, n=0.00316228 the same as n=-50dB, noise= and duration= are the long names. n=-50 (no dB) is refused as out of range with a nonzero exit status. n=0 reports nothing, not even the digital zero (the test is strictly below). On 16 bit input n=1.5 and n=20dB report nothing (the threshold is stored in a 16 bit number and wraps to a negative value), on float input they report the whole file as silent.

How exact: the edges are the true ones to the sample (1 to 3.5 s is samples 48000 to 168000). On 16 bit input the level is cut to an integer: -60dB is 32.767, cut to 32; constants up to 31 are silent, 32 and above are not. On float input 0.000999 is silent and 0.001 is not. Printed times have 6 significant digits: a gap starting at 123.456771 s is printed as 123.457, 11 samples off. A stereo clip with a silent right channel reports nothing; with mono=1 each channel is judged alone and channel 1 is reported from 0 to 4 s.

The 18 tests pass on ffmpeg 6.1.1.

Chapters
<!-- chapters:start -->
00:00 The question
00:17 The clip, two readers
00:35 The default d
00:52 The level n
01:08 Spellings and limits
01:25 How exact
01:40 What to check
<!-- chapters:end -->

Limits: synthetic tones, noise and constants in 16 bit and float WAV, ffmpeg 6.1.1. The 16 bit overflow, the integer cut of the threshold, the strict comparison and the six digit print are behaviors of this build. Not tested: builds other than 6.1.1 and 8.1.2, real recordings, compressed audio, other filters such as silenceremove.

Fixture, tests and video source: github.com/mizcausevic-dev/ffmpeg-reality-checks

> This episode uses synthetic test audio written by Node and read by ffmpeg. No real recordings and no real product.

Miz Causevic, Kinetic Gain LLC

### Tags (15)

ffmpeg, ffmpeg tutorial, ffmpeg silencedetect, ffmpeg silence detection, ffmpeg detect silence, silencedetect noise, silencedetect duration, ffmpeg audio filter, ffmpeg dB threshold, ffmpeg audio analysis, ffprobe, video engineering, ffmpeg reality checks, remove silence ffmpeg, audio silence detection

### Pinned comment (≤ 300 chars)

Synthetic 12 s tone, 5 gaps. Default silencedetect (n=-60dB, d=2) reports 1 of 5. d=0.5: 3. n=-50dB: 4. n=-40dB: 5. n is tested per sample: a gap with rms -53.9 dBFS but a peak of -49.1 stays loud at -50dB. n=-50 without dB is refused. github.com/mizcausevic-dev/ffmpeg-reality-checks
