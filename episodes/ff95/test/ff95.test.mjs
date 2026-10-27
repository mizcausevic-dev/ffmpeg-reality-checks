import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, curveOf, rmsBlocks, sineInput, CURVES, FORMULA, PAIRS, POS, IDEAL, A, N, BLOCK, buildOf, db} from '../fixture/experiment.mjs';

const ok = have('ffmpeg');
let ev;
before(() => { if (ok) ev = runExperiment(); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg not on PATH'}, fn);
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const G = (name) => curveOf(ev, name);
const mid = (name) => G(name).gains[2];

t('the readers behave on signals we make ourselves: a hand made constant reads as its own gain, the Node RMS of a hand made 1000 Hz sine block is 0.5 over the square root of 2, and volume=0.25 is read as gain 0.25 by the sample reader and as the ideal level (-21.07 dB) by astats', () => {
  const dc = new Float32Array(100).fill(0.5); assert.equal(dc[17] / 0.5, 1);
  const s = new Float32Array(sineInput(BLOCK * 2).buffer.slice(0)); const r = rmsBlocks(s);
  assert.equal(r.length, 2); near(r[0], A / Math.SQRT2, 1e-6); near(r[1], A / Math.SQRT2, 1e-6);
  assert.equal(ev.known.gainMin, 0.25); assert.equal(ev.known.gainMax, 0.25);
  near(ev.known.astatsDb, ev.known.ideal, 0.001);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded and the matrix is complete: 23 curve names, each fading 48000 samples at the start of a 2 second constant, 96000 samples out', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(CURVES.length, 23); assert.equal(ev.curves.length, 23);
  for (const c of ev.curves) assert.equal(c.count, 96000, c.name);
});

t('every curve starts at gain 0 (exp starts at 0.00001, which is -100 dB), never falls, and is exactly 1 for every sample after the fade (the fade holds its final gain)', () => {
  for (const c of ev.curves) { if (c.name === 'exp') near(c.first, 1e-5, 1e-7, 'exp'); else near(c.first, 0, 1e-7, c.name); assert.ok(c.monotone, `${c.name} drops by ${c.dropMax}`); assert.equal(c.afterMin, 1, c.name); assert.equal(c.afterMax, 1, c.name); }
});

t('two readers agree on loudness: astats RMS per 4800 sample block equals the Node RMS of the decoded samples within 0.001 dB in all 230 blocks, and equals the ideal formula block RMS for the curves with a formula; the unfaded sine control is -9.0309 dB in both', () => {
  near(ev.control.rmsNode, ev.control.ideal, 1e-6); near(ev.control.astatsDb, ev.control.rmsDb, 0.001); near(ev.control.astatsDb, -9.0309, 0.001);
  let n = 0;
  for (const c of ev.curves) {
    assert.equal(c.rmsAstats.length, 10, c.name);
    c.rmsAstats.forEach((v, i) => { near(v, db(c.rmsNode[i]), 0.001, `${c.name} block ${i} (astats vs Node)`); if (c.rmsIdeal) near(v, db(c.rmsIdeal[i]), 0.001, `${c.name} block ${i} (astats vs formula)`); n++; });
  }
  assert.equal(n, 230);
});

t('the 23 names match 23 different curves: halfway through the same fade the gain runs from 0.003 (exp) to 0.94 (log), a spread of about 50 dB, and the order of the low end is exp, quat, cub, qua', () => {
  assert.ok(mid('exp') < mid('quat') && mid('quat') < mid('cub') && mid('cub') < mid('qua'));
  assert.ok(mid('log') > mid('quatr') && mid('log') > mid('cbr') && mid('log') > 0.9);
  assert.ok(db(mid('log')) - db(mid('exp')) > 45);
  for (const c of ev.curves) assert.ok(c.gains[2] > 0 && c.gains[2] < 1, c.name);
  if (isV6()) { near(mid('exp'), 0.0032, 0.0001); near(mid('log'), 0.9398, 0.0001); near(db(mid('exp')), -50.0, 0.05); near(db(mid('log')), -0.54, 0.02); near(db(mid('log')) - db(mid('exp')), 49.46, 0.05); near(db(mid('quat')), -24.08, 0.05); }
});

t('seven curves give exactly 0.5 at the midpoint (tri, hsin, qsin2, ihsin, dese, desi, losi); the other sixteen do not come within 0.02 of it', () => {
  const half = ev.curves.filter((c) => Math.abs(c.gains[2] - 0.5) < 1e-5).map((c) => c.name).sort();
  assert.deepEqual(half, ['dese', 'desi', 'hsin', 'ihsin', 'losi', 'qsin2', 'tri']);
  for (const c of ev.curves) if (!half.includes(c.name)) assert.ok(Math.abs(c.gains[2] - 0.5) > 0.02, c.name);
});

t('25, 50 and 75 percent: the gains match the documented shape, one formula per name, to 0.0001 over all 48000 samples, for the 20 curves with a closed form (tri a, qsin sin(a pi/2), hsin, qua a squared, cub, squ, cbr, quat, quatr, qsin2, hsin2, iqsin, ihsin, ipar, sinc, isinc, and the ones read off the data: esin, par, exp, log)', () => {
  assert.equal(FORMULA.length, 20);
  for (const n of FORMULA) assert.ok(G(n).formulaMax < 1e-4, `${n} ${G(n).formulaMax}`);
  if (isV6()) {
    near(G('qsin').gains[1], 0.3827, 1e-4); near(G('qsin').gains[3], 0.9239, 1e-4);
    near(G('qua').gains[1], 0.0625, 1e-4); near(G('qua').gains[3], 0.5625, 1e-4);
    near(G('cub').gains[2], 0.125, 1e-4); near(G('tri').gains[1], 0.25, 1e-4); near(G('exp').gains[3], 0.0562, 1e-4);
    near(G('log').gains[1], 0.8796, 1e-4); near(G('dese').gains[1], 0.3969, 1e-4); near(G('losi').gains[1], 0.1176, 1e-4); near(G('desi').gains[1], 0.0625, 1e-4);
  }
});

t('the names are not the shapes you would guess: par (parabola) is 1 minus the square root of 1 minus a, and sits below the diagonal; ipar (inverted parabola) sits above it; qua is the square a squared', () => {
  for (let k = 1; k <= 3; k++) { assert.ok(G('par').gains[k] < POS[k], `par ${k}`); assert.ok(G('ipar').gains[k] > POS[k], `ipar ${k}`); near(G('qua').gains[k], POS[k] ** 2, 1e-4, 'qua'); }
  assert.ok(mid('par') > mid('qua') + 0.03);
  for (const p of [0.1, 0.25, 0.5, 0.9]) near(IDEAL.par(p), 1 - Math.sqrt(1 - p), 1e-12);
});

t('the curves come in mirror pairs, each the inverse function of its partner over all 48000 samples (qsin and iqsin, hsin and ihsin, qua and squ, cub and cbr, quat and quatr, par and ipar, exp and log), but sinc and isinc are not a pair', () => {
  assert.equal(ev.pairs.length, PAIRS.length);
  for (const p of ev.pairs) assert.ok(p.maxErr < 5e-4, `${p.a} ${p.b} ${p.maxErr}`);
  assert.ok(ev.nonPair.maxErr > 0.05, `${ev.nonPair.maxErr}`);
});

t('qsin2 and hsin are the same curve under two names: the largest difference over 48000 samples is below 0.000001', () => {
  assert.ok(ev.twins.maxDiff < 1e-6, `${ev.twins.maxDiff}`);
});

t('esin has a shelf: from 40 to 60 percent its gain moves by less than 0.02 (about 0.29), where the straight tri curve moves by 0.2', () => {
  const e = G('esin').curve101, tr = G('tri').curve101;
  assert.ok(Math.abs(e[60] - e[40]) < 0.02, `${e[40]} ${e[60]}`); near(tr[60] - tr[40], 0.2, 1e-4);
  assert.ok(e[100] - e[75] > 0.5);
  if (isV6()) { near(e[40], 0.2885, 1e-4); near(e[60], 0.2974, 1e-4); near(e[50], 0.2929, 1e-4); }
});

t('the last sample of the fade is not always full gain: par, iqsin, ihsin and dese end below 0.999 on sample 47999, and the first sample after the fade is exactly 1; tri ends at 1 minus one 48000th', () => {
  for (const n of ['par', 'iqsin', 'ihsin', 'dese']) { assert.ok(G(n).last < 0.999, `${n} ${G(n).last}`); assert.equal(G(n).after, 1); }
  near(G('tri').last, 1 - 1 / N, 1e-5);
  if (isV6()) { near(G('par').last, 0.9954, 1e-4); near(G('dese').last, 0.9827, 1e-4); near(G('iqsin').last, 0.9959, 1e-4); near(G('ihsin').last, 0.9971, 1e-4); }
});

t('some curves step instead of ramping: the first sample after silence is 0.0676 for quatr, 0.0638 for log (-24 dB), 0.0275 for cbr, and the last sample of a fade out is the same value before it drops to 0; tri moves by 0.00002 per sample', () => {
  near(G('log').first, 0, 1e-7); assert.ok(G('quatr').second > 0.05 && G('log').second > 0.05 && G('cbr').second > 0.02);
  for (const n of ['quatr', 'log', 'cbr', 'dese', 'squ', 'ihsin']) { assert.ok(G(n).second > 0.002, n); near(G(n).out.last, G(n).second, 1e-6, n); near(G(n).out.after, 0, 1e-7, n); }
  assert.ok(G('tri').second < 1e-3);
  if (isV6()) { near(G('log').second, 0.0638, 1e-4); near(db(G('log').second), -23.9, 0.1); near(G('quatr').second, 0.0676, 1e-4); near(G('cbr').second, 0.0275, 1e-4); near(G('squ').second, 0.0046, 1e-4); near(db(G('squ').second), -46.8, 0.1); }
});

t('exp never reaches silence: it starts at 0.00001 (-100 dB) and a fade out with exp ends at 0.00001 and stays there after the fade, where every other curve ends at 0', () => {
  near(G('exp').out.after, 1e-5, 1e-7);
  for (const c of ev.curves) if (c.name !== 'exp') assert.ok(c.out.after < 1e-7, c.name);
});

t('a fade out is the fade in played backwards (within one sample): its gain at 25, 50 and 75 percent equals the fade in gain at 75, 50 and 25 percent to 0.001 for all 23 curves, and after the fade the signal is 0 (exp: 0.00001)', () => {
  for (const c of ev.curves) {
    for (const k of [1, 2, 3]) near(c.out.gains[k], c.gains[4 - k], 1e-3, `${c.name} ${k}`);
    if (c.name !== 'exp') near(c.out.after, 0, 1e-7, c.name); assert.ok(c.out.first > 0.99, `${c.name} ${c.out.first}`);
  }
});

t('the time arguments are the sample arguments: st=0.5:d=1 gives the same 96000 samples as ss=24000:ns=48000 (largest difference 0), silent before the start, 0.25 a quarter into the fade and 1 after the end', () => {
  assert.equal(ev.timeArgs.length, 96000); assert.equal(ev.timeArgs.maxDiffToSampleArgs, 0);
  assert.equal(ev.timeArgs.before, 0); assert.equal(ev.timeArgs.atStart, 0); near(ev.timeArgs.mid, 0.25, 1e-6); assert.equal(ev.timeArgs.end, 1);
});
