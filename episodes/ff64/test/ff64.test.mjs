import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, cases, commandOf, caseId, endOf, samplesOf, floorFrames, roundFrames, buildOf, AUDIO, SR, GUARD_S, NONE_GUARD_S} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff64-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (opt, aud, fps, fmt, src = 'wav', x = '') => {
  const id = caseId({opt, aud, fps, fmt, src, x});
  assert.ok(ev.runs[id], `no case ${id}`);
  return ev.runs[id];
};
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const wavShortest = () => Object.values(ev.runs).filter((r) => r.opt === 'shortest' && r.src === 'wav');
const copyRuns = (x) => Object.values(ev.runs).filter((r) => r.fmt === 'copy' && r.x === x);

t('the helpers behave: frame rules, sample counts, end of a packet list, build detection, command text carries a hard -t', () => {
  assert.equal(floorFrames(4.3, 30), 129); assert.equal(floorFrames(4.3, 25), 107); assert.equal(floorFrames(4.99, 1), 4); assert.equal(roundFrames(4.3, 25), 108); assert.equal(roundFrames(4.99, 1), 5);
  assert.equal(samplesOf(4.3), 206400); assert.equal(endOf([[0, 1], [3, 1], [1, 1]]), 4);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
  for (const c of cases()) assert.match(commandOf(c), / -t [\d.]+ out\./, `every command is time bounded: ${c.id}`);
  assert.equal(GUARD_S, 20); assert.equal(NONE_GUARD_S, 8);
});

t('ffmpeg -version is recorded, and the sources are what the fixture promises: the wav files decode to exactly 4.0, 4.3, 4.37 and 4.99 s of samples at 48000 Hz, the m4a to 206848 samples (203 aac frames of 1024 minus the 1024 of priming)', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  for (const a of AUDIO) assert.equal(ev.sources.wavSamples[a], samplesOf(a), `${a} s`);
  assert.equal(ev.sources.m4aSamples, 203 * 1024 - 1024); assert.equal(ev.sources.still, true);
  assert.equal(Object.keys(ev.runs).length, cases().length);
});

t('control: a 4.0 s song is a whole number of frames at 25, 30, 24 and 1 fps, so with -shortest the picture is exactly as long as the song (100, 120, 96 and 4 frames, 4.000 s), nothing longer, nothing shorter', () => {
  for (const [fps, n] of [[25, 100], [30, 120], [24, 96], [1, 4]]) {
    const r = R('shortest', 4, fps, 'pcm');
    assert.equal(r.framesDecoded, n, `${fps} fps`); assert.equal(r.vSec, 4); assert.equal(r.aSec, 4); assert.equal(r.gap, 0); assert.equal(r.samplesDecoded, samplesOf(4));
  }
});

t('with -shortest and the song re-encoded (pcm in mkv, aac in mp4) the picture is never longer than the song: it stops after floor(song x fps) frames, so it is 0 to just under one frame period short, at every length and frame rate', () => {
  const runs = wavShortest(); assert.equal(runs.length, 32);
  for (const r of runs) {
    assert.ok(r.gap <= 0.011, `${r.id} gap ${r.gap}`);               // aac decodes 448 samples long, so up to 0.011 s more audio than the packets say
    assert.ok(r.gap > -1 / r.fps - 0.012, `${r.id} gap ${r.gap} is within one frame period`);
    if (isV6()) assert.equal(r.framesDecoded, floorFrames(r.aud, r.fps), r.id);
  }
});

t('at 1 fps the picture ends up to a second before the song: 4.3 s of song gives 4 frames (0.30 s short), 4.37 s gives 4 (0.37 s), 4.99 s gives 4 (0.99 s), in pcm and in aac', () => {
  for (const [aud, short] of [[4.3, 0.3], [4.37, 0.37], [4.99, 0.99]]) for (const fmt of ['pcm', 'aac']) {
    const r = R('shortest', aud, 1, fmt);
    assert.equal(r.framesDecoded, 4, `${aud} ${fmt}`); near(r.vSec - r.aSec, -short, 0.012, `${aud} ${fmt}`);
    near(r.aEnd - r.vEnd, short, 0.002, `${aud} ${fmt} pts ends`);
  }
});

t('-t set to the song length can make the picture longer: it rounds to the nearest frame, so 4.3 s at 25 fps gives 108 frames (4.32 s, 0.02 s longer) and 4.99 s gives 125 (5.00 s, 0.01 s longer), while at 1 fps 4.3 s gives 4 frames and 4.99 s gives 5', () => {
  const a = R('tdur', 4.3, 25, 'pcm'), b = R('tdur', 4.99, 25, 'pcm'), c = R('tdur', 4.99, 1, 'pcm'), d = R('tdur', 4.3, 1, 'pcm');
  assert.ok(a.gap > 0 && b.gap > 0 && c.gap > 0, 'video longer than audio');
  assert.ok(d.gap < 0);
  for (const r of [a, b, c, d, R('tdur', 4.37, 25, 'pcm'), R('tdur', 4, 25, 'pcm')]) near(r.framesDecoded, roundFrames(r.aud, r.fps), 0, r.id);
  if (isV6()) { assert.equal(a.framesDecoded, 108); near(a.gap, 0.02, 0.001); assert.equal(b.framesDecoded, 125); near(b.gap, 0.01, 0.001); assert.equal(c.framesDecoded, 5); assert.equal(d.framesDecoded, 4); }
});

t('known positive for "video longer than the song": with no stop option the picture runs to the -t guard, 200 frames (8.00 s) at 25 fps and 8 frames at 1 fps, against 4.3 s of song: 3.7 s too long, in mkv and mp4', () => {
  for (const fmt of ['pcm', 'aac']) {
    const a = R('none', 4.3, 25, fmt), b = R('none', 4.3, 1, fmt);
    assert.equal(a.framesDecoded, 200); assert.equal(a.vSec, 8); near(a.gap, 3.7, 0.012); assert.equal(b.framesDecoded, 8); near(b.gap, 3.7, 0.012);
    near(a.vEnd, NONE_GUARD_S, 0.001); near(a.fmtDur, 8, 0.001);
  }
});

t('-fflags +shortest does not stop at the end of the song: at 25 fps the picture is 250 frames (10.00 s) against 4.3 s of song, 5.7 s too long, and at 30 fps 300 frames, in mkv and mp4; plain -shortest on the same inputs stops at 107 and 129 frames', () => {
  for (const fmt of ['pcm', 'aac']) {
    const a = R('fflags', 4.3, 25, fmt), b = R('fflags', 4.3, 30, fmt);
    if (a.refused || b.refused) { assert.equal(isV6(), false, 'the 6.1.1 build accepts the flag'); assert.ok(a.refused && b.refused); assert.match(a.error, /fflags/); continue; }
    assert.ok(a.vSec > 9.9 && a.gap > 5.5, `${fmt} 25 fps`); assert.ok(b.vSec > 9.9 && b.gap > 5.5, `${fmt} 30 fps`);
    assert.equal(R('shortest', 4.3, 25, fmt).framesDecoded, 107); assert.equal(R('shortest', 4.3, 30, fmt).framesDecoded, 129);
    assert.ok(a.vSec > 2 * R('shortest', 4.3, 25, fmt).vSec);
    if (isV6()) { assert.equal(a.framesDecoded, 250); assert.equal(b.framesDecoded, 300); near(a.vEnd, 10, 0.001); }
  }
});

t('-shortest_buf_duration 0.2: no change at 25 fps (107 frames), but at 1 fps the picture is 6 frames (6.00 s), 1.7 s longer than the 4.3 s song (build specific, so exact numbers are for 6.1.1)', () => {
  for (const fmt of ['pcm', 'aac']) {
    // ffmpeg 8.1.2: the option no longer leaves 25 fps alone (149 to 153 frames) and at 1 fps the picture runs to the 20 s guard while only 0.683 s of audio is written
    if (isV6()) assert.equal(R('bufdur', 4.3, 25, fmt).framesDecoded, 107); else assert.ok(R('bufdur', 4.3, 25, fmt).framesDecoded > 107);
    const r = R('bufdur', 4.3, 1, fmt);
    assert.ok(r.vSec >= 4); if (!isV6()) assert.ok(r.vSec > 4.3); if (isV6()) { assert.equal(r.framesDecoded, 6); assert.ok(r.gap > 1.6); }
  }
});

t('copying the song (-c:a copy of an aac file) with -shortest makes the picture end early: 105 frames (4.20 s) at 25 fps instead of 107, and 1 frame (1.00 s) at 1 fps against a 4.3 s song, 3.3 s short; the song itself is intact (4.300 s of packets)', () => {
  const runs = copyRuns('');
  assert.equal(runs.length, 6);
  // ffmpeg 8.1.2 at 1 fps: the copied song gives 9 frames (9.00 s), longer than the song, instead of 1 frame
  for (const r of runs) { near(r.aEnd, 4.3, 0.002, r.id); if (isV6()) assert.ok(r.framesDecoded < floorFrames(4.3, r.fps), `${r.id} frames ${r.framesDecoded}`); }
  const a = R('shortest', 4.3, 25, 'copy', 'm4a'), b = R('shortest', 4.3, 1, 'copy', 'm4a');
  if (isV6()) assert.ok(a.vSec < R('shortest', 4.3, 25, 'aac').vSec);
  if (isV6()) { assert.ok(b.vSec < R('shortest', 4.3, 1, 'aac').vSec); assert.ok(b.vSec <= 1 && b.aSec - b.vSec > 3); } 
  if (isV6()) { assert.equal(a.framesDecoded, 105); assert.equal(b.framesDecoded, 1); assert.equal(R('shortest', 4.3, 2, 'copy', 'm4a').framesDecoded, 5); assert.equal(R('shortest', 4.3, 10, 'copy', 'm4a').framesDecoded, 41); }
});

t('the cause is frames waiting inside the video encoder: with -bf 0 (no B-frames) the copied-song outputs get the full count again (107, 129, 103, 43, 8, 4 frames), and ffv1, which has no encoder delay, gives 107 at 25 fps and 4 at 1 fps with the song copied', () => {
  // ffmpeg 8.1.2 at 1 fps: the copied song with -bf 0 gave 4 frames in some runs and 8 in others, so only 25 to 2 fps are exact there
  // ffmpeg 8.1.2: the frame counts of every copied-song output changed from run to run (30 fps gave 126 to 129 frames), so only 6.1.1 is exact
  for (const r of copyRuns('bf0')) { if (!isV6()) { assert.ok(r.framesDecoded >= 1, r.id); continue; } assert.equal(r.framesDecoded, floorFrames(4.3, r.fps), r.id); }
  for (const r of copyRuns('')) if (isV6()) assert.ok(R('shortest', 4.3, r.fps, 'copy', 'm4a', 'bf0').framesDecoded > r.framesDecoded, `${r.fps} fps: -bf 0 restores frames`);
  assert.equal(R('shortest', 4.3, 25, 'copy', 'm4a', 'ffv1').framesDecoded, 107); assert.equal(R('shortest', 4.3, 1, 'copy', 'm4a', 'ffv1').framesDecoded, 4);
});

t('the two readers agree: ffprobe video packet count equals the decoded frame count in every case, the video end from packet timestamps equals decoded frames over frame rate when timestamps are contiguous, and the decoded audio length matches the packets (pcm exactly, aac within 0.012 s)', () => {
  for (const r of Object.values(ev.runs)) {
    if (r.refused) continue;
    assert.equal(r.packetsV, r.framesDecoded, r.id);
    if (r.ptsContiguous) near(r.vEnd, r.vSec, 0.0011, r.id);
    if (r.fmt === 'pcm') near(r.aEnd, r.aSec, 0.0011, r.id);
    else near(r.aEnd, r.aSec, 0.032, r.id);
    const cutAudio = !isV6() && r.opt === 'bufdur' && r.fps === 1; // 8.1.2 writes only 0.683 s of audio here
    if (cutAudio) { assert.ok(r.samplesDecoded < samplesOf(r.aud), `${r.id} audio cut`); continue; }
    if (r.fmt === 'pcm' && r.src === 'wav') assert.equal(r.samplesDecoded, samplesOf(r.aud), `${r.id} audio intact`);
    if (r.fmt === 'aac') assert.ok(r.samplesDecoded - samplesOf(r.aud) >= 0 && r.samplesDecoded - samplesOf(r.aud) <= 1024, `${r.id}: aac decodes up to one frame of padding more`);
    if (r.src === 'm4a') assert.ok(Math.abs(r.samplesDecoded - ev.sources.m4aSamples) <= 1024 + 100, `${r.id}: the copied song is not cut`);
  }
});

t('the container duration is the longer of the two streams: 4.3 s when the picture is shorter than the song, 8.0 s when it runs to the guard', () => {
  near(R('shortest', 4.3, 1, 'pcm').fmtDur, 4.3, 0.002); near(R('shortest', 4.3, 1, 'aac').fmtDur, 4.3, 0.002); near(R('none', 4.3, 25, 'pcm').fmtDur, 8, 0.002);
  for (const r of Object.values(ev.runs)) if (!r.refused && r.ptsContiguous && r.fmt !== 'copy') near(r.fmtDur, Math.max(r.vEnd, r.aEnd), 0.002, r.id);
});

t('the readers can see all three states: the sign of video minus audio is negative for -shortest at 1 fps, zero for the control, positive for no stop option, so the readers do not call everything equal', () => {
  assert.ok(R('shortest', 4.3, 1, 'pcm').gap < -0.2); assert.equal(R('shortest', 4, 25, 'pcm').gap, 0); assert.ok(R('none', 4.3, 25, 'pcm').gap > 3);
});
