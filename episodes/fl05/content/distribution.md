# FL05 distribution kit: Why an FFmpeg MP4 Will Not Play: pix_fmt, Odd Size, faststart, hvc1

All numbers below come from the synthetic fixture in `episodes/fl05/fixture/` (experiment.mjs, run.mjs; it re-runs ff02, ff03, ff09 and ff31 live and adds the composite recipe check) and its tests, measured on ffmpeg 6.1.1.

## YouTube

### Title options (≤ 60 chars), ranked

1. `Why an FFmpeg MP4 Will Not Play: 4 Checks Before You Send` : the question and the count of causes.
2. `FFmpeg Exit 0, and the MP4 Still Fails: 4 Causes` : the symptom people see: exit 0 and a bad file.
3. `FFmpeg MP4 Not Playing? pix_fmt, Odd Size, faststart, hvc1` : the search phrase with the four flags.
4. `Why FFmpeg Writes 4:4:4 MP4s With the Index Last` : the mechanism for engineers.

### Description

An FFmpeg command can exit with status 0, print no warning, and still write a file that a player refuses or makes wait. We take one naive command, read what it wrote with independent readers, and fix the four things we find. We ran no player, no browser and no phone: every claim is about the bytes in the file or the exit of a command.

The naive command, on 25 synthetic RGB PNG frames (lavfi testsrc2, 1000x562): ffmpeg -framerate 25 -i f%03d.png -vf scale=-1:333 -c:v libx264 out.mp4. Exit status 0. ffprobe: profile High 4:4:4 Predictive, pix_fmt yuv444p, size 593x333. The raw bytes agree: avcC profile_idc 244, chroma_format_idc 3, 593x333 in the sample entry, top-level boxes ftyp, free, mdat, moov.

1. Pixel format. RGB input with no -pix_fmt gives High 4:4:4 Predictive, yuv444p; a yuv420p source stays yuv420p. The FFmpeg wiki says some players only support 4:2:0 for H.264 (their claim, not ours). With -pix_fmt yuv420p the profile is High. Against the original frames, PSNR 37.04 dB (4:4:4) versus 35.4 dB (4:2:0).

2. Odd size. 1920x1080 scaled to height 720 gives 1280x720 and encodes. 1000x562 with scale=-1:333 gives 593x333 and libx264 refuses: width not divisible by 2 (593x333), non-zero exit (187 on Linux with ffmpeg 6.1.1), nothing written. Either dimension is enough: scale=-1:240 on 640x360 gives width 427; scale=-2:333 gives 592x333 and the message names the height. scale=-2:334 gives 594x334, exit 0, 10 frames. Our first command did not crash only because 4:4:4 accepts odd sizes; add -pix_fmt yuv420p to it and it is refused.

3. Index position. Without -movflags +faststart the top-level boxes are ftyp, free, mdat, moov: the index (moov) starts at byte 917,559 of 927,238. With it: ftyp, moov, free, mdat. Same 250 frames, same index size. ffprobe reading over a local HTTP server as a client that cannot seek: the whole plain file (927,238 bytes) against under a quarter of the faststart file. A client with range requests copes with the plain file by jumping to the end: 3 requests against 1. The FFmpeg documentation says faststart needs a second pass. No browser was tested.

4. HEVC tag. libx265 to MP4 writes the sample entry hev1 (ffprobe and the raw box agree); Apple players are said to want hvc1 (we did not test one). -c copy -tag:v hvc1 gives hvc1 on both readers and 0 of 50 frames change (packet, sample and frame hashes equal); on ffmpeg 6.1.1 the retag rewrites 2 bytes, both inside the sample entry. The tag is a label: parameter sets carried in the first sample stay there. Matroska has no such tag. The same frames through libx265 with no other flag give profile Rext, pix_fmt gbrp, hev1, 593x333, index last; libx265 also refuses an odd 4:2:0 frame (exit 183 on Linux with ffmpeg 6.1.1).

The command that fixes all three H.264 problems: ffmpeg -framerate 25 -i f%03d.png -vf scale=-2:334 -c:v libx264 -pix_fmt yuv420p -movflags +faststart out.mp4. On fresh frames both readers say profile High, yuv420p, 594x334, boxes ftyp, moov, free, mdat, 25 frames. For HEVC, with -c:v libx265 -tag:v hvc1 added: Main, yuv420p, 594x334, hvc1. Each flag fixes only its own problem: faststart alone leaves 4:4:4 and 593x333; the format and size flags without faststart leave moov last.

Short cut: FFmpeg MP4 Will Not Play? 4 Checks: pix_fmt, Odd Size, faststart, hvc1

Source films in this series:
- FFmpeg Silently Made Your MP4 4:4:4. Players May Refuse It.
- FFmpeg scale=-1 Fails When the Size Is Odd
- Your MP4 May Wait to Play: The Index Is at the End
- FFmpeg HEVC in MP4: -tag:v hvc1 Retags Without Touching a Frame

All numbers above are from the fixtures in this film's repository folder, re-run live on ffmpeg 6.1.1. The four source films were also measured on ffmpeg 8.1.2 (see each film); the composite recipe check was run on 6.1.1 only.

Chapters
<!-- chapters:start -->
00:00 The question
00:24 How we check
00:49 First: the pixel format
01:12 The fix, and its price
01:35 Second: the size
02:00 Either number breaks it
02:25 Why our first command passed
02:47 Third: the index
03:11 What the index costs
03:36 Fourth: the HEVC label
03:56 Retag, do not re-encode
04:18 A label, not a check
04:42 Which command: H.264
05:08 Which command: HEVC
05:34 The cheat sheet
05:50 Not tested
<!-- chapters:end -->

Limits: synthetic RGB frames, libx264 and libx265 only, one local server as the client, ffmpeg 6.1.1 for the composite. Not tested: any player (Safari, QuickTime, iPhone, Android), any browser, other encoders, hardware encoders, fragmented MP4, HLS, real footage, other ffmpeg builds for the composite.

Fixture, tests and video source: github.com/mizcausevic-dev/ffmpeg-reality-checks

> This film uses synthetic frames generated by ffmpeg. No real footage and no real product.

Miz Causevic, Kinetic Gain LLC


### Tags (15)

ffmpeg, ffmpeg tutorial, mp4 not playing, pix_fmt yuv420p, yuv444p, faststart, moov atom, hvc1 hev1, width not divisible by 2, libx264, libx265, ffprobe, video encoding, video engineering, ffmpeg reality checks

### Pinned comment (≤ 300 chars)

Synthetic RGB frames, no player or browser tested. Re-measured on ffmpeg 6.1.1: the naive command exits 0 and writes 4:4:4, 593x333, index last. The recipe gives High, yuv420p, 594x334, index first. github.com/mizcausevic-dev/ffmpeg-reality-checks What broke yours?
