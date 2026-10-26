import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(async () => { if (ok) ev = await runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff03-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const idx = (f, type) => f.order.indexOf(type);

t('fixture: both files carry the same 250 frames and 10 s, so only the box order differs', () => {
  for (const f of Object.values(ev.files)) { assert.equal(f.frames, 250); assert.ok(Math.abs(f.duration - 10) < 0.05, `duration ${f.duration}`); }
});

t('without +faststart the index (moov) comes after the media data (mdat)', () => {
  const f = ev.files.plain;
  assert.equal(f.order[0], 'ftyp');
  assert.ok(idx(f, 'moov') > idx(f, 'mdat'), f.order.join(','));
  assert.equal(f.order[f.order.length - 1], 'moov');
});

t('with +faststart the index (moov) comes before the media data (mdat)', () => {
  const f = ev.files.faststart;
  assert.equal(f.order[0], 'ftyp');
  assert.ok(idx(f, 'moov') < idx(f, 'mdat'), f.order.join(','));
});

t('two independent readers agree on the box order (our parser and ffprobe trace), and can tell the two files apart', () => {
  for (const f of Object.values(ev.files)) assert.deepEqual(f.order, f.traceOrder);
  assert.notDeepEqual(ev.files.plain.order, ev.files.faststart.order);
});

t('the flag moves the index; it does not rewrite the media: file size differs by under 0.1% and the index size is equal', () => {
  const a = ev.files.plain, b = ev.files.faststart;
  assert.ok(Math.abs(a.bytes - b.bytes) / a.bytes < 0.001, `${a.bytes} vs ${b.bytes}`);
  assert.equal(a.moovSize, b.moovSize);
});

t('a client that cannot seek must take the whole file when the index is last, and only a small part when it is first', () => {
  const p = ev.http.plain.noSeek, f = ev.http.faststart.noSeek;
  assert.equal(p.exit, 0); assert.equal(f.exit, 0);
  assert.equal(p.bytesServed, p.fileBytes);
  assert.ok(f.bytesServed < f.fileBytes * 0.25, `${f.bytesServed} of ${f.fileBytes}`);
});

t('a client that can use range requests copes with a last index, by jumping to it: more requests, one at the index', () => {
  const p = ev.http.plain.rangeSeek, f = ev.http.faststart.rangeSeek, moov = ev.files.plain.moovOffset;
  assert.equal(p.exit, 0); assert.ok(Math.abs(p.duration - 10) < 0.05);
  assert.ok(p.requests >= 2, `${p.requests} requests`);
  assert.ok(p.rangeStarts.some((s) => Math.abs(s - moov) <= 16), `starts ${p.rangeStarts} vs moov ${moov}`);
  assert.equal(f.requests, 1);
});
