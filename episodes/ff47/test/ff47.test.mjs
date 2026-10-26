import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, silentRuns, toneSegments, buildOf, CASES, SR, TOTAL, SILENCES, THRESH_INT, WINDOW} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff47-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (k) => ev.runs[k];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const lens = (r) => r.silentRuns.map((s) => s.len);

t('the helpers behave: a hand-made signal with two quiet runs reads as two silences and three tone segments, short quiet stretches (zero crossings) are ignored, the threshold of -50 dB is 104 on a 16 bit scale; build detection', () => {
  const x = new Int16Array(10000).fill(5000); x.fill(0, 1000, 4000); x.fill(60, 6000, 9000); x.fill(0, 500, 520);
  const runs = silentRuns(x);
  assert.deepEqual(runs.map((r) => [r.start, r.len]), [[1000, 3000], [6000, 3000]], 'a run of 60 (under 104) is silence, a 20 sample dip is not');
  assert.equal(toneSegments(x, runs).length, 3);
  assert.equal(toneSegments(x, runs).reduce((a, g) => a + g.len, 0) + runs.reduce((a, r) => a + r.len, 0), x.length);
  assert.equal(THRESH_INT, 104);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, and the source is what the fixture promises: 192000 samples (4.0 s) by ffprobe and by Node, three silences of about 24000, 48000 and 24000 samples at 0, 72000 and 168000, and about 96000 samples of tone; ffmpeg silencedetect lists the same three', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  const s = ev.source;
  assert.equal(s.samples, TOTAL); assert.equal(s.probeSamples, TOTAL);
  assert.equal(s.silences, 3); assert.equal(s.detectSilences, 3);
  [0, 72000, 168000].forEach((p, i) => { near(s.silentRuns[i].start, p, 2); near(s.silentRuns[i].len, SILENCES[i], 2); });
  s.silenceDetect.forEach((d, i) => { near(d.start, [0, 72000, 168000][i], 100); near(d.end - d.start, SILENCES[i], 100); });
  near(s.toneSamples, 96000, 8);
});

t('control, known positive: atrim=start=0.5 removes exactly 24000 samples, so both readers say 168000, the output is the last 168000 source samples byte for byte, and two silences are left (48000 and 24000 long): the readers can see a leading cut', () => {
  const a = R('atrim');
  assert.equal(a.samples, TOTAL - 24000); assert.equal(a.probeSamples, TOTAL - 24000);
  assert.equal(a.equalsSourceTail, true); assert.equal(a.silences, 2); assert.equal(a.detectSilences, 2);
  near(lens(a)[0], 48000, 2); near(lens(a)[1], 24000, 2);
});

t('control, known positive: cutting all three silences by hand (atrim and concat) gives 96000 samples of tone and no silence at all, on both readers and on silencedetect: this is what "all silence removed" looks like', () => {
  const k = R('known');
  assert.equal(k.samples, 96000); assert.equal(k.probeSamples, 96000); assert.equal(k.silences, 0); assert.equal(k.detectSilences, 0);
  near(k.toneSamples, 96000, 0);
});

t('silenceremove with no options does nothing: 192000 samples out, byte for byte the source, all three silences still there (Node and silencedetect)', () => {
  const n = R('none');
  assert.equal(n.samples, TOTAL); assert.equal(n.probeSamples, TOTAL); assert.equal(n.md5, ev.srcMd5); assert.equal(n.equalsSourceTail, true);
  assert.equal(n.silences, 3); assert.equal(n.detectSilences, 3);
});

t('start_periods=1 cuts only the leading silence: 24000 to 24960 samples removed, the output is the source tail byte for byte, the middle (48001) and last (24000) silences are untouched, 2 of 3 silences remain on both readers', () => {
  const s = R('start'), removed = TOTAL - s.samples;
  assert.ok(removed >= 24000 && removed <= 24000 + WINDOW, `removed ${removed}`);
  assert.equal(s.probeSamples, s.samples); assert.equal(s.equalsSourceTail, true);
  assert.equal(s.silences, 2); assert.equal(s.detectSilences, 2);
  near(lens(s)[0], 48001, 2); near(lens(s)[1], 24000, 2);
  near(s.toneSamples, ev.source.toneSamples, 8);
});

t('stop_periods=1 is worse: it cuts at the first silence after the tone and drops everything after it, including the second tone: the output is the source head byte for byte, about half the tone samples remain, and the file ends 0.3 s of silence after the first tone', () => {
  const s = R('stop1');
  assert.equal(s.equalsSourceHead, true); assert.equal(s.probeSamples, s.samples);
  near(s.toneSamples / ev.source.toneSamples, 0.5, 0.01);
  assert.ok(s.samples >= 72000 + 0.3 * SR && s.samples <= 72000 + 0.3 * SR + 2 * WINDOW, `samples ${s.samples}`);
  assert.equal(s.detectSilences, s.silences);
  assert.ok(R('stop1').samples < ev.source.samples / 2, 'under half of the source length');
});

t('stop_periods=-1 on its own cuts the middle and the end but leaves the leading silence: lead silence 24001 untouched, middle and end silences shortened to about 0.3 s, both tones kept in full', () => {
  const s = R('stopAll');
  assert.equal(s.silences, 3); assert.equal(s.detectSilences, 3);
  near(s.silentRuns[0].start, 0, 0); near(lens(s)[0], 24001, 2);
  const keep = 0.3 * SR;
  for (const i of [1, 2]) { const k = lens(s)[i]; assert.ok(k >= keep && k <= keep + 2 * WINDOW, `kept ${k}`); assert.ok(k < SILENCES[i] - 5000, `shortened ${k}`); }
  near(s.toneSamples, ev.source.toneSamples, 8);
});

t('start_periods=1 plus stop_periods=-1 is the combination that works: no leading silence, the other two silences shortened to about 0.3 s each, both tones kept (tone samples within 8 of the source), 126708 samples on this build instead of 96000', () => {
  const b = R('both');
  assert.equal(b.silences, 2); assert.equal(b.detectSilences, 2); assert.ok(b.silentRuns[0].start > 0);
  near(b.toneSamples, ev.source.toneSamples, 8);
  const keep = 0.3 * SR; for (const l of lens(b)) assert.ok(l >= keep && l <= keep + 2 * WINDOW, `kept ${l}`);
  assert.ok(b.samples > R('known').samples + 25000, 'it is far from the hand-cut answer');
  near(b.samples, 96000 + 2 * (keep + WINDOW), 2 * WINDOW);
});

t('stop_duration is the silence it keeps: with 0.3, 0.1 and 0.02 each remaining gap is that many samples plus about one window (20 ms) of extra, so the output shrinks 126708, 107508, 99828 on this build and every step is a strictly smaller file', () => {
  const rows = [['both', 0.3], ['bothTight', 0.1], ['bothTiny', 0.02]];
  let prev = Infinity;
  for (const [k, d] of rows) {
    const r = R(k), gap = (r.samples - 96000) / 2, extra = gap - d * SR;
    assert.ok(extra >= 0 && extra <= 2 * WINDOW, `${k} gap ${gap} extra ${extra}`);
    assert.ok(r.samples < prev); prev = r.samples;
  }
  near(R('bothTight').silentRuns[0].len, 0.1 * SR + WINDOW, WINDOW);
});

t('it never reaches the known answer: even stop_duration=0.02 leaves more than 96000 samples (a gap of at least 20 ms is kept in each of the two gaps), and the kept gaps are too short for the reader to call them silences', () => {
  assert.ok(R('bothTiny').samples > 96000 + 1000, `${R('bothTiny').samples}`);
  assert.ok(R('bothTiny').samples < 96000 + 4 * WINDOW);
  assert.equal(R('bothTiny').silences, 0, 'the kept gaps are shorter than the 50 ms the reader counts as a silence');
});

t('reader agreement on all 10 files: ffprobe duration_ts equals the Node sample count, and ffmpeg silencedetect finds the same number of silences as the Node run finder, with starts within 1 ms (48 samples) of the Node runs', () => {
  const all = [['source', ev.source], ...Object.entries(ev.runs)];
  assert.equal(all.length, 10);
  for (const [k, r] of all) {
    assert.equal(r.probeSamples, r.samples, k);
    assert.equal(r.detectSilences, r.silences, k);
    r.silenceDetect.forEach((d, i) => { near(d.start, r.silentRuns[i].start, 48, `${k} start ${i}`); });
  }
});

t('every cut is a cut and nothing else: none, start, atrim equal a slice of the source byte for byte (head or tail), stop1 equals the source head; the filter changed no sample it kept', () => {
  assert.equal(R('none').equalsSourceTail, true); assert.equal(R('start').equalsSourceTail, true); assert.equal(R('atrim').equalsSourceTail, true); assert.equal(R('stop1').equalsSourceHead, true);
  assert.equal(R('start').equalsSourceHead, false, 'a tail slice is not the head');
  assert.equal(Object.keys(CASES).length, 9);
});
