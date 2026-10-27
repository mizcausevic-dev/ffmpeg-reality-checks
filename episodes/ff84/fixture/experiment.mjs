// Episode 84 fixture: "Where does the encoder's lowpass sit at 64 to 256 kbit/s, for aac, libmp3lame and libopus?"
// Synthetic input only. Node writes one stereo 48000 Hz float WAV of stepped tones (left = right): 151 tones, 0.25 s each, amplitude 0.5,
// at 1000, 2000, 4000 Hz, then 6000 to 9500 Hz in steps of 500 Hz, then 10000 to 23900 Hz in steps of 100 Hz. Every tone has 0.025 s of silence on both sides and a 5 ms raised cosine ramp,
// so the steady part is 9600 samples. Each file is encoded, decoded back to float WAV, and every tone is measured.
//   reader 1  Node: the amplitude of the decoded signal at the tone's own frequency (Goertzel over 4800 steady samples, 10 Hz bins), in dB relative to the input amplitude
//   reader 2  ffmpeg: astats RMS level of each 0.25 s frame (asetnsamples) of the decoded file minus the same measurement of the stimulus, in dB (a different method: time domain RMS in ffmpeg, no FFT, no frequency selection)
// A tone "passes" when it is within 3 dB of the 1000 Hz tone. The cutoff is the last tone of the unbroken run of passing tones that starts at 6000 Hz.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const SR = 48000, SEG = 12000, WIN_OFF = 3600, WIN_N = 4800, AMP = 0.5;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
export const FREQS = [1000, 2000, 4000];
for (let f = 6000; f <= 9500; f += 500) FREQS.push(f);
for (let f = 10000; f <= 23900; f += 100) FREQS.push(f);
export const SCAN_FROM = 6000, PASS_DB = -3, REF = 1000;

const ENC = {mp3: {codec: 'libmp3lame', ext: 'mp3'}, aac: {codec: 'aac', ext: 'm4a'}, opus: {codec: 'libopus', ext: 'opus'}};
export const encoderOk = (codec) => spawnSync('ffmpeg', ['-hide_banner', '-v', 'quiet', '-h', `encoder=${codec}`], {encoding: 'utf8'}).stdout.includes(`Encoder ${codec}`);

// name: {fmt, channels, k (kbit/s), cutoff (the -cutoff value or null), extra (more encoder options)}
export const COMBOS = {};
for (const fmt of Object.keys(ENC)) {
  for (const k of [64, 96, 128, 192, 256]) COMBOS[`${fmt}_s${k}`] = {fmt, channels: 2, k, cutoff: null, extra: []};
  for (const k of [32, 48, 64, 96, 128]) COMBOS[`${fmt}_m${k}`] = {fmt, channels: 1, k, cutoff: null, extra: []};
}
for (const [fmt, c] of [['mp3', 16000], ['mp3', 20000], ['aac', 16000], ['aac', 20000], ['opus', 8000], ['opus', 12000]]) COMBOS[`${fmt}_c${c}`] = {fmt, channels: 2, k: 128, cutoff: c, extra: []};
for (const k of [64]) COMBOS[`opus_cbr${k}`] = {fmt: 'opus', channels: 2, k, cutoff: null, extra: ['-vbr', 'off']};
export const commandOf = (name) => {
  const c = COMBOS[name];
  return `ffmpeg -i stim.wav${c.channels === 1 ? ' -ac 1' : ''} -c:a ${ENC[c.fmt].codec} -b:a ${c.k}k${c.cutoff ? ` -cutoff ${c.cutoff}` : ''}${c.extra.length ? ` ${c.extra.join(' ')}` : ''} out.${ENC[c.fmt].ext}`;
};

const ffm = (args) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${String(r.stderr)}`);
};

export function makeStimulus(file) {
  const n = FREQS.length * SEG, x = new Float32Array(n);
  FREQS.forEach((f, k) => {
    const L = SEG - 2400;
    for (let j = 0; j < L; j++) {
      let g = 1; if (j < 240) g = 0.5 - 0.5 * Math.cos((Math.PI * j) / 240); if (j >= L - 240) g = 0.5 - 0.5 * Math.cos((Math.PI * (L - 1 - j)) / 240);
      x[k * SEG + 1200 + j] = AMP * g * Math.sin((2 * Math.PI * f * (1200 + j)) / SR);
    }
  });
  const b = Buffer.alloc(44 + n * 8);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 8, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(3, 20); b.writeUInt16LE(2, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 8, 28); b.writeUInt16LE(8, 32); b.writeUInt16LE(32, 34); b.write('data', 36); b.writeUInt32LE(n * 8, 40);
  for (let i = 0; i < n; i++) { b.writeFloatLE(x[i], 44 + i * 8); b.writeFloatLE(x[i], 48 + i * 8); }
  fs.writeFileSync(file, b);
  return x;
}

// first channel of a float WAV
export function readWavMono(file) {
  const buf = fs.readFileSync(file);
  let o = 12, fmt = null, data = null;
  while (o + 8 <= buf.length) {
    const id = buf.toString('latin1', o, o + 4), size = buf.readUInt32LE(o + 4);
    if (id === 'fmt ') fmt = {tag: buf.readUInt16LE(o + 8), ch: buf.readUInt16LE(o + 10), rate: buf.readUInt32LE(o + 12), bits: buf.readUInt16LE(o + 22)};
    if (id === 'data') { data = buf.subarray(o + 8, o + 8 + size); break; }
    o += 8 + size + (size & 1);
  }
  const step = 4 * fmt.ch, m = Math.floor(data.length / step), y = new Float32Array(m);
  for (let i = 0; i < m; i++) y[i] = data.readFloatLE(i * step);
  return {y, channels: fmt.ch, rate: fmt.rate, bits: fmt.bits, tag: fmt.tag};
}

// Goertzel recurrence: the amplitude of the component at frequency f over N samples (exact for whole cycles, as here: 10 Hz bins)
export function goertzel(y, off, N, f) {
  const c = 2 * Math.cos((2 * Math.PI * f) / SR);
  let s1 = 0, s2 = 0;
  for (let i = 0; i < N; i++) { const s0 = y[off + i] + c * s1 - s2; s2 = s1; s1 = s0; }
  const power = s1 * s1 + s2 * s2 - c * s1 * s2;
  return (2 * Math.sqrt(Math.max(power, 0))) / N;
}
export const levelsOf = (y) => FREQS.map((f, k) => {
  if ((k + 1) * SEG > y.length) return -200;
  return Math.max(-200, 20 * Math.log10(Math.max(goertzel(y, k * SEG + WIN_OFF, WIN_N, f), 1e-12) / AMP));
});

// reader 2: per frame RMS level from ffmpeg
export function astatsFrames(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-v', 'error', '-i', file, '-af', `asetnsamples=n=${SEG}:p=0,astats=metadata=1:reset=1,ametadata=mode=print:key=lavfi.astats.Overall.RMS_level:file=-`, '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`astats failed: ${r.stderr}`);
  return r.stdout.split(/\r?\n/).filter((l) => l.startsWith('lavfi.astats.Overall.RMS_level=')).map((l) => { const v = l.split('=')[1]; return v === '-inf' ? -200 : Math.max(-200, Number(v)); });
}

// cutoff from a list of levels (dB relative to the input)
export function cutoffOf(lv, passDb = PASS_DB) {
  const ref = lv[FREQS.indexOf(REF)];
  let cut = null, firstFail = null, highestAny = null;
  FREQS.forEach((f, k) => {
    if (f < SCAN_FROM) return;
    const pass = lv[k] >= ref + passDb;
    if (pass) highestAny = f;
    if (firstFail === null && !pass) firstFail = f;
    if (firstFail === null && pass) cut = f;
  });
  const kFail = firstFail === null ? null : FREQS.indexOf(firstFail);
  const worstAbove = kFail === null ? null : Math.max(...lv.filter((_, k) => FREQS[k] >= (cut ?? 0) + 1000));
  return {cutoff: cut, firstFail, highestAny, dropAtFail: kFail === null ? null : lv[kFail] - ref, nextDrop: kFail === null || kFail + 1 >= FREQS.length ? null : lv[kFail + 1] - ref, worstAbove: worstAbove === null ? null : worstAbove - ref, ref};
}

export function runCombo(name, dir, stim) {
  const c = COMBOS[name], e = ENC[c.fmt];
  const enc = path.join(dir, `e_${name}.${e.ext}`), dec = path.join(dir, `d_${name}.wav`);
  ffm(['-i', stim, ...(c.channels === 1 ? ['-ac', '1'] : []), '-c:a', e.codec, '-b:a', `${c.k}k`, ...(c.cutoff ? ['-cutoff', String(c.cutoff)] : []), ...c.extra, enc]);
  ffm(['-i', enc, '-c:a', 'pcm_f32le', '-ar', String(SR), dec]);
  const w = readWavMono(dec);
  const lv1 = levelsOf(w.y);
  const rms = astatsFrames(dec);
  return {name, ...c, command: commandOf(name), bytes: fs.statSync(enc).size, kbps: (fs.statSync(enc).size * 8) / ((FREQS.length * SEG) / SR) / 1000, decChannels: w.channels, decSamples: w.y.length, lv1, rms};
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const stim = path.join(dir, 'stim.wav');
  makeStimulus(stim);
  const stimRms = astatsFrames(stim);
  const sw = readWavMono(stim);
  const control = {name: 'pcm', lv1: levelsOf(sw.y), rms: stimRms};
  control.lv2 = control.rms.map((v, k) => v - stimRms[k]);
  Object.assign(control, {c1: cutoffOf(control.lv1), c2: cutoffOf(control.lv2)});
  const ev = {ffmpeg: ffmpegVersion(), freqs: FREQS, stimSamples: sw.y.length, control, runs: {}};
  ev.build = buildOf(ev.ffmpeg);
  for (const name of Object.keys(COMBOS)) {
    const r = runCombo(name, dir, stim);
    r.lv2 = r.rms.slice(0, FREQS.length).map((v, k) => v - stimRms[k]);
    while (r.lv2.length < FREQS.length) r.lv2.push(-200);
    r.c1 = cutoffOf(r.lv1); r.c2 = cutoffOf(r.lv2);
    delete r.rms;
    ev.runs[name] = r;
  }
  return ev;
}
