# fl02 / fs02 plan: Gapless audio (palette later: phosphor)

Running question (long film): "Where does my audio really start after an encode, a join or a cut, and who tells the decoder?"
Answer in one line: the file carries a note (MP3 Info tag, Opus pre-skip, mp4 edit list); the decoder removes exactly what the note says; `-c copy` joins and cuts lose or rewrite the note; trim and re-encode once.
Hook number: 2112 samples at the seam instead of 200. Thumbnail: "2112 / SAMPLES AT THE SEAM, NOT 200" (red).
Evidence: `node episodes/fl02/fixture/run.mjs` writes `out/fl02/evidence.json`; the numbers below are keys in it (`ff08`, `ff46`, `ff78`, `ff79`, `bridge`, `recipe`, `facts`).

## LONG film fl02 (1920x1080), 16 scenes, 921 words, about 6:13 of speech (6:24 with lead and end card)

| id | on screen | measured value | source |
|---|---|---|---|
| ask | two files, each with a click 100 samples from both ends; a seam ruler with 200 wanted and 2112 measured, a gap bar | recipe.control seam 200, recipe.copy seam 2112 (48 ms) | new (recipe) with ff08 |
| rule | three cards: MP3 Info tag, Opus header, AAC mp4 edit list; "decoder removes what the note says" | none (concept) | all |
| mp3raw | Figure "+1105"; sample ruler with the impulse at 4410 (control) and at 5515; 46,080 vs 44,100 | ff78 control 4410; imp_cbr_raw peak 5515, 1105 late, 46080 samples | ff78 |
| mp3tag | hex strip of the Info frame, `24 05 7c` split into delay 576 and padding 1404; skip 576 + 529 = 1105, trim 875 | ff78 imp_cbr_tag mp3.delay, mp3.padding, facts.mp3Skip, mp3Trim | ff78 |
| opushead | OpusHead hex with `38 01` highlighted = 312 samples = 6.5 ms; four containers with click at 4800 | ff79 encodes.*.head.preSkip, click 4800, control 4800 | ff79 |
| opuslie | Duel: pre-skip 0 gives click 5112 (312 late), 1000 gives 4112 (688 early) | ff79 patched.ogg_0, ogg_1000 | ff79 |
| aacnote | mp4 box tree (moov, trak, edts, elst) with the edit "2000 ms, media 1024"; counter 89,088 vs 90,112 (edit list ignored) | bridge.single | ff08 + ff46 + new bridge |
| editlist | -itsoffset 1: empty edit 1000 ms; -itsoffset -1: mp4 skips 48,000 (144,000 decode) vs mkv 192,000 | ff46 mp4.aPlus, mp4.aMinus, mkv.aMinus | ff46 |
| aacjoin | two files merging into one: 176 packets, edit list 4024 ms media 0, 180,224 vs 176,400, 3,824 = 2 x (1,024 + 888) | ff08 join, accounting; bridge.join | ff08 |
| seam | waveform strip with four clicks: PCM control 100/88100/88300/176300, copy join 1124/89124/91236/179236, untrimmed re-encode seam 1088 | recipe.control, copy, notrim | new (recipe) |
| cutmp3 | tag delay 3567, decoder drops 4096, cut 3981 late; re-encode exact 22,050 | ff78 cuts.copyBefore5, reencode5 | ff78 |
| cutopus | 960-sample packets (20 ms): mkv before -960, mkv after 0, ogg after +960; re-encode 24,000 | ff79 cuts.mkvBefore, mkvAfter, oggAfter, reencode | ff79 |
| which | decision table: join AAC, exact cut, gapless playback, with the command for each | none (decision) | all |
| recipe | the recipe command; clicks 100/88100/88300/176300 beside the control; edit list 4000 ms, 174 packets, ffprobe 4 s | recipe.recipe (readers: decoder, bytes, ffprobe) | new (recipe) |
| cheat | one-screen cheat sheet: where to read the note per codec, what to count after a copy | none | all |
| close | Not tested list, ffmpeg 6.1.1, end card follows | none | all |

## SHORT cut fs02 (1080x1920), 11 scenes, 418 words, about 2:49 of speech (2:55 with lead and 4 s end card)
Keep content out of the bottom 420 px, right 140 px, top 200 px. One idea chain: hook, the note, three notes, the join loses the note, where the samples go, the fix, proof.

| id | on screen | measured value | source |
|---|---|---|---|
| hook | stacked seam ruler: 200 wanted, 2112 measured | seam 200 vs 2112 | recipe |
| rule | three stacked cards (MP3 tag, Opus header, AAC edit list) | none | all |
| mp3 | Figure "+1105" with impulse at 4410 and 5515; tag delay 576 + 529 | ff78 | ff78 |
| opus | pre-skip 312 box; two lines: 0 gives 312 late, 1000 gives 688 early | ff79 patched | ff79 |
| aac | edit list "2000 ms from 1024"; 90,112 vs 89,088 | bridge.single | ff08/ff46 + bridge |
| join | edit list 4024 ms from 0; 180,224; 3,824 extra | ff08, bridge.join | ff08 |
| seam | sum bar: 200 + 888 + 1,024 = 2,112; untrimmed re-encode 1,088 | recipe | recipe |
| cut | `-ss 0.5 -c copy` MP3: delay 3567, 3,981 late; re-encode 22,050 | ff78 | ff78 |
| fix | recipe command in short lines; clicks 100, 88100, 88300, 176300 | recipe.recipe | recipe |
| proof | seam 200 beside the control; 4000 ms, 174 packets, 4 s | recipe.recipe | recipe |
| close | check line and Not tested | none | all |

## Open points for the orchestrator
- `n` is 102 (fl02) and 202 (fs02) so it cannot collide with ff02; change it if the engine wants another scheme.
- fs02 has `endCard: {"seconds": 4}` so the vertical film stays under 3:00; the long film uses the default 10 s end card.
- Palette is "lab" until the phosphor palette lands; switch `palette` in both script.json files then.
