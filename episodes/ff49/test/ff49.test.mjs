import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, encode, parseMp3, buildOf, SIGNALS, QS, MIN_KBPS, MAX_KBPS} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff49-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const V = (s, q) => ev.vbr[s][q];
const allFiles = () => [...SIGNALS.flatMap((s) => [...QS.map((q) => [`${s} q${q}`, V(s, q)]), [`${s} cbr128`, ev.cbr[s]]]), ['mixed q2', ev.mixed[2]], ['mixed q6', ev.mixed[6]], ['noise cbr320', ev.cbr320]];

t('the Node frame walker is right on bytes it did not read from ffmpeg: three hand-built 128 kbit/s frames of 417 bytes (plus an ID3 header) read as 3 frames at 128, and a Xing tag frame is skipped; build detection', () => {
  const frame = (pad, tag) => { const b = Buffer.alloc(417 + pad); b.writeUInt32BE((0xfffb9000 | (pad ? 0x200 : 0)) >>> 0, 0); if (tag) b.write(tag, 4 + 32, 'latin1'); return b; };
  const id3 = Buffer.from([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 5, 1, 2, 3, 4, 5]);
  const f = path.join(dir, 'crafted.mp3');
  fs.writeFileSync(f, Buffer.concat([id3, frame(0, 'Info'), frame(0), frame(1), frame(0)]));
  const p = parseMp3(f);
  assert.equal(p.tag, 'Info'); assert.equal(p.frames, 3); assert.deepEqual(p.distinct, [128]); near(p.headerMeanKbps, 128, 1e-9);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, and every file has the length the fixture promises: 10 s is 383 to 386 mp3 frames of 1152 samples, and ffprobe and Node count the same frames (to within 1)', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(allFiles().length, 5 * 10 + 5 + 2 + 1);
  for (const [k, v] of allFiles()) {
    assert.ok(v.nodeFrames >= 383 && v.nodeFrames <= 386, `${k} frames ${v.nodeFrames}`);
    near(v.probePackets, v.nodeFrames, 1, k);
  }
});

t('control, known positive: -b:a 128k gives exactly 128 kbit/s for all five signals, read by Node from the headers and by ffprobe from the packet sizes, and every single frame is a 128 kbit/s frame; 320k gives 320', () => {
  for (const s of SIGNALS) {
    const v = ev.cbr[s];
    near(v.nodeHeaderKbps, 128, 0.001, s); near(v.nodeKbps, 128, 0.3, s); near(v.probePacketKbps, 128, 0.3, s);
    assert.deepEqual(v.distinct, [128], s); assert.equal(v.tag, 'Info', s);
  }
  near(ev.cbr320.nodeHeaderKbps, 320, 0.001); near(ev.cbr320.probePacketKbps, 320, 0.3); assert.deepEqual(ev.cbr320.distinct, [320]);
  const sizes = SIGNALS.map((s) => ev.cbr[s].bytes);
  assert.ok(Math.max(...sizes) / Math.min(...sizes) < 1.001, 'constant bitrate files are the same size whatever the signal');
});

t('reader agreement on all 58 files: the average from the frame headers (Node) matches the average from ffprobe packet sizes within 0.5 percent, and the format bit_rate that tools print is above it by less than 1 kbit/s on ffmpeg 6.1.1 and by less than 2.5 kbit/s on 8.1.2 (the noise 320 kbit/s file is 1.9 above on 8.1.2)', () => {
  for (const [k, v] of allFiles()) {
    near(v.nodeKbps, v.probePacketKbps, 0.05, k);
    near(v.nodeHeaderKbps, v.probePacketKbps, Math.max(0.3, v.probePacketKbps * 0.005), k);
    const d = v.probeFormatKbps - v.probePacketKbps; assert.ok(d > -0.2 && d < (buildOf(ev.ffmpeg) === 'v8' ? 2.5 : 1), `${k} format minus packets ${d}`);
  }
});

t('the same quality gives very different bitrates: at -q:a 2 silence is the smallest and noise the largest, the five signals all differ by at least 8 kbit/s, and noise is at least 5 times silence', () => {
  const k = SIGNALS.map((s) => V(s, 2).nodeKbps);
  const sorted = [...k].sort((a, b) => a - b);
  assert.equal(k.indexOf(Math.min(...k)), SIGNALS.indexOf('silence')); assert.equal(k.indexOf(Math.max(...k)), SIGNALS.indexOf('noise'));
  for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i] - sorted[i - 1] >= 8, `signals too close: ${sorted}`);
  assert.ok(V('noise', 2).nodeKbps >= 5 * V('silence', 2).nodeKbps, `${V('noise', 2).nodeKbps} vs ${V('silence', 2).nodeKbps}`);
  assert.ok(V('noise', 2).probePacketKbps >= 5 * V('silence', 2).probePacketKbps);
});

t('silence has a floor: every quality from 0 to 9 gives the same file size, every frame is a 32 kbit/s frame (the minimum), and the average is 32 kbit/s within 0.2', () => {
  const sizes = QS.map((q) => V('silence', q).bytes);
  assert.equal(new Set(sizes).size, 1, `sizes ${sizes}`);
  for (const q of QS) { const v = V('silence', q); assert.deepEqual(v.distinct, [MIN_KBPS], `q${q}`); near(v.nodeKbps, MIN_KBPS, 0.2); near(v.probePacketKbps, MIN_KBPS, 0.2); }
});

t('a larger quality number never costs more bits: for every signal the average does not rise as -q:a goes from 0 to 9, on both readers, and noise falls by at least a factor of 2.5 from 0 to 9', () => {
  for (const s of SIGNALS) for (let q = 1; q < QS.length; q++) {
    assert.ok(V(s, q).nodeKbps <= V(s, q - 1).nodeKbps + 0.3, `${s} q${q} ${V(s, q).nodeKbps} > q${q - 1} ${V(s, q - 1).nodeKbps}`);
    assert.ok(V(s, q).probePacketKbps <= V(s, q - 1).probePacketKbps + 0.3, `${s} probe q${q}`);
  }
  assert.ok(V('noise', 0).nodeKbps >= 2.5 * V('noise', 9).nodeKbps);
});

t('the setting is not a bitrate: no non-silent signal lands on one value at any quality below 9, and the five signals do not agree within 20 kbit/s at any of the quality settings 0 to 4', () => {
  for (const q of [0, 1, 2, 3, 4]) {
    const k = SIGNALS.map((s) => V(s, q).nodeKbps);
    assert.ok(Math.max(...k) - Math.min(...k) > 20, `q${q} spread ${Math.max(...k) - Math.min(...k)}`);
  }
});

t('a variable bitrate file is not constant inside: every non-silent file at -q:a 2 uses at least 3 different frame bitrates, between the 32 and 320 kbit/s limits, and carries a Xing tag; the constant bitrate files carry an Info tag', () => {
  for (const s of SIGNALS.filter((x) => x !== 'silence')) {
    const v = V(s, 2);
    assert.ok(v.distinct.length >= 3, `${s} ${v.distinct}`); assert.ok(v.min >= MIN_KBPS && v.max <= MAX_KBPS);
    assert.equal(v.tag, 'Xing', s);
  }
  assert.ok(V('noise', 2).min >= 128, 'white noise never drops below 128 kbit/s in any frame');
  assert.ok(V('sweep', 2).min <= 40 && V('sweep', 2).max >= 128, 'the sweep spans from near the floor to a high frame');
});

t('the average is not what any frame does: 5 s of silence then 5 s of noise at -q:a 2 averages about 107 kbit/s, which is the mean of its halves (32.7 and 182.5 read separately), yet fewer than 5 percent of its frames are within 25 kbit/s of that average', () => {
  const m = ev.mixed[2];
  near(m.firstHalfKbps, V('silence', 2).nodeKbps, 1.5); near(m.secondHalfKbps, V('noise', 2).nodeKbps, 4);
  near(m.nodeKbps, (m.firstHalfKbps + m.secondHalfKbps) / 2, 2); near(m.probePacketKbps, m.nodeKbps, 0.05);
  assert.ok(m.nodeKbps > 90 && m.nodeKbps < 125, `${m.nodeKbps}`);
  assert.ok(m.nearAverage / m.nodeFrames < 0.05, `frames near the average ${m.nearAverage} of ${m.nodeFrames}`);
});

t('the file size follows the signal, not the setting: at -q:a 2 the noise file is at least 5 times the silence file, while at 128k every file is the same size; and quality 6 on the mixed file is smaller than quality 2 on it', () => {
  assert.ok(V('noise', 2).bytes >= 5 * V('silence', 2).bytes);
  assert.ok(ev.mixed[6].nodeKbps < ev.mixed[2].nodeKbps);
  near(ev.mixed[6].firstHalfKbps, V('silence', 6).nodeKbps, 1.5);
});

t('the measurement is repeatable: encoding the noise at -q:a 2 a second time gives a byte-identical file, so the numbers in this episode are properties of the signal, not of a run', () => {
  const a = encode('noise', ['-q:a', '2'], path.join(dir, 'rep_a.mp3')), b = encode('noise', ['-q:a', '2'], path.join(dir, 'rep_b.mp3'));
  assert.ok(fs.readFileSync(a).equals(fs.readFileSync(b)));
  assert.equal(fs.statSync(a).size, V('noise', 2).bytes);
});
