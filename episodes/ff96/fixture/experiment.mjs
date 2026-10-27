// Episode 96 fixture: "loudnorm and dynaudnorm: which one hits a loudness target, which one flattens a program with quiet and loud parts?"
// Synthetic input only, made in Node: a speech-like program, eight sections of a 140 Hz tone with 8 harmonics and a syllable envelope (0.25 s on, 0.08 s off),
// section levels -38, -20, -32, -14, -40, -18, -26, -12 dB RMS, 0.4 s of silence between sections. Two programs: sections of 4 s and sections of 16 s.
// Readers:
//   reader 1  ffmpeg ebur128 summary (integrated loudness, loudness range, sample peak, true peak) on the processed audio
//   reader 2  a BS.1770 K weighted loudness meter written in Node (gated integrated loudness, loudness range from 3 s blocks every 100 ms, sample peak, loudness of each section)
// Both read the same processed audio (loudnorm output is brought back to 48000 Hz with aresample first, because loudnorm outputs 192000 Hz).
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const R = 48000;
export const LEVELS = [-38, -20, -32, -14, -40, -18, -26, -12];
export const PROGRAMS = [{id: 'short', sec: 4}, {id: 'long', sec: 16}];
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

export function program(sec, levels = LEVELS) {
  const f0 = 140, per = Math.round(0.33 * R), on = Math.round(0.25 * R), parts = [];
  for (const L of levels) {
    const n = sec * R, a = new Float32Array(n); let ss = 0;
    for (let i = 0; i < n; i++) {
      const k = i % per, env = k < on ? Math.sin(Math.PI * k / on) ** 2 : 0;
      let x = 0; for (let h = 1; h <= 8; h++) x += Math.sin(2 * Math.PI * f0 * h * i / R) / h;
      a[i] = x * env; ss += a[i] * a[i];
    }
    const g = 10 ** (L / 20) / Math.sqrt(ss / n);
    for (let i = 0; i < n; i++) a[i] *= g;
    parts.push(a, new Float32Array(Math.round(0.4 * R)));
  }
  const out = new Float32Array(parts.reduce((s, p) => s + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return Buffer.from(out.buffer);
}
export const sineProgram = (amp, secs = 20) => { const a = new Float32Array(secs * R); for (let i = 0; i < a.length; i++) a[i] = amp * Math.sin(2 * Math.PI * 1000 * i / R); return Buffer.from(a.buffer); };

// ---------------- reader 2: BS.1770 in Node (48000 Hz) ----------------
const S1 = {b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [1, -1.69065929318241, 0.73248077421585]};
const S2 = {b: [1, -2, 1], a: [1, -1.99004745483398, 0.99007225036621]};
function biquad(x, {b, a}) { const y = new Float64Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2; y[i] = v; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; } return y; }
export const kweighted = (x) => biquad(biquad(x, S1), S2);
const lufs = (z) => -0.691 + 10 * Math.log10(z);
const cumsum = (sq) => { const cs = new Float64Array(sq.length + 1); for (let i = 0; i < sq.length; i++) cs[i + 1] = cs[i] + sq[i]; return cs; };
const blocks = (cs, win, hop) => { const o = []; for (let s = 0; s + win <= cs.length - 1; s += hop) o.push((cs[s + win] - cs[s]) / win); return o; };
export function measure(x, sec) {
  const y = kweighted(x), sq = y.map((v) => v * v), cs = cumsum(sq);
  const b4 = blocks(cs, 0.4 * R, 0.1 * R).filter((z) => z > 0 && lufs(z) > -70);
  const rel = lufs(b4.reduce((s, z) => s + z, 0) / b4.length) - 10;
  const g = b4.filter((z) => lufs(z) > rel);
  const I = lufs(g.reduce((s, z) => s + z, 0) / g.length);
  const st = blocks(cs, 3 * R, 0.1 * R).filter((z) => z > 0 && lufs(z) > -70);
  const rl = lufs(st.reduce((s, z) => s + z, 0) / st.length) - 20;
  const l = st.map(lufs).filter((v) => v > rl).sort((p, q) => p - q);
  const pick = (p) => l[Math.floor(p * (l.length - 1))];
  let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v));
  const sections = LEVELS.map((_, k) => { const s0 = Math.round(k * (sec + 0.4) * R); return lufs((cs[s0 + sec * R] - cs[s0]) / (sec * R)); });
  return {I, LRA: pick(0.95) - pick(0.1), samplePeakDb: 20 * Math.log10(pk), sections};
}

// the short-term loudness blocks (3 s every 100 ms) of an output, with the relative gate for the loudness range and how many blocks sit within 1 LU of it
export function lraDetail(x) {
  const y = kweighted(x), sq = y.map((v) => v * v), cs = cumsum(sq);
  const st = blocks(cs, 3 * R, 0.1 * R).filter((z) => z > 0 && lufs(z) > -70);
  const thr = lufs(st.reduce((s, z) => s + z, 0) / st.length) - 20;
  const l = st.map(lufs).sort((p, q) => p - q), above = l.filter((v) => v > thr), hist = {};
  for (const v of l) { const k = Math.floor(v / 2) * 2; hist[k] = (hist[k] || 0) + 1; }
  const near = l.filter((v) => Math.abs(v - thr) <= 1.0).length;
  return {threshold: thr, blocks: l.length, above: above.length, nearGate: near, share: near / l.length, p10: above[Math.floor(0.1 * (above.length - 1))], p95: above[Math.floor(0.95 * (above.length - 1))], hist};
}

// ---------------- ffmpeg ----------------
const base = ['-f', 'f32le', '-ar', String(R), '-ac', '1', '-i', 'pipe:0'];
const ff = (args, input) => spawnSync('ffmpeg', args, {input, maxBuffer: 1 << 30});
const f32 = (b) => new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
export const decode = (input, af) => { const r = ff(['-v', 'error', ...base, ...(af ? ['-af', af] : []), '-f', 'f32le', '-ac', '1', '-'], input); if (r.status !== 0) throw new Error(String(r.stderr)); return f32(r.stdout); };
export function ebur128(input, af) {
  const r = ff(['-hide_banner', '-nostats', '-v', 'info', ...base, '-af', (af ? af + ',' : '') + 'ebur128=peak=sample+true', '-f', 'null', '-'], input);
  const s = String(r.stderr), t = s.slice(s.lastIndexOf('Summary:'));
  const g = (re) => { const m = t.match(re); return m ? Number(m[1]) : null; };
  return {I: g(/I:\s+(-?[\d.]+)\s+LUFS/), LRA: g(/LRA:\s+(-?[\d.]+)\s+LU/), samplePeak: g(/Sample peak:\s+Peak:\s+(-?[\d.]+)\s+dBFS/), truePeak: g(/True peak:\s+Peak:\s+(-?[\d.]+)\s+dBFS/)};
}
export const T16 = 'I=-16:TP=-1.5:LRA=11', T24 = 'I=-24:TP=-2:LRA=20';
const passJson = (input, af) => { const r = ff(['-hide_banner', '-nostats', '-v', 'info', ...base, '-af', af + ':print_format=json', '-f', 'null', '-'], input); const s = String(r.stderr); return JSON.parse(s.slice(s.lastIndexOf('{'), s.lastIndexOf('}') + 1)); };
export const loudnormPass1 = (input, target) => passJson(input, `loudnorm=${target}`);
const twoPass = (input, target) => {
  const m = loudnormPass1(input, target);
  const af = `loudnorm=${target}:measured_I=${m.input_i}:measured_LRA=${m.input_lra}:measured_TP=${m.input_tp}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  return {af, pass1: m, pass2: passJson(input, af)};
};
export const variants = (input) => {
  const a = twoPass(input, T24), b = twoPass(input, T16);
  return {
    twoPass: {linear: {pass1: a.pass1, type: a.pass2.normalization_type}, fallback: {pass1: b.pass1, type: b.pass2.normalization_type}},
    list: [
      {id: 'input', af: null},
      {id: 'ln', af: 'loudnorm', native: true},
      {id: 'ln16', af: `loudnorm=${T16}`, native: true},
      {id: 'ln2', af: a.af, native: true},
      {id: 'ln2f', af: b.af, native: true},
      {id: 'dyn', af: 'dynaudnorm'},
      {id: 'dynt', af: 'dynaudnorm=f=150:g=5'},
    ],
  };
};
// the sample rate of the output as written to a wav: reader 1 the wav header read in Node, reader 2 ffprobe on the same bytes
export function wavRate(input, af) {
  const r = ff(['-v', 'error', ...base, ...(af ? ['-af', af] : []), '-f', 'wav', '-'], input);
  if (r.status !== 0) throw new Error(String(r.stderr));
  const b = r.stdout;
  const raw = decode(input, af).length;
  const p = spawnSync('ffprobe', ['-v', 'error', '-of', 'json', '-show_entries', 'stream=sample_rate,duration', '-i', 'pipe:0'], {input: b, encoding: 'utf8', maxBuffer: 1 << 28});
  const s = JSON.parse(p.stdout).streams[0];
  return {header: b.readUInt32LE(24), probe: Number(s.sample_rate), samples: raw, bytes: b.length};
}

export function runExperiment() {
  const ev = {ffmpeg: ffmpegVersion(), levels: LEVELS, programs: {}, targets: {T16, T24}};
  for (const P of PROGRAMS) {
    const input = program(P.sec), v = variants(input), rows = [];
    for (const x of v.list) {
      const chain = x.id === 'input' ? null : x.af + (x.native ? ',aresample=48000' : '');
      const dec = decode(input, chain), node = measure(dec, P.sec), eb = ebur128(input, chain);
      const row = {id: x.id, af: x.af, samples: dec.length, ebur: eb, node};
      if (P.id === 'long' && x.id === 'ln') ev.gateCase = lraDetail(dec);
      if (P.id === 'short' && x.id !== 'input') row.rate = wavRate(input, x.af);
      if (P.id === 'short' && x.native) row.rateFixed = wavRate(input, x.af + ',aresample=48000');
      rows.push(row);
    }
    ev.programs[P.id] = {sec: P.sec, samples: input.length / 4, twoPass: v.twoPass, rows};
  }
  // controls: a 1000 Hz sine through both readers, and the same sine 6.0206 dB lower
  const a1 = 0.5, a2 = 0.25, s1 = sineProgram(a1), s2 = sineProgram(a2);
  const c1 = measure(f32(s1), 1), c2 = measure(f32(s2), 1);
  ev.control = {node: [c1.I, c2.I], ebur: [ebur128(s1, null).I, ebur128(s2, null).I]};
  return ev;
}
export const rowOf = (ev, prog, id) => ev.programs[prog].rows.find((r) => r.id === id);
export const sectionSpread = (r) => Math.max(...r.node.sections) - Math.min(...r.node.sections);
