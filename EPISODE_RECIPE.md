# Episode recipe (ff26 onward, "lab" look)

One question per film, answered by a synthetic fixture that is measured twice, with a control and a "not tested" list.
Exemplars to copy structure from: `episodes/ff22`, `ff23`, `ff24`, `ff25` (fixture, test, script.json, Scenes.tsx, index.tsx, distribution kit).

## Rules (non-negotiable)
1. Synthetic input only (ffmpeg `lavfi` sources). No network, no user media, no real footage.
2. Every number on screen, in the script, in the description and in the pinned comment comes from a command you ran. If a command does not give a surprising, measurable result, say so in your report and stop: do not invent a finding.
3. Two independent readers for every claim (for example frame md5 and decoded pixel or sample values; ffprobe and a raw read). A known-positive control proves each reader can see the effect.
4. Record `ffmpeg -version` in the evidence. Tests assert behavior that holds on ffmpeg 6.1.1 (this container) and 8.1.2 (the PC). You can only run 6.1.1. Assert only what you measured, avoid exact encoder byte counts, and list in your report any assertion you think could differ on 8.1.2 so it can be checked there.
5. Every episode ends with a "not tested" statement (other builds, real footage, players you did not run).
6. No em dashes anywhere. Flags are case-sensitive: never uppercase them. Spoken narration spells flags the way `ff25/script.json` does ("dash v f", "equals").

## Files to create in `episodes/ffNN/`
- `fixture/experiment.mjs` (the measurement, exports functions) and `fixture/run.mjs` (prints and writes evidence). Use helpers from `tools/ff.mjs` (read only; do not edit it).
- `test/ffNN.test.mjs` (`node --test`, one test per claim, plus a known-positive control and a reader-agreement test). Run it three times to check for flakiness.
- `script.json` (see ff25): `n`, `slug`, `palette: "lab"`, `series: "FFmpeg Reality Checks"`, `title`, `fullTitle` (at most 74 chars), `kicker: "Episode NN"`, `thumb: {number, label, color}`, `endCard: {}`, `hero`, `scenes` (6 scenes, about 100 to 115 seconds of narration in total, each with `id`, `chapter`, `narration`, `captions`, optional `sim: null`).
  - `thumb.number` is the single most surprising measured value (short: "73 of 125", "-6 dB", "10 s"). `thumb.label` is at most 28 characters, uppercase-friendly. `thumb.color` is one of red, cyan, amber, green.
- `video/Scenes.tsx` and `video/index.tsx` (copy ff25's `index.tsx`, keep the label `'SYNTHETIC TEST CLIP'`).
- `content/distribution.md`, generated from a data file `dist_ffNN.py` kept in the session scratchpad (copy `dist_ff25.py`; run it from `episodes/` so it can read `ffNN/script.json`). Limits enforced by `gen_dist.py`: each title option at most 60 characters, pinned comment at most 300, exactly 15 tags. The description carries the measured numbers.
- `outline-row.md`: one markdown table row for `SERIES_OUTLINE.md` (copy the format of row 25): question, the measured results, and what was not tested.

## Visual rules for Scenes.tsx (palette `lab`)
- Use only `C.*` keys from `kit/theme`: `C.cyan` is indigo (expected or baseline), `C.amber` is ochre (doubt), `C.red` is madder (the surprise or the failure), `C.green` is olive (verified or fixed). Never write a hex color, never use teal, cyan, glow, or gradients of your own.
- Components in `kit/Sym` (already used in ff25): `Halo`, `Head`, `Mid`, `Cmd`, `Duel`, `Row`, `Verdict`, `Cells`, `Mirror`, `FrameBox`, plus the new `FrameStrip` (numbered film frames with sprocket holes) and `Figure` (one huge measured number with a caption). Use `Figure` or `FrameStrip` in at least one scene.
- Safe vertical zone is y 120 to 880. The caption bar owns y >= 950 and the episode tag owns y <= 90. Nothing may overlap another element. Fit long values by lowering `valueSize`.
- Big Shoulders Display (titles and values) is condensed; B612 is the body face; B612 Mono is for commands and numbers.

## Checks before you report
1. `node --test episodes/ffNN/test/ffNN.test.mjs` passes three times in a row.
2. Render QA stills in a private engine clone and look at every still (Read tool on the PNG):
   ```
   git clone -q /home/claude/wrc /tmp/e-ffNN
   ln -s /home/claude/wrc/video/node_modules /tmp/e-ffNN/video/node_modules
   cd /tmp/e-ffNN && node tools/ship.mjs --series /home/claude/ffmpeg-reality-checks ffNN --stills --skip-tests
   ```
   (`--stills` needs `content/distribution.md` to exist first and writes `episodes/ffNN/qa/`.) Fix overlaps and clipped text, re-run.
3. Every number in `script.json` and `distribution.md` matches the evidence file. Grep for it.
4. Do not commit, do not push, do not touch another episode, the kit, the engine, or shared files. Do not use the PC. Do not upload or publish anything.

## Report back (short)
The question, the measured result (numbers), the control, the two readers, tests passing, any assertion that might differ on 8.1.2, what was not tested, and whether the finding is strong enough to ship (yes, weak, or no finding).
