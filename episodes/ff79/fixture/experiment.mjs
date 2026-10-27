// Episode 79 fixture: "libopus gives me a pre-skip of 312: where is the first click after decoding, and what do -ss, -c copy and atrim do to it?"
// Synthetic source only. Two 48000 Hz mono 16 bit wav files of exactly 48000 samples (1.000 s), written byte by byte in Node:
//   imp   one click (+29000) at sample 4800, zero everywhere else
//   gaps  40 clicks of +24000 at samples 2000 + (sum of 800 + 10 k): the gap before click k is 800 + 10 (k - 1), so the gaps name each click
// Encodes: libopus 64 kbit/s into ogg (default 1 s pages), ogg with 100 ms pages (-page_duration 100000), mkv and .opus.
// Readers:
//   reader 1  ffmpeg decodes to s16le, Node finds the click (peak or gap pattern)
//   reader 2  Node reads the bytes: the OpusHead pre-skip field (little endian, 2 bytes at offset 10 of the head), and in mkv the CodecDelay and SeekPreRoll elements
//   reader 3  ffprobe start_time, initial_padding and duration
// Known positive: Node rewrites the pre-skip field (the ogg page CRC is recomputed): the decoded click moves with it, by exactly the difference.
// Control: the same wav through pcm_s16le gives the click at 4800.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const SR = 48000, N = 48000, PACKET = 960;
export const CLICK_AT = 4800, CLICK_AMP = 29000;
export const GAP_POS = (() => { const p = []; let q = 2000; for (let k = 0; k < 40; k++) { p.push(q); q += 800 + 10 * k; } return p; })();
export const GAP_AMP = 24000;
export const CUT_S = 0.5, CUT_SAMPLES = Math.round(CUT_S * SR);
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

const ffm = (args, opts = {}) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {maxBuffer: 1 << 28, ...opts});
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${String(r.stderr)}`);
  return r;
};
const probeJson = (file) => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=start_time,initial_padding,codec_name:format=start_time,duration', '-of', 'json', file], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`ffprobe failed: ${r.stderr}`);
  const j = JSON.parse(r.stdout), s = j.streams[0] ?? {};
  return {codec: s.codec_name, streamStart: Number(s.start_time), initialPadding: s.initial_padding === undefined ? null : Number(s.initial_padding), formatStart: Number(j.format.start_time), duration: Number(j.format.duration)};
};

// ---- sources ----
export const clickSamples = () => { const a = new Int16Array(N); a[CLICK_AT] = CLICK_AMP; return a; };
export const gapSamples = () => { const a = new Int16Array(N); for (const p of GAP_POS) a[p] = GAP_AMP; return a; };
export function writeWav(file, s) {
  const d = Buffer.alloc(s.length * 2); for (let i = 0; i < s.length; i++) d.writeInt16LE(s[i], i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + d.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(d.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, d]));
}

// ---- reader 1: decode ----
export function decode(file) {
  const r = ffm(['-i', file, '-f', 's16le', '-ac', '1', '-ar', String(SR), '-'], {});
  const b = r.stdout; return new Int16Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
}
export const pcmMd5 = (a) => createHash('md5').update(Buffer.from(a.buffer, a.byteOffset, a.byteLength)).digest('hex');
export function peakOf(a) { let pk = 0, pi = 0; for (let i = 0; i < a.length; i++) { const v = Math.abs(a[i]); if (v > pk) { pk = v; pi = i; } } return {index: pi, value: pk}; }
export function peaksOf(a, thr = 5000) {
  const out = [];
  for (let i = 1; i < a.length - 1; i++) {
    const v = Math.abs(a[i]);
    if (v >= thr && v >= Math.abs(a[i - 1]) && v > Math.abs(a[i + 1])) {
      if (out.length && i - out[out.length - 1].index < 100) { if (v > out[out.length - 1].value) out[out.length - 1] = {index: i, value: v}; } else out.push({index: i, value: v});
    }
  }
  return out;
}
export function gapIdentify(a) {
  const pk = peaksOf(a).map((p) => p.index);
  if (pk.length < 3) return {peaks: pk.length, first: null, startsAt: null, consistent: false};
  const gaps = pk.slice(1).map((v, i) => v - pk[i]);
  const k0 = Math.round((gaps[0] - 800) / 10);
  const consistent = gaps.every((g, i) => Math.abs(g - (800 + 10 * (k0 + i))) <= 2) && k0 >= 0 && k0 < GAP_POS.length;
  return {peaks: pk.length, first: k0, firstDecoded: pk[0], startsAt: GAP_POS[k0] - pk[0], consistent};
}

// ---- reader 2: the bytes ----
export function readOpusHead(file) {
  const b = fs.readFileSync(file), i = b.indexOf('OpusHead');
  if (i < 0) return null;
  const r = {at: i, version: b[i + 8], channels: b[i + 9], preSkip: b.readUInt16LE(i + 10), inputRate: b.readUInt32LE(i + 12), gain: b.readInt16LE(i + 16), mapping: b[i + 18], hex: b.subarray(i, i + 19).toString('hex')};
  r.preSkipHex = b.subarray(i + 10, i + 12).toString('hex');
  r.container = b.toString('latin1', 0, 4) === 'OggS' ? 'ogg' : b[0] === 0x1a && b[1] === 0x45 ? 'mkv' : 'other';
  if (r.container === 'mkv') {
    const ebml = (id) => { const j = b.indexOf(Buffer.from(id)); if (j < 0 || j > 4096) return null; const len = b[j + 2] & 0x7f; let v = 0n; for (let k = 0; k < len; k++) v = (v << 8n) | BigInt(b[j + 3 + k]); return Number(v); };
    r.codecDelayNs = ebml([0x56, 0xaa]); r.seekPreRollNs = ebml([0x56, 0xbb]);
  }
  return r;
}
// ogg pages: CRC (polynomial 0x04c11db7, no reflection, start 0) so that a rewritten head still plays
const CRC_T = (() => { const T = new Uint32Array(256); for (let i = 0; i < 256; i++) { let r = i << 24; for (let k = 0; k < 8; k++) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1; T[i] = r >>> 0; } return T; })();
export const oggCrc = (b) => { let c = 0; for (const x of b) c = ((c << 8) ^ CRC_T[((c >>> 24) ^ x) & 255]) >>> 0; return c >>> 0; };
export function patchPreSkip(file, out, v) {
  const b = Buffer.from(fs.readFileSync(file)), i = b.indexOf('OpusHead');
  b.writeUInt16LE(v, i + 10);
  if (b.toString('latin1', 0, 4) === 'OggS') {
    const nseg = b[27 - 1], len = 27 + nseg + b.subarray(27, 27 + nseg).reduce((a, x) => a + x, 0);
    b.writeUInt32LE(0, 22); b.writeUInt32LE(oggCrc(b.subarray(0, len)), 22);
  }
  fs.writeFileSync(out, b);
  return out;
}

// ---- encodes ----
export const FORMATS = {
  ogg: {ext: 'ogg', extra: []},
  oggp: {ext: 'ogg', extra: ['-page_duration', '100000']},
  mkv: {ext: 'mkv', extra: []},
  opus: {ext: 'opus', extra: []},
};
export const encodeCommand = (fmt) => `ffmpeg -i in.wav -c:a libopus -b:a 64k${FORMATS[fmt].extra.length ? ' ' + FORMATS[fmt].extra.join(' ') : ''} out.${FORMATS[fmt].ext}`;
export function encode(src, out, fmt) { ffm(['-i', src, '-c:a', 'libopus', '-b:a', '64k', ...FORMATS[fmt].extra, out]); return out; }

export function measureClick(file) {
  const a = decode(file), pk = peakOf(a), head = readOpusHead(file), pr = probeJson(file);
  return {samples: a.length, click: pk.index, shift: pk.index - CLICK_AT, peakValue: pk.value, head, probe: pr};
}

// ---- cuts of the gap train ----
export const CUTS = {
  copyAllOgg: {src: 'ogg', out: 'ogg', args: ['-c', 'copy'], ss: null},
  copyAllMkv: {src: 'mkv', out: 'mkv', args: ['-c', 'copy'], ss: null},
  oggBefore: {src: 'ogg', out: 'ogg', args: ['-c', 'copy'], ss: CUT_S, pos: 'before'},
  oggAfter: {src: 'ogg', out: 'ogg', args: ['-c', 'copy'], ss: CUT_S, pos: 'after'},
  oggpBefore: {src: 'oggp', out: 'ogg', args: ['-c', 'copy'], ss: CUT_S, pos: 'before'},
  oggpAfter: {src: 'oggp', out: 'ogg', args: ['-c', 'copy'], ss: CUT_S, pos: 'after'},
  mkvBefore: {src: 'mkv', out: 'mkv', args: ['-c', 'copy'], ss: CUT_S, pos: 'before'},
  mkvAfter: {src: 'mkv', out: 'mkv', args: ['-c', 'copy'], ss: CUT_S, pos: 'after'},
  reencode: {src: 'ogg', out: 'ogg', args: ['-c:a', 'libopus', '-b:a', '64k'], ss: CUT_S, pos: 'before'},
  atrim: {src: 'ogg', out: 'ogg', args: ['-af', `atrim=start=${CUT_S}`, '-c:a', 'libopus', '-b:a', '64k'], ss: null},
};
const cutArgs = (name, srcFile, outFile) => {
  const k = CUTS[name], ss = k.ss === null ? [] : ['-ss', String(k.ss)];
  return [...(k.pos === 'before' ? ss : []), '-i', srcFile, ...(k.pos === 'after' ? ss : []), ...k.args, outFile];
};
export const cutCommand = (name) => `ffmpeg ${cutArgs(name, `in.${FORMATS[CUTS[name].src].ext}`, `out.${CUTS[name].out}`).join(' ')}`;
export function makeCut(srcs, dir, name) {
  const out = path.join(dir, `${name}.${CUTS[name].out}`);
  ffm(cutArgs(name, srcs[CUTS[name].src], out));
  return out;
}
export function measureCut(file, name) {
  const a = decode(file), g = gapIdentify(a), head = readOpusHead(file), pr = probeJson(file);
  const want = CUTS[name].ss === null && !/atrim/.test(CUTS[name].args.join(' ')) ? 0 : CUT_SAMPLES;
  return {samples: a.length, md5: pcmMd5(a), ...g, wanted: want, offset: g.startsAt === null ? null : g.startsAt - want, head, probe: pr, tail: a.length - (N - (g.startsAt ?? 0))};
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const src = {imp: path.join(dir, 'imp.wav'), gaps: path.join(dir, 'gaps.wav')};
  writeWav(src.imp, clickSamples()); writeWav(src.gaps, gapSamples());
  const ev = {ffmpeg: ffmpegVersion(), source: {samples: N, rate: SR, clickAt: CLICK_AT, gapClicks: GAP_POS.length}, control: {}, encodes: {}, patched: {}, cuts: {}};
  const ctl = path.join(dir, 'ctl.wav'); ffm(['-i', src.imp, '-c:a', 'pcm_s16le', ctl]);
  const ca = decode(ctl); ev.control = {samples: ca.length, click: peakOf(ca).index, peakValue: peakOf(ca).value};
  const files = {};
  for (const fmt of Object.keys(FORMATS)) {
    files[fmt] = encode(src.imp, path.join(dir, `imp_${fmt}.${FORMATS[fmt].ext}`), fmt);
    ev.encodes[fmt] = {fmt, command: encodeCommand(fmt), bytes: fs.statSync(files[fmt]).size, ...measureClick(files[fmt])};
  }
  // known positive: rewrite the pre-skip field
  for (const fmt of ['ogg', 'mkv']) for (const v of [0, 312, 1000]) {
    const f = patchPreSkip(files[fmt], path.join(dir, `patch_${fmt}_${v}.${FORMATS[fmt].ext}`), v);
    ev.patched[`${fmt}_${v}`] = {fmt, preSkip: v, ...measureClick(f)};
  }
  const gfiles = {};
  for (const fmt of ['ogg', 'oggp', 'mkv']) gfiles[fmt] = encode(src.gaps, path.join(dir, `gaps_${fmt}.${FORMATS[fmt].ext}`), fmt);
  ev.gapsFull = {ogg: measureCut(gfiles.ogg, 'copyAllOgg'), mkv: measureCut(gfiles.mkv, 'copyAllMkv')};
  for (const name of Object.keys(CUTS)) {
    const f = makeCut(gfiles, dir, name);
    ev.cuts[name] = {name, command: cutCommand(name), ...measureCut(f, name)};
  }
  ev.hex = {ogg: {file: 'imp_ogg.ogg', head: readOpusHead(files.ogg).hex}, mkv: {file: 'imp_mkv.mkv'}};
  return ev;
}
