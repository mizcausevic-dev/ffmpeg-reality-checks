import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff29-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (k) => ev.runs[k];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);

t('control source: 300 unique frames, picture 10 s, audio 10 s, container 10 s, pitch 440 Hz on both pitch readers', () => {
  assert.equal(ev.source.frames, 300); assert.equal(ev.source.unique, 300);
  const s = ev.source.read;
  near(s.video.endPackets, 10, 0.05); near(s.audio.endPackets, 10, 0.05); near(s.container, 10, 0.05);
  assert.equal(s.video.framesDecoded, 300);
  assert.equal(s.pitch.goertzel, 440); near(s.pitch.zeroCross, 440, 1);
});

t('control run, no speed change: the same clip re-encoded keeps 300 frames, 10 s of picture, 10 s of audio and 440 Hz', () => {
  const r = R('ctrl');
  assert.deepEqual(r.byMd5, ev.source.read.byMd5);
  near(r.video.endPackets, 10, 0.05); near(r.audio.endPackets, 10, 0.05); near(r.container, 10, 0.05);
  assert.equal(r.pitch.goertzel, 440);
});

t('setpts=0.5*PTS alone: the picture is about 5 s, the audio is still 10 s, and the container says 10 s', () => {
  const r = R('video');
  near(r.video.endPackets, 5, 0.1, 'picture'); near(r.video.endDecoded, 5, 0.1, 'picture decoded');
  near(r.audio.endPackets, 10, 0.05, 'audio'); near(r.audio.endDecoded, 10, 0.05, 'audio decoded');
  near(r.container, 10, 0.05, 'container');
  assert.ok(r.audio.endDecoded - r.video.endDecoded > 4.5, 'audio outlasts the picture by almost 5 s');
});

t('setpts=0.5*PTS alone leaves the audio untouched: 440 Hz, same sample count as the control', () => {
  const r = R('video');
  assert.equal(r.pitch.goertzel, 440); near(r.pitch.zeroCross, 440, 1);
  assert.equal(r.audio.samples, R('ctrl').audio.samples);
});

t('at the default 30 fps output, setpts=0.5*PTS keeps only about half of the 300 frames (not all of them), in source order, from 0..3 then every second frame', () => {
  const r = R('video');
  assert.ok(r.byMd5.length < 200 && r.byMd5.length > 120, `kept ${r.byMd5.length}`);
  assert.deepEqual(r.byMd5.slice(0, 12), [0, 1, 2, 3, 5, 7, 9, 11, 13, 15, 17, 19]);
  const gaps = new Set(r.byMd5.slice(4).map((v, i, a) => (i ? v - a[i - 1] : 2))); assert.deepEqual([...gaps], [2]);
  for (let i = 1; i < r.byMd5.length; i++) assert.ok(r.byMd5[i] > r.byMd5[i - 1]);
});

t('the picture runs at 2x: at output time 2.5 s the picture shows about source second 5 (4.9), the audio has not been sped up', () => {
  near(R('video').pictureAt2_5.md5, 4.9, 0.2); near(R('ctrl').pictureAt2_5.md5, 2.5, 0.05);
});

t('-fps_mode passthrough keeps all 300 frames in about 5 s, so the frame drop is the 30 fps output rate, not setpts', () => {
  const r = R('keepall');
  assert.equal(r.byMd5.length, 300); assert.deepEqual(r.byMd5, [...Array(300).keys()]);
  near(r.video.endDecoded, 5, 0.1); near(r.audio.endDecoded, 10, 0.05);
});

t('adding atempo=2: the audio shortens to about 5 s, picture and audio now end together, the container is about 5 s, pitch stays 440 Hz', () => {
  const r = R('tempo');
  near(r.audio.endDecoded, 5, 0.05, 'audio decoded'); near(r.audio.endPackets, 5, 0.05, 'audio packets');
  near(Math.abs(r.audio.endDecoded - r.video.endDecoded), 0, 0.1, 'ends together');
  near(r.container, 5, 0.1);
  assert.equal(r.pitch.goertzel, 440); near(r.pitch.zeroCross, 440, 1);
});

t('known-positive for the pitch readers: asetrate=88200,aresample=44100 also fixes the length (about 5 s) but moves the pitch to 880 Hz', () => {
  const r = R('rate');
  near(r.audio.endDecoded, 5, 0.05);
  assert.equal(r.pitch.goertzel, 880); near(r.pitch.zeroCross, 880, 1);
  assert.notEqual(r.pitch.goertzel, R('tempo').pitch.goertzel);
});

t('the two readers agree on every output: frame md5 and decoded frame code name the same source frames, durations agree within 0.02 s, pitch within 1 Hz', () => {
  for (const [k, r] of [['source', ev.source.read], ...Object.entries(ev.runs)]) {
    assert.deepEqual(r.byCode, r.byMd5, k);
    near(r.video.endPackets, r.video.endDecoded, 0.02, `${k} video`);
    near(r.audio.endPackets, r.audio.endDecoded, 0.02, `${k} audio`);
    near(r.pitch.goertzel, r.pitch.zeroCross, 1, `${k} pitch`);
    assert.equal(r.video.packets, r.video.framesDecoded, k);
    near(r.pictureAt2_5.md5, r.pictureAt2_5.code, 0.001, `${k} picture at 2.5 s`);
  }
});
