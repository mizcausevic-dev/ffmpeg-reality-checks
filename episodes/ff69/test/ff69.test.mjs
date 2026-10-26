import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, readWav, firstNonZero, trailingZeros, CASES, RATE, FRAMES, buildOf} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff69-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (n) => ev.runs[n];
const same = (a, b, msg) => assert.deepEqual(a, b, msg);
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);

t('the Node reader works on bytes we write ourselves: extra chunk before data, odd chunk padding, two channels', () => {
  const chunk = (id, body) => { const h = Buffer.alloc(8); h.write(id, 0, 'latin1'); h.writeUInt32LE(body.length, 4); return Buffer.concat([h, body, body.length & 1 ? Buffer.alloc(1) : Buffer.alloc(0)]); };
  const fmt = Buffer.alloc(16); fmt.writeUInt16LE(1, 0); fmt.writeUInt16LE(2, 2); fmt.writeUInt32LE(48000, 4); fmt.writeUInt32LE(48000 * 4, 8); fmt.writeUInt16LE(4, 12); fmt.writeUInt16LE(16, 14);
  const frames = [[0, 5], [0, 6], [7, 0], [8, 0], [0, 0]];
  const data = Buffer.alloc(frames.length * 4); frames.forEach(([l, r], i) => { data.writeInt16LE(l, i * 4); data.writeInt16LE(r, i * 4 + 2); });
  const body = Buffer.concat([Buffer.from('WAVE', 'latin1'), chunk('fmt ', fmt), chunk('LIST', Buffer.from('abc')), chunk('data', data)]);
  const head = Buffer.alloc(8); head.write('RIFF', 0, 'latin1'); head.writeUInt32LE(body.length, 4);
  const w = readWav(Buffer.concat([head, body]));
  assert.equal(w.channels, 2); assert.equal(w.rate, 48000); assert.equal(w.frames, 5);
  same(Array.from(w.ch[0]), [0, 0, 7, 8, 0]); same(Array.from(w.ch[1]), [5, 6, 0, 0, 0]);
  same([firstNonZero(w.ch[0]), firstNonZero(w.ch[1])], [2, 0]); same([trailingZeros(w.ch[0]), trailingZeros(w.ch[1])], [1, 3]);
  assert.equal(firstNonZero(new Int16Array(4)), -1);
});

t('known positive: a file whose left channel is gated to start at 0.25 s is read as 12000 and 0 by both readers', () => {
  const kp = ev.knownPositive;
  same(kp.node.onset, [12000, 0]); same(kp.ff.onset, [12000, 0]);
  same(kp.node.onset, kp.expect); assert.equal(kp.frames, FRAMES);
});

t('control: the input with no filter starts at sample 0 on both channels, 96000 frames, no silence found by ffmpeg', () => {
  const c = R('ctl');
  same(c.node.onset, [0, 0]); same(c.ff.onset, [0, 0]); same(c.node.tail, [0, 0]); same(c.ff.tail, [0, 0]);
  assert.equal(c.frames, FRAMES); assert.equal(c.channels, 2); assert.equal(c.rate, RATE);
  same(c.ff.spans, [[], []]);
  assert.ok(ev.input.firstSamples.every((a) => a[0] !== 0), 'the input must start with a non zero sample so that a zero run means a delay');
});

t('adelay=1000 delays only the left channel by 48000 samples and leaves the right channel where it was', () => {
  const d = R('d1000');
  same(d.node.onset, [48000, 0]); same(d.ff.onset, [48000, 0]);
  same(d.expect, [48000, 0]);
});

t('the other channel is not shortened: both channels are 144000 frames (3 s), and the right channel ends with 48000 zeros', () => {
  const d = R('d1000');
  assert.equal(d.frames, FRAMES + 48000); near(d.durationProbe, 3, 0.002);
  same(d.node.tail, [0, 48000]); same(d.ff.tail, [0, 48000]);
  same(d.node.soundSamples, [FRAMES, FRAMES]);
});

t('every setting gives the onsets the documentation implies, in both readers', () => {
  for (const [name, c] of Object.entries(CASES)) {
    same(R(name).node.onset, c.expect, `${name} node`);
    same(R(name).ff.onset, c.expect, `${name} ffmpeg`);
  }
});

t('a list with one value per channel, all=1, and a longer list than channels all delay both channels by the same 48000 samples', () => {
  for (const n of ['d1000_1000', 'd1000_all', 'd1000x3']) { same(R(n).node.onset, [48000, 48000], n); same(R(n).node.tail, [0, 0], n); }
  same(R('d1000_1000').peaks, R('d1000_all').peaks); same(R('d1000_1000').peaks, R('d1000x3').peaks);
});

t('a single value equals 1000|0, and 1000 ms equals 48000S, sample for sample (same 20 ms peak envelopes)', () => {
  same(R('d1000').peaks, R('d1000_0').peaks); same(R('d1000').peaks, R('d48000S').peaks);
  same(R('d0_1000').node.onset, [0, 48000]); same(R('d0_1000').node.tail, [48000, 0]);
});

t('different delays per channel: 500|1500 and 333|777 land on 24000, 72000 and 15984, 37296 samples', () => {
  same(R('d500_1500').node.onset, [24000, 72000]); same(R('d333_777').node.onset, [15984, 37296]);
  assert.equal(R('d500_1500').frames, FRAMES + 72000); assert.equal(R('d333_777').frames, FRAMES + 37296);
});

t('the output length is the input length plus the largest delay, and each channel ends with the difference', () => {
  for (const [name, r] of Object.entries(ev.runs)) {
    const maxOnset = Math.max(...r.expect);
    assert.equal(r.frames, FRAMES + maxOnset, name);
    r.expect.forEach((o, c) => assert.equal(r.node.tail[c], maxOnset - o, `${name} channel ${c}`));
  }
});

t('the delayed channel is an exact copy of the input shifted by the delay: nothing is resampled, scaled or changed', () => {
  for (const [name, r] of Object.entries(ev.runs)) same(r.copy, [true, true], name);
  same(R('d1000').around.left, [0, 0, 0, 13787, 14273, 14713]);
  same(ev.input.firstSamples[0].slice(0, 3), [13787, 14273, 14713]);
});

t('the two readers agree on every onset and every trailing silence, within one sample', () => {
  for (const [name, r] of Object.entries(ev.runs)) for (let c = 0; c < 2; c++) {
    near(r.node.onset[c], r.ff.onset[c], 1, `${name} onset ${c}`);
    near(r.node.tail[c], r.ff.tail[c], 1, `${name} tail ${c}`);
  }
});

t('records which build was measured (6.x here; the assertions are about documented behavior and should hold on 8.x)', () => {
  assert.ok(/version/.test(ev.ffmpeg)); assert.ok(['v6', 'v8', 'other'].includes(buildOf(ev.ffmpeg)));
});
