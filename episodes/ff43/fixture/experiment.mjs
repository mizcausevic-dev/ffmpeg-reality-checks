// Episode 43 fixture: "Does libopus really resample everything to 48 kHz?"
// Synthetic sources only (lavfi). A 1000 Hz sine, 2 s, mono, made at 8 input rates, encoded with -c:a libopus (64k) into three containers:
//   opus (Ogg), mka (Matroska), webm.
// Controls: the same sines written by encoders that keep the rate: pcm_s16le and flac, both into mka.
// Then white noise (48000 Hz, 2 s) encoded with -ar 8000 / 12000 / 16000 / 24000 / 48000 / none, to see what an output rate does to a libopus file.
// Every file is read two independent ways:
//   reader 1  ffprobe: stream sample_rate, codec, channels, format duration
//   reader 2  bytes and samples read in Node: the OpusHead input-rate field, the last Ogg page granule position, the decoded float samples
//             (count, pitch by rising zero crossings, pitch by FFT peak, band levels of the noise by Welch FFT)
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const TONE_HZ = 1000, SECONDS = 2;
export const RATES = [8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000, 96000];
export const OPUS_RATES = [8000, 12000, 16000, 24000, 48000]; // the rates the libopus encoder accepts
export const CONTAINERS = ['opus', 'mka', 'webm'];
export const AR_OK = [8000, 12000, 16000, 24000, 48000];
export const AR_BAD = [22050, 32000, 44100, 96000];
export const CUTOFF = {8000: 4000, 12000: 6000, 16000: 8000, 24000: 12000};
export const SUPPORTED = [8000, 12000, 16000, 24000, 48000];
export const nearestSupported = (r) => SUPPORTED.reduce((best, s) => (Math.abs(s - r) < Math.abs(best - r) ? s : best), SUPPORTED[0]);
// white noise sources whose own band reaches past 12 kHz; the band 13000 to 15500 Hz is inside both
export const LOSS_SOURCES = [32000, 44100];
export const LOSS_BAND = [13000, 15500], REF_BAND = [300, 9000];

const ffmpeg = (args) => spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', maxBuffer: 1 << 26});
const sineGraph = (r) => `sine=f=${TONE_HZ}:r=${r}:d=${SECONDS}`;
const noiseGraph = `anoisesrc=r=48000:d=${SECONDS}:c=white:a=0.5:seed=7`;
const round = (v, k = 1) => Math.round(v * 10 ** k) / 10 ** k;

// ---------- reader 1: ffprobe ----------
export function probe(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,sample_rate,channels:format=duration', '-of', 'json', file], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) return null;
  let j = {}; try { j = JSON.parse(r.stdout); } catch { return null; }
  const s = (j.streams ?? [])[0];
  if (!s) return null;
  return {codec: s.codec_name, sampleRate: Number(s.sample_rate), channels: s.channels, duration: j.format?.duration !== undefined ? Number(j.format.duration) : null};
}

// ---------- reader 2: bytes ----------
// The OpusHead packet (RFC 7845): "OpusHead", version, channels, pre-skip (u16), input sample rate (u32), gain (i16), mapping family. Found by search, so it works in Ogg, Matroska and WebM alike.
export function opusHead(file) {
  const b = fs.readFileSync(file);
  const i = b.indexOf('OpusHead');
  if (i < 0 || i + 19 > b.length) return null;
  return {version: b[i + 8], channels: b[i + 9], preSkip: b.readUInt16LE(i + 10), inputRate: b.readUInt32LE(i + 12)};
}
// Granule position of the last Ogg page. For Opus it counts samples at 48000 per second, whatever the encoder rate was.
export function lastGranule(file) {
  const b = fs.readFileSync(file);
  let pos = 0, last = null;
  while (pos + 27 <= b.length && b.toString('latin1', pos, pos + 4) === 'OggS') {
    const nseg = b[pos + 26];
    let len = 0; for (let i = 0; i < nseg; i++) len += b[pos + 27 + i];
    last = Number(b.readBigInt64LE(pos + 6));
    pos += 27 + nseg + len;
  }
  return last;
}

// ---------- reader 2: decoded samples ----------
// Decode at the file's own rate: no -ar, mono float32 little-endian. The caller knows the rate from ffprobe.
export function decode(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-vn', '-f', 'f32le', '-'], {maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(`decode failed: ${String(r.stderr)}`);
  const b = r.stdout;
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length - (b.length % 4)));
}
// frequency from rising zero crossings with linear interpolation, over the whole signal minus a warm-up
export function zeroCrossHz(x, rate, skip = 2000) {
  const t = [];
  for (let i = Math.max(1, skip); i < x.length; i++) if (x[i - 1] < 0 && x[i] >= 0) t.push(i - 1 + (0 - x[i - 1]) / (x[i] - x[i - 1]));
  if (t.length < 3) return NaN;
  return (t.length - 1) / ((t[t.length - 1] - t[0]) / rate);
}
// radix-2 FFT, in place
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
function hannPower(x, start, n) {
  const re = new Float64Array(n), im = new Float64Array(n);
  for (let i = 0; i < n; i++) re[i] = (x[start + i] ?? 0) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)));
  fft(re, im);
  const p = new Float64Array(n / 2); for (let k = 0; k < n / 2; k++) p[k] = re[k] * re[k] + im[k] * im[k];
  return p;
}
// pitch from the strongest FFT bin (65536 points, parabolic interpolation of the log peak)
export function fftPeakHz(x, rate, start = 4000) {
  const n = 32768, p = hannPower(x, start, n);
  let k = 1; for (let i = 2; i < p.length - 1; i++) if (p[i] > p[k]) k = i;
  const a = Math.log(p[k - 1] + 1e-30), b = Math.log(p[k] + 1e-30), c = Math.log(p[k + 1] + 1e-30);
  const d = 0.5 * (a - c) / (a - 2 * b + c);
  return (k + d) * rate / n;
}
// Welch average power (dB) of a band, 4096-point Hann windows, 50 percent overlap, first 4800 samples skipped
export function bandDb(x, rate, lo, hi) {
  const n = 4096; let sum = 0, cnt = 0;
  for (let s = 4800; s + n <= x.length; s += n / 2) {
    const p = hannPower(x, s, n);
    for (let k = Math.ceil(lo * n / rate); k <= Math.floor(hi * n / rate); k++) { sum += p[k]; cnt++; }
  }
  return 10 * Math.log10(sum / cnt + 1e-30);
}
// level below the encoder rate's band edge minus level above 1.25 times that edge (dB). White noise in, so a flat codec gives about 0.
export function dropDb(x, rate, cutoff) {
  const below = bandDb(x, rate, 300, cutoff * 0.75), above = bandDb(x, rate, cutoff * 1.25, 20000);
  return below - above;
}

// ---------- the experiment ----------
function fileFacts(file) {
  const p = probe(file);
  const x = decode(file);
  const rate = p.sampleRate;
  return {
    probe: p, head: opusHead(file), granule: file.endsWith('.opus') ? lastGranule(file) : null,
    samples: x.length, seconds: round(x.length / rate, 4),
    zeroCrossHz: round(zeroCrossHz(x, rate), 2), fftHz: round(fftPeakHz(x, rate), 2),
  };
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const out = {ffmpeg: ffmpegVersion(), tone: {}, control: {pcm: {}, flac: {}}, ar: {}, arBad: {}, arBadInputWithoutAr: {}, noiseNone: null};
  for (const c of CONTAINERS) {
    out.tone[c] = {};
    for (const r of RATES) {
      const f = path.join(dir, `tone${r}.${c}`);
      const e = ffmpeg(['-f', 'lavfi', '-i', sineGraph(r), '-c:a', 'libopus', '-b:a', '64k', f]);
      if (e.status !== 0) throw new Error(`encode failed ${r} ${c}: ${e.stderr}`);
      out.tone[c][r] = fileFacts(f);
    }
  }
  for (const [name, codec] of [['pcm', 'pcm_s16le'], ['flac', 'flac']]) {
    for (const r of RATES) {
      const f = path.join(dir, `ctl_${name}${r}.mka`);
      const e = ffmpeg(['-f', 'lavfi', '-i', sineGraph(r), '-c:a', codec, f]);
      if (e.status !== 0) throw new Error(`control encode failed ${name} ${r}: ${e.stderr}`);
      out.control[name][r] = fileFacts(f);
    }
  }
  // output rate on a 48000 Hz noise source
  const noise = (tag, arArgs) => {
    const f = path.join(dir, `noise_${tag}.opus`);
    const e = ffmpeg(['-f', 'lavfi', '-i', noiseGraph, ...arArgs, '-c:a', 'libopus', '-b:a', '128k', f]);
    if (e.status !== 0) throw new Error(`noise encode failed ${tag}: ${e.stderr}`);
    const p = probe(f), x = decode(f);
    return {probe: p, head: opusHead(f), samples: x.length, edgeDrop: CUTOFF[tag] ? round(dropDb(x, p.sampleRate, CUTOFF[tag])) : null, lowDb: round(bandDb(x, p.sampleRate, 300, 3000)), highDb: round(bandDb(x, p.sampleRate, 5000, 20000)), granule: lastGranule(f)};
  };
  const loss = (S, arArgs) => {
    const f = path.join(dir, `loss${S}_${arArgs.length ? arArgs[1] : 'none'}.opus`);
    const e = ffmpeg(['-f', 'lavfi', '-i', `anoisesrc=r=${S}:d=${SECONDS}:c=white:a=0.5:seed=7`, ...arArgs, '-c:a', 'libopus', '-b:a', '128k', f]);
    if (e.status !== 0) throw new Error(`loss encode failed ${S}: ${e.stderr}`);
    const p = probe(f), x = decode(f);
    const ref = bandDb(x, p.sampleRate, ...REF_BAND), band = bandDb(x, p.sampleRate, ...LOSS_BAND);
    return {probe: p, head: opusHead(f), samples: x.length, refDb: round(ref), bandDb: round(band), lossDb: round(ref - band)};
  };
  out.loss = {};
  for (const S of LOSS_SOURCES) out.loss[S] = {none: loss(S, []), ar48000: loss(S, ['-ar', '48000']), ar24000: loss(S, ['-ar', '24000'])};
  out.noiseNone = noise('none', []);
  for (const r of AR_OK) out.ar[r] = noise(String(r), ['-ar', String(r)]);
  // an output rate the encoder does not support
  for (const r of AR_BAD) {
    const f = path.join(dir, `bad${r}.opus`);
    const e = ffmpeg(['-f', 'lavfi', '-i', sineGraph(44100), '-ar', String(r), '-c:a', 'libopus', '-b:a', '64k', f]);
    out.arBad[r] = {status: e.status, stderr: (e.stderr ?? '').split(/\r?\n/).filter(Boolean).slice(0, 3).join(' | '), probeable: fs.existsSync(f) ? probe(f) !== null : false};
  }
  // the same unsupported input rates, with no -ar at all (these are the tone files above)
  for (const r of [32000, 44100, 96000]) out.arBadInputWithoutAr[r] = {sampleRate: out.tone.opus[r].probe.sampleRate, inputRate: out.tone.opus[r].head.inputRate};
  return out;
}
