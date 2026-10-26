// Episode 58 fixture: "Why does my -ss cut with -c copy start with black or frozen frames?"
// Synthetic input only (lavfi, lossless x264, mkv, 96x72, 25 fps, yuv420p). One clip of 100 frames (4 s), keyframes every 25 frames (at 0, 1, 2, 3 s),
// no B-frames; frame N is a flat card of luma 16 + 2 N, so a decoded frame names its own source index.
// Cuts: -ss S with -c copy, S in 0.48, 1.0, 1.52, 1.96 s (all on the 25 fps frame grid), with -ss before -i and after -i, written to .mp4 and .mkv (16 files),
// plus two controls: -ss 0 (the whole clip) and a re-encode -ss 1.52 (accurate seek, no copy).
// The requested content of a cut at S is source frames r = ceil(S x 25) to 99.
// Readers:
//   reader 1  ffprobe (first packet and first frame times, stream start_time) plus ffmpeg framemd5 matched against the source frame hashes (names the source frame of every output frame)
//   reader 2  raw decoded luma in Node (frame index = (luma - 16) / 2) plus the container bytes in Node: mp4 edit list (elst) and mkv first block times
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 96, H = 72, FPS = 25, FRAMES = 100, GOP = 25;
export const SS = [0.48, 1.0, 1.52, 1.96];
export const CONTAINERS = ['mp4', 'mkv'];
export const POS = ['before', 'after'];
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
export const reqStart = (ss) => Math.ceil(ss * FPS - 1e-9);
export const nameOf = (pos, ss, c) => `${pos}_${String(ss).replace('.', 'p')}_${c}`;

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

export function makeSource(dir) {
  const src = path.join(dir, 'src.mkv');
  ffm(['-f', 'lavfi', '-i', `color=c=black:s=${W}x${H}:r=${FPS}:d=${FRAMES / FPS},format=yuv420p,geq=lum='16+2*N':cb=128:cr=128`,
    '-c:v', 'libx264', '-qp', '0', '-g', String(GOP), '-keyint_min', String(GOP), '-sc_threshold', '0', '-bf', '0', '-pix_fmt', 'yuv420p', src]);
  return src;
}

export const CASES = {};
for (const pos of POS) for (const ss of SS) for (const c of CONTAINERS) CASES[nameOf(pos, ss, c)] = {pos, ss, container: c, copy: true};
CASES.whole_mkv = {pos: 'before', ss: 0, container: 'mkv', copy: true};
CASES.reenc_1p52_mkv = {pos: 'before', ss: 1.52, container: 'mkv', copy: false};

export const commandOf = (name) => {
  const c = CASES[name];
  const codec = c.copy ? '-c copy' : '-c:v libx264 -qp 0';
  return c.pos === 'before' ? `ffmpeg -ss ${c.ss} -i src.mkv ${codec} out.${c.container}` : `ffmpeg -i src.mkv -ss ${c.ss} ${codec} out.${c.container}`;
};

export function makeCase(src, dir, name) {
  const c = CASES[name];
  const out = path.join(dir, `${name}.${c.container}`);
  const codec = c.copy ? ['-c', 'copy'] : ['-c:v', 'libx264', '-qp', '0', '-pix_fmt', 'yuv420p'];
  const args = c.pos === 'before' ? ['-ss', String(c.ss), '-i', src, ...codec, out] : ['-i', src, '-ss', String(c.ss), ...codec, out];
  ffm(args);
  return out;
}

// ---- reader 1: framemd5 and ffprobe ----
export function framemd5(file, mode = 'passthrough') {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-an', '-fps_mode', mode, ...(mode === 'cfr' ? ['-r', String(FPS)] : []), '-f', 'framemd5', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`framemd5 failed: ${r.stderr}`);
  return r.stdout.split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());
}
export const srcIndexByHash = (outMd5, srcMd5) => { const m = new Map(srcMd5.map((h, i) => [h, i])); return outMd5.map((h) => (m.has(h) ? m.get(h) : -1)); };
export function probeTimes(file) {
  const first = (arr) => (arr.length ? Math.min(...arr.map(Number)) : null);
  const pkt = first(probe(['-select_streams', 'v:0', '-show_entries', 'packet=pts_time', '-of', 'csv=p=0', file]));
  const frm = probe(['-select_streams', 'v:0', '-show_entries', 'frame=pts_time', '-of', 'csv=p=0', file]).map(Number);
  const st = probe(['-select_streams', 'v:0', '-show_entries', 'stream=start_time', '-of', 'csv=p=0', file]).map(Number)[0];
  return {firstPacket: pkt, firstFrame: frm.length ? frm[0] : null, frameCount: frm.length, streamStart: st, lastFrame: frm.length ? frm[frm.length - 1] : null};
}

// ---- reader 2: Node on raw pixels and container bytes ----
export function rawLumaIndex(file) {
  const r = ffm(['-i', file, '-an', '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-'], {});
  const b = r.stdout, fsz = W * H * 3 / 2, n = Math.floor(b.length / fsz);
  if (n * fsz !== b.length) throw new Error('unexpected raw size');
  const out = [];
  for (let i = 0; i < n; i++) { let s = 0, lo = 255, hi = 0; for (let k = 0; k < W * H; k++) { const v = b[i * fsz + k]; s += v; if (v < lo) lo = v; if (v > hi) hi = v; } out.push(lo === hi ? (s / (W * H) - 16) / 2 : -1); }
  return out;
}
// mp4: edit list of the video track (segment duration in movie units, media time in track units), time scales
export function mp4Edits(buf) {
  let mvts = 1000, mdts = 1; const edits = [];
  const box = (s, e, fn) => { let p = s; while (p + 8 <= e) { let sz = buf.readUInt32BE(p); const t = buf.toString('latin1', p + 4, p + 8); let h = 8; if (sz === 1) { sz = Number(buf.readBigUInt64BE(p + 8)); h = 16; } if (sz === 0) sz = e - p; fn(t, p + h, p + sz); p += sz; } };
  box(0, buf.length, (t, s, e) => {
    if (t !== 'moov') return;
    box(s, e, (t2, s2, e2) => {
      if (t2 === 'mvhd') mvts = buf.readUInt32BE(s2 + (buf[s2] === 1 ? 20 : 12));
      if (t2 !== 'trak') return;
      box(s2, e2, (t3, s3, e3) => {
        if (t3 === 'edts') box(s3, e3, (t4, s4) => { if (t4 === 'elst') { const v = buf[s4], n = buf.readUInt32BE(s4 + 4); let q = s4 + 8; for (let i = 0; i < n; i++) { if (v === 1) { edits.push({dur: Number(buf.readBigUInt64BE(q)), media: Number(buf.readBigInt64BE(q + 8))}); q += 20; } else { edits.push({dur: buf.readUInt32BE(q), media: buf.readInt32BE(q + 4)}); q += 12; } } } });
        if (t3 === 'mdia') box(s3, e3, (t4, s4) => { if (t4 === 'mdhd') mdts = buf.readUInt32BE(s4 + (buf[s4] === 1 ? 20 : 12)); });
      });
    });
  });
  const skip = edits.length && edits[0].media > 0 ? edits[0].media : 0; // media time of the first edit: track units skipped from the start of the stored media
  const lead = edits.length && edits[0].media === -1 ? edits[0].dur / mvts : 0; // an empty edit delays the start
  return {mvts, mdts, edits, hasEdit: edits.length > 0, skipSeconds: skip / mdts, leadSeconds: lead, segSeconds: edits.length ? edits.reduce((a, e) => a + e.dur, 0) / mvts : null};
}
// mkv: smallest absolute block time (seconds) of the video track
export function mkvFirstBlock(buf) {
  const vint = (p, keep) => { let b = buf[p], len = 1; while (len <= 8 && !(b & (0x80 >> (len - 1)))) len++; let v = keep ? b : b & (0xff >> len); for (let i = 1; i < len; i++) v = v * 256 + buf[p + i]; return {v, len, unknown: !keep && v === 2 ** (7 * len) - 1}; };
  let scale = 1e6, first = Infinity;
  const CONT = new Set([0x18538067, 0x1f43b675, 0xa0]);
  const walk = (s, e, cluster) => {
    let p = s;
    while (p < e) {
      const id = vint(p, true); const sz = vint(p + id.len, false); const ds = p + id.len + sz.len, de = sz.unknown ? e : Math.min(e, ds + sz.v);
      if (CONT.has(id.v)) walk(ds, de, cluster);
      else if (id.v === 0x1549a966) { let q = ds; while (q < de) { const i2 = vint(q, true), s2 = vint(q + i2.len, false), d2 = q + i2.len + s2.len; if (i2.v === 0x2ad7b1) { let v = 0; for (let i = d2; i < d2 + s2.v; i++) v = v * 256 + buf[i]; scale = v; } q = d2 + s2.v; } }
      else if (id.v === 0xe7) { let v = 0; for (let i = ds; i < de; i++) v = v * 256 + buf[i]; cluster = v; }
      else if (id.v === 0xa3 || id.v === 0xa1) { const tn = vint(ds, false); const t = (cluster + buf.readInt16BE(ds + tn.len)) * scale / 1e9; if (t < first) first = t; }
      p = de;
    }
  };
  walk(0, buf.length, 0);
  return first;
}

const r3 = (v) => Math.round(v * 1000) / 1000;
export function measure(file, ss, container, srcMd5) {
  const md5 = framemd5(file);
  const idx = srcIndexByHash(md5, srcMd5);
  const raw = rawLumaIndex(file);
  const t = probeTimes(file);
  const buf = fs.readFileSync(file);
  const r = reqStart(ss);
  const first = idx[0], last = idx[idx.length - 1];
  const cfr = srcIndexByHash(framemd5(file, 'cfr'), srcMd5);
  let frozen = 0; while (frozen + 1 < cfr.length && cfr[frozen + 1] === cfr[0]) frozen++;
  return {
    ss, container, requestedFrom: r, requestedFrames: FRAMES - r,
    packets: Number(probe(['-count_packets', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', file])[0]),
    frames: idx.length, framesRaw: raw.length, unknownHashes: idx.filter((x) => x < 0).length,
    firstSrc: first, lastSrc: last, bySrcHash: idx, bySrcRaw: raw,
    leading: idx.filter((x) => x >= 0 && x < r).length,        // frames of the cut that come before the requested start
    missing: Math.max(0, first - r),                             // requested frames that are not in the cut (the cut starts later than asked)
    contiguous: idx.every((x, i) => !i || x === idx[i - 1] + 1),
    firstPacket: r3(t.firstPacket), firstFrame: r3(t.firstFrame), streamStart: r3(t.streamStart), lastFrame: r3(t.lastFrame), frameCount: t.frameCount,
    frozenOnCfr: frozen, cfrFrames: cfr.length,
    mp4: container === 'mp4' ? mp4Edits(buf) : null,
    mkvFirst: container === 'mkv' ? r3(mkvFirstBlock(buf)) : null,
  };
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const src = makeSource(dir);
  const srcMd5 = framemd5(src), srcRaw = rawLumaIndex(src);
  const kf = probe(['-select_streams', 'v:0', '-skip_frame', 'nokey', '-show_entries', 'frame=pts_time', '-of', 'csv=p=0', src]).map(Number);
  const bframes = probe(['-select_streams', 'v:0', '-show_entries', 'frame=pict_type', '-of', 'csv=p=0', src]).filter((x) => x === 'B').length;
  const ev = {
    ffmpeg: ffmpegVersion(),
    source: {frames: srcMd5.length, distinct: new Set(srcMd5).size, keyframes: kf, bFrames: bframes, lumaRule: srcRaw.every((v, i) => v === i), md5Sample: createHash('md5').update(srcMd5.join()).digest('hex').slice(0, 8)},
    runs: {},
  };
  for (const name of Object.keys(CASES)) {
    const f = makeCase(src, dir, name);
    ev.runs[name] = {name, command: commandOf(name), copy: CASES[name].copy, pos: CASES[name].pos, ...measure(f, CASES[name].ss, CASES[name].container, srcMd5)};
  }
  return ev;
}
