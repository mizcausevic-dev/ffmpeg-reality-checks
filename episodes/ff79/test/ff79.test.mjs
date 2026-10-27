import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, peaksOf, gapIdentify, gapSamples, GAP_POS, oggCrc, readOpusHead, buildOf, SR, N, PACKET, CLICK_AT, CUTS, CUT_SAMPLES} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff79-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const E = (k) => ev.encodes[k];
const P = (k) => ev.patched[k];
const C = (k) => ev.cuts[k];
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const FMTS = ['ogg', 'oggp', 'mkv', 'opus'];

t('the helpers behave: peaksOf merges close maxima, gapIdentify names the first click from the gap pattern, the ogg CRC matches a known value, build detection', () => {
  const a = new Int16Array(3000); a[100] = 9000; a[103] = 7000; a[1000] = 8000; a[1810] = 8000;
  assert.deepEqual(peaksOf(a).map((p) => p.index), [100, 1000, 1810]);
  const late = new Int16Array(N); for (const q of GAP_POS) if (q >= 20000) late[q - 20000] = 24000;
  const id = gapIdentify(late); assert.equal(id.first, 21); assert.equal(id.startsAt, 20000); assert.equal(id.consistent, true);
  assert.equal(gapIdentify(gapSamples()).startsAt, 0);
  assert.equal(oggCrc(Buffer.alloc(0)), 0); assert.equal(oggCrc(Buffer.from([1])), 0x04c11db7);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, and the sources are what the fixture promises: 48000 samples at 48000 Hz, one click at 4800, 40 gap-coded clicks', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(ev.source.samples, N); assert.equal(ev.source.rate, SR); assert.equal(ev.source.clickAt, CLICK_AT); assert.equal(ev.source.gapClicks, 40);
  assert.equal(Object.keys(ev.encodes).length, 4); assert.equal(Object.keys(ev.cuts).length, Object.keys(CUTS).length);
});

t('control: the same wav through pcm_s16le comes back with 48000 samples and the click at 4800, value 29000', () => {
  assert.equal(ev.control.samples, N); assert.equal(ev.control.click, CLICK_AT); assert.equal(ev.control.peakValue, 29000);
});

t('reader 2 (the bytes): every encode has an OpusHead of version 1, one channel, input rate 48000, gain 0, mapping 0; the pre-skip is 312 samples = 6.5 ms on 6.1.1 and the same in ogg, 100 ms pages, mkv and .opus', () => {
  for (const f of FMTS) {
    const h = E(f).head; assert.equal(h.version, 1, f); assert.equal(h.channels, 1, f); assert.equal(h.inputRate, SR, f); assert.equal(h.gain, 0, f); assert.equal(h.mapping, 0, f);
    assert.ok(h.preSkip > 0 && h.preSkip < 960, `${f}: pre-skip is under one packet`);
    assert.equal(h.preSkip, E('ogg').head.preSkip, `${f}: same pre-skip in every container`);
    assert.equal(h.container, f === 'mkv' ? 'mkv' : 'ogg', f);
    if (isV6()) { assert.equal(h.preSkip, 312, f); assert.equal(h.preSkipHex, '3801', f); }
  }
  const m = E('mkv').head; near(m.codecDelayNs * SR / 1e9, m.preSkip, 0.01, 'CodecDelay in ns is the same pre-skip'); assert.equal(m.seekPreRollNs, 80000000);
});

t('reader 3 (ffprobe) agrees with the bytes: initial_padding is the pre-skip; ogg and .opus start at 0; mkv starts at minus the pre-skip, rounded to a millisecond (-0.007 s on 6.1.1)', () => {
  for (const f of FMTS) { assert.equal(E(f).probe.codec, 'opus', f); assert.equal(E(f).probe.initialPadding, E(f).head.preSkip, f); }
  near(E('ogg').probe.streamStart, 0, 1e-6); near(E('opus').probe.streamStart, 0, 1e-6);
  near(E('mkv').probe.streamStart, -E('mkv').head.preSkip / SR, 0.001);
  if (isV6()) { assert.equal(E('mkv').probe.streamStart, -0.007); assert.equal(E('ogg').probe.duration, 1.0065); assert.equal(E('mkv').probe.duration, 1.008); }
});

t('reader 1 (the decoder): the click comes back at 4800 and 48000 samples come out, in every container; the pre-skip is removed by the decoder', () => {
  for (const f of FMTS) {
    near(E(f).click, CLICK_AT, 2, f); near(E(f).samples, N, PACKET, f);
    if (isV6()) { assert.equal(E(f).click, CLICK_AT, f); assert.equal(E(f).samples, N, f); }
  }
});

t('known positive: rewrite only the pre-skip field in the head (ogg with a recomputed page CRC, mkv in CodecPrivate) and the click moves by exactly the difference: pre-skip 0 puts it 312 samples late, 312 changes nothing, 1000 puts it 688 early', () => {
  const pre = E('ogg').head.preSkip;
  for (const f of ['ogg', 'mkv']) for (const v of [0, 312, 1000]) {
    const r = P(`${f}_${v}`); assert.equal(r.head.preSkip, v, `${f} ${v}: the patch landed`);
    assert.equal(r.click, CLICK_AT + pre - v, `${f} ${v}`); assert.equal(r.samples, N + pre - v, `${f} ${v}: length follows too`);
  }
  assert.equal(P('ogg_312').click, E('ogg').click); assert.equal(P('mkv_312').samples, E('mkv').samples);
  if (isV6()) { assert.equal(P('ogg_0').click, 5112); assert.equal(P('mkv_0').samples, 48312); assert.equal(P('ogg_1000').click, 4112); assert.equal(P('ogg_1000').samples, 47312); }
});

t('-c copy of the whole file changes nothing: same decoded hash as the original encode and the same pre-skip, in ogg and in mkv', () => {
  for (const [c, f] of [['copyAllOgg', 'ogg'], ['copyAllMkv', 'mkv']]) {
    assert.equal(C(c).md5, ev.gapsFull[f].md5, c); assert.equal(C(c).head.preSkip, ev.gapsFull[f].head.preSkip, c); assert.equal(C(c).peaks, 40, c); assert.equal(C(c).consistent, true, c);
  }
});

t('every stream-copy cut keeps the pre-skip of the source and cuts on whole 960 sample packets: the decoded start is a multiple of 960 samples away from the request (6.1.1: ogg after -i +960, 100 ms pages before -i 0, mkv before -i -960, mkv after -i 0)', () => {
  for (const c of ['oggAfter', 'oggpBefore', 'oggpAfter', 'mkvBefore', 'mkvAfter']) {
    const r = C(c); assert.equal(r.head.preSkip, E('ogg').head.preSkip, c); assert.equal(r.consistent, true, c);
    assert.equal(((r.offset % PACKET) + PACKET) % PACKET, 0, `${c}: offset ${r.offset} is a whole number of packets`);
  }
  if (isV6()) {
    assert.deepEqual(['oggAfter', 'oggpBefore', 'oggpAfter', 'mkvBefore', 'mkvAfter'].map((c) => C(c).offset), [960, 0, 960, -960, 0]);
    assert.deepEqual(['oggAfter', 'oggpBefore', 'mkvBefore', 'mkvAfter'].map((c) => C(c).samples), [23688, 24000, 24960, 24000]);
  }
});

t('measured on 6.1.1: -ss before -i with -c copy on an ogg with the default 1 s pages cuts nothing: all 48000 samples and all 40 clicks come out, with a start_time of -0.5 s (the file has one audio page to seek to)', () => {
  const r = C('oggBefore'); assert.equal(r.head.preSkip, E('ogg').head.preSkip);
  if (!isV6()) return;
  assert.equal(r.samples, N); assert.equal(r.peaks, 40); assert.equal(r.offset, -CUT_SAMPLES); near(r.probe.streamStart, -0.5, 1e-6);
});

t('a re-encoded cut starts where it was asked: -ss before -i and libopus, or -af atrim, put the first decoded sample at source sample 24000 (within 2), with a fresh pre-skip', () => {
  for (const c of ['reencode', 'atrim']) { const r = C(c); near(r.startsAt, CUT_SAMPLES, 2, c); assert.equal(r.consistent, true, c); assert.equal(r.head.preSkip, E('ogg').head.preSkip, c); }
  near(C('reencode').samples, N - CUT_SAMPLES, PACKET); if (isV6()) { assert.equal(C('reencode').samples, 24000); assert.equal(C('reencode').tail, 0); }
});

t('measured on 6.1.1: the end of a cut can grow: -ss after -i with -c copy on ogg and atrim both decode 648 samples more than the source has left (tail 648), -ss before -i with a re-encode does not (tail 0)', () => {
  if (!isV6()) return;
  assert.equal(C('oggAfter').tail, 648); assert.equal(C('oggpAfter').tail, 648); assert.equal(C('atrim').tail, 648); assert.equal(C('atrim').samples, 24648); assert.equal(C('reencode').tail, 0);
});
