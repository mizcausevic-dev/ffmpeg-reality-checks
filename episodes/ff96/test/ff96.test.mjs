import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, rowOf, sectionSpread, sineProgram, measure, LEVELS, PROGRAMS, buildOf, R} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const row = (p, id) => rowOf(ev, p, id);
const both = (fn) => ['short', 'long'].forEach((p) => fn(p, ev.programs[p]));
const IDS = ['input', 'ln', 'ln16', 'ln2', 'ln2f', 'dyn', 'dynt'];

t('the readers behave on signals we make ourselves: a 1000 Hz sine reads -9.02 dB in Node and -9.0 in ebur128, the same sine 6.02 dB lower reads 6.02 lower in Node and in ebur128, and the section levels of the program are the ones we asked for (-38 to -12 dB RMS, K weighting adds 1 dB)', () => {
  near(ev.control.node[0], -9.02, 0.02); near(ev.control.ebur[0], -9.0, 0.06);
  near(ev.control.node[0] - ev.control.node[1], 6.02, 0.02); near(ev.control.ebur[0] - ev.control.ebur[1], 6.0, 0.15);
  const m = measure(new Float32Array(sineProgram(0.5).buffer.slice(0)), 1); near(m.I, ev.control.node[0], 1e-9);
  both((p, P) => { const r = rowOf(ev, p, 'input'); LEVELS.forEach((L, k) => near(r.node.sections[k], L - 1, 0.1, `${p} section ${k}`)); near(sectionSpread(r), 28, 0.1); });
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded and the matrix is complete: 2 programs (8 sections of 4 s and of 16 s), 7 versions each (input, loudnorm default, loudnorm to -16, two pass linear, two pass that falls back, dynaudnorm default, dynaudnorm f=150:g=5)', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.deepEqual(PROGRAMS.map((p) => p.sec), [4, 16]);
  both((p, P) => { assert.deepEqual(P.rows.map((r) => r.id), IDS); assert.equal(P.samples, Math.round(8 * (P.sec + 0.4) * R)); for (const r of P.rows) assert.equal(r.samples, P.samples, `${p} ${r.id}`); });
});

t('two readers agree on every output: integrated loudness within 0.15 LU, sample peak within 0.1 dB, and loudness range within 0.3 LU in all but at most two of the 14 outputs (v6: exactly one, see the gate test)', () => {
  let off = 0;
  both((p, P) => { for (const r of P.rows) { near(r.ebur.I, r.node.I, 0.15, `${p} ${r.id} I`); near(r.ebur.samplePeak, r.node.samplePeakDb, 0.1, `${p} ${r.id} peak`); assert.ok(r.ebur.truePeak >= r.ebur.samplePeak - 0.05, `${p} ${r.id} true peak`); if (Math.abs(r.ebur.LRA - r.node.LRA) > 0.3) off++; } });
  assert.ok(off <= 2, `${off} outputs differ`);
  if (isV6()) assert.equal(off, 1);
});

t('the input: both programs read about -17 LUFS with a loudness range of about 20 LU and the quietest and loudest sections 28 LU apart; the true peak is within 1 dB of full scale', () => {
  both((p) => { const r = row(p, 'input'); near(r.node.I, -17, 0.2, p); near(r.node.LRA, 19.75, 0.5, p); near(sectionSpread(r), 28, 0.1); assert.ok(r.ebur.truePeak > -1.2 && r.ebur.truePeak < 0); });
});

t('loudnorm with its defaults (target -24 LUFS, range 7, true peak -2) misses its own integrated target: it lands within 1.5 LU but not on it (-23.1 on both programs), and keeps the peak below -2', () => {
  both((p) => { const r = row(p, 'ln'); const miss = r.node.I + 24; assert.ok(Math.abs(miss) < 1.5 && Math.abs(miss) > 0.3, `${p} ${r.node.I}`); assert.ok(r.ebur.truePeak <= -2, `${p}`); if (isV6()) near(r.node.I, -23.1, 0.1, p); });
});

t('loudnorm to -16 LUFS lands within 0.3 LU of the target on both programs and the true peak sits on its -1.5 limit', () => {
  both((p) => { const r = row(p, 'ln16'); near(r.node.I, -16, 0.3, p); near(r.ebur.I, -16, 0.35, p); assert.ok(r.ebur.truePeak <= -1.4 && r.ebur.truePeak >= -1.6, `${p} ${r.ebur.truePeak}`); });
});

t('dynaudnorm has no loudness target: the same defaults end at about -15.9 LUFS on the short program and -14 on the long one (more than 1 LU apart), where loudnorm to -16 keeps both within 0.5 LU of each other; the sample peak sits at the 0.95 peak target (-0.45 dB) within 0.15 dB', () => {
  const a = row('short', 'dyn').node.I, b = row('long', 'dyn').node.I;
  assert.ok(Math.abs(a - b) > 1.0, `${a} ${b}`);
  assert.ok(Math.abs(row('short', 'ln16').node.I - row('long', 'ln16').node.I) < 0.5);
  both((p) => { near(row(p, 'dyn').node.samplePeakDb, 20 * Math.log10(0.95), 0.15, p); near(row(p, 'dynt').node.samplePeakDb, 20 * Math.log10(0.95), 0.15, p); });
  if (isV6()) { near(a, -15.93, 0.1); near(b, -13.95, 0.1); }
});

t('loudnorm does not flatten the program: after loudnorm (default and to -16) the quietest section is still 20 LU or more below the loudest, while the loudness range number falls on the short program (9.7 and 9.4 from 19.5) because its 3 s windows blur 4 s sections; the long program gives a larger range for the same filter', () => {
  both((p) => { for (const id of ['ln', 'ln16']) assert.ok(sectionSpread(row(p, id)) > 20, `${p} ${id} ${sectionSpread(row(p, id))}`); });
  for (const id of ['ln', 'ln16']) { assert.ok(row('short', id).node.LRA < 10.5, id); assert.ok(sectionSpread(row('short', id)) > 24, id); assert.ok(row('short', id).node.LRA < row('short', 'input').node.LRA - 8, id); }
  if (isV6()) { near(sectionSpread(row('short', 'ln')), 24.9, 0.2); near(sectionSpread(row('long', 'ln')), 23.0, 0.2); near(row('short', 'ln').node.LRA, 9.69, 0.05); }
});

t('loudnorm does not reach its loudness range target of 7 LU: the default run gives 9.7 LU on the short program and 16.9 to 22.5 on the long one (both readers above 7.5 on both programs)', () => {
  both((p) => { const r = row(p, 'ln'); assert.ok(r.node.LRA > 7.5 && r.ebur.LRA > 7.5, `${p}`); });
  assert.ok(row('long', 'ln').node.LRA > row('short', 'ln').node.LRA + 3);
});

t('dynaudnorm with its defaults changes little on this program (range 14.6 and 17.9 from 19.5 and 20.0; the sections stay 20 to 26 LU apart), and with a short window (f=150:g=5) it flattens: sections within 10 LU of each other and range under 9.5 LU on both programs', () => {
  both((p) => { const d = row(p, 'dyn'), s = row(p, 'dynt'); assert.ok(d.node.LRA > 13.5, `${p} ${d.node.LRA}`); assert.ok(sectionSpread(d) > 18, `${p}`); assert.ok(sectionSpread(s) < 10, `${p} ${sectionSpread(s)}`); assert.ok(s.node.LRA < 9.5 && s.ebur.LRA < 9.5, `${p} ${s.node.LRA}`); });
  assert.ok(sectionSpread(row('short', 'dyn')) > 24);
  if (isV6()) { near(sectionSpread(row('short', 'dynt')), 8.5, 0.2); near(sectionSpread(row('long', 'dynt')), 8.5, 0.2); }
});

t('two pass loudnorm with linear=true keeps the dynamics when the range target is above the input range (LRA=20): the loudness range and the section spread stay as the input (within 0.3 and 0.2), the pass 2 report says linear, and the integrated loudness misses -24 by exactly what loudnorm\'s own pass 1 reading got wrong', () => {
  both((p, P) => {
    const r = row(p, 'ln2'), i = row(p, 'input');
    assert.equal(P.twoPass.linear.type, 'linear'); near(r.node.LRA, i.node.LRA, 0.3, p); near(sectionSpread(r), sectionSpread(i), 0.2, p); assert.ok(Math.abs(r.node.I + 24) < 1.0, `${p} ${r.node.I}`);
    const p1 = Number(P.twoPass.linear.pass1.input_i); near(r.node.I - (-24), i.node.I - p1, 0.1, `${p} offset against pass 1 reading`);
  });
  if (isV6()) { near(row('short', 'ln2').node.I, -24.54, 0.05); near(Number(ev.programs.short.twoPass.linear.pass1.input_i), -16.46, 0.01); near(row('long', 'ln2').node.I, -24.14, 0.05); }
});

t('loudnorm\'s own meter reads differently from both ebur128 and Node on the short program: its pass 1 integrated loudness is 0.05 to 1 LU higher than the two readers (-16.46 against -17.0), and its pass 1 loudness range is below both readers (14.9 against 19.5)', () => {
  const P = ev.programs.short, p1 = P.twoPass.linear.pass1, i = row('short', 'input');
  const d = Number(p1.input_i) - i.node.I; assert.ok(d > 0.05 && d < 1.0, `${d}`); near(i.ebur.I, i.node.I, 0.1);
  assert.ok(Number(p1.input_lra) < i.node.LRA - 2, `${p1.input_lra}`); assert.ok(Number(p1.input_lra) < i.ebur.LRA - 2);
});

t('two pass with linear=true is a request, not a guarantee: with a range target of 11 below the measured input range, the pass 2 report says dynamic and the output is not the input shifted (range 16.7 and 24.2 against 19.5 and 20.0, sections change by different amounts)', () => {
  both((p, P) => {
    assert.ok(Number(P.twoPass.fallback.pass1.input_lra) > 11, p); assert.equal(P.twoPass.fallback.type, 'dynamic', p);
    const f = row(p, 'ln2f'), i = row(p, 'input'), d = f.node.sections.map((v, k) => v - i.node.sections[k]);
    assert.ok(Math.max(...d) - Math.min(...d) > 3, `${p} gains differ by section: ${d.map((v) => v.toFixed(1))}`);
    const l = row(p, 'ln2'), dl = l.node.sections.map((v, k) => v - i.node.sections[k]); assert.ok(Math.max(...dl) - Math.min(...dl) < 0.2, `${p} linear is one gain`);
  });
});

t('loudnorm in dynamic mode writes 192000 Hz: header and ffprobe agree, 4 times the samples of the input, a plain aresample=48000 brings it back; dynaudnorm and loudnorm in linear mode keep 48000 Hz', () => {
  const P = ev.programs.short, n = P.samples;
  for (const id of ['ln', 'ln16', 'ln2f']) { const r = row('short', id); assert.equal(r.rate.header, r.rate.probe, id); assert.ok(r.rate.header > R, id); assert.equal(r.rate.samples, n * r.rate.header / R, id); assert.equal(r.rateFixed.header, R, id); assert.equal(r.rateFixed.samples, n, id); }
  for (const id of ['ln2', 'dyn', 'dynt']) { const r = row('short', id); assert.equal(r.rate.header, R, id); assert.equal(r.rate.probe, R, id); assert.equal(r.rate.samples, n, id); }
  if (isV6()) for (const id of ['ln', 'ln16', 'ln2f']) assert.equal(row('short', id).rate.header, 192000);
});

t('the loudness range is knife edge near its gate: on the long program the default loudnorm output puts a cluster of blocks next to the relative gate and the two readers differ by more than 5 LU (22.5 against 16.9) while both agree on the integrated loudness', () => {
  const a = row('long', 'ln'), g = ev.gateCase;
  near(a.ebur.I, a.node.I, 0.15); assert.ok(g.share > 0.05, `${g.share}`);
  assert.ok(Math.abs(a.ebur.LRA - a.node.LRA) > 3, `${a.ebur.LRA} ${a.node.LRA}`);
  if (isV6()) { near(a.ebur.LRA, 22.5, 0.1); near(a.node.LRA, 16.94, 0.1); }
});
