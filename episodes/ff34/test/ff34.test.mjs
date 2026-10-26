import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff34-')); ev = runExperiment(dir); } });
after(() => { try { if (dir) fs.rmSync(dir, {recursive: true, force: true}); } catch {} });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (k) => ev.runs[k];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const ALL = Array.from({length: 100}, (_, i) => i + 1);
const allOnce = (r) => assert.deepEqual(r.byMd5, ALL);

t('source: 100 PNGs, each decodes to its own frame (100 unique md5s)', () => {
  assert.equal(ev.source.pngs, 100); assert.equal(ev.source.frames, 100); assert.equal(ev.source.unique, 100);
});

t('control, no option: the default input rate is 25 fps, so 100 frames last 4 s and every frame appears once, in order', () => {
  const r = R('ctrl');
  allOnce(r); near(r.ffprobe.end, 4, 0.02); near(r.decode.end, 4, 0.02); near(r.ffprobe.container, 4, 0.02);
  assert.equal(r.ffprobe.packets, 100); assert.equal(r.decode.frames, 100);
  near(r.ffprobe.rFrameRate, 25, 0.01); near(r.ffprobe.avgFrameRate, 25, 0.01);
});

t('explicit -framerate 25 gives the same result as the default (explicit option tested, not only the default)', () => {
  assert.deepEqual(R('fr25').byMd5, R('ctrl').byMd5); near(R('fr25').ffprobe.end, 4, 0.02);
});

t('-framerate 10 before -i: all 100 frames once, in order, 10 s, 10 fps', () => {
  const r = R('fr10');
  allOnce(r); assert.equal(r.dups, 0);
  near(r.ffprobe.end, 10, 0.02); near(r.decode.end, 10, 0.02); near(r.ffprobe.container, 10, 0.02);
  assert.equal(r.ffprobe.packets, 100); near(r.ffprobe.rFrameRate, 10, 0.01);
});

t('-r 10 before -i behaves like -framerate 10 on an image sequence: same frames, same 10 s', () => {
  const r = R('rin10');
  assert.deepEqual(r.byMd5, R('fr10').byMd5); near(r.ffprobe.end, 10, 0.02); near(r.decode.end, 10, 0.02); near(r.ffprobe.rFrameRate, 10, 0.01);
});

t('-r 10 after -i: the input still runs at 25 fps, so ffmpeg converts 25 to 10 and keeps only 42 of 100 frames; the film is 4.2 s, not 10 s', () => {
  const r = R('rout10');
  assert.equal(r.byMd5.length, 42); assert.equal(r.kept, 42); assert.equal(r.dups, 0);
  assert.equal(r.ffprobe.packets, 42); assert.equal(r.decode.frames, 42);
  near(r.ffprobe.end, 4.2, 0.05); near(r.decode.end, 4.2, 0.05); near(r.ffprobe.container, 4.2, 0.05);
  near(r.ffprobe.rFrameRate, 10, 0.01);
  assert.ok(r.ffprobe.end < 0.5 * R('fr10').ffprobe.end, 'less than half the length of the -framerate 10 film');
});

t('-r 10 after -i drops frames in source order, never duplicates, and keeps the first frame: ids 1, 2, 3, 5, 8, 10', () => {
  const ids = R('rout10').byMd5;
  for (let i = 1; i < ids.length; i++) assert.ok(ids[i] > ids[i - 1], 'increasing');
  assert.equal(ids[0], 1); assert.deepEqual(ids.slice(0, 6), [1, 2, 3, 5, 8, 10]);
  const gaps = new Set(ids.slice(1).map((v, i) => v - ids[i]));
  for (const g of gaps) assert.ok(g >= 1 && g <= 3, `gap ${g}`);
  assert.equal(100 - ids.length, 58);
});

t('both -framerate 25 and -r 10 before -i: the -r value wins, 100 frames, 10 s', () => {
  const r = R('both');
  allOnce(r); near(r.ffprobe.end, 10, 0.02); near(r.decode.end, 10, 0.02); near(r.ffprobe.rFrameRate, 10, 0.01);
});

t('-framerate 10 before -i plus -r 10 after -i: no conversion needed, all 100 frames, 10 s', () => {
  const r = R('frrout');
  allOnce(r); near(r.ffprobe.end, 10, 0.02); near(r.decode.end, 10, 0.02);
});

t('-framerate 10 before -i and -r 30 after: each frame is repeated 3 times, 300 frames, still 10 s, 30 fps', () => {
  const r = R('fr10r30');
  assert.equal(r.byMd5.length, 300); assert.equal(r.kept, 100); assert.equal(r.dups, 200);
  assert.deepEqual(r.byMd5.slice(0, 6), [1, 1, 1, 2, 2, 2]);
  near(r.ffprobe.end, 10, 0.05); near(r.decode.end, 10, 0.05); near(r.ffprobe.rFrameRate, 30, 0.01);
});

t('-pattern_type glob gives the same frames and length as the %03d sequence, with -framerate 10 and with -r 10 before -i', () => {
  for (const k of ['globfr', 'globr']) { assert.deepEqual(R(k).byMd5, R('fr10').byMd5, k); near(R(k).ffprobe.end, 10, 0.02, k); near(R(k).decode.end, 10, 0.02, k); }
});

t('-start_number 51 on the full set starts at file 51: 50 frames, ids 51 to 100, 5 s at 10 fps', () => {
  const r = R('start51');
  assert.deepEqual(r.byMd5, ALL.slice(50)); near(r.ffprobe.end, 5, 0.02); near(r.decode.end, 5, 0.02);
});

t('a sequence that begins at img051.png: without -start_number the command fails (non-zero exit), with -start_number 51 it makes 50 frames, ids 51 to 100', () => {
  assert.notEqual(ev.lateDefault.exitCode, 0);
  const r = ev.lateSet;
  assert.deepEqual(r.byMd5, ALL.slice(50)); near(r.ffprobe.end, 5, 0.02);
});

t('the two readers agree on every output: frame md5 and decoded pixel code name the same source files, ffprobe and decode agree on length and frame count', () => {
  for (const [k, r] of [...Object.entries(ev.runs), ['lateSet', ev.lateSet]]) {
    assert.deepEqual(r.byCode, r.byMd5, k);
    assert.ok(!r.byMd5.includes(0), `${k}: every frame matches a source PNG`);
    near(r.ffprobe.end, r.decode.end, 0.02, `${k} length`);
    assert.equal(r.ffprobe.packets, r.decode.frames, `${k} frame count`);
  }
});
