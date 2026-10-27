# fl01 / fs01 "Cutting": scene plan (phase A)

Running question: **Where does my cut really start, and where does it end?** Answer in one line: a re-encode is exact; a copy can only start and stop on whole packets and keyframes, so put keyframes where you cut, or re-encode. Palette (later): `signal`. Look for both: one big measured number per scene (`Figure`), a frame strip (`FrameStrip`) where frames are counted, `Cmd` for every command, `Verdict` for the check.

Source film tags: ff01 copy start, ff23 -ss/-to order, ff21 keyframes, ff32 -sseof, ff15 -shortest, NEW = measured in fl01 only.

## fl01 (landscape 1920x1080, 18 scenes, 956 words)
| id | on screen | measured value | source |
|---|---|---|---|
| hook | Figure "13 frames" over a 75-frame strip, caption "asked for 3 s from 7.5 s" | 13 frames, 0.52 s vs 75 frames | ff01 |
| ask | five numbered cards: flag order, copy vs re-encode, keyframes, from the end, -shortest | none (structure) | all |
| readers | two reader icons (md5, ffprobe/pixel code) and a control tick | 500 unique frames | ff23, ff01 |
| order | Cmd `-ss 5 -to 10 -i` / both after; strip 125 frames, source bar 5 to 10 s | 5 s, 125 frames | ff23 |
| after | Cmd `-ss 5 -i ... -to 10`; clock restart diagram; source bar 5 to 15 s | 10 s, 250 frames | ff23 |
| length | Cmd `-ss 5 -i ... -t 5`; `-to 10 -i` first 10 s | 5 s source 5 to 10; 250 frames | ff23 |
| copyBefore | timeline 0..20 s with keyframes at 0,5,10,15; packets bar 138 with 63 hidden | 7.52 s, 75 frames, 138 packets, 63 hidden | ff01 |
| copyAfter | same timeline, start jumps to 10 s; 13-frame strip; re-encode row 74 frames | 10 s, 13 frames, 74 frames re-encoded | ff01 |
| gop | 10 s bar with cuts at 3.2 and 6.8, keyframe ticks | 0, 3.2, 6.8 | ff21 |
| grid | three bars: grid 0,4,8; forced 3.2,6.8; added 2 | 0,4,8; 0,3.2,6.8; 0,2,3.2,6.8 | ff21 |
| sseof | 300-frame strip, window 210..299 vs 200..299 | 90, 100 frames, 3.333 s, 90 at -g 10, 87 vs 90 at -2.9 | ff32 |
| container | picture bar 10 s under audio bar 12 s, window of 3 s | 1 s picture, 30 frames, 3 s audio, 300 frames at -30 | ff32 |
| shortest | 125-frame strip cut at 73; re-encode 75; 8 s tone case | 73 of 125, 75, file 8 s vs 5 s | ff15 |
| tcopy | 75-frame target line, copy markers at 73 and 77 | 77 frames, 3.08 s, 75 re-encoded | NEW |
| recipe | numbered 600-frame clip, window 225..314; Verdict card reencode ok, control fail | 90 frames, 15 frames from 300 | NEW |
| prepared | packets bar 165 (75 hidden) vs 90; keyframes at 7.5 and 10.5 | 165 / 75 / 90 | NEW |
| sheet | one-screen cheat sheet of four commands | none (summary of the above) | all |
| close | "not tested" list, end card | 6.1.1 | all |

## fs01 (vertical 1080x1920, 11 scenes, 424 words, keep out of bottom 420 px, right 140 px, top 200 px)
| id | on screen | measured value | source |
|---|---|---|---|
| hook | huge "13 frames" with "asked for 3 s" | 13 frames, 0.52 s | ff01 |
| copyBefore | stacked: timeline with 5 s keyframes, packets 138 / 63 hidden | 7.52 s, 75, 138, 63 | ff01 |
| copyAfter | start jumps to 10 s, 13-frame strip, re-encode 74 | 10 s, 13, 74 | ff01 |
| order | two Cmd cards, 10 s vs 5 s | 10 s source 5 to 15; 5 s | ff23 |
| gop | ticks 0, 3.2, 6.8 then 0, 4, 8 | as ff21 | ff21 |
| forced | Cmd force_key_frames, ticks exact | 3.2, 6.8 | ff21 |
| recipe | Verdict pair: re-encode 90 ok, control 15 from 300 fail | 90; 15; 300 | NEW |
| prepared | 165 / 75 hidden vs 90 / 90 | 165, 75, 90 | NEW |
| sseof | window 210..299 vs 200..299 | 90, 100, 3.333 s | ff32 |
| shortest | three bars 73, 77, 75 | 73 of 125, 77, 75 | ff15, NEW |
| close | two-line rule, not-tested list | 6.1.1 | all |
