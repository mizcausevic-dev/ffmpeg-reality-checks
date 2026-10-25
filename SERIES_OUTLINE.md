# FFmpeg Reality Checks: series outline

Format: one claim, one runnable synthetic fixture, one measured result, regression tests. Same as Web Reality Checks.

**Status key.** *Measured* means the numbers below were produced by running the command on the stated build. *Planned* means not yet run. Numbers are from **ffmpeg 6.1.1 (Ubuntu 24.04 package)**. Behaviour, exit codes and message text can differ on other builds, so every episode records `ffmpeg -version` in its evidence file.

| # | Claim under test | Measured result (ffmpeg 6.1.1, synthetic fixtures) | Status |
|---|---|---|---|
| 01 | Where does `-c copy` really start? | Ask for 3 s from 7.5 s, keyframes every 5 s. `-ss` before `-i`: starts at 7.52 s, 75 frames, but the file holds 138 packets (63 hidden pre-roll). `-ss` after `-i`: starts at 10.00 s, 13 frames (0.52 s). Re-encode: starts 7.52 s, 74 frames | Measured, 5 tests pass (`episodes/ep01`) |
| 02 | Why does my MP4 not play in QuickTime or the browser? | RGB input encoded with `libx264` and no `-pix_fmt` gives `High 4:4:4 Predictive`, `yuv444p`. With `-pix_fmt yuv420p`: `High`, `yuv420p` | Measured (playback in specific players not tested) |
| 03 | Why does my video wait to download before playing? | Atom order without `+faststart`: `ftyp, free, mdat, moov`. With it: `ftyp, moov, free, mdat` | Measured (browser streaming behaviour not tested) |
| 04 | Does a slower preset make better video at the same CRF? | 10 s 640x360 test pattern, CRF 23. ultrafast 2,425,546 B / SSIM 0.9700 / 0.66 s. veryfast 909,133 B / 0.9679 / 1.04 s. medium 979,254 B / 0.9690 / 1.92 s. slow 942,161 B / 0.9691 / 2.62 s. Quality barely moves. Size is not monotonic with preset on this clip | Measured on one synthetic clip, so size ordering is content dependent |
| 05 | What does "constant frame rate" do to a phone video? | VFR source: 103 frames over 5.0 s. `-fps_mode cfr -r 30`: 150 frames (47 duplicates), still 5.0 s. `passthrough`: 103 | Measured |
| 06 | Can I join clips with `-c copy` if they look the same? | Two 2 s clips, 320x180 and 640x360. Concat demuxer with `-c copy`: exit 0, no warning, container says 320x180, but frames inside are 50 at 320x180 and 50 at 640x360. Matching clips: 4.0 s, no errors | Measured |
| 07 | Does `loudnorm` hit the target without changing the sound? | Two-level tone, source -28.1 LUFS, LRA 6.9 LU. One pass: -14.1 LUFS but LRA 19.5 LU. Two pass (`linear=true`): -13.9 LUFS, LRA 6.9 LU | Measured on a synthetic tone, not music |
| 08 | Does joining AAC files with `-c copy` keep the length? | Two 2.0 s AAC files. Container duration of the join: 4.021 s. Decoded length: 4.053 s. One file alone decodes to 2.005 s | Numbers measured. **Cause (encoder priming and padding) not yet verified** |
| 09 | Why does `scale=-1:720` sometimes crash? | `scale=-1:333` on 1000x562 gives 593x333, libx264 refuses ("width not divisible by 2"), exit 187, nothing written. `scale=-2:333` also fails (333 is odd). `scale=-2:334` gives 594x334 | Measured |
| 10 | Where did my second audio track go? | Source with 2 audio streams. No `-map`: 1 audio stream in the output. `-map 0`: 2 | Measured |

## Rules for every episode
1. Synthetic input only (ffmpeg `lavfi` sources). No network, no user media.
2. Prefer frame md5 (lossless source) and ffprobe over opinions.
3. Record the ffmpeg version in `evidence.json`; tests assert behaviour, not text that changes between builds, unless that text is the point.
4. State what was not tested (specific players, other builds) in the film and README.
