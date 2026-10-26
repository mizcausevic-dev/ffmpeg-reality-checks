import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, buildOf, expectedId, expectedSeek, SEEKS, TOTAL, SECONDS, FPS, lumaOf, idOfLuma, injectMehd, describe as describeFile, VARIANTS} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff77-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg and ffprobe are needed'}, fn);
const F = (n) => ev.files[n];
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const FRAGMENTED = ['frag', 'fragbase', 'fragdur', 'fragfirst', 'dash', 'sidx', 'sidxbase'];
const NO_SIDX_TOTAL = ['frag', 'fragbase', 'fragdur', 'fragfirst', 'dash'];

t('the helpers behave: card ids, where a correct seek lands, build detection, the file list', () => {
  assert.equal(lumaOf(0), 16); assert.equal(lumaOf(99), 214); assert.equal(idOfLuma(lumaOf(57)), 57);
  assert.equal(expectedId(0), 0); assert.equal(expectedId(3.5), 35); assert.equal(expectedId(9.9), 99); assert.equal(expectedId(20), 99); assert.equal(expectedId(-1), 0);
  assert.deepEqual(SEEKS.map(expectedSeek), [0, 35, 99, 80]);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
  assert.equal(Object.keys(VARIANTS).length, 8);
});

t('ffmpeg -version is recorded, and the regular file is the known positive: ftyp free mdat moov, mvhd says 10000 of 1000, 100 frames in order, no fragments', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  const r = F('reg'), n = r.node;
  assert.deepEqual(n.top, ['ftyp', 'free', 'mdat', 'moov']); assert.equal(n.moovAfterMdat, true);
  assert.deepEqual(n.mvhd, {timescale: 1000, duration: 10000}); assert.equal(n.fragments, 0); assert.equal(n.mehd, null); assert.equal(n.sidx.length, 0); assert.equal(n.mfra, null);
  assert.equal(r.decoded.frames, TOTAL); assert.equal(r.decoded.ordered, true);
  assert.equal(r.disk.format, SECONDS); assert.equal(r.disk.stream, SECONDS); assert.equal(r.disk.nbFrames, TOTAL);
  assert.equal(r.pipe.format, SECONDS, 'a regular file read from a pipe still has its total');
});

t('the two readers agree: the box reader (sum of every sample duration) and ffprobe on disk both say 10 s for every file, and the sample count is 100', () => {
  for (const [name, f] of Object.entries(ev.files)) {
    assert.equal(f.node.seconds, SECONDS, `${name} box reader`);
    assert.equal(f.node.samples, TOTAL, `${name} sample count`);
    assert.equal(f.disk.format, SECONDS, `${name} ffprobe on disk`);
  }
});

t('the fragmented file: mvhd duration is 0, no mehd, no sidx, 10 moof (one per keyframe), an mfra at the end with 10 entries', () => {
  const n = F('frag').node;
  assert.deepEqual(n.top.slice(0, 2), ['ftyp', 'moov']); assert.equal(n.top[n.top.length - 1], 'mfra');
  assert.equal(n.mvhd.duration, 0); assert.equal(n.mvhd.timescale, 1000);
  assert.equal(n.mehd, null); assert.equal(n.sidx.length, 0);
  assert.equal(n.fragments, 10); assert.equal(n.wholeFragments, 10); assert.equal(n.header.samples, 0, 'the moov holds no samples');
  assert.deepEqual(n.mfra, {entries: 10});
  assert.equal(n.moofs.every((m) => m.samples === 10), true, 'ten frames in each fragment');
});

t('the stream frame count is the part ffprobe cannot read from a fragmented header: nb_frames is missing on disk, while the duration is found', () => {
  for (const name of ['frag', 'fragbase', 'fragdur', 'dash', 'sidxbase']) { assert.equal(F(name).disk.nbFrames, null, name); assert.equal(F(name).disk.format, SECONDS, name); }
  assert.equal(F('reg').disk.nbFrames, TOTAL);
});

t('how the flags change the layout: frag_duration 2 s gives 5 fragments, no empty_moov keeps the first fragment inside the moov (mvhd 1 s, 9 moof), dash puts a sidx before every fragment', () => {
  assert.equal(F('fragbase').node.fragments, 10); assert.equal(F('fragdur').node.fragments, 5);
  assert.equal(F('fragfirst').node.fragments, 9); assert.equal(F('fragfirst').node.header.samples, 10); assert.equal(F('fragfirst').node.mvhd.duration, 1000);
  assert.equal(F('dash').node.sidx.length, 10); assert.equal(F('dash').node.moofs.length, 10);
  for (const name of ['frag', 'fragbase', 'fragdur']) assert.equal(F(name).node.mvhd.duration, 0, name);
});

t('three views of the duration of the same file: the header says 0, ffprobe on disk says 10, ffprobe on a pipe says less than 10 (and never 0)', () => {
  for (const name of NO_SIDX_TOTAL) {
    const f = F(name);
    assert.equal(f.disk.format, SECONDS, `${name} on disk`);
    assert.ok(f.pipe.format > 0 && f.pipe.format < SECONDS, `${name} on a pipe: ${f.pipe.format}`);
    if (name === 'fragfirst') assert.equal(f.pipe.format, f.node.mvhd.duration / 1000, 'only the first fragment is in the moov, and the pipe repeats it');
  }
  if (isV6()) assert.deepEqual(Object.fromEntries(NO_SIDX_TOTAL.map((n) => [n, F(n).pipe.format])), {frag: 3, fragbase: 3, fragdur: 4, fragfirst: 1, dash: 3});
});

t('no flag of this build writes a mehd; a mehd added by hand is found by the box reader, and ffprobe on a pipe ignores it, with or without a matching mvhd', () => {
  for (const [name, f] of Object.entries(ev.files)) assert.equal(f.node.mehd, null, name);
  for (const name of ['mehd', 'mehdMvhd']) {
    const c = ev.controls[name];
    assert.deepEqual(c.node.mehd, {duration: 10000}, `${name} found by the reader`);
    assert.equal(c.decoded.frames, TOTAL); assert.equal(c.disk.format, SECONDS);
    assert.equal(c.pipe.format, F('fragbase').pipe.format, `${name} changes nothing on a pipe`);
  }
  assert.equal(ev.controls.mehdMvhd.node.mvhd.duration, 10000);
});

t('a global sidx is what gives a pipe the total: one sidx, ten references, 10.0 s by the box reader and 10 by ffprobe on a pipe; a sidx per fragment (dash) does not', () => {
  const s = F('sidxbase').node;
  assert.equal(s.sidx.length, 1); assert.equal(s.sidx[0].refs.length, 10); assert.equal(s.sidx[0].total, SECONDS);
  assert.deepEqual(s.top.slice(0, 3), ['ftyp', 'moov', 'sidx']);
  assert.equal(F('sidxbase').pipe.format, SECONDS); assert.equal(F('sidxbase').pipe.format, s.sidx[0].total, 'the two readers agree');
  assert.ok(F('dash').pipe.format < SECONDS);
  assert.equal(s.sidx[0].refs.every((r) => r.duration === s.sidx[0].timescale), true, 'each reference is one second');
});

t('global_sidx without default_base_moof writes absolute base offsets that are 160 bytes stale: the box reader sees it, and the file decodes no frames', () => {
  const bad = F('sidx'), good = F('sidxbase');
  assert.equal(bad.node.baseOk, false); assert.equal(good.node.baseOk, true);
  const sidxSize = bad.node.layout.find((b) => b.type === 'sidx').size;
  assert.equal(bad.node.moofs[0].off - bad.node.moofs[0].baseOffset, sidxSize, 'stale by exactly the size of the inserted sidx');
  assert.equal(bad.decoded.frames, 0); assert.equal(good.decoded.frames, TOTAL);
  assert.equal(good.decoded.ordered, true);
  for (const [n, f] of Object.entries(ev.files)) assert.equal(f.decoded.frames === TOTAL, f.node.baseOk, `${n}: decoded everything iff the offsets are right`);
  if (isV6()) { assert.equal(bad.node.moofs[0].baseOffset, 783); assert.equal(sidxSize, 160); }
});

t('seeking on a file on disk works for every layout: -ss 0, 3.5 and 9.9 land on frames 0, 35 and 99, and -sseof -2 lands on frame 80', () => {
  for (const [name, f] of Object.entries(ev.files)) {
    if (name === 'sidx') continue;
    for (const s of f.seeks.disk) assert.equal(s.id, s.expected, `${name} ${s.kind} ${s.t}`);
  }
  for (const c of Object.values(ev.controls)) for (const s of c.seeks.disk) assert.equal(s.id, s.expected);
});

t('seeking in the broken sidx file fails, and says so: no frame comes out of any of the four seeks', () => {
  for (const s of [...F('sidx').seeks.disk, ...F('sidx').seeks.pipe]) { assert.equal(s.id, null); assert.match(s.error, /./); }
});

t('seeking on a pipe: -ss still lands right everywhere (the client reads and drops), but -sseof counts from the wrong end for every fragmented file without a global sidx', () => {
  for (const [name, f] of Object.entries(ev.files)) {
    if (name === 'sidx') continue;
    f.seeks.pipe.filter((s) => s.kind === 'ss').forEach((s) => assert.equal(s.id, s.expected, `${name} ss ${s.t}`));
    const e = f.seeks.pipe.find((s) => s.kind === 'sseof');
    if (name === 'reg' || name === 'sidxbase') assert.equal(e.id, 80, `${name} sseof`);
    else {
      assert.notEqual(e.id, 80, `${name} sseof lands wrong`);
      assert.equal(e.id, expectedId(Math.max(0, f.pipe.format - 2)), `${name}: -sseof -2 counted back from the probed ${f.pipe.format} s`);
    }
  }
  if (isV6()) assert.deepEqual(Object.fromEntries(NO_SIDX_TOTAL.map((n) => [n, F(n).seeks.pipe[3].id])), {frag: 10, fragbase: 10, fragdur: 20, fragfirst: 0, dash: 10});
});

t('a writer that died (the file cut at 55 percent): the fragmented file keeps its whole fragments and ffmpeg decodes exactly those frames; the regular file has lost its moov and cannot be opened', () => {
  const fr = ev.truncated.frag, rg = ev.truncated.reg;
  assert.ok(fr.node.wholeFragments >= 1 && fr.node.wholeFragments < 10);
  assert.equal(fr.decoded.frames, fr.node.wholeFragments * GOP_FRAMES, 'frames decoded = whole fragments x 10');
  assert.equal(fr.decoded.ordered, true); assert.equal(fr.disk.ok, true);
  assert.equal(rg.node.top.includes('moov'), false); assert.equal(rg.disk.ok, false); assert.match(rg.disk.error, /moov atom not found/); assert.equal(rg.decoded.frames, 0);
  if (isV6()) { assert.equal(fr.node.wholeFragments, 5); assert.equal(fr.decoded.frames, 50); }
});
const GOP_FRAMES = 10;

t('the repair: -c copy remux of the fragmented file gives a regular file with the total in mvhd (10000), no fragments, the same 100 frame hashes, and the total on a pipe', () => {
  const r = ev.remux.file;
  assert.equal(r.node.fragments, 0); assert.equal(r.node.mvhd.duration, 10000); assert.equal(r.node.mfra, null);
  assert.equal(r.pipe.format, SECONDS); assert.equal(r.disk.nbFrames, TOTAL); assert.equal(r.decoded.frames, TOTAL);
  assert.equal(ev.remux.sameHashes, true);
  assert.equal(r.seeks.pipe.every((s) => s.id === s.expected), true, 'all four seeks right, even on a pipe');
});

t('writing to a pipe: a regular mp4 is refused (it needs to seek back to fill the moov), a fragmented one streams out whole and decodes; global_sidx is dropped on a pipe', () => {
  const w = ev.pipeWrite;
  assert.notEqual(w.reg.exit, 0); assert.equal(w.reg.bytes, 0); assert.match(w.reg.error ?? '', /non seekable/);
  assert.equal(w.frag.exit, 0); assert.ok(w.frag.bytes > 0);
  assert.equal(w.frag.file.decoded.frames, TOTAL); assert.equal(w.frag.file.node.fragments, 10); assert.equal(w.frag.file.node.mvhd.duration, 0);
  assert.equal(w.sidxbase.exit, 0); assert.equal(w.sidxbase.sidx, 0);
});

t('the box reader itself: injecting a mehd of 7 s into a fragmented file is read back as 7000, and the other boxes still parse', () => {
  const b = fs.readFileSync(path.join(dir, 'fragbase.mp4'));
  const d = describeFile(injectMehd(b, 7));
  assert.deepEqual(d.mehd, {duration: 7000}); assert.equal(d.fragments, 10); assert.equal(d.seconds, SECONDS); assert.equal(d.mfra, null);
  assert.equal(FPS, 10);
});
