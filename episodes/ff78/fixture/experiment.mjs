// Episode 78 fixture: "I encode a one second file to MP3 and decode it: where does the sound start, and what does the header say?"
// Synthetic source only. Three 44100 Hz mono 16 bit wav files of exactly 44100 samples (1.000 s), written byte by byte in Node:
//   imp   one impulse of +29000 at sample 4410, zero everywhere else
//   tone  a 1000 Hz cosine burst of amplitude 16000 from sample 4410 for 35280 samples (it starts at full amplitude, so the start is a sharp edge)
//   gaps  40 impulses of +24000 at samples 2000 + (sum of 800 + 10 k), so the gap before impulse k is 800 + 10 (k - 1): the gap sequence names each impulse
// Encodes (libmp3lame, 44100 Hz mono): CBR 128 kbit/s and VBR q2, each with the Xing/Info tag (default) and with -write_xing 0.
// Readers:
//   reader 1  ffmpeg decodes to s16le, Node finds the impulse peak (or the first sample above half the burst amplitude, or the gap pattern)
//   reader 2  Node parses the MP3 bytes: walks every frame header, reads the Xing/Info frame count and the LAME-style encoder delay and padding fields
//   reader 3  ffprobe start_time and duration
// Control: the same wav through ffmpeg to pcm_s16le gives back the impulse at 4410 and the burst at 4410 (the readers can see an exact position).
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const SR = 44100, N = 44100, FRAME = 1152;
export const IMP_AT = 4410, IMP_AMP = 29000;
export const TONE_FROM = 4410, TONE_LEN = 35280, TONE_HZ = 1000, TONE_AMP = 16000;
export const GAP_POS = (() => { const p = []; let q = 2000; for (let k = 0; k < 40; k++) { p.push(q); q += 800 + 10 * k; } return p; })();
export const GAP_AMP = 24000;
export const CUT_S = 0.5, CUT_SAMPLES = Math.round(CUT_S * SR);
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

const ffm = (args, opts = {}) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {maxBuffer: 1 << 28, ...opts});
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${String(r.stderr)}`);
  return r;
};
const probe = (args) => {
  const r = spawnSync('ffprobe', ['-v', 'error', ...args], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`ffprobe ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout.split(/\r?\n/).map((l) => l.replace(/,$/, '').trim()).filter(Boolean);
};

// ---- sources (samples are Int16Array, the wav is written by hand) ----
export const impSamples = () => { const a = new Int16Array(N); a[IMP_AT] = IMP_AMP; return a; };
export const toneSamples = () => { const a = new Int16Array(N); for (let i = 0; i < TONE_LEN; i++) a[TONE_FROM + i] = Math.round(TONE_AMP * Math.cos((2 * Math.PI * TONE_HZ * i) / SR)); return a; };
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
  const r = ffm(['-i', file, '-f', 's16le', '-ac', '1', '-'], {});
  const b = r.stdout; return new Int16Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
}
export const pcmMd5 = (a) => createHash('md5').update(Buffer.from(a.buffer, a.byteOffset, a.byteLength)).digest('hex');
export function peakOf(a) { let pk = 0, pi = 0; for (let i = 0; i < a.length; i++) { const v = Math.abs(a[i]); if (v > pk) { pk = v; pi = i; } } return {index: pi, value: pk}; }
// first sample whose magnitude reaches half of the burst amplitude
export const onsetOf = (a, level = TONE_AMP / 2) => { for (let i = 0; i < a.length; i++) if (Math.abs(a[i]) >= level) return i; return -1; };
// local maxima of |x| at or above thr, merged when closer than 100 samples
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
// which source impulse is the first one in a decoded file, and which source sample is decoded sample 0
export function gapIdentify(a) {
  const pk = peaksOf(a).map((p) => p.index);
  if (pk.length < 3) return {peaks: pk.length, first: null, startsAt: null, consistent: false};
  const gaps = pk.slice(1).map((v, i) => v - pk[i]);
  const k0 = Math.round((gaps[0] - 800) / 10);
  const consistent = gaps.every((g, i) => Math.abs(g - (800 + 10 * (k0 + i))) <= 2) && k0 >= 0 && k0 < GAP_POS.length;
  return {peaks: pk.length, first: k0, firstDecoded: pk[0], startsAt: GAP_POS[k0] - pk[0], consistent};
}

// ---- reader 2: the MP3 bytes ----
const BR = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const SRS = [44100, 48000, 32000];
export function parseMp3(file) {
  const b = fs.readFileSync(file);
  let o = 0, id3 = 0;
  if (b.toString('latin1', 0, 3) === 'ID3') { id3 = 10 + (((b[6] & 127) << 21) | ((b[7] & 127) << 14) | ((b[8] & 127) << 7) | (b[9] & 127)); o = id3; }
  const first = o;
  // walk every frame header (MPEG 1 layer III)
  const frames = []; let p = first;
  while (p + 4 <= b.length && b[p] === 0xff && (b[p + 1] & 0xe0) === 0xe0) {
    const h = b.readUInt32BE(p), br = BR[(h >> 12) & 15] * 1000, sr = SRS[(h >> 10) & 3], pad = (h >> 9) & 1;
    if (!br || !sr) break;
    const len = Math.floor((144 * br) / sr) + pad;
    frames.push({at: p, len, br}); p += len;
  }
  const f0 = frames[0], mono = ((b.readUInt32BE(first) >> 6) & 3) === 3;
  const tagAt = first + 4 + (mono ? 17 : 32);
  const tag = b.toString('latin1', tagAt, tagAt + 4);
  const r = {file: path.basename(file), bytes: b.length, id3Bytes: id3, firstFrameAt: first, frameHeader: b.subarray(first, first + 4).toString('hex'), walked: frames.length, walkedEnd: p === b.length, bitrates: [...new Set(frames.map((f) => f.br / 1000))].sort((x, y) => x - y), tag: null};
  if (tag === 'Xing' || tag === 'Info') {
    const fl = b.readUInt32BE(tagAt + 4); let q = tagAt + 8;
    r.tag = tag; r.tagAt = tagAt; r.flags = fl;
    if (fl & 1) { r.tagFrames = b.readUInt32BE(q); q += 4; }
    if (fl & 2) { r.tagBytes = b.readUInt32BE(q); q += 4; }
    if (fl & 4) q += 100;
    if (fl & 8) q += 4;
    r.lameAt = q; r.encoder = b.toString('latin1', q, q + 9).replace(/\0+$/, '');
    const d = q + 21; r.delayAt = d; r.delayHex = b.subarray(d, d + 3).toString('hex');
    r.delay = (b[d] << 4) | (b[d + 1] >> 4); r.padding = ((b[d + 1] & 15) << 8) | b[d + 2];
    r.audioFrames = frames.length - 1; // the tag frame is a silent frame at the front
  } else r.audioFrames = frames.length;
  r.decodedWithoutSkip = r.audioFrames * FRAME;
  return r;
}
export const hexRange = (file, from, len) => {
  const b = fs.readFileSync(file); return {start: from, bytes: Array.from(b.subarray(from, from + len), (v) => v.toString(16).padStart(2, '0'))};
};

export const probeTimes = (file) => {
  const f = probe(['-show_entries', 'format=start_time,duration', '-of', 'csv=p=0', file])[0].split(',');
  return {startTime: Number(f[0]), duration: Number(f[1])};
};

// ---- encodes ----
export const MODES = {cbr: ['-b:a', '128k'], vbr: ['-q:a', '2']};
export function encode(src, out, mode, xing, extra = []) {
  ffm(['-i', src, '-c:a', 'libmp3lame', ...MODES[mode], '-write_xing', xing ? '1' : '0', ...extra, out]);
  return out;
}
export const commandOf = (mode, xing) => `ffmpeg -i in.wav -c:a libmp3lame ${MODES[mode].join(' ')}${xing ? '' : ' -write_xing 0'} out.mp3`;

// what a decode should return if the tag is honoured: audio frames x 1152 minus delay minus padding
export const expectedLength = (m) => (m.tag ? m.audioFrames * FRAME - m.delay - m.padding : m.audioFrames * FRAME);

export function measureEncode(file, sig) {
  const m = parseMp3(file), a = decode(file), pt = probeTimes(file);
  const r = {bytes: m.bytes, mp3: m, samples: a.length, md5: pcmMd5(a), probe: pt, expectedLength: expectedLength(m)};
  if (sig === 'imp') { const pk = peakOf(a); r.peak = pk.index; r.peakValue = pk.value; r.shift = pk.index - IMP_AT; }
  else if (sig === 'tone') { r.onset = onsetOf(a); r.shift = r.onset - TONE_FROM; r.peakValue = peakOf(a).value; }
  return r;
}

// ---- cuts of the gap train ----
export const CUTS = {
  copyAll: {args: ['-c', 'copy'], ss: null, xing: true},
  copyBefore5: {args: ['-c', 'copy'], ss: 0.5, pos: 'before', xing: true},
  copyAfter5: {args: ['-c', 'copy'], ss: 0.5, pos: 'after', xing: true},
  copyNoXing5: {args: ['-c', 'copy'], ss: 0.5, pos: 'before', xing: false},
  copyBefore1: {args: ['-c', 'copy'], ss: 0.1, pos: 'before', xing: true},
  copyBefore3: {args: ['-c', 'copy'], ss: 0.3, pos: 'before', xing: true},
  copyBefore7: {args: ['-c', 'copy'], ss: 0.7, pos: 'before', xing: true},
  reencode5: {args: ['-c:a', 'libmp3lame', '-b:a', '128k'], ss: 0.5, pos: 'before', xing: true},
};
export const cutCommand = (c) => {
  const k = CUTS[c];
  const ss = k.ss === null ? [] : ['-ss', String(k.ss)];
  const parts = ['ffmpeg', ...(k.pos === 'before' ? ss : []), '-i', 'in.mp3', ...(k.pos === 'after' ? ss : []), ...k.args, ...(k.xing ? [] : ['-write_xing', '0']), 'out.mp3'];
  return parts.join(' ');
};
export function makeCut(src, dir, name) {
  const k = CUTS[name], out = path.join(dir, `${name}.mp3`);
  const ss = k.ss === null ? [] : ['-ss', String(k.ss)];
  ffm([...(k.pos === 'before' ? ss : []), '-i', src, ...(k.pos === 'after' ? ss : []), ...k.args, ...(k.xing ? [] : ['-write_xing', '0']), out]);
  return out;
}
export function measureCut(file, name) {
  const m = parseMp3(file), a = decode(file), g = gapIdentify(a), pt = probeTimes(file);
  const want = CUTS[name].ss === null ? 0 : Math.round(CUTS[name].ss * SR);
  return {mp3: m, samples: a.length, md5: pcmMd5(a), expectedLength: expectedLength(m), ...g, wanted: want, late: g.startsAt === null ? null : g.startsAt - want, probe: pt};
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const src = {imp: path.join(dir, 'imp.wav'), tone: path.join(dir, 'tone.wav'), gaps: path.join(dir, 'gaps.wav')};
  writeWav(src.imp, impSamples()); writeWav(src.tone, toneSamples()); writeWav(src.gaps, gapSamples());
  const ev = {ffmpeg: ffmpegVersion(), source: {samples: N, rate: SR, impAt: IMP_AT, toneFrom: TONE_FROM, toneLen: TONE_LEN, gapImpulses: GAP_POS.length}, control: {}, encodes: {}, cuts: {}};
  // control: wav to pcm through ffmpeg
  for (const sig of ['imp', 'tone']) {
    const out = path.join(dir, `ctl_${sig}.wav`); ffm(['-i', src[sig], '-c:a', 'pcm_s16le', out]);
    const a = decode(out);
    ev.control[sig] = sig === 'imp' ? {samples: a.length, peak: peakOf(a).index, peakValue: peakOf(a).value} : {samples: a.length, onset: onsetOf(a), peakValue: peakOf(a).value};
  }
  for (const sig of ['imp', 'tone']) for (const mode of Object.keys(MODES)) for (const xing of [true, false]) {
    const f = encode(src[sig], path.join(dir, `${sig}_${mode}_${xing ? 'tag' : 'raw'}.mp3`), mode, xing);
    ev.encodes[`${sig}_${mode}_${xing ? 'tag' : 'raw'}`] = {sig, mode, xing, command: commandOf(mode, xing), ...measureEncode(f, sig)};
  }
  const gapsMp3 = encode(src.gaps, path.join(dir, 'gaps.mp3'), 'cbr', true);
  ev.gapsFull = measureCut(gapsMp3, 'copyAll');
  for (const name of Object.keys(CUTS)) {
    const f = makeCut(gapsMp3, dir, name);
    ev.cuts[name] = {name, command: cutCommand(name), ...measureCut(f, name)};
  }
  // bytes for the film
  const cbr = path.join(dir, 'imp_cbr_tag.mp3'), m = ev.encodes.imp_cbr_tag.mp3;
  ev.hex = {header: hexRange(cbr, m.firstFrameAt, 4), head: {file: 'imp_cbr_tag.mp3', ...hexRange(cbr, m.firstFrameAt + 13, 48)}, lame: {file: 'imp_cbr_tag.mp3', ...hexRange(cbr, m.lameAt, 48)}};
  ev.hexCut = (() => { const f = path.join(dir, 'copyBefore5.mp3'); const mm = ev.cuts.copyBefore5.mp3; return {file: 'copyBefore5.mp3', ...hexRange(f, mm.lameAt, 48), lameAt: mm.lameAt, delayAt: mm.delayAt}; })();
  return ev;
}
