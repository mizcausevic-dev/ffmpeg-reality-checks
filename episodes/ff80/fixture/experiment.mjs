// Episode 80 fixture: "A GIF stores one delay per frame, in hundredths of a second. What does ffmpeg make of those delays when it writes an mp4, and what do -r, the fps filter and -fps_mode change?"
// Synthetic source only. GIF89a files written byte by byte in Node (own LZW encoder): 48 x 48 pixels, 2 colours, 20 frames; every frame carries its own
// number as six 6 x 8 pixel blocks (a binary code), so a decoded picture says which source frame it is.
//   const2 const3 const4 const6 const10   every frame has the same delay (2, 3, 4, 6, 10 hundredths of a second)
//   mix                                   delays cycle 2, 3, 4, 6, 10 (sum 100 = 1.000 s)
//   low                                   delays 0, 1, 2, 1 repeated (below the demuxer's min_delay of 2)
// Readers:
//   reader 1  Node parses the file bytes: the delay field of every graphic control extension
//   reader 2  ffprobe: stream rates, packet timestamps, duration
//   reader 3  ffmpeg decodes every frame (passthrough) to gray pixels, Node reads the frame number from the blocks
// What is measured per output: how long (in hundredths of a second) each source frame is on screen, from the decoded pictures and their timestamps.
// Known positive: the gif itself, decoded the same way, shows frame i for exactly delay i.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 48, H = 48, FRAMES = 20;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
export const GIFS = {
  const2: Array(FRAMES).fill(2), const3: Array(FRAMES).fill(3), const4: Array(FRAMES).fill(4), const6: Array(FRAMES).fill(6), const10: Array(FRAMES).fill(10),
  mix: Array.from({length: FRAMES}, (_, i) => [2, 3, 4, 6, 10][i % 5]),
  low: Array.from({length: FRAMES}, (_, i) => [0, 1, 2, 1][i % 4]),
};

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, {maxBuffer: 1 << 28, ...opts});
const ffm = (args, opts) => { const r = run('ffmpeg', ['-v', 'error', '-y', ...args], opts); if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${String(r.stderr)}`); return r; };

// ---- GIF writer ----
export function lzw(indices, minCode) {
  const clear = 1 << minCode, eoi = clear + 1;
  let codeSize = minCode + 1, next = eoi + 1, dict = new Map();
  const out = []; let cur = 0, nbits = 0;
  const emit = (c) => { cur |= c << nbits; nbits += codeSize; while (nbits >= 8) { out.push(cur & 255); cur >>= 8; nbits -= 8; } };
  emit(clear);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i], key = prefix * 256 + k;
    if (dict.has(key)) { prefix = dict.get(key); continue; }
    emit(prefix);
    if (next < 4096) { dict.set(key, next++); if (next - 1 === (1 << codeSize) && codeSize < 12) codeSize++; }
    else { emit(clear); dict = new Map(); next = eoi + 1; codeSize = minCode + 1; }
    prefix = k;
  }
  emit(prefix); emit(eoi);
  if (nbits > 0) out.push(cur & 255);
  return Buffer.from(out);
}
export function framePixels(n) {
  const px = new Uint8Array(W * H);
  for (let x = 0; x < W; x++) px[x] = 1;
  for (let b = 0; b < 6; b++) if ((n >> b) & 1) for (let y = 20; y < 28; y++) for (let x = 2 + 7 * b; x < 8 + 7 * b; x++) px[y * W + x] = 1;
  return px;
}
export function gifBytes(delays) {
  const parts = [];
  const hd = Buffer.alloc(13); hd.write('GIF89a', 0); hd.writeUInt16LE(W, 6); hd.writeUInt16LE(H, 8); hd[10] = 0xf0; parts.push(hd, Buffer.from([0, 0, 0, 255, 255, 255]));
  parts.push(Buffer.from([0x21, 0xff, 0x0b, ...Buffer.from('NETSCAPE2.0'), 0x03, 0x01, 0, 0, 0x00]));
  delays.forEach((d, i) => {
    parts.push(Buffer.from([0x21, 0xf9, 0x04, 0x00, d & 255, d >> 8, 0, 0]));
    const id = Buffer.alloc(10); id[0] = 0x2c; id.writeUInt16LE(W, 5); id.writeUInt16LE(H, 7); parts.push(id);
    const data = lzw(framePixels(i), 2); parts.push(Buffer.from([2]));
    for (let o = 0; o < data.length; o += 255) { const c = data.subarray(o, o + 255); parts.push(Buffer.from([c.length]), c); }
    parts.push(Buffer.from([0]));
  });
  parts.push(Buffer.from([0x3b]));
  return Buffer.concat(parts);
}

// ---- reader 1: the delay fields in the bytes ----
export function readGifDelays(buf) {
  let p = 13; if (buf[10] & 0x80) p += 3 * (1 << ((buf[10] & 7) + 1));
  const delays = [];
  while (p < buf.length) {
    const b = buf[p];
    if (b === 0x3b) break;
    if (b === 0x21) {
      const label = buf[p + 1];
      if (label === 0xf9) delays.push(buf.readUInt16LE(p + 4));
      p += 2; while (buf[p] !== 0) p += buf[p] + 1; p += 1;
    } else if (b === 0x2c) {
      const packed = buf[p + 9]; p += 10; if (packed & 0x80) p += 3 * (1 << ((packed & 7) + 1));
      p += 1; while (buf[p] !== 0) p += buf[p] + 1; p += 1;
    } else throw new Error(`unexpected gif byte ${b} at ${p}`);
  }
  return delays;
}

// ---- reader 2: ffprobe ----
export function probe(file) {
  const r = run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,r_frame_rate,avg_frame_rate,nb_frames,time_base:format=duration', '-of', 'json', file], {encoding: 'utf8'});
  if (r.status !== 0) throw new Error(`ffprobe failed: ${r.stderr}`);
  const j = JSON.parse(r.stdout), s = j.streams[0];
  const pk = run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=pts_time', '-of', 'csv=p=0', file], {encoding: 'utf8'});
  const pts = String(pk.stdout).trim().split(/\r?\n/).filter(Boolean).map(Number).sort((a, b) => a - b);
  return {codec: s.codec_name, rFrameRate: s.r_frame_rate, avgFrameRate: s.avg_frame_rate, packets: pts.length, duration: Number(j.format.duration), pts};
}
export const rate = (frac) => { const [a, b] = String(frac).split('/').map(Number); return b ? a / b : a; };

// ---- reader 3: which source frame is on screen, and for how long ----
export function frameNumbers(file) {
  const r = ffm(['-i', file, '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], {});
  const b = r.stdout, n = Math.floor(b.length / (W * H)), out = [];
  for (let f = 0; f < n; f++) { let v = 0; for (let k = 0; k < 6; k++) if (b[f * W * H + 24 * W + 4 + 7 * k] > 128) v |= 1 << k; out.push(v); }
  return out;
}
// frame i is on screen from its first picture to the first picture of the next frame (the last one until the file's duration); milliseconds, one decimal
export function onScreen(numbers, pts, duration) {
  const t = pts.map((x, i) => (i + 1 < pts.length ? pts[i + 1] : duration) - x);
  const cs = Array(FRAMES).fill(0), first = Array(FRAMES).fill(null);
  numbers.forEach((v, i) => { cs[v] += t[i]; if (first[v] === null) first[v] = pts[i]; });
  return {ms: cs.map((x) => Math.round(x * 10000) / 10), shown: numbers.length, missing: cs.map((x, i) => (x < 1e-9 ? i : -1)).filter((i) => i >= 0), first};
}

// ---- conversions ----
export const CONVERSIONS = {
  default: {args: [], label: 'ffmpeg -i in.gif -pix_fmt yuv420p out.mp4'},
  passthrough: {args: ['-fps_mode', 'passthrough'], label: 'ffmpeg -i in.gif -fps_mode passthrough -pix_fmt yuv420p out.mp4'},
  vfr: {args: ['-fps_mode', 'vfr'], label: 'ffmpeg -i in.gif -fps_mode vfr -pix_fmt yuv420p out.mp4'},
  r30: {args: ['-r', '30'], label: 'ffmpeg -i in.gif -r 30 -pix_fmt yuv420p out.mp4'},
  fps30: {args: ['-vf', 'fps=30'], label: 'ffmpeg -i in.gif -vf fps=30 -pix_fmt yuv420p out.mp4'},
  r25: {args: ['-r', '25'], label: 'ffmpeg -i in.gif -r 25 -pix_fmt yuv420p out.mp4'},
  vsyncPass: {args: ['-vsync', 'passthrough'], label: 'ffmpeg -i in.gif -vsync passthrough -pix_fmt yuv420p out.mp4', optional: true},
};

export function measure(file) {
  const p = probe(file), nums = frameNumbers(file), os = onScreen(nums, p.pts, p.duration);
  return {...p, numbers: nums, onScreen: os.ms, shown: os.shown, missing: os.missing};
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const ev = {ffmpeg: ffmpegVersion().split('\n')[0], gifs: {}, conversions: {}};
  for (const [name, delays] of Object.entries(GIFS)) {
    const file = path.join(dir, `${name}.gif`);
    fs.writeFileSync(file, gifBytes(delays));
    const bytes = fs.readFileSync(file);
    const g = {bytes: bytes.length, delaysInFile: readGifDelays(bytes), sumInFile: readGifDelays(bytes).reduce((a, b) => a + b, 0), asGif: measure(file), out: {}};
    for (const [cname, c] of Object.entries(CONVERSIONS)) {
      const out = path.join(dir, `${name}_${cname}.mp4`);
      const r = run('ffmpeg', ['-v', 'error', '-y', '-i', file, ...c.args, '-pix_fmt', 'yuv420p', out], {encoding: 'utf8'});
      if (r.status !== 0) { if (c.optional) { g.out[cname] = {failed: true, stderr: String(r.stderr).split(/\r?\n/)[0]}; continue; } throw new Error(`${name} ${cname} failed: ${r.stderr}`); }
      g.out[cname] = {command: c.label, ...measure(out)};
    }
    ev.gifs[name] = g;
  }
  return ev;
}
