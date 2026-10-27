// Episode 95 fixture: "afade curves: what gain does each of the 23 curve names give at 0, 25, 50, 75 and 100 percent of a fade?"
// Synthetic input only, made in Node and piped to ffmpeg as raw f32le.
//   signal A  a constant 0.5 (DC): every output sample is 0.5 times the gain, so one sample is one gain reading
//   signal B  a 1000 Hz sine, amplitude 0.5, for the loudness reader (100 whole periods in each 4800 sample block)
// The fade is 48000 samples at 48000 Hz (ns=48000, start at sample 0). Gain at p percent is read at sample round(p * 48000), the last one at 47999.
// Readers:
//   reader 1  the raw f32le samples ffmpeg writes to stdout, read in Node (gain per sample; RMS per block)
//   reader 2  astats (reset=1, one frame per block, Overall.RMS_level through ametadata) on the same command
// Ideal: the formula the curve name or the documentation words suggest (tri, qsin, hsin, qua, cub, squ, cbr, quat, quatr, qsin2, hsin2, iqsin, ihsin, ipar, sinc, isinc),
// and the formulas read off the measurements for esin, par, exp and log (checked against all 48000 samples).
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const RATE = 48000, N = 48000, DC = 0.5, A = 0.5, BLOCK = 4800;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
export const CURVES = ['tri', 'qsin', 'esin', 'hsin', 'log', 'ipar', 'qua', 'cub', 'squ', 'cbr', 'par', 'exp', 'iqsin', 'ihsin', 'dese', 'desi', 'losi', 'sinc', 'isinc', 'quat', 'quatr', 'qsin2', 'hsin2'];
export const PAIRS = [['qsin', 'iqsin'], ['hsin', 'ihsin'], ['qua', 'squ'], ['cub', 'cbr'], ['quat', 'quatr'], ['par', 'ipar'], ['exp', 'log']];
export const POS = [0, 0.25, 0.5, 0.75, 1];
export const idxOf = (p) => Math.min(Math.round(p * N), N - 1);
export const db = (g) => (g > 0 ? 20 * Math.log10(g) : -Infinity);
const sinc = (x) => (x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));
// formulas by name, a in [0,1]
export const IDEAL = {
  tri: (a) => a,
  qsin: (a) => Math.sin(a * Math.PI / 2),
  esin: (a) => 1 - Math.cos(Math.PI / 4 * ((2 * a - 1) ** 3 + 1)),
  hsin: (a) => (1 - Math.cos(a * Math.PI)) / 2,
  log: (a) => (a <= 0 ? 0 : Math.min(1, Math.max(0, 1 + 0.2 * Math.log10(a)))),
  ipar: (a) => 1 - (1 - a) ** 2,
  qua: (a) => a * a,
  cub: (a) => a ** 3,
  squ: (a) => Math.sqrt(a),
  cbr: (a) => Math.cbrt(a),
  par: (a) => 1 - Math.sqrt(1 - a),
  exp: (a) => 10 ** (5 * (a - 1)),
  iqsin: (a) => Math.asin(a) * 2 / Math.PI,
  ihsin: (a) => Math.asin(2 * a - 1) / Math.PI + 0.5,
  sinc: (a) => sinc(1 - a),
  isinc: (a) => 1 - sinc(a),
  quat: (a) => a ** 4,
  quatr: (a) => a ** 0.25,
  qsin2: (a) => Math.sin(a * Math.PI / 2) ** 2,
  hsin2: (a) => ((1 - Math.cos(a * Math.PI)) / 2) ** 2,
};
// curves with a formula in IDEAL; dese, desi and losi are measured only
export const FORMULA = Object.keys(IDEAL);

const run = (args, input) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-hide_banner', ...args], {input, maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${String(r.stderr)}`);
  return r.stdout;
};
const f32 = (b) => new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
export const dcInput = (n) => { const a = new Float32Array(n).fill(DC); return Buffer.from(a.buffer); };
export const sineInput = (n) => { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = A * Math.sin(2 * Math.PI * 1000 * i / RATE); return Buffer.from(a.buffer); };
const base = ['-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', 'pipe:0'];
const outRaw = ['-f', 'f32le', '-ac', '1', '-'];
export const fadeIn = (curve, input, extra = '') => f32(run([...base, '-af', `afade=t=in:ss=0:ns=${N}:curve=${curve}${extra}`, ...outRaw], input));
export const fadeOut = (curve, input) => f32(run([...base, '-af', `afade=t=out:ss=0:ns=${N}:curve=${curve}`, ...outRaw], input));

// ---- reader 2: astats RMS per 4800 sample block ----
export function astatsBlocks(curve, input) {
  const out = run([...base, '-af', `afade=t=in:ss=0:ns=${N}:curve=${curve},asetnsamples=n=${BLOCK}:p=0,astats=metadata=1:reset=1,ametadata=mode=print:key=lavfi.astats.Overall.RMS_level:file=-`, '-f', 'null', '-'], input);
  return String(out).split(/\r?\n/).filter((l) => l.includes('RMS_level=')).map((l) => Number(l.split('=')[1]));
}
export const rmsBlocks = (y) => { const r = []; for (let b = 0; b + BLOCK <= y.length; b += BLOCK) { let s = 0; for (let i = b; i < b + BLOCK; i++) s += y[i] * y[i]; r.push(Math.sqrt(s / BLOCK)); } return r; };
export const idealRmsBlocks = (curve, nBlocks) => {
  const g = IDEAL[curve]; const r = [];
  for (let b = 0; b < nBlocks; b++) { let s = 0; for (let i = b * BLOCK; i < (b + 1) * BLOCK; i++) { const a = i < N ? i / N : 1; const x = g(a) * A * Math.sin(2 * Math.PI * 1000 * i / RATE); s += x * x; } r.push(Math.sqrt(s / BLOCK)); }
  return r;
};

export function runExperiment() {
  const dc = dcInput(N * 2), sine = sineInput(N * 2);
  const ev = {ffmpeg: ffmpegVersion(), fade: {samples: N, rate: RATE}, curves: []};
  for (const c of CURVES) {
    const y = fadeIn(c, dc), o = fadeOut(c, dc);
    const gain = (i) => y[i] / DC;
    const rec = {name: c, count: y.length, gains: POS.map((p) => gain(idxOf(p))), first: gain(0), second: gain(1), last: gain(N - 1), after: gain(N), afterMin: Math.min(...y.slice(N).map((v) => v / DC)), afterMax: Math.max(...y.slice(N).map((v) => v / DC))};
    let dropMax = 0, mono = true;
    for (let i = 1; i < N; i++) { if (y[i] < y[i - 1]) { mono = false; dropMax = Math.max(dropMax, (y[i - 1] - y[i]) / DC); } }
    rec.monotone = mono; rec.dropMax = dropMax;
    rec.curve101 = Array.from({length: 101}, (_, k) => gain(idxOf(k / 100)));
    if (IDEAL[c]) { let m = 0, at = 0; for (let i = 0; i < N; i++) { const e = Math.abs(gain(i) - IDEAL[c](i / N)); if (e > m) { m = e; at = i; } } rec.formulaMax = m; rec.formulaAt = at; }
    rec.out = {gains: POS.map((p) => o[idxOf(p)] / DC), first: o[0] / DC, last: o[N - 1] / DC, after: o[N] / DC};
    let mir = 0; for (let k = 0; k < N; k++) mir = Math.max(mir, Math.abs(o[k] - y[N - 1 - k]) / DC); rec.mirrorMax = mir;
    // the loudness readers
    const ys = fadeIn(c, sine); const nb = 10;
    rec.rmsNode = rmsBlocks(ys.subarray(0, N * 2)).slice(0, nb);
    rec.rmsAstats = astatsBlocks(c, sine).slice(0, nb);
    rec.rmsIdeal = IDEAL[c] ? idealRmsBlocks(c, nb) : null;
    ev.curves.push(rec);
  }
  // pairs of curves that are inverse functions of each other, and curves that are the same curve under two names (all 48000 samples)
  const gAll = (c) => Array.from(fadeIn(c, dc).subarray(0, N), (v) => v / DC);
  ev.pairs = PAIRS.map(([a, b]) => { const A1 = gAll(a), B1 = gAll(b); let m = 0; for (let i = 2000; i < N - 2000; i++) m = Math.max(m, Math.abs(A1[Math.min(N - 1, Math.round(B1[i] * N))] - i / N)); return {a, b, maxErr: m}; });
  ev.nonPair = (() => { const A1 = gAll('sinc'), B1 = gAll('isinc'); let m = 0; for (let i = 2000; i < N - 2000; i++) m = Math.max(m, Math.abs(A1[Math.min(N - 1, Math.round(B1[i] * N))] - i / N)); return {a: 'sinc', b: 'isinc', maxErr: m}; })();
  { const h = gAll('hsin'), q = gAll('qsin2'); let m = 0; for (let i = 0; i < N; i++) m = Math.max(m, Math.abs(h[i] - q[i])); ev.twins = {a: 'hsin', b: 'qsin2', maxDiff: m}; }
  // the unfaded sine as a control for both loudness readers, and time based arguments
  const ctrl = rmsBlocks(f32(run([...base, '-af', 'anull', ...outRaw], sine)));
  const vol = f32(run([...base, '-af', 'volume=0.25', ...outRaw], dc)), volS = run([...base, '-af', 'volume=0.25,asetnsamples=n=4800:p=0,astats=metadata=1:reset=1,ametadata=mode=print:key=lavfi.astats.Overall.RMS_level:file=-', '-f', 'null', '-'], sine);
  ev.known = {gain: vol[1000] / DC, gainMin: Math.min(...vol) / DC, gainMax: Math.max(...vol) / DC, astatsDb: Number(String(volS).split(/\r?\n/).find((l) => l.includes('RMS_level=')).split('=')[1]), ideal: db(0.25 * A / Math.SQRT2)};
  ev.control = {rmsNode: ctrl[0], rmsDb: db(ctrl[0]), astatsDb: astatsBlocks('nofade', sine)[0], ideal: A / Math.SQRT2};
  const ts = f32(run([...base, '-af', 'afade=t=in:st=0.5:d=1:curve=tri', ...outRaw], dc));
  const sa = f32(run([...base, '-af', 'afade=t=in:ss=24000:ns=48000:curve=tri', ...outRaw], dc));
  let tm = 0; for (let i = 0; i < ts.length; i++) tm = Math.max(tm, Math.abs(ts[i] - sa[i]) / DC);
  ev.timeArgs = {before: ts[100] / DC, atStart: ts[24000] / DC, mid: ts[36000] / DC, end: ts[72000] / DC, maxDiffToSampleArgs: tm, length: ts.length};
  ev.cmd = `ffmpeg -f f32le -ar ${RATE} -ac 1 -i in.raw -af afade=t=in:ss=0:ns=${N}:curve=NAME -f f32le out.raw`;
  return ev;
}
export const curveOf = (ev, name) => ev.curves.find((c) => c.name === name);
