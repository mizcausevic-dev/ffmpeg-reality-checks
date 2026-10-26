import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, parseGif, handGif, buildOf, NETSCAPE_BYTES, FRAMES} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff52-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (k) => ev.runs[k];
const V6 = () => buildOf(ev.ffmpeg) === 'v6';
const WRITTEN = ['default', 'm1', 'p0', 'p1', 'p3', 'p255', 'p65535'];

t('the helpers behave: the GIF parser reads a hand built gif (2 frames, 1x1, loop count 7, delays of 10 cs), reads a gif with no loop block as null, and rejects bytes that are not a gif; build detection', () => {
  const g = parseGif(handGif(7));
  assert.equal(g.valid, true); assert.equal(g.frames, 2); assert.equal(g.loop, 7); assert.deepEqual(g.delays, [10, 10]); assert.equal(g.netscapeBlocks, 1);
  assert.equal(parseGif(handGif(65535)).loop, 65535); assert.equal(parseGif(handGif(256)).loop, 256);
  const n = parseGif(handGif(null)); assert.equal(n.valid, true); assert.equal(n.loop, null); assert.equal(n.netscapeBlocks, 0); assert.equal(handGif(0).length - handGif(null).length, NETSCAPE_BYTES);
  assert.equal(parseGif(Buffer.from('not a gif at all')).valid, false);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, and the source is what the fixture promises: every written gif has 10 distinct frames of 32x24 at 0.1 s each (1.0 s), by the bytes and by ffprobe, and the frame hashes are the same whatever the loop value', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  for (const k of WRITTEN) {
    const r = R(k);
    assert.equal(r.status, 0, k); assert.equal(r.gif.valid, true, k); assert.equal(r.gif.frames, FRAMES, k); assert.deepEqual(r.gif.delays, Array(FRAMES).fill(10), k);
    assert.equal(r.gif.width, 32); assert.equal(r.gif.height, 24);
    assert.equal(r.probe.frames, FRAMES, k); assert.ok(Math.abs(r.probe.duration - 1) < 0.01, k);
    assert.equal(new Set(r.hashes).size, FRAMES, `${k} frames are all different`);
    assert.deepEqual(r.hashes, R('default').hashes, `${k} same pixels as default`);
  }
});

t('known-positive control: a gif built byte by byte in Node with loop count 7 is read as 7 by the bytes reader and played 7 times by ffmpeg (14 frames from 2); with count 0 it keeps playing to the limit; with no loop block it plays once', () => {
  assert.equal(ev.hand['7'].gif.loop, 7); assert.equal(ev.hand['7'].replayPerPass.frames, 14); assert.equal(ev.hand['7'].replayPerPass.passes, 7);
  assert.equal(ev.hand['0'].gif.loop, 0); assert.equal(ev.hand['0'].replayPerPass.passes, 'capped');
  assert.equal(ev.hand['null'].gif.loop, null); assert.equal(ev.hand['null'].replayPerPass.passes, 1);
});

t('-loop 0 writes a NETSCAPE2.0 block with count 0, and so does leaving -loop out: the default file is byte for byte the -loop 0 file', () => {
  assert.equal(R('p0').gif.netscapeBlocks, 1); assert.equal(R('p0').gif.loop, 0);
  assert.equal(R('default').gif.netscapeBlocks, 1); assert.equal(R('default').gif.loop, 0);
  assert.equal(R('default').md5, R('p0').md5); assert.deepEqual(ev.diffs.default_vs_p0, []);
});

t('-loop -1 writes no loop block at all: no NETSCAPE2.0 block in the bytes, and the file is exactly 19 bytes smaller than the -loop 0 file', () => {
  assert.equal(R('m1').gif.netscapeBlocks, 0); assert.equal(R('m1').gif.loop, null);
  assert.equal(ev.diffs.sizeGap, NETSCAPE_BYTES); assert.equal(R('p0').bytes - R('m1').bytes, 19);
});

t('-loop 3 writes the count 3 into the block; -loop 1, 255 and 65535 write 1, 255 and 65535: the number you pass is the number in the file (16 bit, little endian)', () => {
  for (const [k, n] of [['p1', 1], ['p3', 3], ['p255', 255], ['p65535', 65535]]) { assert.equal(R(k).gif.netscapeBlocks, 1, k); assert.equal(R(k).gif.loop, n, k); }
});

t('the loop value is metadata only: the -loop 0 and -loop 3 files differ in exactly one byte (the low byte of the count), and 0 versus 65535 in exactly two; all of them hold the same 10 frame hashes', () => {
  assert.deepEqual(ev.diffs.p0_vs_p3, [R('p3').gif.loopOffset]); assert.equal(ev.diffs.p0_vs_p3.length, 1);
  assert.equal(ev.diffs.p0_vs_p65535.length, 2); assert.deepEqual(ev.diffs.p0_vs_p65535, [R('p0').gif.loopOffset, R('p0').gif.loopOffset + 1]);
  for (const k of ['p1', 'p3', 'p255', 'p65535']) assert.deepEqual(R(k).hashes, R('p0').hashes, k);
});

t('-loop 65536 is refused: ffmpeg exits non-zero and no gif is written (0 bytes, not a gif)', () => {
  const r = R('p65536');
  assert.notEqual(r.status, 0); assert.equal(r.gif.valid, false); assert.equal(r.bytes, 0);
});

t('what ffmpeg itself does with the count (its gif demuxer, asked to honour it): no block plays once, count 3 plays 3 times (30 frames from 10), count 0 and every large count are still playing at the 20 s limit. Asserted exactly on 6.1.1 and as an ordering on other builds', () => {
  const p = (k) => R(k).replay.passes;
  assert.equal(R('m1').replay.frames, 10); assert.equal(p('m1'), 1);
  assert.equal(p('p0'), 'capped'); assert.equal(p('default'), 'capped'); assert.equal(p('p255'), 'capped'); assert.equal(p('p65535'), 'capped');
  if (V6()) { assert.equal(p('p3'), 3); assert.equal(R('p3').replay.frames, 30); assert.equal(p('p1'), 1); }
  else { assert.ok(p('p1') >= 1 && p('p3') > p('p1') && p('p3') !== 'capped'); }
});

t('the two readers agree on every written file: the loop count in the bytes decides the number of passes the demuxer plays (none gives 1, 0 and big counts reach the cap, small counts give the count on 6.1.1)', () => {
  for (const k of WRITTEN) {
    const r = R(k), n = r.gif.loop;
    if (n === null) assert.equal(r.replay.passes, 1, k);
    else if (n === 0 || n >= 21) assert.equal(r.replay.passes, 'capped', k);
    else if (V6()) assert.equal(r.replay.passes, n, k);
  }
  for (const h of ['7', '0', 'null']) { const r = ev.hand[h]; if (r.gif.loop === 7 && V6()) assert.equal(r.replayPerPass.passes, 7); }
});

t('-loop before -i is a different option: on a still png it is the image demuxer loop (a boolean). -loop 1 there makes the png repeat for the 1 s, 10 frames, and the gif it writes still has the default count 0; -loop 3 is not a boolean and ffmpeg refuses', () => {
  const a = ev.input.in1, b = ev.input.in3;
  assert.equal(a.status, 0); assert.equal(a.gif.frames, 10); assert.equal(a.gif.loop, 0); assert.equal(a.replay.passes, 'capped');
  if (V6()) { assert.notEqual(b.status, 0); assert.equal(b.gif.valid, false); }
  else assert.equal(b.gif.valid, b.status === 0);
});

t('the gif muxer takes -loop from -1 to 65535 and nothing else: the six in range values (and the default) wrote valid gifs, and 65536 wrote nothing', () => {
  const written = Object.entries(ev.runs).filter(([, r]) => r.gif.valid).map(([k]) => k).sort();
  assert.deepEqual(written, [...WRITTEN].sort());
  assert.equal(R('p65536').bytes, 0);
});
