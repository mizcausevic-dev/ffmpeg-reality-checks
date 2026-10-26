// Episode 27 fixture: "5.1 to stereo: where did the dialogue go?"
// Synthetic source only: one 3.0 s 5.1 file (48 kHz, 16-bit), each of the six channels carries its own sine at amplitude 0.2.
//   FL 150 Hz, FR 400 Hz, FC 1000 Hz (the dialogue channel), LFE 50 Hz, BL 2500 Hz, BR 6000 Hz
// It is downmixed several ways. The level of each source tone in the left and right output is read two independent ways:
//   reader 1  ffmpeg: pick one output channel, two cascaded narrow bandpass filters on the tone, astats RMS (after 1.0 s), minus the same chain on that tone in the source
//   reader 2  the raw 16-bit PCM read in JS: a Goertzel sum at the tone frequency, relative to the same measure on the source
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const AMP = 0.2;
export const DUR = 3;
export const RATE = 48000;
export const CHANNELS = [
  {name: 'FL', hz: 150}, {name: 'FR', hz: 400}, {name: 'FC', hz: 1000},
  {name: 'LFE', hz: 50}, {name: 'BL', hz: 2500}, {name: 'BR', hz: 6000},
];
const sine = (hz) => `${AMP}*sin(2*PI*${hz}*t)`;
export const SOURCE = `aevalsrc=${CHANNELS.map((c) => sine(c.hz)).join('|')}:s=${RATE}:d=${DUR}:c=FL+FR+FC+LFE+BL+BR`;

const ITU = 'pan=stereo|FL=FL+0.707*FC+0.707*BL|FR=FR+0.707*FC+0.707*BR';
export const WAYS = {
  ac2:      {command: 'ffmpeg -i in.wav -ac 2 out.wav',                                   args: ['-ac', '2']},
  pan_itu:  {command: `ffmpeg -i in.wav -af "${ITU}" out.wav`,                            args: ['-af', ITU]},
  maxval:   {command: 'ffmpeg -i in.wav -af aresample=out_chlayout=stereo:rematrix_maxval=3 out.wav', args: ['-af', 'aresample=out_chlayout=stereo:rematrix_maxval=3']},
  lfe1:     {command: 'ffmpeg -i in.wav -af aresample=out_chlayout=stereo:lfe_mix_level=1 out.wav', args: ['-af', 'aresample=out_chlayout=stereo:lfe_mix_level=1']},
  pan_mix:  {command: 'ffmpeg -i in.wav -af "pan=stereo|FL=0.5*FL+0.7*FC+0.3*BL+0.5*LFE|FR=0.5*FR+0.7*FC+0.3*BR+0.5*LFE" out.wav', args: ['-af', 'pan=stereo|FL=0.5*FL+0.7*FC+0.3*BL+0.5*LFE|FR=0.5*FR+0.7*FC+0.3*BR+0.5*LFE']},
  // known-positive controls
  pan_half: {command: 'ffmpeg -i in.wav -af "pan=stereo|FL=0.5*FL|FR=0.5*FR" out.wav',    args: ['-af', 'pan=stereo|FL=0.5*FL|FR=0.5*FR']},
  pan_lfe:  {command: 'ffmpeg -i in.wav -af "pan=stereo|FL=LFE|FR=LFE" out.wav',           args: ['-af', 'pan=stereo|FL=LFE|FR=LFE']},
};

export const ITU_SUM = 1 + 2 * 0.707; // sum of the default front-left row, 2.414
export const dbOf = (x) => 20 * Math.log10(x);
export const DEFAULT_GAIN_DB = Math.round(dbOf(1 / (1 + 2 * Math.SQRT1_2)) * 100) / 100; // -7.66, expected normalization

const round2 = (x) => (x === -Infinity ? -Infinity : Math.round(x * 100) / 100);
const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };

// reader 1: one channel of a file, narrow bandpass on one tone (twice), astats RMS after the first second
export function toneRmsDb(file, channelIndex, hz) {
  const bp = `bandpass=f=${hz}:width_type=q:w=10`;
  const af = `pan=mono|c0=c${channelIndex},${bp},${bp},atrim=start=1,asetpts=PTS-STARTPTS,astats`;
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', af, '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  const err = r.stderr.split(/\r?\n/);
  const at = err.findIndex((l) => /Overall/.test(l));
  const l = err.slice(at).find((x) => x.includes('RMS level dB:'));
  const v = l.split(':').pop().trim();
  return v === '-inf' ? -Infinity : Number(v);
}

// reader 2: raw PCM, Goertzel amplitude of one tone in one channel
export function readPcm(file) {
  const b = fs.readFileSync(file);
  const fmt = b.indexOf('fmt ');
  const channels = b.readUInt16LE(fmt + 10);
  const off = b.indexOf('data') + 8;
  const n = Math.floor((b.length - off) / 2 / channels);
  const x = Array.from({length: channels}, () => new Float64Array(n));
  for (let i = 0; i < n; i++) for (let c = 0; c < channels; c++) x[c][i] = b.readInt16LE(off + (i * channels + c) * 2) / 32768;
  return {channels, n, x};
}
export function toneAmp(pcm, channelIndex, hz) {
  const {n, x} = pcm;
  const w = (2 * Math.PI * hz) / RATE;
  const coeff = 2 * Math.cos(w);
  let s1 = 0, s2 = 0;
  const d = x[channelIndex];
  for (let i = 0; i < n; i++) { const s0 = d[i] + coeff * s1 - s2; s2 = s1; s1 = s0; }
  const power = s1 * s1 + s2 * s2 - coeff * s1 * s2;
  return (2 * Math.sqrt(Math.max(power, 0))) / n;
}

// anything under this is "absent": the 16-bit floor and filter leakage sit far below it
export const ABSENT_R1 = -40; // reader 1: two cascaded Q=10 bandpass filters reject a neighbour tone by about 50 dB
export const ABSENT_R2 = -80; // reader 2: 16-bit quantization noise sits around -90 dB or lower

function levels(file, srcRef1, srcRef2, outCh) {
  const pcm = readPcm(file);
  const out = {};
  for (const c of CHANNELS) {
    out[c.name] = {};
    for (let ch = 0; ch < outCh; ch++) {
      const side = ch === 0 ? 'L' : 'R';
      const r1 = toneRmsDb(file, ch, c.hz) - srcRef1[c.name];
      const a = toneAmp(pcm, ch, c.hz);
      const r2 = a === 0 ? -Infinity : dbOf(a / srcRef2[c.name]);
      out[c.name][side] = {r1: round2(r1), r2: round2(r2)};
    }
  }
  return out;
}

// clipping probe: the same 0.8 tone in FL, FC and BL (in phase), the others silent
const LOUD = `aevalsrc=${[0.8, 0, 0.8, 0, 0.8, 0].map((a) => (a ? `${a}*sin(2*PI*440*t)` : '0')).join('|')}:s=${RATE}:d=2:c=FL+FR+FC+LFE+BL+BR`;
function peakInfo(file, f32) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'astats', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  const err = r.stderr.split(/\r?\n/);
  const at = err.findIndex((l) => /Overall/.test(l));
  const l = err.slice(at).find((x) => x.includes('Peak level dB:'));
  const astatsPeak = round2(Number(l.split(':').pop().trim()));
  const b = fs.readFileSync(file);
  const off = b.indexOf('data') + 8;
  let peak = 0, clipped = 0;
  if (f32) { for (let i = off; i + 3 < b.length; i += 4) { const v = Math.abs(b.readFloatLE(i)); if (v > peak) peak = v; } }
  else { for (let i = off; i + 1 < b.length; i += 2) { const s = b.readInt16LE(i); const v = Math.abs(s) / 32768; if (v > peak) peak = v; if (s >= 32767 || s <= -32768) clipped++; } }
  return {astatsPeakDb: astatsPeak, rawPeakDb: round2(dbOf(peak)), clippedSamples: f32 ? null : clipped};
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const out = {ffmpeg: ffmpegVersion(), amplitude: AMP, tones: CHANNELS, defaultGainDb: DEFAULT_GAIN_DB, runs: {}, clip: {}};
  ff(['-f', 'lavfi', '-i', SOURCE, '-c:a', 'pcm_s16le', 'src.wav'], dir);
  const src = path.join(dir, 'src.wav');
  const ref1 = {}, ref2 = {};
  const srcPcm = readPcm(src);
  CHANNELS.forEach((c, i) => { ref1[c.name] = toneRmsDb(src, i, c.hz); ref2[c.name] = toneAmp(srcPcm, i, c.hz); });
  out.source = {reader1RmsDb: Object.fromEntries(Object.entries(ref1).map(([k, v]) => [k, round2(v)])), reader2Amp: Object.fromEntries(Object.entries(ref2).map(([k, v]) => [k, Math.round(v * 1e5) / 1e5]))};
  for (const [way, w] of Object.entries(WAYS)) {
    ff(['-i', 'src.wav', ...w.args, '-c:a', 'pcm_s16le', `${way}.wav`], dir);
    const p = path.join(dir, `${way}.wav`);
    const ch = readPcm(p).channels;
    out.runs[way] = {way, command: w.command, outChannels: ch, levels: levels(p, ref1, ref2, ch)};
  }
  // control: a 2.0 source through -ac 2 is untouched
  ff(['-f', 'lavfi', '-i', `aevalsrc=${sine(150)}|${sine(400)}:s=${RATE}:d=${DUR}`, '-c:a', 'pcm_s16le', 'st.wav'], dir);
  ff(['-i', 'st.wav', '-ac', '2', '-c:a', 'pcm_s16le', 'st_ac2.wav'], dir);
  out.stereoControl = {byteIdentical: fs.readFileSync(path.join(dir, 'st.wav')).equals(fs.readFileSync(path.join(dir, 'st_ac2.wav')))};
  // clipping probe
  ff(['-f', 'lavfi', '-i', LOUD, '-c:a', 'pcm_s16le', 'loud.wav'], dir);
  ff(['-i', 'loud.wav', '-ac', '2', '-c:a', 'pcm_s16le', 'loud_ac2.wav'], dir);
  ff(['-i', 'loud.wav', '-af', ITU, '-c:a', 'pcm_s16le', 'loud_itu.wav'], dir);
  ff(['-i', 'loud.wav', '-af', `aformat=sample_fmts=fltp,${ITU}`, '-c:a', 'pcm_f32le', 'loud_itu_f32.wav'], dir);
  out.clip = {
    ac2: peakInfo(path.join(dir, 'loud_ac2.wav'), false),
    pan_itu: peakInfo(path.join(dir, 'loud_itu.wav'), false),
    pan_itu_float: peakInfo(path.join(dir, 'loud_itu_f32.wav'), true),
    expectedUnclippedDb: round2(dbOf(0.8 * ITU_SUM)),
  };
  return out;
}
