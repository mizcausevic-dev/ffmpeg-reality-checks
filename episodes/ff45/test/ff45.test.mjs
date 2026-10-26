import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, markerOfLuma, lumaOfMarker, sourceTimeAt, repeats, buildOf, SR, SRC_FRAMES} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff45-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (c, v) => ev.runs[`${c}.${v}`];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const CONT = ['mov', 'mkv'];
const CUT = Array.from({length: 25}, (_, i) => 25 + i);
const seq = (a, b) => assert.deepEqual(a, b);

t('the helpers behave: luma 16 + 2 N round-trips to N, repeats counts consecutive equal items, a synthetic 0.05 + 0.2 t tone reads back its own time, build detection', () => {
  for (const n of [0, 25, 49, 99]) assert.equal(markerOfLuma(lumaOfMarker(n)), n);
  assert.equal(repeats([1, 1, 1, 2, 2, 3]), 3); assert.equal(repeats([1, 2, 3]), 0);
  const s = new Float64Array(SR * 3); for (let i = 0; i < s.length; i++) { const tt = i / SR; s[i] = Math.sin(2 * Math.PI * 480 * tt) * (0.05 + 0.2 * tt); }
  near(sourceTimeAt(s, 0), 0, 0.01); near(sourceTimeAt(s, SR), 1, 0.01); near(sourceTimeAt(s, 2 * SR), 2, 0.01);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, and the source is what the fixture promises: 100 frames whose decoded luma names their own index, 4 s of tone whose amplitude reads 0, 1 and 2 s at those places', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(ev.source.frames, SRC_FRAMES); assert.equal(ev.source.markersAreIndexes, true);
  assert.equal(ev.srcMd5.length, SRC_FRAMES); assert.equal(new Set(ev.srcMd5).size, SRC_FRAMES, 'every source frame is different');
  assert.equal(ev.source.audioSeconds, 4);
  near(ev.source.audioAt0, 0, 0.02); near(ev.source.audioAt1, 1, 0.02); near(ev.source.audioAt2, 2, 0.02);
});

t('control: -ss 1 -t 1 (before or after -i) gives 25 frames that are source frames 25 to 49, starting at time 0, no repeats, and 1.000 s of audio that starts at source 1.0 s and begins at time 0, in both containers', () => {
  for (const c of CONT) for (const v of ['ctl', 'ctlout']) {
    const r = R(c, v), k = `${c}.${v}`;
    assert.equal(r.video.framesMd5, 25, k); assert.equal(r.video.framesRaw, 25, k); assert.equal(r.video.packets, 25, k);
    seq(r.video.markers, CUT); seq(r.video.md5, ev.srcMd5.slice(25, 50));
    assert.equal(r.video.repeatsMd5, 0, k); near(r.video.firstPtsProbe, 0, 0.001, k); near(r.video.firstPtsMd5, 0, 0.001, k); near(r.video.endTime, 1, 0.001, k);
    assert.equal(r.audio.samples, SR, k); near(r.audio.firstSourceTime, 1, 0.02, k); near(r.audio.firstPtsProbe, 0, 0.003, k); near(r.audio.endProbe, 1, 0.03, k);
    assert.equal(r.audio.audioHash, ev.srcCutAudioHash, `${k} audio samples equal source 1 s to 2 s`);
    near(r.audioLate, 0, 0.02, k);
  }
});

t('known-positive control: trim and atrim WITH setpts and asetpts equal the -ss/-t cut frame for frame (same 25 frame md5s, same first time 0) and sample for sample (same audio md5), in both containers', () => {
  for (const c of CONT) {
    const f = R(c, 'fix'), k = R(c, 'ctl');
    seq(f.video.md5, k.video.md5); seq(f.video.markers, k.video.markers);
    assert.equal(f.video.framesMd5, 25); near(f.video.firstPtsProbe, 0, 0.001); near(f.video.firstPtsMd5, 0, 0.001); near(f.video.endTime, 1, 0.001);
    assert.equal(f.audio.audioHash, k.audio.audioHash); near(f.audio.firstPtsProbe, 0, 0.003); near(f.audioLate, 0, 0.02);
  }
});

t('known-positive control, readers can see it: with an explicit -fps_mode cfr the same trim without setpts gives 50 frames of which 25 are repeats of source frame 25, seen by frame md5 (25 repeats, run of 26) and by raw luma (25 repeats), and its md5 list is not the control list', () => {
  for (const c of CONT) {
    const r = R(c, 'rawCfr'), k = R(c, 'ctl'), kk = `${c}.rawCfr`;
    assert.equal(r.video.framesMd5, 50, kk); assert.equal(r.video.framesRaw, 50, kk); assert.equal(r.video.packets, 50, kk);
    assert.equal(r.video.repeatsMd5, 25, kk); assert.equal(r.video.repeatsRaw, 25, kk); assert.equal(r.video.longestRunMd5, 26, kk); assert.equal(r.video.uniqueMd5, 25, kk);
    assert.equal(r.video.firstMarker, 25, kk); assert.equal(r.video.lastMarker, 49, kk);
    assert.deepEqual(r.video.markers.slice(0, 26), Array(26).fill(25), kk); seq(r.video.markers.slice(26), CUT.slice(1));
    assert.notDeepEqual(r.video.md5, k.video.md5, kk);
    near(r.video.firstPtsProbe, 0, 0.001, kk); near(r.video.endTime, 2, 0.001, kk);
  }
});

t('with an explicit -fps_mode passthrough the same trim without setpts has no repeats and the right frames (same 25 md5s as the control), but the first frame is at 1.000 s, not 0: a 1 s gap that only the timestamps show; ffprobe packets and framemd5 with -copyts agree', () => {
  for (const c of CONT) {
    const r = R(c, 'rawPass'), k = R(c, 'ctl'), kk = `${c}.rawPass`;
    assert.equal(r.video.framesMd5, 25, kk); assert.equal(r.video.repeatsMd5, 0, kk); assert.equal(r.video.repeatsRaw, 0, kk);
    seq(r.video.md5, k.video.md5); seq(r.video.markers, CUT);
    near(r.video.firstPtsProbe, 1, 0.001, kk); near(r.video.firstPtsMd5, 1, 0.001, kk); near(r.video.endTime, 2, 0.001, kk);
    near(r.video.lastPtsProbe, 1.96, 0.001, kk);
  }
});

t('pixels alone cannot see the gap: the .mkv trim without setpts has exactly the control frame hashes and luma markers, yet its first frame is at 1.000 s instead of 0.000 s (default frame-rate mode of the matroska muxer on this build)', () => {
  const r = R('mkv', 'raw'), k = R('mkv', 'ctl');
  seq(r.video.md5, k.video.md5); seq(r.video.markers, k.video.markers);
  assert.equal(r.video.framesMd5, 25); assert.equal(r.video.repeatsMd5, 0);
  near(r.video.firstPtsProbe, 1, 0.001); near(r.video.firstPtsMd5, 1, 0.001); near(k.video.firstPtsProbe, 0, 0.001);
});

t('the default frame rate mode is not the same on both builds. mkv, both builds: 25 frames, no repeats, first frame at 1.000 s. mov on 6.1.1: 50 frames, 25 repeats of frame 25, ends at 2.000 s; mov on 8.1.2: 25 frames, first frame at 1.000 s, same as mkv. Each default equals the explicit mode it behaves like', () => {
  const m = R('mov', 'raw'), k = R('mkv', 'raw');
  assert.equal(k.video.framesMd5, 25); assert.equal(k.video.repeatsMd5, 0); near(k.video.firstPtsProbe, 1, 0.001); near(k.video.endTime, 2, 0.001);
  seq(k.video.md5, R('mkv', 'rawPass').video.md5); near(k.video.firstPtsProbe, R('mkv', 'rawPass').video.firstPtsProbe, 0.001);
  const build = buildOf(ev.ffmpeg);
  if (build === 'v6') {
    assert.equal(m.video.framesMd5, 50); assert.equal(m.video.repeatsMd5, 25); assert.equal(m.video.repeatsRaw, 25); near(m.video.endTime, 2, 0.001); near(m.video.firstPtsProbe, 0, 0.001);
    seq(m.video.md5, R('mov', 'rawCfr').video.md5);
  } else if (build === 'v8') {
    assert.equal(m.video.framesMd5, 25); assert.equal(m.video.repeatsMd5, 0); near(m.video.firstPtsProbe, 1, 0.001); near(m.video.endTime, 2, 0.001);
    seq(m.video.md5, R('mov', 'rawPass').video.md5);
  }
});

t('writing the mode out removes the build difference: -fps_mode cfr gives 50 frames with 25 repeats and -fps_mode passthrough gives 25 frames starting at 1.000 s, in both containers, on whichever build ran', () => {
  for (const c of CONT) {
    assert.equal(R(c, 'rawCfr').video.framesMd5, 50, c); assert.equal(R(c, 'rawCfr').video.repeatsMd5, 25, c);
    assert.equal(R(c, 'rawPass').video.framesMd5, 25, c); near(R(c, 'rawPass').video.firstPtsProbe, 1, 0.001, c);
  }
});

t('audio: atrim without asetpts keeps the source timestamps, so the 48000 samples (1.000 s, identical to the control samples) start at 1.000 s in both containers; with asetpts they start at 0', () => {
  for (const c of CONT) {
    for (const v of ['raw', 'vonly', 'rawCfr', 'rawPass']) {
      const a = R(c, v).audio; assert.equal(a.samples, SR, `${c}.${v}`); near(a.firstPtsProbe, 1, 0.003, `${c}.${v}`); near(a.endProbe, 2, 0.03, `${c}.${v}`);
      near(a.firstSourceTime, 1, 0.02); assert.equal(a.audioHash, ev.srcCutAudioHash);
    }
    for (const v of ['fix', 'aonly']) { const a = R(c, v).audio; near(a.firstPtsProbe, 0, 0.003, `${c}.${v}`); assert.equal(a.audioHash, ev.srcCutAudioHash); }
  }
});

t('out of sync needs a half fix: both stamped or both left alone is in sync (audio late by 0.00 s), setpts on the video only leaves the audio 1.00 s late, asetpts on the audio only leaves it 1.00 s early, in both containers', () => {
  for (const c of CONT) {
    near(R(c, 'raw').audioLate, 0, 0.02, `${c}.raw`); near(R(c, 'fix').audioLate, 0, 0.02, `${c}.fix`);
    near(R(c, 'vonly').audioLate, 1, 0.02, `${c}.vonly`); near(R(c, 'aonly').audioLate, -1, 0.02, `${c}.aonly`);
  }
});

t('the half fixes keep the right pictures: vonly has exactly the control frame hashes; aonly keeps the video stamps of a plain trim, so it has the same frames as the plain trim of that container and build (25 repeats in .mov on 6.1.1, a 1.000 s gap everywhere else)', () => {
  for (const c of CONT) {
    seq(R(c, 'vonly').video.md5, R(c, 'ctl').video.md5); near(R(c, 'vonly').video.firstPtsProbe, 0, 0.001);
    seq(R(c, 'aonly').video.md5, R(c, 'raw').video.md5); assert.equal(R(c, 'aonly').video.framesMd5, R(c, 'raw').video.framesMd5, c);
    near(R(c, 'aonly').video.firstPtsProbe, R(c, 'raw').video.firstPtsProbe, 0.001, c);
  }
  assert.equal(R('mkv', 'aonly').video.framesMd5, 25); assert.equal(R('mkv', 'aonly').video.repeatsMd5, 0); near(R('mkv', 'aonly').video.firstPtsProbe, 1, 0.001);
  if (buildOf(ev.ffmpeg) === 'v6') { assert.equal(R('mov', 'aonly').video.framesMd5, 50); assert.equal(R('mov', 'aonly').video.repeatsMd5, 25); }
  if (buildOf(ev.ffmpeg) === 'v8') { assert.equal(R('mov', 'aonly').video.framesMd5, 25); near(R('mov', 'aonly').video.firstPtsProbe, 1, 0.001); }
});

t('reader agreement on every one of the 16 outputs: frame count by framemd5, raw luma and ffprobe packets agree; first and last frame time by ffprobe and framemd5 with -copyts agree within 1 ms; audio packet span matches the sample count within 30 ms', () => {
  assert.equal(Object.keys(ev.runs).length, 16);
  for (const [k, r] of Object.entries(ev.runs)) {
    assert.equal(r.video.framesMd5, r.video.framesRaw, k); assert.equal(r.video.framesMd5, r.video.packets, k);
    near(r.video.firstPtsProbe, r.video.firstPtsMd5, 0.001, k); near(r.video.lastPtsProbe, r.video.lastPtsMd5, 0.001, k);
    assert.equal(r.video.repeatsMd5, r.video.repeatsRaw, k);
    near(r.audio.endProbe - r.audio.firstPtsProbe, r.audio.seconds, 0.03, k);
  }
});
