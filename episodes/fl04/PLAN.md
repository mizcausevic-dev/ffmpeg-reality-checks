# fl04 / fs04 plan: Frame rate and timestamps (palette swiss)

Running question: when I change the frame rate, the speed or the length, how many frames and how many seconds do I really get? Closing recipe: `ffmpeg -stream_loop 2 -i in.mkv -vf setpts=0.5*PTS,fps=60 -af atempo=2 out.mkv`.
Numbers all live in `evidence.json` (run `node episodes/fl04/fixture/run.mjs`). Source film in brackets. Cheat-sheet and limits scenes reuse the kit's static layouts.

## fl04 (1920x1080, 16 scenes, 967 words, about 6:32)
| id | on screen | measured value | source |
|---|---|---|---|
| hook | Figure "900 vs 450" with four small numbers around it (93 to 150, 60 frames 6 s, 10 s vs 5 s) | 900 frames, 450 timestamps | recipe control, ff05, ff16, ff29 |
| method | two reader boxes (ffprobe, decode) plus a coded FrameStrip | 300 unique frames, 6.1.1 | ff29 fixture |
| vfr | timeline with 93 ticks and gaps 33, 67, 933 ms highlighted | 93 frames, 5 s, avg 18.477 | ff05 |
| cfr | Duel: 6.1.1 default 150 (57 dup) vs passthrough 93; 8.1.2 default 93 marked "published" | 150, 57, 93 | ff05 |
| rflag | two clocks: after -i 22 frames 2.2 s / fps=10 20 frames 2.0 s / before -i 60 frames 6 s | 22, 2.2, 20, 2.0, 60, 6 | ff16 |
| fps1 | FrameStrip 0..124 with frames 12, 37, 62 lit, 0.48 s marker; round=up row 0, 25, 50 | 12, 37, 62, 0.48 | ff25 |
| setpts | two bars: picture 5.07 s, audio 10.0 s, container 10.0 s; 152 of 300 frames | 5.07, 10.0, 152 | ff29 |
| atempo | bars aligned at 5 s; two pitch cells 440 Hz and 880 Hz | 5.0 s, 440, 880 | ff29 |
| loop | three plays on a 12 s ruler; 360 vs 355 frames, 11.83 s; 8.1.2 359 marked "published" | 360, 355, 11.83 | ff33 |
| loop2 | audio 4.1 s: 12.3 s with 0.13 s picture holes; -c copy: 0.1 s sound holes | 12.3, 0.13, 0.1 | ff33 |
| together | passthrough: 900 frames FrameStrip, timestamps repeating in groups, "450 distinct" Figure | 900, 450, 15 s | new (recipe control) |
| recipe | command Cmd, then Verdict rows: 900 frames, 900 timestamps, 16 to 17 ms, 15 s, 440 Hz | 900, 900, 16, 17, 15, 440 | new (recipe) |
| controls | three rows: -r 60 901 (frame 0 twice), no atempo 30 s vs 15 s, no rate 452 | 901, 30, 15, 452 | new (controls) |
| decide | decision table: want / command / chapter | none new | all |
| cheat | one-screen cheat sheet of six flags | none new | all |
| limits | not-tested list | none | all |
End card from `endCard: {}`.

## fs04 (1080x1920, 10 scenes, 424 words, about 2:52)
Keep content out of the bottom 420 px, right 140 px and top 200 px. One idea per scene, one big number each.
| id | on screen | measured value | source |
|---|---|---|---|
| hook | Figure "900 / 450" | 900, 450, 15 s | recipe control |
| method | two reader boxes | 6.1.1 | ff29 fixture |
| vfr | Figure 93 to 150, "57 duplicates" | 93, 150, 57 | ff05 |
| rflag | stack of three: 22 / 20 / 60 frames with seconds | 22, 2.2, 20, 6 | ff16 |
| fps1 | FrameStrip with 12, 37, 62 lit, "0.48 s" | 12, 37, 62, 0.48 | ff25 |
| setpts | two bars 5.07 s vs 10.0 s, then 5 s at 440 Hz | 5.07, 10.0, 5, 440 | ff29 |
| loop | 360 vs 355 frames | 360, 355, 11.83 | ff33 |
| together | passthrough: 900 frames, "450 distinct timestamps" | 900, 450, 15 | recipe control |
| recipe | Cmd (wrapped over lines) and 900 / 900 verdict | 900, 900, 16, 17, 440 | recipe |
| close | three controls in one line each, then "name the rate, check frames, timestamps, lengths" | 901, 30, 452 | controls |
