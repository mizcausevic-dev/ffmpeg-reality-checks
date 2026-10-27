import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, peaksOf, onsetOf, gapIdentify, gapSamples, GAP_POS, expectedLength, buildOf, SR, N, FRAME, IMP_AT, TONE_FROM, CUTS, CUT_SAMPLES} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff78-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const E = (k) => ev.encodes[k];
const C = (k) => ev.cuts[k];
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const ENC = ['imp_cbr_tag', 'imp_cbr_raw', 'imp_vbr_tag', 'imp_vbr_raw', 'tone_cbr_tag', 'tone_cbr_raw', 'tone_vbr_tag', 'tone_vbr_raw'];
const TAGGED = ENC.filter((k) => k.endsWith('_tag')), RAW = ENC.filter((k) => k.endsWith('_raw'));

t('the helpers behave: peaksOf merges close maxima, onsetOf finds the first sample at half level, gapIdentify names the first impulse from the gap pattern, expectedLength reads frames minus delay minus padding, build detection', () => {
  const a = new Int16Array(3000); a[100] = 9000; a[103] = 7000; a[1000] = 8000; a[1810] = 8000;
  assert.deepEqual(peaksOf(a).map((p) => p.index), [100, 1000, 1810]);
  assert.equal(onsetOf(Int16Array.from([0, 100, 7999, 8000, 9000])), 3);
  const g = gapSamples(); const shifted = new Int16Array(g.length); for (let i = 11; i < g.length; i++) shifted[i - 11] = g[i]; // cut 11 samples off the start
  const id = gapIdentify(shifted); assert.equal(id.first, 0); assert.equal(id.startsAt, 11); assert.equal(id.consistent, true);
  const late = new Int16Array(N); for (const q of GAP_POS) if (q >= 20000) late[q - 20000] = 24000; // cut 20000 samples off the start
  const id2 = gapIdentify(late); assert.equal(id2.first, 21); assert.equal(id2.startsAt, 20000); assert.equal(id2.consistent, true);
  assert.equal(expectedLength({tag: 'Info', audioFrames: 40, delay: 576, padding: 1404}), 44100); assert.equal(expectedLength({tag: null, audioFrames: 40}), 46080);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, and the sources are what the fixture promises: 44100 samples at 44100 Hz, impulse at 4410, tone burst from 4410, 40 gap-coded impulses', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(ev.source.samples, N); assert.equal(ev.source.rate, SR); assert.equal(ev.source.impAt, IMP_AT); assert.equal(ev.source.toneFrom, TONE_FROM); assert.equal(ev.source.gapImpulses, 40);
  assert.equal(Object.keys(ev.encodes).length, 8); assert.equal(Object.keys(ev.cuts).length, Object.keys(CUTS).length);
});

t('control: the same wav through pcm_s16le comes back with 44100 samples, the impulse at 4410 and the tone burst starting at 4410, so both readers can see an exact position', () => {
  assert.equal(ev.control.imp.samples, N); assert.equal(ev.control.imp.peak, IMP_AT); assert.equal(ev.control.imp.peakValue, 29000);
  assert.equal(ev.control.tone.samples, N); assert.equal(ev.control.tone.onset, TONE_FROM); assert.equal(ev.control.tone.peakValue, 16000);
  assert.equal(ev.gapsFull.peaks, 40); assert.equal(ev.gapsFull.first, 0); assert.equal(ev.gapsFull.consistent, true);
});

t('the bytes: every encode is a clean walk of 40 audio frames of 1152 samples (41 frame headers with the tag, 40 without), the walk ends exactly at the end of the file, the tag frame is Info for CBR and Xing for VBR', () => {
  for (const k of ENC) {
    const m = E(k).mp3;
    assert.equal(m.walkedEnd, true, k); assert.equal(m.audioFrames, 40, k); assert.equal(m.decodedWithoutSkip, 40 * FRAME, k);
    assert.equal(m.walked, k.endsWith('_tag') ? 41 : 40, k);
    assert.equal(m.tag, k.endsWith('_raw') ? null : k.includes('_cbr_') ? 'Info' : 'Xing', k);
  }
  assert.deepEqual(E('imp_cbr_tag').mp3.bitrates, [128]);
  assert.ok(E('imp_vbr_tag').mp3.bitrates.length > 1 || E('imp_vbr_tag').mp3.bitrates[0] !== 128, 'VBR frames are not all 128 kbit/s');
});

t('without the tag (-write_xing 0) the decoder cannot know the delay: the impulse and the tone both come back about 1105 samples late, and the file decodes to 40 x 1152 = 46080 samples for 44100 in (CBR and VBR)', () => {
  for (const k of RAW) {
    const r = E(k);
    assert.equal(r.samples, 40 * FRAME, k); assert.equal(r.samples - N, 1980, 'extra samples: delay plus padding'); near(r.shift, 1105, 3, k);
    if (isV6()) assert.equal(r.shift, 1105, k);
  }
  for (const m of ['cbr', 'vbr']) assert.equal(E(`imp_${m}_raw`).shift, E(`tone_${m}_raw`).shift, `${m}: the impulse and the tone move by the same amount`);
  assert.equal(E('imp_cbr_raw').shift, E('imp_vbr_raw').shift, 'CBR and VBR move by the same amount');
});

t('with the tag the delay is gone from the decode: shift 0 and exactly 44100 samples on 6.1.1; on every build the tagged decode is shorter and earlier than the raw one', () => {
  for (const k of TAGGED) {
    const r = E(k), raw = E(k.replace('_tag', '_raw'));
    assert.ok(r.samples < raw.samples, k); assert.ok(Math.abs(r.shift) < Math.abs(raw.shift), k);
    if (isV6()) { assert.equal(r.samples, N, k); assert.equal(r.shift, 0, k); }
  }
});

t('reader 2 (the header bytes) agrees with reader 1 (the decoder): the header delay field says 576 and padding 1404 (6.1.1), delay plus padding equals frames x 1152 minus 44100, and the shift the tag removes equals delay + 529', () => {
  for (const k of TAGGED) {
    const m = E(k).mp3, raw = E(k.replace('_tag', '_raw'));
    assert.equal(m.tagFrames, m.audioFrames, k);
    assert.equal(m.delay + m.padding, m.audioFrames * FRAME - N, `${k}: the fields account for every extra sample`);
    near(raw.shift - E(k).shift, m.delay + 529, 3, `${k}: decoder removes delay + 528 + 1`);
    if (isV6()) { assert.equal(m.delay, 576, k); assert.equal(m.padding, 1404, k); assert.equal(m.delayHex, '24057c', k); assert.equal(raw.shift - E(k).shift, 1105, k); }
  }
  assert.equal(E('imp_cbr_tag').mp3.delay, E('imp_vbr_tag').mp3.delay, 'CBR and VBR write the same delay');
});

t('the decoded length always follows the header: samples = audio frames x 1152 minus delay minus padding for every tagged file, and audio frames x 1152 for every raw one (the cuts too)', () => {
  for (const k of ENC) if (isV6() || k.endsWith('_raw')) assert.equal(E(k).samples, E(k).expectedLength, k);
  for (const k of Object.keys(ev.cuts)) if (isV6() || !ev.cuts[k].mp3.tag) assert.equal(ev.cuts[k].samples, ev.cuts[k].expectedLength, k);
  assert.equal(ev.gapsFull.samples, N);
});

t('ffprobe (reader 3): start_time is 0 without the tag and 1105 / 44100 = 0.025057 s with it (6.1.1); the durations differ by the extra padding only', () => {
  for (const k of RAW) near(E(k).probe.startTime, 0, 1e-6, k);
  if (isV6()) { for (const k of TAGGED) near(E(k).probe.startTime, 1105 / SR, 2e-6, k); near(E('imp_cbr_tag').probe.duration, 1.044898, 1e-5); }
  // 6.1.1 prints the tagged duration with the delay and padding included (1.0449 s); 8.1.2 prints 1.000 s for a tagged file.
  for (const k of ENC) assert.ok(E(k).probe.duration >= (isV6() || k.endsWith('_raw') ? 1.0 : 0.99) && E(k).probe.duration < 1.06, k);
});

t('known-positive control: both signals, both modes, show a non-zero shift when the tag is removed, so the readers can see the effect; the shift is identical to the sample for the impulse (peak) and the tone (half-level onset)', () => {
  const shifts = RAW.map((k) => E(k).shift);
  assert.ok(shifts.every((s) => s > 1000), 'every raw encode is late by more than 1000 samples');
  assert.equal(new Set(shifts).size, 1);
});

t('-c copy of the whole tagged file changes nothing audible: the same 44100 decoded samples (same hash), the same delay and padding fields', () => {
  const c = C('copyAll'), src = ev.gapsFull;
  assert.equal(c.md5, src.md5); assert.equal(c.samples, src.samples); assert.equal(c.mp3.delay, src.mp3.delay); assert.equal(c.mp3.padding, src.mp3.padding); assert.equal(c.mp3.audioFrames, 40);
});

t('the re-encoded cut (-ss 0.5 then libmp3lame) starts where it was asked: decoded sample 0 is source sample 22050, within 2 samples, with 22050 samples out', () => {
  const r = C('reencode5');
  near(r.startsAt, CUT_SAMPLES, 2); near(r.samples, 22050, 2); assert.equal(r.consistent, true);
  assert.equal(r.mp3.delay + r.mp3.padding, r.mp3.audioFrames * FRAME - r.samples);
});

t('a stream-copy cut is cut on a frame boundary: the copy keeps whole 1152 sample frames (the decoded length follows the header), and the cut without the tag starts within one frame of the request', () => {
  for (const k of ['copyBefore5', 'copyAfter5', 'copyNoXing5', 'copyBefore1', 'copyBefore3', 'copyBefore7']) {
    const r = C(k); assert.ok(r.mp3.audioFrames > 0 && r.mp3.audioFrames < 40, k); assert.equal(r.consistent || r.first === null, true, k);
  }
  const n = C('copyNoXing5'); assert.equal(n.mp3.tag, null); assert.equal(n.consistent, true); assert.ok(Math.abs(n.late) <= FRAME, `no tag: ${n.late} samples from the request`);
  if (isV6()) { assert.equal(n.late, -115); assert.equal(n.samples, 20 * FRAME); }
});

t('measured on 6.1.1: the stream-copy cut writes delay 3567 into its new tag, so the decoder drops 3567 + 529 = 4096 samples and the cut lands 3189 to 3981 samples late (before -i), 5133 after -i; it is the same delay field for every seek time', () => {
  if (!isV6()) return;
  for (const k of ['copyBefore1', 'copyBefore3', 'copyBefore5', 'copyBefore7', 'copyAfter5']) { assert.equal(C(k).mp3.delay, 3567, k); assert.equal(C(k).mp3.padding, 1404, k); }
  assert.deepEqual(['copyBefore1', 'copyBefore3', 'copyBefore5', 'copyBefore7'].map((k) => C(k).late), [3189, 3585, 3981, 3225]);
  assert.equal(C('copyAfter5').late, 5133);
  near(C('copyBefore5').probe.startTime, 4096 / SR, 2e-6);
  assert.equal(C('copyBefore5').samples, 18069);
});

t('the cuts keep every impulse after the start (the audio is intact, only the start moves): the copy of 0.5 s keeps 14 impulses, the last one is the source impulse 39, all gaps follow the 800 + 10 k pattern', () => {
  if (!isV6()) return;
  const r = C('copyBefore5'); assert.equal(r.first, 26); assert.equal(r.peaks, 14); assert.equal(r.consistent, true);
  assert.equal(r.first + r.peaks, GAP_POS.length, 'from the first kept impulse to the last source impulse, none missing');
});
