// Episode 72 fixture: "FLAC -compression_level 0 to 12: smaller files, same sound?"
// Synthetic input only (ffmpeg lavfi). Four signals, each 3 s, 44100 Hz, stereo, 16 bit, written once as a wav (pcm_s16le) and then encoded with the native flac encoder at every level 0..12:
//   noise    white noise, amplitude 0.5, fixed seed
//   tones    two pure tones per channel (440 and 660 Hz left, 550 and 770 Hz right)
//   music    a decaying chord (220, 330, 440 Hz left; 247, 370, 494 Hz right) with a re-struck envelope and a little noise
//   silence  all zero samples
// Readers (independent of each other):
//   size      Node fs.statSync of the file, and ffprobe format=size
//   frames    Node parses the flac bytes itself (STREAMINFO, then every frame header, each one checked with its CRC-8 and its frame number), and ffprobe lists the packets: count and every size must agree
//   sound     three md5s of the decoded samples: ffmpeg's own md5 muxer, Node md5 of the raw s16le that ffmpeg decodes, and the md5 stored in the file's STREAMINFO by the encoder (taken from the encoder's input, so it does not depend on the decoder)
// Controls: no -compression_level is the same file as level 5 (cmp). Known positives for the sound readers: the same signal shifted by one sample must give a different md5 in all three readers;
//   compression levels 13 and 99 must be rejected by the encoder.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const RATE = 44100, SECS = 3, FRAMES = RATE * SECS, RAW_BYTES = FRAMES * 2 * 2; // 529200
export const LEVELS = Array.from({length: 13}, (_, i) => i);
export const SIGNALS = {
  noise: 'anoisesrc=d=3:c=white:r=44100:a=0.5:seed=7',
  tones: "aevalsrc='0.4*sin(2*PI*440*t)+0.3*sin(2*PI*660*t)|0.4*sin(2*PI*550*t)+0.3*sin(2*PI*770*t)':d=3:s=44100",
  music: "aevalsrc='0.25*sin(2*PI*220*t)*exp(-2*mod(t,0.5))+0.2*sin(2*PI*330*t)*exp(-2*mod(t,0.5))+0.15*sin(2*PI*440*t)*exp(-3*mod(t,0.25))+0.01*(random(0)-0.5)|0.25*sin(2*PI*247*t)*exp(-2*mod(t,0.5))+0.2*sin(2*PI*370*t)*exp(-2*mod(t,0.5))+0.15*sin(2*PI*494*t)*exp(-3*mod(t,0.25))+0.01*(random(1)-0.5)':d=3:s=44100",
  silence: 'anullsrc=r=44100:cl=stereo:d=3',
};
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, {maxBuffer: 1 << 28, ...opts});
const ffm = (args, opts = {}) => {
  const r = run('nice', ['-n', '10', 'ffmpeg', '-v', 'error', '-y', ...args], opts);
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${String(r.stderr)}`);
  return r;
};
const md5 = (buf) => crypto.createHash('md5').update(buf).digest('hex');

// ---- reader: the flac bytes, parsed by Node ----
const BLOCK_CODE = (code, b, pos) => {
  if (code === 1) return {size: 192, used: 0};
  if (code >= 2 && code <= 5) return {size: 576 * 2 ** (code - 2), used: 0};
  if (code === 6) return {size: b[pos] + 1, used: 1};
  if (code === 7) return {size: b.readUInt16BE(pos) + 1, used: 2};
  if (code >= 8 && code <= 15) return {size: 256 * 2 ** (code - 8), used: 0};
  return null;
};
export function crc8(buf) { let c = 0; for (const x of buf) { c ^= x; for (let i = 0; i < 8; i++) c = c & 0x80 ? ((c << 1) ^ 0x07) & 0xff : (c << 1) & 0xff; } return c; }
// UTF-8 style number of a flac frame header: returns {value, len} or null
function utf8num(b, pos) {
  const x = b[pos]; let len, v;
  if (x < 0x80) return {value: x, len: 1};
  if ((x & 0xe0) === 0xc0) { len = 2; v = x & 0x1f; } else if ((x & 0xf0) === 0xe0) { len = 3; v = x & 0x0f; } else if ((x & 0xf8) === 0xf0) { len = 4; v = x & 0x07; } else if ((x & 0xfc) === 0xf8) { len = 5; v = x & 0x03; } else if ((x & 0xfe) === 0xfc) { len = 6; v = x & 0x01; } else return null;
  for (let i = 1; i < len; i++) { if ((b[pos + i] & 0xc0) !== 0x80) return null; v = v * 64 + (b[pos + i] & 0x3f); }
  return {value: v, len};
}
// header at pos, valid only if the sync, the fields, the crc-8 and the expected frame number all match
export function frameHeaderAt(b, pos, expectNumber) {
  if (pos + 6 > b.length || b[pos] !== 0xff || (b[pos + 1] & 0xfe) !== 0xf8) return null;
  const bs = b[pos + 2] >> 4, sr = b[pos + 2] & 15;
  if (bs === 0 || sr === 15 || (b[pos + 3] & 1)) return null;
  const num = utf8num(b, pos + 4); if (!num || num.value !== expectNumber) return null;
  let p = pos + 4 + num.len;
  const blk = BLOCK_CODE(bs, b, p); if (!blk) return null; p += blk.used;
  if (sr === 12) p += 1; else if (sr === 13 || sr === 14) p += 2;
  if (p >= b.length || crc8(b.subarray(pos, p)) !== b[p]) return null;
  return {pos, blockSize: blk.size, headerLen: p + 1 - pos};
}
export function parseFlac(buf) {
  if (buf.toString('latin1', 0, 4) !== 'fLaC') throw new Error('not flac');
  let pos = 4, last = false, info = null;
  while (!last) {
    const h = buf[pos]; last = !!(h & 0x80); const type = h & 0x7f, len = buf.readUIntBE(pos + 1, 3);
    if (type === 0) {
      const d = buf.subarray(pos + 4, pos + 4 + len);
      const rate = (d.readUInt32BE(10) >>> 12), ch = ((d[12] >> 1) & 7) + 1, bits = (((d[12] & 1) << 4) | (d[13] >> 4)) + 1;
      info = {minBlock: d.readUInt16BE(0), maxBlock: d.readUInt16BE(2), minFrame: d.readUIntBE(4, 3), maxFrame: d.readUIntBE(7, 3), rate, channels: ch, bits,
        totalSamples: (d[13] & 15) * 2 ** 32 + d.readUInt32BE(14), md5: d.subarray(18, 34).toString('hex')};
    }
    pos += 4 + len;
  }
  const start = pos, frames = [];
  let cur = frameHeaderAt(buf, pos, 0);
  if (!cur) throw new Error('no first frame');
  for (;;) {
    let next = null;
    for (let q = cur.pos + cur.headerLen; q < buf.length - 5; q++) { if (buf[q] === 0xff) { const h = frameHeaderAt(buf, q, frames.length + 1); if (h) { next = h; break; } } }
    const end = next ? next.pos : buf.length;
    frames.push({offset: cur.pos, bytes: end - cur.pos, blockSize: cur.blockSize});
    if (!next) break;
    cur = next;
  }
  return {info, headerBytes: start, frames};
}

// ---- readers: ffprobe and ffmpeg ----
export const probeSize = (file) => parseInt(run('ffprobe', ['-v', 'error', '-show_entries', 'format=size', '-of', 'csv=p=0', file], {encoding: 'utf8'}).stdout.trim(), 10);
export const probePackets = (file) => run('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'packet=size', '-of', 'csv=p=0', file], {encoding: 'utf8'}).stdout.split(/\s+/).filter(Boolean).map(Number);
export const ffmpegMd5 = (file) => String(ffm(['-i', file, '-map', '0:a', '-c:a', 'pcm_s16le', '-f', 'md5', '-']).stdout).trim().replace(/^MD5=/, '');
export const rawMd5 = (file) => md5(ffm(['-i', file, '-map', '0:a', '-c:a', 'pcm_s16le', '-f', 's16le', '-']).stdout);

// the samples of a RIFF wav: walk the chunks to 'data' (ffmpeg also writes a LIST chunk)
export function wavData(buf) {
  let pos = 12;
  while (pos + 8 <= buf.length) { const id = buf.toString('latin1', pos, pos + 4), len = buf.readUInt32LE(pos + 4); if (id === 'data') return buf.subarray(pos + 8, pos + 8 + len); pos += 8 + len + (len & 1); }
  throw new Error('no data chunk');
}
function makeWav(dir, name, expr, af) {
  const wav = path.join(dir, `${name}.wav`);
  ffm(['-f', 'lavfi', '-i', expr, '-ac', '2', ...(af ? ['-af', af] : []), '-t', String(SECS), '-c:a', 'pcm_s16le', wav]);
  return wav;
}
const enc = (wav, out, level) => ffm(['-i', wav, '-c:a', 'flac', ...(level === undefined ? [] : ['-compression_level', String(level)]), out]);

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const ev = {ffmpeg: ffmpegVersion(), signals: {}, controls: {}};
  for (const [name, expr] of Object.entries(SIGNALS)) {
    const wav = makeWav(dir, name, expr);
    const pcm = wavData(fs.readFileSync(wav));
    // a peek at the signal for the video: min and max of the left channel in 80 buckets over the first 100 ms
    const preview = Array.from({length: 80}, (_, b) => { let lo = 32767, hi = -32768; for (let i = 0; i < 55; i++) { const v = pcm.readInt16LE((b * 55 + i) * 4); if (v < lo) lo = v; if (v > hi) hi = v; } return [lo, hi]; });
    const sig = {sourceBytes: pcm.length, sourceMd5: md5(pcm), preview, levels: {}};
    for (const l of LEVELS) {
      const f = path.join(dir, `${name}_${l}.flac`); enc(wav, f, l);
      const buf = fs.readFileSync(f), p = parseFlac(buf), pk = probePackets(f);
      sig.levels[l] = {
        bytes: buf.length, probeBytes: probeSize(f),
        frames: p.frames.length, frameBytes: p.frames.map((x) => x.bytes), blockSizes: [...new Set(p.frames.map((x) => x.blockSize))],
        probePackets: pk.length, probeSizes: pk,
        info: p.info, headerBytes: p.headerBytes,
        md5Ffmpeg: ffmpegMd5(f), md5Raw: rawMd5(f),
      };
    }
    ev.signals[name] = sig;
  }
  // header blocks of one file (the same in every file): STREAMINFO, VORBIS_COMMENT, PADDING
  { const b = fs.readFileSync(path.join(dir, 'tones_5.flac')); const blocks = []; let pos = 4, last = false;
    while (!last) { const h = b[pos]; last = !!(h & 0x80); blocks.push({type: h & 0x7f, len: b.readUIntBE(pos + 1, 3)}); pos += 4 + b.readUIntBE(pos + 1, 3); }
    ev.headerBlocks = blocks; }
  // control: no -compression_level is level 5
  const tw = path.join(dir, 'tones.wav'); const d = path.join(dir, 'tones_default.flac'); enc(tw, d);
  ev.controls.defaultEqualsLevel5 = Buffer.compare(fs.readFileSync(d), fs.readFileSync(path.join(dir, 'tones_5.flac'))) === 0;
  // known positive for the sound readers: tones shifted by one sample must give a different md5 everywhere
  const shifted = makeWav(dir, 'tones_shift', SIGNALS.tones, 'atrim=start_sample=1,asetpts=PTS-STARTPTS,apad=pad_len=1');
  const sf = path.join(dir, 'tones_shift.flac'); enc(shifted, sf, 5);
  const sp = parseFlac(fs.readFileSync(sf));
  const base = ev.signals.tones;
  ev.controls.shift = {md5Ffmpeg: ffmpegMd5(sf), md5Raw: rawMd5(sf), md5Info: sp.info.md5, differsFfmpeg: ffmpegMd5(sf) !== base.levels[5].md5Ffmpeg, differsRaw: rawMd5(sf) !== base.levels[5].md5Raw, differsInfo: sp.info.md5 !== base.levels[5].info.md5};
  // known positive for the size reader: the same tones as a much shorter file are smaller; and a level that does not exist must be rejected
  ev.controls.reject = {};
  for (const l of [13, 99]) {
    const r = run('ffmpeg', ['-v', 'error', '-y', '-i', tw, '-c:a', 'flac', '-compression_level', String(l), path.join(dir, `bad_${l}.flac`)], {encoding: 'utf8'});
    ev.controls.reject[l] = {status: r.status, message: /invalid compression level/.test(r.stderr), exists: fs.existsSync(path.join(dir, `bad_${l}.flac`)) && fs.statSync(path.join(dir, `bad_${l}.flac`)).size > 0};
  }
  return ev;
}
