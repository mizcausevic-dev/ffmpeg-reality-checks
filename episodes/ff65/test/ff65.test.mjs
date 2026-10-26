import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, cases, commandOf, endOf, samplesOf, buildOf, SR, GUARD_S} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff65-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (id) => { assert.ok(ev.runs[id], `no case ${id}`); return ev.runs[id]; };
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);

t('the helpers behave: sample counts, end of a packet list, build detection, and every command text carries a hard -t', () => {
  assert.equal(samplesOf(5), 240000); assert.equal(samplesOf(4.3), 206400); assert.equal(endOf([[0, 1], [3, 1], [1, 1]]), 4);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
  for (const c of cases()) assert.match(commandOf(c), / -t [\d.]+ out\./, `every command is time bounded: ${c.id}`);
  for (const c of cases()) assert.ok(c.guard <= GUARD_S, c.id);
  assert.equal(GUARD_S, 20);
});

t('ffmpeg -version is recorded, and the sources are what the fixture promises: the wav files decode to exactly 144000 (3 s) and 336000 (7 s) samples', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(ev.sources.wavSamples[3], 144000); assert.equal(ev.sources.wavSamples[7], 336000); assert.equal(ev.sources.still, true);
  assert.equal(Object.keys(ev.runs).length, cases().length);
});

t('control: without apad a 3 s song under a 5 s picture just ends early: the file is 5.000 s, the picture 125 frames, the audio 144000 samples (3.000 s); with -shortest the whole file is 75 frames and 3.000 s', () => {
  const a = R('noapad'), b = R('noapad_shortest');
  assert.equal(a.framesDecoded, 125); assert.equal(a.samplesDecoded, 144000); near(a.fmtDur, 5, 0.002); near(a.aEnd, 3, 0.002); assert.equal(a.hitGuard, false);
  assert.equal(b.framesDecoded, 75); assert.equal(b.samplesDecoded, 144000); near(b.fmtDur, 3, 0.002); assert.equal(b.hitGuard, false);
});

t('apad alone never ends by itself: the file is exactly as long as the -t guard, 8.000 s (384000 samples) with an 8 s guard and 12.000 s (576000 samples) with a 12 s guard, in mkv, while the picture stays at 125 frames (5.000 s)', () => {
  for (const [id, guard] of [['apad_g8', 8], ['apad_g12', 12]]) {
    const r = R(id);
    assert.equal(r.hitGuard, true, id); near(r.fmtDur, guard, 0.002, id); near(r.aSec, guard, 0.0005, id); assert.equal(r.framesDecoded, 125, id); near(r.vEnd, 5, 0.002, id);
    if (isV6()) assert.equal(r.samplesDecoded, samplesOf(guard), id);
    assert.ok(r.aSec > ev.runs.noapad.aSec + guard - 3 - 0.001, 'the audio grew by the whole guard minus the song');
  }
  assert.ok(R('apad_g12').samplesDecoded - R('apad_g8').samplesDecoded === 4 * SR || !isV6(), 'four more seconds of guard give four more seconds of samples');
});

t('the same in mp4 with aac: the guard still sets the length (8.000 s, 125 frames of picture), the aac track decodes to 384000 samples (within one 1024 frame)', () => {
  const r = R('apad_g8_aac');
  assert.equal(r.hitGuard, true); near(r.fmtDur, 8, 0.002); assert.equal(r.framesDecoded, 125);
  assert.ok(Math.abs(r.samplesDecoded - samplesOf(8)) <= 1024, `${r.samplesDecoded}`);
});

t('known positive for the guard: only the cases with no other stop reach it (apad alone at 8 and 12 s, the looped picture with apad and -shortest, and -t 5 which is the stop itself); every other case ends by itself under its 20 s guard', () => {
  const hit = Object.values(ev.runs).filter((r) => r.hitGuard).map((r) => r.id).sort();
  assert.deepEqual(hit, ['apad_g12', 'apad_g8', 'apad_g8_aac', 'apad_t5', 'loop_apad_shortest']);
  for (const r of Object.values(ev.runs)) if (!r.hitGuard) assert.ok(r.fmtDur < 8, `${r.id} ${r.fmtDur}`);
});

t('-shortest ends the file at the end of the picture: 5.000 s and 125 frames at 25 fps, 150 at 30 fps, 5 at 1 fps; the audio is never longer than the picture and is up to 0.04 s short (238208 of 240000 samples in pcm on 6.1.1), the same count at every frame rate', () => {
  for (const [id, n] of [['apad_shortest', 125], ['apad_shortest_30', 150], ['apad_shortest_1', 5]]) {
    const r = R(id);
    assert.equal(r.framesDecoded, n, id); near(r.fmtDur, 5, 0.002, id); assert.equal(r.hitGuard, false, id);
    assert.ok(r.aSec <= r.vSec + 0.0005, `${id} audio not longer`); assert.ok(r.vSec - r.aSec < 0.05, `${id} audio short by ${r.vSec - r.aSec}`);
    if (isV6()) assert.equal(r.samplesDecoded, 238208, id);
  }
  assert.equal(R('apad_shortest_30').samplesDecoded, R('apad_shortest').samplesDecoded); assert.equal(R('apad_shortest_1').samplesDecoded, R('apad_shortest').samplesDecoded);
  assert.ok(R('apad_shortest').samplesDecoded < 240000);
  const aac = R('apad_shortest_aac');
  assert.equal(aac.framesDecoded, 125); if (isV6()) assert.ok(aac.aSec <= 5.0005 && 5 - aac.aSec < 0.05); else assert.ok(Math.abs(aac.aSec - 5) < 0.1, `aac ${aac.aSec}`); // ffmpeg 8.1.2 sometimes writes up to 77 ms more aac audio than the picture, and the amount varies between runs if (isV6()) assert.equal(aac.samplesDecoded, 239616);
});

t('whole_dur, pad_dur, pad_len and whole_len each stop by themselves and give exactly 240000 samples (5.000 s) from the 3 s song, against a 5 s picture of 125 frames', () => {
  for (const id of ['whole5', 'padd2', 'padlen', 'wholelen']) {
    const r = R(id);
    assert.equal(r.hitGuard, false, id); assert.equal(r.samplesDecoded, 240000, id); assert.equal(r.framesDecoded, 125, id); near(r.fmtDur, 5, 0.002, id); near(r.aEnd, 5, 0.002, id);
  }
});

t('whole_dur sets the audio length, not the file length: whole_dur=4 gives 192000 samples (4.000 s of audio under a 5.000 s picture of 125 frames), so the audio ends 1 s before the picture', () => {
  const r = R('whole4');
  assert.equal(r.samplesDecoded, 192000); near(r.aEnd, 4, 0.002); near(r.vEnd, 5, 0.002); near(r.fmtDur, 5, 0.002); assert.equal(r.framesDecoded, 125);
});

t('apad never cuts: a 7 s song with whole_dur=5 stays 336000 samples (7.000 s, longer than the 5 s picture), while -shortest cuts it to the picture; with or without apad the -shortest result is the same count, 239616 samples on 6.1.1', () => {
  const w = R('long_whole5'), s = R('long_apad_shortest'), n = R('long_noapad_shortest');
  assert.equal(w.samplesDecoded, 336000); near(w.fmtDur, 7, 0.002); assert.equal(w.framesDecoded, 125);
  assert.ok(s.samplesDecoded < 240000 && s.samplesDecoded > 235000); near(s.fmtDur, 5, 0.002);
  assert.equal(s.samplesDecoded, n.samplesDecoded); assert.equal(s.framesDecoded, n.framesDecoded);
  if (isV6()) assert.equal(s.samplesDecoded, 239616);
});

t('aac rounds the padded track to whole 1024 sample frames: whole_dur=5 and pad_dur=2 both decode to 240640 samples (235 x 1024, 5.013 s) while ffprobe says the audio packets end at 5.000 s', () => {
  for (const id of ['whole5_aac', 'padd2_aac']) {
    const r = R(id);
    assert.ok(Math.abs(r.samplesDecoded - 240000) <= 1024, id); assert.ok(r.samplesDecoded >= 240000, id); near(r.aEnd, 5, 0.002, id); near(r.fmtDur, 5, 0.002, id); assert.equal(r.framesDecoded, 125);
    if (isV6()) assert.equal(r.samplesDecoded, 235 * 1024, id);
  }
});

t('a picture that is not a whole number of seconds: 4.3 s at 25 fps is 108 frames (4.32 s); whole_dur=4.3 and pad_dur=1.3 give 206400 samples (4.300 s), 0.02 s shorter than the picture, and -shortest gives fewer samples than that', () => {
  const s = R('v43_shortest'), w = R('v43_whole'), p = R('v43_padd');
  for (const r of [s, w, p]) { assert.equal(r.framesDecoded, 108); near(r.fmtDur, 4.32, 0.002); }
  assert.equal(w.samplesDecoded, 206400); assert.equal(p.samplesDecoded, 206400); near(w.vSec - w.aSec, 0.02, 0.0005);
  assert.ok(s.samplesDecoded < w.samplesDecoded); if (isV6()) assert.equal(s.samplesDecoded, 205440);
});

t('the looped still picture is the real trap: apad with -shortest never ends (both streams are endless): it runs to the 8 s guard, 200 frames and 384000 samples; whole_dur=5 with -shortest ends at 5.000 s (125 frames, 240000 samples); without apad it ends at the 3 s song', () => {
  const a = R('loop_apad_shortest'), b = R('loop_whole5_shortest'), c = R('loop_noapad_shortest');
  assert.equal(a.hitGuard, true); assert.equal(a.framesDecoded, 200); near(a.fmtDur, 8, 0.002); near(a.aSec, 8, 0.0005);
  assert.equal(b.hitGuard, false); assert.equal(b.framesDecoded, 125); assert.equal(b.samplesDecoded, 240000); near(b.fmtDur, 5, 0.002);
  assert.equal(c.hitGuard, false); assert.equal(c.framesDecoded, 75); assert.equal(c.samplesDecoded, 144000);
});

t('the two readers agree: ffprobe video packet count equals the decoded frame count in every case, the video end from packets equals decoded frames over frame rate, the format duration is the later stream end, and the decoded audio length matches the packets (pcm within 0.002 s, aac within 0.032 s)', () => {
  for (const r of Object.values(ev.runs)) {
    assert.equal(r.packetsV, r.framesDecoded, r.id);
    near(r.vEnd, r.vSec, 0.0011, r.id);
    near(r.fmtDur, Math.max(r.vEnd, r.aEnd), 0.002, r.id);
    near(r.aEnd, r.aSec, r.fmt === 'pcm' ? 0.002 : 0.032, r.id);
  }
});

t('the readers can see all three states: picture longer than the audio (noapad), equal (whole5), audio longer than the picture (apad at the 8 s guard), so they do not call everything equal', () => {
  assert.ok(R('noapad').vSec - R('noapad').aSec > 1.9);
  assert.equal(R('whole5').vSec, R('whole5').aSec);
  assert.ok(R('apad_g8').aSec - R('apad_g8').vSec > 2.9);
});
