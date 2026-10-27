// Episode 83 fixture: "silencedetect finds one gap, not five: what do n and d really mean?"
// Synthetic input only. The clips are written by Node as plain WAV files, so the samples are known before ffmpeg sees them.
//   main  12 s, mono, 48000 Hz, 16 bit: 440 Hz tone (amplitude 16384, phase 1 rad) with five gaps of known length and level
//         A  1.0 to 3.5 s  digital zero               (2.5 s)
//         B  4.5 to 5.0 s  digital zero               (0.5 s)
//         C  6.0 to 7.0 s  uniform noise, peak 115    (-49.1 dBFS peak, -53.9 dBFS rms)
//         D  8.0 to 9.0 s  uniform noise, peak  66    (-53.9 dBFS peak, -58.7 dBFS rms)
//         E 10.0 to 11.0 s uniform noise, peak  16    (-66.2 dBFS peak, -71.0 dBFS rms)
//   mainf same samples as 32 bit float wav
//   dc    16 bit constants 28 to 36 and -28 to -36 (1 s each, tone between), for the exact threshold
//   dcf   32 bit float constants around 0.001
//   st    stereo 4 s: left a tone, right digital zero
//   edge  mono 6 s: 2 s zero, 1 s tone, 3 s zero (silence touching the start and the end of the file)
//   late  mono 125 s: tone with one 1 s digital zero gap starting at sample 5925925 (123.456771 s)
// Readers:
//   reader 1  what ffmpeg prints (silencedetect lines on stderr) and the exit status
//   reader 2  the raw samples, read back in Node from the WAV bytes: a run of samples with |x| below the threshold, at least d long
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const SR = 48000;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
export const GAPS = [
  {id: 'A', start: 1.0, end: 3.5, kind: 'zero', peak: 0},
  {id: 'B', start: 4.5, end: 5.0, kind: 'zero', peak: 0},
  {id: 'C', start: 6.0, end: 7.0, kind: 'noise', peak: 115},
  {id: 'D', start: 8.0, end: 9.0, kind: 'noise', peak: 66},
  {id: 'E', start: 10.0, end: 11.0, kind: 'noise', peak: 16},
];
export const MAIN_SECONDS = 12;
export const LATE = {total: 125, startSample: 5925925, len: SR};
const FS = 32768;
export const dbfs = (x) => (x <= 0 ? -Infinity : 20 * Math.log10(x / FS));

const tone = (i) => Math.round(16384 * Math.sin((2 * Math.PI * 440 * i) / SR + 1));

function wavBytes(channels, samples, kind) {
  // samples: array of Int16Array/Float32Array per channel, same length
  const n = samples[0].length, bytes = kind === 'f32' ? 4 : 2, ba = bytes * channels;
  const b = Buffer.alloc(44 + n * ba);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * ba, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(kind === 'f32' ? 3 : 1, 20); b.writeUInt16LE(channels, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * ba, 28);
  b.writeUInt16LE(ba, 32); b.writeUInt16LE(bytes * 8, 34); b.write('data', 36); b.writeUInt32LE(n * ba, 40);
  for (let i = 0; i < n; i++) for (let c = 0; c < channels; c++) {
    const o = 44 + (i * channels + c) * bytes;
    if (kind === 'f32') b.writeFloatLE(samples[c][i], o); else b.writeInt16LE(samples[c][i], o);
  }
  return b;
}

// Parse a WAV written by wavBytes (fmt then data, no other chunks): returns {channels, samples: [Int16Array|Float32Array], kind}
export function readWav(file) {
  const b = fs.readFileSync(file);
  let o = 12, fmt = null, data = null;
  while (o + 8 <= b.length) {
    const id = b.toString('latin1', o, o + 4), size = b.readUInt32LE(o + 4);
    if (id === 'fmt ') fmt = {tag: b.readUInt16LE(o + 8), channels: b.readUInt16LE(o + 10), rate: b.readUInt32LE(o + 12), bits: b.readUInt16LE(o + 22)};
    if (id === 'data') { data = b.subarray(o + 8, o + 8 + size); break; }
    o += 8 + size + (size & 1);
  }
  const kind = fmt.tag === 3 ? 'f32' : 's16', bytes = fmt.bits / 8, n = data.length / (bytes * fmt.channels);
  const samples = Array.from({length: fmt.channels}, () => (kind === 'f32' ? new Float32Array(n) : new Int16Array(n)));
  for (let i = 0; i < n; i++) for (let c = 0; c < fmt.channels; c++) {
    const p = (i * fmt.channels + c) * bytes;
    samples[c][i] = kind === 'f32' ? data.readFloatLE(p) : data.readInt16LE(p);
  }
  return {channels: fmt.channels, rate: fmt.rate, kind, samples};
}

export function makeMain() {
  const n = MAIN_SECONDS * SR, x = new Int16Array(n);
  let seed = 12345;
  const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < n; i++) x[i] = tone(i);
  for (const g of GAPS) {
    const a = g.start * SR, b = g.end * SR;
    for (let i = a; i < b; i++) x[i] = g.kind === 'zero' ? 0 : Math.round((2 * rnd() - 1) * g.peak);
    if (g.kind === 'noise') { x[a] = g.peak; x[a + 1] = -g.peak; } // the peak is hit exactly, on both sides
  }
  return x;
}

export function makeFiles(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const w = (name, ch, arr, kind = 's16') => { const f = path.join(dir, name); fs.writeFileSync(f, wavBytes(ch, arr, kind)); return f; };
  const main = makeMain();
  const files = {};
  files.main = w('main.wav', 1, [main]);
  files.mainf = w('mainf.wav', 1, [Float32Array.from(main, (v) => v / FS)], 'f32');
  // pure tone control, no gap at all
  files.tone = w('tone.wav', 1, [Int16Array.from({length: 4 * SR}, (_, i) => tone(i))]);
  // dc steps
  const dcv = [28, 29, 30, 31, 32, 33, 34, 35, 36, -28, -29, -30, -31, -32, -33, -34, -35, -36];
  const dc = new Int16Array(dcv.length * 2 * SR);
  dcv.forEach((v, k) => { for (let i = 0; i < SR; i++) { dc[k * 2 * SR + i] = v; dc[k * 2 * SR + SR + i] = tone(i); } });
  files.dc = w('dc.wav', 1, [dc]);
  const dcfv = [0.00098, 0.00099, 0.000999, 0.001, 0.001001, 0.00101];
  const dcf = new Float32Array(dcfv.length * 2 * SR);
  dcfv.forEach((v, k) => { for (let i = 0; i < SR; i++) { dcf[k * 2 * SR + i] = v; dcf[k * 2 * SR + SR + i] = tone(i) / FS; } });
  files.dcf = w('dcf.wav', 1, [dcf], 'f32');
  const L = Int16Array.from({length: 4 * SR}, (_, i) => tone(i)), R = new Int16Array(4 * SR);
  files.st = w('st.wav', 2, [L, R]);
  const edge = new Int16Array(6 * SR);
  for (let i = 2 * SR; i < 3 * SR; i++) edge[i] = tone(i);
  files.edge = w('edge.wav', 1, [edge]);
  const late = Int16Array.from({length: LATE.total * SR}, (_, i) => tone(i));
  late.fill(0, LATE.startSample, LATE.startSample + LATE.len);
  files.late = w('late.wav', 1, [late]);
  return {files, dcv, dcfv};
}

// ---- reader 1: what ffmpeg prints ----
export function parseSilence(stderr) {
  const runs = [];
  for (const l of String(stderr).split(/\r?\n/)) {
    const m = /(?:channel: (\d+) \| )?silence_(start|end): (-?[\d.]+(?:e-?\d+)?)(?: \| silence_duration: (-?[\d.]+(?:e-?\d+)?))?/.exec(l);
    if (!m) continue;
    if (m[2] === 'start') runs.push({start: Number(m[3]), end: null, duration: null, channel: m[1] ? Number(m[1]) : null});
    else if (runs.length) { const r = runs[runs.length - 1]; r.end = Number(m[3]); r.duration = Number(m[4]); }
  }
  return runs;
}
export function detect(file, filter, extra = []) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, ...extra, '-af', filter, '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  const err = String(r.stderr);
  const message = (err.split(/\r?\n/).find((l) => /rror|out of range|Invalid/.test(l)) ?? '').replace(/\[[^\]]*@ [0-9a-fx]+\]\s*/i, '').trim();
  return {status: r.status, silences: parseSilence(err), message, stderrLines: err.split(/\r?\n/).filter((l) => /silence_/.test(l)).length};
}

// ---- reader 2: raw samples ----
// runs of samples with |x| < thr (thr in the units of the samples) that last at least minLen samples
export function sampleRuns(x, thr, minLen) {
  const out = []; let s = -1;
  for (let i = 0; i <= x.length; i++) {
    const quiet = i < x.length && Math.abs(x[i]) < thr;
    if (quiet && s < 0) s = i;
    if (!quiet && s >= 0) { if (i - s >= minLen) out.push({startSample: s, endSample: i, start: s / SR, end: i / SR, duration: (i - s) / SR}); s = -1; }
  }
  return out;
}
export const peakOf = (x, a, b) => { let m = 0; for (let i = a; i < b; i++) m = Math.max(m, Math.abs(x[i])); return m; };
export const rmsOf = (x, a, b) => { let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i]; return Math.sqrt(s / (b - a)); };

// The threshold in sample units. 16 bit input: n x 32767 cut to an integer and stored in a 16 bit variable (so it wraps above 32767); float input: n itself.
// The test on a sample is |x| < threshold, strictly. (Measured on 6.1.1; the fixture records what other builds do.)
export const toInt16 = (v) => { const m = ((v % 65536) + 65536) % 65536; return m >= 32768 ? m - 65536 : m; };
export const thresholdOf = (n, kind) => (kind === 'f32' ? n : toInt16(Math.trunc(n * 32767)));

// n and d as ffmpeg should read them (in amplitude ratio and seconds). nAmp null = the case is not a plain threshold.
export const CASES = {
  default:  {file: 'main', filter: 'silencedetect',                        n: 0.001,   d: 2},
  explicit: {file: 'main', filter: 'silencedetect=n=-60dB:d=2',            n: 0.001,   d: 2},
  d1:       {file: 'main', filter: 'silencedetect=n=-60dB:d=1',            n: 0.001,   d: 1},
  d05:      {file: 'main', filter: 'silencedetect=n=-60dB:d=0.5',          n: 0.001,   d: 0.5},
  d05plus:  {file: 'main', filter: 'silencedetect=n=-60dB:d=0.5001',       n: 0.001,   d: 0.5001},
  d03:      {file: 'main', filter: 'silencedetect=n=-60dB:d=0.3',          n: 0.001,   d: 0.3},
  n50:      {file: 'main', filter: 'silencedetect=n=-50dB:d=0.3',          n: 10 ** (-50 / 20), d: 0.3},
  n40:      {file: 'main', filter: 'silencedetect=n=-40dB:d=0.3',          n: 10 ** (-40 / 20), d: 0.3},
  amp001:   {file: 'main', filter: 'silencedetect=n=0.001:d=0.3',          n: 0.001,   d: 0.3},
  amp00316: {file: 'main', filter: 'silencedetect=n=0.00316228:d=0.3',     n: 0.00316228, d: 0.3},
  longnames:{file: 'main', filter: 'silencedetect=noise=-50dB:duration=0.3', n: 10 ** (-50 / 20), d: 0.3},
  bareDb:   {file: 'main', filter: 'silencedetect=n=-50:d=0.3',            n: null},
  badD:     {file: 'main', filter: 'silencedetect=n=-60dB:d=-1',           n: null},
  zero:     {file: 'main', filter: 'silencedetect=n=0:d=0.3',              n: 0,       d: 0.3},
  one:      {file: 'main', filter: 'silencedetect=n=1:d=0.3',              n: 1,       d: 0.3},
  over15:   {file: 'main', filter: 'silencedetect=n=1.5:d=0.3',            n: 1.5,     d: 0.3},
  plus20:   {file: 'main', filter: 'silencedetect=n=20dB:d=0.3',           n: 10,      d: 0.3},
  plus50:   {file: 'main', filter: 'silencedetect=n=50dB:d=0.3',           n: 10 ** (50 / 20), d: 0.3},
  f32n50:   {file: 'mainf', filter: 'silencedetect=n=-50dB:d=0.3',         n: 10 ** (-50 / 20), d: 0.3},
  f32n60:   {file: 'mainf', filter: 'silencedetect=n=-60dB:d=0.3',         n: 0.001,   d: 0.3},
  f32over15:{file: 'mainf', filter: 'silencedetect=n=1.5:d=0.3',           n: 1.5,     d: 0.3},
  f32plus20:{file: 'mainf', filter: 'silencedetect=n=20dB:d=0.3',          n: 10,      d: 0.3},
  toneOnly: {file: 'tone', filter: 'silencedetect=n=-60dB:d=0.3',          n: 0.001,   d: 0.3},
  stereo:   {file: 'st',   filter: 'silencedetect=n=-60dB:d=0.5',          n: 0.001,   d: 0.5, channels: 'all'},
  stereoMono:{file: 'st',  filter: 'silencedetect=n=-60dB:d=0.5:mono=1',   n: 0.001,   d: 0.5, channels: 'each'},
  edge:     {file: 'edge', filter: 'silencedetect=n=-60dB:d=0.5',          n: 0.001,   d: 0.5},
  late:     {file: 'late', filter: 'silencedetect=n=-60dB:d=0.5',          n: 0.001,   d: 0.5},
};
export const commandOf = (name) => `ffmpeg -i ${CASES[name].file}.wav -af "${CASES[name].filter}" -f null -`;

// Which of the true gaps does a list of reported runs cover (a run inside the gap, within 2 ms)?
export const gapsFound = (runs) => GAPS.filter((g) => runs.some((r) => r.end !== null && r.start >= g.start - 0.002 && r.end <= g.end + 0.002 && r.end - r.start > 0.9 * (g.end - g.start))).map((g) => g.id);

export function runCase(name, files, wavs) {
  const c = CASES[name], file = files[c.file], w = wavs[c.file];
  const rep = detect(file, c.filter);
  let model = null;
  if (c.n !== null && rep.status === 0) {
    const thr = thresholdOf(c.n, w.kind), minLen = Math.ceil(c.d * SR - 1e-6);
    const perCh = w.samples.map((x) => sampleRuns(x, thr, minLen));
    model = c.channels === 'all' ? sampleRuns(w.samples[0].map((v, i) => (Math.abs(v) < thr && Math.abs(w.samples[1][i]) < thr ? 0 : 1)), 0.5, minLen) : perCh[0];
    if (c.channels === 'each') model = perCh.map((r, k) => r.map((q) => ({...q, channel: k}))).flat();
  }
  const same = model && model.length === rep.silences.length && model.every((m, i) => Math.abs(m.start - rep.silences[i].start) < 5e-4 && rep.silences[i].end !== null && Math.abs(m.end - rep.silences[i].end) < 5e-4);
  return {name, command: commandOf(name), filter: c.filter, file: c.file, status: rep.status, message: rep.message, silences: rep.silences, count: rep.silences.length, model: model ? model.map((m) => ({start: m.start, end: m.end, duration: m.duration, startSample: m.startSample, endSample: m.endSample, channel: m.channel ?? null})) : null, agree: same === null ? null : Boolean(same), found: c.file === 'main' || c.file === 'mainf' ? gapsFound(rep.silences) : null};
}

// exact threshold, one second of each constant: the values reported silent
export function boundary(file, values, n, unit = 1) {
  const rep = detect(file, `silencedetect=n=${n}:d=0.5`);
  const startsAt = rep.silences.map((s) => Math.round(s.start / 2));
  return {status: rep.status, silent: startsAt.map((k) => values[k]), notSilent: values.filter((_, k) => !startsAt.includes(k))};
}

export function runExperiment(dir) {
  const {files, dcv, dcfv} = makeFiles(dir);
  const wavs = Object.fromEntries(Object.entries(files).map(([k, f]) => [k, readWav(f)]));
  const x = wavs.main.samples[0];
  const gaps = GAPS.map((g) => {
    const a = g.start * SR, b = g.end * SR;
    return {id: g.id, kind: g.kind, start: g.start, end: g.end, duration: g.end - g.start, peak: peakOf(x, a, b), rms: rmsOf(x, a, b), peakDb: dbfs(peakOf(x, a, b)), rmsDb: dbfs(rmsOf(x, a, b))};
  });
  const ev = {ffmpeg: ffmpegVersion(), build: null, sr: SR, gaps, tonePeak: peakOf(x, 0, SR), thresholds: {}, runs: {}};
  ev.build = buildOf(ev.ffmpeg);
  for (const [k, n] of [['-60dB', 0.001], ['-50dB', 10 ** (-50 / 20)], ['-40dB', 10 ** (-40 / 20)]]) ev.thresholds[k] = {amp: n, s16: n * 32767, trunc: Math.trunc(n * 32767)};
  for (const name of Object.keys(CASES)) ev.runs[name] = runCase(name, files, wavs);
  ev.boundary = {s16: {values: dcv, ...boundary(files.dc, dcv, '0.001')}, s16n50: {values: dcv, ...boundary(files.dc, dcv, '-50dB')}, f32: {values: dcfv, ...boundary(files.dcf, dcfv, '0.001')}};
  const lateStartTrue = LATE.startSample / SR;
  ev.late = {trueStart: lateStartTrue, trueEnd: (LATE.startSample + LATE.len) / SR, reported: ev.runs.late.silences[0] ?? null, modelStart: ev.runs.late.model?.[0]?.start ?? null, offSamples: ev.runs.late.silences[0] ? Math.round((ev.runs.late.silences[0].start - lateStartTrue) * SR) : null};
  return ev;
}
