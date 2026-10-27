# ff01 to ff25 on two builds (run Oct 27 2026)

Each film's `fixture/run.mjs` was run on ffmpeg 6.1.1 (Linux, `runs-6.1.1/`) and 8.1.2 (Windows, gyan.dev full build, `runs-8.1.2/`). The 25 test files also pass on 8.1.2 (6 to 9 tests each, 0 failures).

Byte-identical output apart from the version line: ff01, ff06, ff07, ff08, ff15, ff18, ff19, ff20, ff21, ff22, ff23, ff24, ff25.

Numbers differ (file sizes, PSNR, packet gaps, tag strings) but the claim holds, except where listed:

- ff02: numbers only
- ff03: numbers only
- ff04: numbers only
- ff05: CLAIM DIFFERS, default frame-rate behaviour (150 vs 93 frames)
- ff09: CLAIM DIFFERS, exit number only
- ff10: numbers only
- ff11: numbers only
- ff12: numbers only
- ff13: CLAIM DIFFERS, -noautorotate tag kept vs dropped
- ff14: numbers only
- ff16: numbers only
- ff17: CLAIM DIFFERS, -colorspace/out_color_matrix label vs convert

The public pinned comments of ff05, ff09, ff13 and ff17 already state these differences. No pinned comment claims sameness for a film in the list above whose claim differs.
