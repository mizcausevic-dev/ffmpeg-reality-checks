# FF12 distribution kit: FFmpeg Keeps Your Video's Location Tag by Default

All numbers below come from the synthetic fixture in `episodes/ff12/fixture/` (experiment.mjs, run.mjs) and its tests, measured on ffmpeg 6.1.1 and 8.1.2.

## YouTube

### Title options (≤ 60 chars), ranked

1. `FFmpeg Keeps Your Video's Location Tag by Default` : the measured consequence.
2. `Does FFmpeg Remove Metadata? Not by Default` : the question people ask.
3. `FFmpeg -map_metadata -1: Strip Video Metadata` : the fix.
4. `FFmpeg Strip Metadata: What Is Left Behind` : the surprising finding.

### Description

You edit a video with FFmpeg and then share it. Does the file still carry the title, the author, a comment and the place where it was filmed? We build a test file with made-up tags, run commands, and look inside the results two ways.

The source: five made-up tags (title, artist, comment, a location in the open Atlantic, and a custom name on the video stream). Readers: ffprobe lists the tags, and a raw byte search of the file. Location is stored as a binary atom named loci, so for that one we search for the atom's name.

A plain re-encode keeps all five tags. -c copy keeps all five too.

-map_metadata -1 removes all five, with a re-encode and with -c copy. Both readers agree.

One thing remains: the format tag "encoder" naming the tool that wrote the file (Lavf...). Adding -fflags +bitexact drops it.

Same results on ffmpeg 6.1.1 and 8.1.2 (the Lavf version differs).

We tested only the tags we made. Check the output yourself before you share a file.

Chapters
<!-- chapters:start -->
00:00 The question
00:17 Five made-up tags
00:41 A plain command
00:53 Remove it on purpose
01:05 The tool's own name
01:17 What we did not test
01:31 Metadata survives by default
<!-- chapters:end -->

Limits: one synthetic MP4, five made-up tags, MP4 only, two ffmpeg builds. Not tested: real phone files, location tracks, thumbnails, vendor atoms, other containers.

Fixture, tests and video source: github.com/mizcausevic-dev/ffmpeg-reality-checks

> This episode uses a synthetic test file with made-up tags. No real footage, no real location and no real product.

Miz Causevic, Kinetic Gain LLC

### Tags (15)

ffmpeg, ffmpeg tutorial, ffmpeg metadata, map_metadata, remove metadata, strip metadata, video privacy, gps location, bitexact, ffprobe, mp4 metadata, video engineering, command line, ffmpeg c copy, ffmpeg reality checks

### Pinned comment (≤ 300 chars)

Synthetic MP4, 5 made-up tags. Re-encode and -c copy keep all five, location included. -map_metadata -1 removes them all; -fflags +bitexact also drops the encoder tag. Same on ffmpeg 6.1.1 and 8.1.2. Real phone files untested. github.com/mizcausevic-dev/ffmpeg-reality-checks. What did yours keep?
