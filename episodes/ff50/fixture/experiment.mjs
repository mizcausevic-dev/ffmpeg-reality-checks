// Episode 50 fixture: "Downsampling with aresample: does a high tone alias into the audible range?"
// Synthetic source only (lavfi): a pure sine, amplitude 0.25, 48000 Hz, mono, 2 s, float wav (aevalsrc, so the tone is exact).
// Downsampled to 24000 Hz, so the new Nyquist is 12000 Hz and a tone at f above it can only land at 24000 - f.
// Cases:
//   ctl      control: a 6000 Hz tone, inside the new band, must come out at 6000 Hz with the same level
//   sweep    tones at 12100 12500 13000 14000 16000 20000 23000 Hz through the default aresample=24000; the alias is read at 24000 - f
//   naive    known-positive control: the 20000 Hz tone decimated by 2 in Node (every second sample, no filter), written to a wav. The alias at 4000 Hz must read about 0 dB
//   dial     the 20000 Hz tone through aresample=24000:filter_size=N for N = 1 2 4 8 16 32 (32 is the default)
//   routes   the 20000 Hz tone through -ar 24000, aresample=24000 and aformat=sample_rates=24000: are they the same samples?
// Level of a tone = RMS in dB. The alias level is given in dBc: alias level minus the level of the input tone at its own frequency.
// Readers:
//   reader 1  Node: decoded float samples, Hann FFT (32768 points), band power around the frequency
//   reader 2  ffmpeg itself: bandpass filter (width 400 Hz) around the frequency, then astats RMS level
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const SR_IN = 48000, SR_OUT = 24000, SECONDS = 2, AMP = 0.25;
export const NYQ_OUT = SR_OUT / 2;
export const CTL_HZ = 6000, ALIAS_HZ = 20000;
export const SWEEP = [12100, 12500, 13000, 14000, 16000, 20000, 23000];
export const DIAL = [1, 2, 4, 8, 16, 32];
export const aliasOf = (f) => (f <= NYQ_OUT ? f : SR_OUT - f);
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

const ffm = (args, opts = {}) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {maxBuffer: 1 << 28, ...opts});
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${String(r.stderr)}`);
  return r;
};
const probe = (file) => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,sample_rate,channels:format=duration', '-of', 'json', file], {encoding: 'utf8'});
  if (r.status !== 0) throw new Error(`ffprobe failed: ${r.stderr}`);
  const j = JSON.parse(r.stdout), s = j.streams[0];
  return {codec: s.codec_name, sampleRate: Number(s.sample_rate), channels: s.channels, duration: Number(j.format.duration)};
};
const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;

export function makeTone(dir, hz) {
  const file = path.join(dir, `tone${hz}.wav`);
  ffm(['-f', 'lavfi', '-i', `aevalsrc=exprs=${AMP}*sin(2*PI*${hz}*t):s=${SR_IN}:d=${SECONDS}:c=mono`, '-c:a', 'pcm_f32le', file]);
  return file;
}
export function resample(src, dir, tag, args) {
  const file = path.join(dir, `${tag}.wav`);
  ffm(['-i', src, ...args, '-c:a', 'pcm_f32le', file]);
  return file;
}
export const AF = (n) => `aresample=${SR_OUT}:filter_size=${n}`;

// ---- reader 1: Node FFT on the decoded samples ----
export function decode(file) {
  const r = ffm(['-i', file, '-vn', '-ac', '1', '-f', 'f32le', '-'], {});
  const b = r.stdout;
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length - (b.length % 4)));
}
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b2 = i + k + len / 2;
        const xr = re[b2] * cr - im[b2] * ci, xi = re[b2] * ci + im[b2] * cr;
        re[b2] = re[a] - xr; im[b2] = im[a] - xi; re[a] += xr; im[a] += xi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}
export const N_FFT = 32768, SKIP = 8192;
// one-sided power spectrum, scaled so that a sine of amplitude A reads A^2 / 2 in the sum of its bins (the mean square)
export function spectrum(x) {
  const n = N_FFT, re = new Float64Array(n), im = new Float64Array(n);
  let sw2 = 0;
  for (let i = 0; i < n; i++) { const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)); re[i] = (x[SKIP + i] ?? 0) * w; sw2 += w * w; }
  fft(re, im);
  const p = new Float64Array(n / 2);
  for (let k = 0; k < n / 2; k++) p[k] = (2 * (re[k] * re[k] + im[k] * im[k])) / (n * sw2);
  return p;
}
const toDb = (ms) => 10 * Math.log10(ms + 1e-30);
// level (dB, RMS) of everything within +-4 bins of hz
export function nodeDb(x, rate, hz) {
  const p = spectrum(x), k0 = Math.round(hz * N_FFT / rate);
  let s = 0; for (let k = Math.max(0, k0 - 4); k <= Math.min(p.length - 1, k0 + 4); k++) s += p[k];
  return toDb(s);
}
// strongest peak of the whole spectrum: frequency (parabolic interpolation) and level
export function nodePeak(x, rate) {
  const p = spectrum(x);
  let k = 2; for (let i = 3; i < p.length - 2; i++) if (p[i] > p[k]) k = i;
  const a = Math.log(p[k - 1] + 1e-30), b = Math.log(p[k] + 1e-30), c = Math.log(p[k + 1] + 1e-30);
  const d = 0.5 * (a - c) / (a - 2 * b + c);
  return {hz: (k + d) * rate / N_FFT, db: toDb(p[k - 1] + p[k] + p[k + 1])};
}
// ---- reader 2: ffmpeg bandpass + astats ----
export function ffmpegDb(file, hz) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', `atrim=start=0.5,bandpass=f=${hz}:width_type=h:w=400,astats=measure_perchannel=RMS_level:measure_overall=none`, '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`astats failed: ${r.stderr}`);
  const m = /RMS level dB:\s*(-?[\d.]+|-inf)/.exec(r.stderr);
  if (!m) throw new Error(`no RMS level in: ${r.stderr}`);
  return m[1] === '-inf' ? -Infinity : Number(m[1]);
}
const samplesMd5 = (x) => crypto.createHash('md5').update(Buffer.from(x.buffer, x.byteOffset, x.byteLength)).digest('hex');

// read the level of `file` at `hz` with both readers
export function read(file, x, rate, hz) {
  return {hz, node: r1(nodeDb(x, rate, hz)), ffmpeg: r1(ffmpegDb(file, hz))};
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const ev = {ffmpeg: ffmpegVersion(), srcRate: SR_IN, outRate: SR_OUT, nyquistOut: NYQ_OUT, amp: AMP, ctl: null, sweep: {}, naive: null, dial: {}, routes: {}};
  const srcs = {};
  const srcLevel = {};
  for (const hz of [CTL_HZ, ...SWEEP]) {
    const f = makeTone(dir, hz), x = decode(f);
    srcs[hz] = f;
    srcLevel[hz] = read(f, x, SR_IN, hz);
  }
  ev.src = {levels: srcLevel, probe: probe(srcs[ALIAS_HZ]), samples: decode(srcs[ALIAS_HZ]).length, expectedDb: r1(toDb(AMP * AMP / 2))};
  const measure = (file, hzIn, hzRead) => {
    const x = decode(file), p = probe(file);
    const lv = read(file, x, p.sampleRate, hzRead), inLv = srcLevel[hzIn];
    const pk = nodePeak(x, p.sampleRate);
    return {inHz: hzIn, readHz: hzRead, probe: p, samples: x.length, level: lv, inLevel: inLv,
      dbc: {node: r1(lv.node - inLv.node), ffmpeg: r1(lv.ffmpeg - inLv.ffmpeg)}, peakHz: r2(pk.hz), peakDb: r1(pk.db), md5: samplesMd5(x)};
  };
  // control, in band
  ev.ctl = measure(resample(srcs[CTL_HZ], dir, `ctl`, ['-af', `aresample=${SR_OUT}`]), CTL_HZ, CTL_HZ);
  // sweep through the default
  for (const hz of SWEEP) ev.sweep[hz] = measure(resample(srcs[hz], dir, `sweep${hz}`, ['-af', `aresample=${SR_OUT}`]), hz, aliasOf(hz));
  // known positive: naive decimation by 2 in Node, no filter
  {
    const x = decode(srcs[ALIAS_HZ]), y = new Float32Array(x.length / 2);
    for (let i = 0; i < y.length; i++) y[i] = x[2 * i];
    const raw = path.join(dir, 'naive.raw');
    fs.writeFileSync(raw, Buffer.from(y.buffer));
    const f = path.join(dir, 'naive.wav');
    ffm(['-f', 'f32le', '-ar', String(SR_OUT), '-ac', '1', '-i', raw, '-c:a', 'pcm_f32le', f]);
    ev.naive = measure(f, ALIAS_HZ, aliasOf(ALIAS_HZ));
  }
  // filter size dial
  for (const n of DIAL) ev.dial[n] = measure(resample(srcs[ALIAS_HZ], dir, `dial${n}`, ['-af', AF(n)]), ALIAS_HZ, aliasOf(ALIAS_HZ));
  // three ways to ask for 24000 Hz
  ev.routes.aresample = ev.sweep[ALIAS_HZ].md5;
  ev.routes.ar = measure(resample(srcs[ALIAS_HZ], dir, 'route_ar', ['-ar', String(SR_OUT)]), ALIAS_HZ, aliasOf(ALIAS_HZ)).md5;
  ev.routes.aformat = measure(resample(srcs[ALIAS_HZ], dir, 'route_aformat', ['-af', `aformat=sample_rates=${SR_OUT}`]), ALIAS_HZ, aliasOf(ALIAS_HZ)).md5;
  return ev;
}
