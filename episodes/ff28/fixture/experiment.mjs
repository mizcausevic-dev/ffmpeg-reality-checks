// Episode 28 fixture: "Why does amix make my audio quieter, and why does the level jump?"
// Synthetic sources only (lavfi aevalsrc, 48 kHz mono, 32-bit float WAV so nothing is clipped or rounded before the mix):
//   A 440 Hz at -6 dBFS, 6 s    B 660 Hz at -6 dBFS, 3 s (the shorter input)    C 880 Hz at -6 dBFS, 6 s
//   hot pair: 440 Hz and 660 Hz, each at -3 dBFS, 4 s (to see whether a plain sum clips)
// The level of every tone in every output is read back two independent ways, in 0.5 s windows:
//   reader 1  ffmpeg: a narrow bandpass around the tone (two cascaded stages), then astats RMS per window (+3.01 dB turns RMS into sine amplitude)
//   reader 2  Goertzel on the raw 32-bit float samples, in Node
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, ffmpegVersion} from '../../../tools/ff.mjs';

export const RATE = 48000;
const A_AMP = 0.5011872;  // -6.00 dBFS
const H_AMP = 0.7079458;  // -3.00 dBFS
export const FREQS = [440, 660, 880];
export const WIN = 24000;   // 0.5 s: a whole number of cycles of 440, 660 and 880 Hz
export const FINE = 4800;   // 0.1 s: also a whole number of cycles of all three

const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };
const dbOf = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);

// Each case: inputs (files, in order), amix options, and an optional output codec (default 32-bit float).
const AB = ['a.wav', 'b.wav'];
export const CASES = {
  single:       {inputs: ['a.wav'], amix: 'inputs=1',                         command: 'ffmpeg -i a.wav -filter_complex amix=inputs=1 out.wav'},
  sum_default:  {inputs: ['a.wav', 'a.wav'], amix: 'inputs=2',                command: 'ffmpeg -i a.wav -i a.wav -filter_complex amix=inputs=2 out.wav'},
  sum_norm0:    {inputs: ['a.wav', 'a.wav'], amix: 'inputs=2:normalize=0',    command: 'ffmpeg -i a.wav -i a.wav -filter_complex amix=inputs=2:normalize=0 out.wav'},
  default:      {inputs: AB, amix: 'inputs=2',                                 command: 'ffmpeg -i a.wav -i b.wav -filter_complex amix=inputs=2 out.wav'},
  three:        {inputs: ['a.wav', 'b.wav', 'c.wav'], amix: 'inputs=3',        command: 'ffmpeg -i a.wav -i b.wav -i c.wav -filter_complex amix=inputs=3 out.wav'},
  norm0:        {inputs: AB, amix: 'inputs=2:normalize=0',                     command: 'ffmpeg -i a.wav -i b.wav -filter_complex amix=inputs=2:normalize=0 out.wav'},
  weights21:    {inputs: AB, amix: 'inputs=2:weights=2 1',                     command: "ffmpeg -i a.wav -i b.wav -filter_complex amix=inputs=2:weights='2 1' out.wav"},
  weights_n0:   {inputs: AB, amix: 'inputs=2:weights=1 0.5:normalize=0',       command: "ffmpeg -i a.wav -i b.wav -filter_complex amix=inputs=2:weights='1 0.5':normalize=0 out.wav"},
  dur_shortest: {inputs: AB, amix: 'inputs=2:duration=shortest',               command: 'ffmpeg -i a.wav -i b.wav -filter_complex amix=inputs=2:duration=shortest out.wav'},
  dur_first:    {inputs: AB, amix: 'inputs=2:duration=first',                  command: 'ffmpeg -i a.wav -i b.wav -filter_complex amix=inputs=2:duration=first out.wav'},
  dur_first_b:  {inputs: ['b.wav', 'a.wav'], amix: 'inputs=2:duration=first',   command: 'ffmpeg -i b.wav -i a.wav -filter_complex amix=inputs=2:duration=first out.wav'},
  dt0:          {inputs: AB, amix: 'inputs=2:dropout_transition=0',            command: 'ffmpeg -i a.wav -i b.wav -filter_complex amix=inputs=2:dropout_transition=0 out.wav'},
  dt1:          {inputs: AB, amix: 'inputs=2:dropout_transition=1',            command: 'ffmpeg -i a.wav -i b.wav -filter_complex amix=inputs=2:dropout_transition=1 out.wav'},
  dt5:          {inputs: AB, amix: 'inputs=2:dropout_transition=5',            command: 'ffmpeg -i a.wav -i b.wav -filter_complex amix=inputs=2:dropout_transition=5 out.wav'},
  dt0_n0:       {inputs: AB, amix: 'inputs=2:dropout_transition=0:normalize=0', command: 'ffmpeg -i a.wav -i b.wav -filter_complex amix=inputs=2:dropout_transition=0:normalize=0 out.wav'},
};

export const HOT_CASES = {
  hot_default_f32: {amix: 'inputs=2',             codec: 'pcm_f32le', command: 'ffmpeg -i h1.wav -i h2.wav -filter_complex amix=inputs=2 -c:a pcm_f32le out.wav'},
  hot_norm0_f32:   {amix: 'inputs=2:normalize=0', codec: 'pcm_f32le', command: 'ffmpeg -i h1.wav -i h2.wav -filter_complex amix=inputs=2:normalize=0 -c:a pcm_f32le out.wav'},
  hot_default_s16: {amix: 'inputs=2',             codec: 'pcm_s16le', command: 'ffmpeg -i h1.wav -i h2.wav -filter_complex amix=inputs=2 -c:a pcm_s16le out.wav'},
  hot_norm0_s16:   {amix: 'inputs=2:normalize=0', codec: 'pcm_s16le', command: 'ffmpeg -i h1.wav -i h2.wav -filter_complex amix=inputs=2:normalize=0 -c:a pcm_s16le out.wav'},
};

// ---------- reader 2: Goertzel on raw float samples ----------
export function readF32(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-'], {maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
  const b = r.stdout;
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
}
export function goertzel(x, start, n, f) {
  let re = 0, im = 0;
  for (let i = 0; i < n; i++) { const w = 2 * Math.PI * f * (start + i) / RATE; re += x[start + i] * Math.cos(w); im += x[start + i] * Math.sin(w); }
  return (2 * Math.hypot(re, im)) / n;
}
export function goertzelDb(x, f, win = WIN) {
  const out = [];
  for (let s = 0; s + win <= x.length; s += win) out.push(dbOf(goertzel(x, s, win, f)));
  return out;
}

// ---------- reader 1: bandpass + astats RMS per window (ffmpeg only) ----------
export function bandpassDb(file, f, win = WIN) {
  const bp = `bandpass=f=${f}:width_type=h:w=40`;
  const r = spawnSync('ffmpeg', ['-hide_banner', '-v', 'error', '-i', file, '-af',
    `${bp},${bp},asetnsamples=n=${win}:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-`, '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
  return r.stdout.split(/\r?\n/).filter((l) => l.includes('RMS_level=')).map((l) => {
    const v = l.split('=').pop().trim();
    return v === '-inf' ? -Infinity : Number(v) + 3.0103;   // RMS of a sine is amplitude / sqrt 2
  });
}

export function astats(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'astats', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  const err = r.stderr.split(/\r?\n/);
  const at = err.findIndex((l) => /Overall/.test(l));
  const get = (name) => { const l = err.slice(at).find((x) => x.includes(name + ':')); return l ? Number(l.split(':').pop().trim()) : null; };
  return {peakDb: r2(get('Peak level dB')), flat: r2(get('Flat factor')), peakCount: get('Peak count'), samples: get('Number of samples')};
}

export const durationOf = (file) => Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).trim());

// first window (start time in s) from `after` on where the level is within 0.05 dB of `target`
export function arrival(dbs, win, after, target) {
  for (let i = Math.floor((after * RATE) / win); i < dbs.length; i++) if (dbs[i] >= target - 0.05) return r2((i * win) / RATE);
  return null;
}

export function pcm16(file) {
  const b = fs.readFileSync(file);
  const off = b.indexOf('data') + 8;
  const v = new Int16Array(Math.floor((b.length - off) / 2));
  for (let i = 0; i < v.length; i++) v[i] = b.readInt16LE(off + i * 2);
  return v;
}

const mkdb = (arr) => arr.map(r2);

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const tone = (name, f, amp, secs) => ff(['-f', 'lavfi', '-i', `aevalsrc=${amp}*sin(2*PI*${f}*t):s=${RATE}:d=${secs}`, '-c:a', 'pcm_f32le', name], dir);
  tone('a.wav', 440, A_AMP, 6); tone('b.wav', 660, A_AMP, 3); tone('c.wav', 880, A_AMP, 6);
  tone('h1.wav', 440, H_AMP, 4); tone('h2.wav', 660, H_AMP, 4);

  const out = {ffmpeg: ffmpegVersion(), rate: RATE, windowSeconds: WIN / RATE, sources: {}, runs: {}, hot: {}};
  for (const [k, f] of [['a', 440], ['b', 660], ['c', 880]]) {
    const file = path.join(dir, `${k}.wav`), x = readF32(file);
    out.sources[k] = {freq: f, seconds: x.length / RATE, goertzelDb: mkdb(goertzelDb(x, f)), bandpassDb: mkdb(bandpassDb(file, f)), peakDb: astats(file).peakDb};
  }

  const srcA = readF32(path.join(dir, 'a.wav'));
  for (const [name, c] of Object.entries(CASES)) {
    const file = path.join(dir, `${name}.wav`);
    ff([...c.inputs.flatMap((i) => ['-i', i]), '-filter_complex', `amix=${c.amix}`, '-c:a', 'pcm_f32le', `${name}.wav`], dir);
    const x = readF32(file);
    const run1 = {command: c.command, amix: c.amix, seconds: r2(durationOf(file)), samples: x.length, windows: {}, fine: {}};
    for (const f of FREQS) {
      run1.windows[f] = {goertzel: mkdb(goertzelDb(x, f)), bandpass: mkdb(bandpassDb(file, f))};
    }
    const g = goertzelDb(x, 440, FINE), bp = bandpassDb(file, 440, FINE);
    run1.fine = {goertzel440: mkdb(g), bandpass440: mkdb(bp), arrivalGoertzel: arrival(g, FINE, 3.0, -6.0), arrivalBandpass: arrival(bp, FINE, 3.0, -6.0)};
    let peak = 0, maxErr = 0;
    for (let i = 0; i < x.length; i++) { peak = Math.max(peak, Math.abs(x[i])); if (i < srcA.length) maxErr = Math.max(maxErr, Math.abs(x[i] - srcA[i])); }
    run1.peakDbReader2 = r2(dbOf(peak)); run1.astatsPeakDb = astats(file).peakDb; run1.maxErrVsA = maxErr;
    out.runs[name] = run1;
  }

  for (const [name, c] of Object.entries(HOT_CASES)) {
    const file = path.join(dir, `${name}.wav`);
    ff(['-i', 'h1.wav', '-i', 'h2.wav', '-filter_complex', `amix=${c.amix}`, '-c:a', c.codec, `${name}.wav`], dir);
    const st = astats(file);
    if (c.codec === 'pcm_s16le') {
      const v = pcm16(file);
      let full = 0, peak = 0;
      for (let i = 0; i < v.length; i++) { const a = Math.abs(v[i]); if (a >= 32767) full++; if (a > peak) peak = a; }
      out.hot[name] = {command: c.command, astats: st, samplesAtFullScale: full, share: Math.round((full / v.length) * 1000) / 1000, peak, samples: v.length};
    } else {
      const x = readF32(file);
      let peak = 0, over = 0;
      for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > peak) peak = a; if (a > 1) over++; }
      out.hot[name] = {command: c.command, astats: st, peakAmplitude: Math.round(peak * 1e4) / 1e4, peakDbReader2: r2(dbOf(peak)), samplesAboveFullScale: over, samples: x.length};
    }
  }
  return out;
}
