// Episode 94 fixture: "ffmpeg resampling: how many samples come out of aresample, -ar, soxr and asetrate, and what does joining 100 pieces cost?"
// Synthetic input only. A 200 Hz sine written by Node as s16le (amplitude 16000, phase 0 at sample 0) and piped into ffmpeg.
// Rates: 48000 to 44100, 44100 to 48000, 96000 to 44100. Input lengths: exactly one second, 2048, 1000, 1001, 20 samples.
// Methods: aresample=RO (the default engine, swr), -ar RO on the output, aresample=resampler=soxr:osr=RO (when the build has libsoxr), asetrate=RO (no resampling).
// Readers:
//   reader 1  the raw s16le bytes ffmpeg writes to stdout, counted in Node
//   reader 2  the same command written to a .wav: the RIFF data chunk size read in Node, and ffprobe duration_ts and sample_rate
// Also: the output compared with the ideal sine at the output instants (alignment), the tone frequency by zero crossings (asetrate), and 100 pieces joined.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const F0 = 200, AMP = 16000;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
const r3 = (v) => (v === null || v === undefined ? null : Math.round(v * 1000) / 1000);

export const tone = (rate, n, f0 = F0) => { const b = Buffer.alloc(2 * n); for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(AMP * Math.sin(2 * Math.PI * f0 * i / rate)), 2 * i); return b; };
export const pcm = (buf) => Array.from({length: buf.length >> 1}, (_, i) => buf.readInt16LE(2 * i));

const filterOf = {
  aresample: (ro) => ['-af', `aresample=${ro}`],
  ar: (ro) => ['-ar', String(ro)],
  soxr: (ro) => ['-af', `aresample=resampler=soxr:osr=${ro}`],
  asetrate: (ro) => ['-af', `asetrate=${ro}`],
};
export const commandOf = (method, rin, ro) => ({
  aresample: `ffmpeg -f s16le -ar ${rin} -i in.raw -af aresample=${ro} out.wav`,
  ar: `ffmpeg -f s16le -ar ${rin} -i in.raw -ar ${ro} out.wav`,
  soxr: `ffmpeg -f s16le -ar ${rin} -i in.raw -af aresample=resampler=soxr:osr=${ro} out.wav`,
  asetrate: `ffmpeg -f s16le -ar ${rin} -i in.raw -af asetrate=${ro} out.wav`,
}[method]);
const base = (rin) => ['-v', 'error', '-y', '-f', 's16le', '-ar', String(rin), '-ac', '1', '-i', 'pipe:0'];
export function convertRaw(input, rin, ro, method) {
  const r = spawnSync('ffmpeg', [...base(rin), ...filterOf[method](ro), '-f', 's16le', '-'], {input, maxBuffer: 1 << 28});
  if (r.status !== 0) return null;
  return r.stdout;
}
export function convertWav(input, rin, ro, method, out) {
  const r = spawnSync('ffmpeg', [...base(rin), ...filterOf[method](ro), '-c:a', 'pcm_s16le', out], {input, maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${String(r.stderr)}`);
}
export const soxrAvailable = () => convertRaw(tone(48000, 4800), 48000, 44100, 'soxr') !== null;

// ---------------- reader 2: wav bytes and ffprobe ----------------
export function wavData(file) {
  const b = fs.readFileSync(file); let p = 12, rate = null, ch = null;
  while (p + 8 <= b.length) {
    const id = b.toString('latin1', p, p + 4), sz = b.readUInt32LE(p + 4);
    if (id === 'fmt ') { ch = b.readUInt16LE(p + 10); rate = b.readUInt32LE(p + 12); }
    if (id === 'data') return {rate, ch, bytes: sz, samples: sz / (2 * ch), start: p + 8, data: b.subarray(p + 8, p + 8 + sz)};
    p += 8 + sz + (sz & 1);
  }
  throw new Error('no data chunk');
}
export function probeWav(file) {
  const j = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-of', 'json', '-show_entries', 'stream=duration_ts,sample_rate,duration', file], {encoding: 'utf8'}).stdout);
  const s = j.streams[0]; return {durationTs: Number(s.duration_ts), rate: Number(s.sample_rate), duration: Number(s.duration)};
}

// ---------------- alignment against the ideal sine ----------------
// The ideal output sample j is AMP sin(2 pi F0 j / ro). interior: skip 64 samples at each end; edge: the first 64 and last 64.
export function alignment(y, ro, shift = 0) {
  let mi = 0, me = 0; const n = y.length;
  for (let j = 0; j < n; j++) {
    const e = Math.abs(y[j] - AMP * Math.sin(2 * Math.PI * F0 * (j + shift) / ro));
    if (j >= 64 && j < n - 64) mi = Math.max(mi, e); else me = Math.max(me, e);
  }
  return {interiorMax: Math.round(mi * 10) / 10, edgeMax: Math.round(me * 10) / 10, first: y[0], last: y[n - 1]};
}
// time offset of the tone in a window of ro/100 samples (exactly 2 periods of F0): microseconds, positive = the tone is late
export function phaseUs(y, ro, from) {
  const w = ro / 100; let c = 0, s = 0;
  for (let j = from; j < from + w; j++) { const a = 2 * Math.PI * F0 * j / ro; c += y[j] * Math.cos(a); s += y[j] * Math.sin(a); }
  return -Math.atan2(c, s) / (2 * Math.PI * F0) * 1e6;
}
// up-crossings of zero, counting the one at sample 0 (the sine starts at 0 going up)
export const upCrossings = (y) => { let n = 1; for (let j = 1; j < y.length; j++) if (y[j - 1] < 0 && y[j] >= 0) n++; return n; };

// ---------------- the count matrix ----------------
export const DIRECTIONS = [[48000, 44100], [44100, 48000], [96000, 44100]];
export const LENGTHS = ['second', 2048, 1000, 1001, 20];
export const METHODS = ['aresample', 'ar', 'soxr', 'asetrate'];

export function runCounts(dir, soxr) {
  const cells = [];
  for (const [rin, ro] of DIRECTIONS) for (const L of LENGTHS) {
    const n = L === 'second' ? rin : L, input = tone(rin, n);
    for (const method of METHODS) {
      if (method === 'soxr' && !soxr) continue;
      const raw = convertRaw(input, rin, ro, method);
      const wavFile = path.join(dir, `c_${rin}_${ro}_${n}_${method}.wav`);
      convertWav(input, rin, ro, method, wavFile);
      const w = wavData(wavFile), pr = probeWav(wavFile);
      const ideal = method === 'asetrate' ? n : n * ro / rin;
      const y = pcm(raw);
      cells.push({rin, ro, n, label: L === 'second' ? 'second' : String(L), method, ideal, rawSamples: y.length, md5: createHash('md5').update(raw).digest('hex').slice(0, 12), wavSamples: w.samples, wavRate: w.rate, probeTs: Number.isFinite(pr.durationTs) ? pr.durationTs : null, probeRate: pr.rate, diff: y.length - ideal, seconds: y.length / ro,
        ...(L === 'second' && y.length > 400 ? {align: alignment(y, ro), shifted: alignment(y, ro, 1), phaseStartUs: r3(phaseUs(y, ro, 100)), phaseEndUs: r3(phaseUs(y, ro, y.length - 100 - ro / 100)), freq: r3(upCrossings(y) / (y.length / ro))} : {})});
      fs.rmSync(wavFile, {force: true});
    }
  }
  return cells;
}

// ---------------- 100 pieces ----------------
export function runPieces(dir, size, method, rin = 48000, ro = 44100, pieces = 100) {
  const total = size * pieces, whole = tone(rin, total);
  const sub = fs.mkdtempSync(path.join(dir, `p${size}${method}-`));
  let rawTotal = 0, listing = '';
  const chunks = [];
  for (let k = 0; k < pieces; k++) {
    const part = whole.subarray(2 * size * k, 2 * size * (k + 1));
    const name = `p${String(k).padStart(3, '0')}.wav`; const f = path.join(sub, name);
    convertWav(part, rin, ro, method, f); const w = wavData(f);
    rawTotal += w.samples; chunks.push(Buffer.from(w.data)); listing += `file '${name}'\n`;
  }
  fs.writeFileSync(path.join(sub, 'list.txt'), listing);
  const joined = path.join(sub, 'joined.wav');
  const j = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', 'joined.wav'], {cwd: sub, encoding: 'utf8'});
  if (j.status !== 0) throw new Error(`concat failed ${j.stderr}`);
  const pr = probeWav(joined), jw = wavData(joined);
  const y = pcm(Buffer.concat(chunks));
  const one = pcm(convertRaw(whole, rin, ro, method));
  const ideal = total * ro / rin;
  const out = {size, method, pieces, inputSamples: total, ideal, perPiece: (rawTotal / pieces), wholeSamples: one.length, joinedSamples: y.length, joinedWav: jw.samples, joinedProbeTs: pr.durationTs, drift: y.length - one.length, driftMs: r3((y.length - one.length) / ro * 1000),
    phaseStartUs: r3(phaseUs(y, ro, 100)), phaseEndUs: r3(phaseUs(y, ro, y.length - 100 - ro / 100)), wholePhaseEndUs: r3(phaseUs(one, ro, one.length - 100 - ro / 100))};
  fs.rmSync(sub, {recursive: true, force: true});
  return out;
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const soxr = soxrAvailable();
  const ev = {ffmpeg: ffmpegVersion(), soxr, cells: runCounts(dir, soxr), pieces: {}};
  ev.pieces.swr1000 = runPieces(dir, 1000, 'aresample');
  ev.pieces.swr1001 = runPieces(dir, 1001, 'aresample');
  ev.pieces.swr4800 = runPieces(dir, 4800, 'aresample');
  if (soxr) ev.pieces.soxr1000 = runPieces(dir, 1000, 'soxr');
  return ev;
}
export const cellOf = (ev, rin, ro, n, method) => ev.cells.find((c) => c.rin === rin && c.ro === ro && c.n === n && c.method === method);
