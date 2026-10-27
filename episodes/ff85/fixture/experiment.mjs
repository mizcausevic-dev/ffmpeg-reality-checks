// Episode 85 fixture: "Converting a 10 bit ramp to 8 bit: does format=yuv420p band, and do the dither options change anything?"
// Synthetic input only. Node writes raw yuv420p10le frames (no container): a 1024 x 16 ramp whose luma is 384 + (x >> 2), so 256 ten bit levels, each 4 pixels wide
// (an 8 bit level is 4 ten bit levels, 16 pixels wide), chroma flat at 512; a full ramp (luma = x, 1024 levels); and four flat tiles (luma 400 to 403, i.e. 100.0, 100.25, 100.5, 100.75 in 8 bit).
// Every conversion goes through the scaler: `format=yuv420p` alone, or `scale=...` with sws_dither and flags options, then rawvideo out.
//   reader 1  Node: reads the decoded Y plane bytes (distinct values, run lengths, error against the ideal value/4, error of every 2 x 2 block mean, md5 of the frame)
//   reader 2  ffmpeg: framemd5 of the same output file (equality classes) and, in a separate ffmpeg run, extractplanes=y,scale=area to the 2 x 2 block means, written as gray16le
// Control: yuv420p10le to yuv420p10le changes nothing. Known positive: rgb8 output, where the dither options do change the bytes (so both readers can see a dither difference).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 1024, H = 16, LO = 384;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

// name: {opts (appended to scale=W:H), label}
export const MODES = {
  default: {vf: 'format=yuv420p', say: 'format=yuv420p'},
  auto: {opts: 'sws_dither=auto', say: 'sws_dither=auto'},
  none: {opts: 'sws_dither=none', say: 'sws_dither=none'},
  bayer: {opts: 'sws_dither=bayer', say: 'sws_dither=bayer'},
  ed: {opts: 'sws_dither=ed', say: 'sws_dither=ed'},
  a_dither: {opts: 'sws_dither=a_dither', say: 'sws_dither=a_dither'},
  x_dither: {opts: 'sws_dither=x_dither', say: 'sws_dither=x_dither'},
  flag_ed: {opts: 'flags=+error_diffusion', say: 'flags=+error_diffusion'},
};
export const vfOf = (mode, pix) => (MODES[mode].vf && pix === 'yuv420p' ? MODES[mode].vf : `scale=${W}:${H}${MODES[mode].opts ? ':' + MODES[mode].opts : ''},format=${pix}`);

export const idealOf = (kind) => Float64Array.from({length: W}, (_, x) => (kind === 'full' ? x : LO + (x >> 2)) / 4);

function writeRaw10(file, w, h, yOf) {
  const y = new Uint16Array(w * h);
  for (let r = 0; r < h; r++) for (let x = 0; x < w; x++) y[r * w + x] = yOf(x, r);
  const c = new Uint16Array((w / 2) * (h / 2)).fill(512);
  fs.writeFileSync(file, Buffer.concat([Buffer.from(y.buffer), Buffer.from(c.buffer), Buffer.from(c.buffer)]));
}

const ff = (args) => { const r = spawnSync('ffmpeg', ['-hide_banner', '-v', 'error', '-y', ...args], {encoding: 'utf8', maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')}: ${r.stderr}`); return r.stdout; };
export const convert = (inFile, w, h, vf, pix, outFile) => ff(['-f', 'rawvideo', '-pix_fmt', 'yuv420p10le', '-s', `${w}x${h}`, '-i', inFile, '-vf', vf, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', pix, outFile]);
export const md5File = (f) => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');
// reader 2a: ffmpeg's own md5 of the frame in the raw file
export function ffmpegMd5(file, w, h, pix) {
  const out = ff(['-f', 'rawvideo', '-pix_fmt', pix, '-s', `${w}x${h}`, '-i', file, '-f', 'framemd5', '-']);
  return out.split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim())[0];
}
// reader 2b: ffmpeg averages every 2 x 2 block of the Y plane (area scaling) and writes 16 bit gray; back to 8 bit units (this build widens 8 to 16 bit by a shift of 8)
export function ffmpegBlocks(file, w, h, pix, tmp) {
  const out = path.join(tmp, 'blk.raw');
  ff(['-f', 'rawvideo', '-pix_fmt', pix, '-s', `${w}x${h}`, '-i', file, '-vf', `extractplanes=y,scale=${w / 2}:${h / 2}:flags=area,format=gray16le`, '-frames:v', '1', '-f', 'rawvideo', out]);
  const b = fs.readFileSync(out); const v = new Float64Array((w / 2) * (h / 2));
  for (let i = 0; i < v.length; i++) v[i] = b.readUInt16LE(i * 2) / 256;
  return v;
}

// reader 1: Node, on the Y plane of an 8 bit frame
export function analyze8(buf, ideal) {
  const y = buf.subarray(0, W * H);
  const set = new Set(y); const d = [...set].sort((a, b) => a - b);
  const row = (r) => [...y.subarray(r * W, (r + 1) * W)];
  const runsOf = (a) => { const runs = []; let c = 1; for (let i = 1; i < a.length; i++) { if (a[i] === a[i - 1]) c++; else { runs.push(c); c = 1; } } runs.push(c); return runs; };
  const r0 = row(0), runs = runsOf(r0);
  let sum = 0, ss = 0, mx = 0;
  for (let r = 0; r < H; r++) for (let x = 0; x < W; x++) { const e = y[r * W + x] - ideal[x]; sum += e; ss += e * e; mx = Math.max(mx, Math.abs(e)); }
  const blocks = blockMeans(y, W, H);
  let bmax = 0;
  for (let by = 0; by < H / 2; by++) for (let bx = 0; bx < W / 2; bx++) bmax = Math.max(bmax, Math.abs(blocks[by * (W / 2) + bx] - (ideal[bx * 2] + ideal[bx * 2 + 1]) / 2));
  return {
    distinct: set.size, lowest: d[0], highest: d.at(-1),
    meanRun: W / runs.length, maxRun: Math.max(...runs), changesRow0: runs.length - 1, rowsDiffer01: r0.filter((v, i) => v !== y[W + i]).length,
    bias: sum / (W * H), maxErr: mx, rms: Math.sqrt(ss / (W * H)), blockMaxErr: bmax,
    row0: r0.slice(56, 72), row1: row(1).slice(56, 72),
  };
}
export function blockMeans(y, w, h) {
  const out = new Float64Array((w / 2) * (h / 2));
  for (let by = 0; by < h / 2; by++) for (let bx = 0; bx < w / 2; bx++) out[by * (w / 2) + bx] = (y[2 * by * w + 2 * bx] + y[2 * by * w + 2 * bx + 1] + y[(2 * by + 1) * w + 2 * bx] + y[(2 * by + 1) * w + 2 * bx + 1]) / 4;
  return out;
}
export const maxAbsDiff = (a, b) => { let m = 0; for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i])); return m; };
export const classesOf = (md5s) => { const m = {}; for (const [k, v] of Object.entries(md5s)) (m[v] ??= []).push(k); return Object.values(m); };

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const ev = {ffmpeg: ffmpegVersion(), size: {W, H}, lo: LO, modes: {}, full: {}, rgb8: {}, tiles: {}};
  // stimuli
  const narrow = path.join(dir, 'ramp.yuv'), full = path.join(dir, 'full.yuv'), tiles = path.join(dir, 'tiles.yuv');
  writeRaw10(narrow, W, H, (x) => LO + (x >> 2));
  writeRaw10(full, W, H, (x) => x);
  writeRaw10(tiles, 64, 16, (x) => 400 + (x >> 4));
  const idealN = idealOf('narrow'), idealF = idealOf('full');

  // control: 10 bit to 10 bit
  const ctl = path.join(dir, 'ctl.raw');
  convert(narrow, W, H, 'format=yuv420p10le', 'yuv420p10le', ctl);
  { const b = fs.readFileSync(ctl); const set = new Set(); let bad = 0;
    for (let r = 0; r < H; r++) for (let x = 0; x < W; x++) { const v = b.readUInt16LE((r * W + x) * 2); set.add(v); if (v !== LO + (x >> 2)) bad++; }
    ev.control = {distinct: set.size, mismatches: bad, md5Node: md5File(ctl), md5Ffmpeg: ffmpegMd5(ctl, W, H, 'yuv420p10le')}; }

  // the 8 spellings on the narrow ramp, yuv420p
  const md5N = {}, md5F = {};
  for (const m of Object.keys(MODES)) {
    const out = path.join(dir, `o_${m}.raw`);
    const vf = vfOf(m, 'yuv420p'); convert(narrow, W, H, vf, 'yuv420p', out);
    const b = fs.readFileSync(out);
    const a = analyze8(b, idealN);
    const fb = ffmpegBlocks(out, W, H, 'yuv420p', dir);
    const nb = blockMeans(b.subarray(0, W * H), W, H);
    md5N[m] = md5File(out); md5F[m] = ffmpegMd5(out, W, H, 'yuv420p');
    ev.modes[m] = {vf, ...a, md5: md5N[m], md5Ffmpeg: md5F[m], blockDiffReaders: maxAbsDiff(nb, fb), blockMaxErrFfmpeg: (() => { let mx = 0; for (let i = 0; i < fb.length; i++) { const bx = i % (W / 2); mx = Math.max(mx, Math.abs(fb[i] - (idealN[bx * 2] + idealN[bx * 2 + 1]) / 2)); } return mx; })()};
  }
  ev.classes = classesOf(md5N); ev.classesFfmpeg = classesOf(md5F);

  // full ramp: 1024 input levels
  for (const m of ['default', 'none', 'ed']) {
    const out = path.join(dir, `f_${m}.raw`); convert(full, W, H, vfOf(m, 'yuv420p'), 'yuv420p', out);
    const a = analyze8(fs.readFileSync(out), idealF);
    ev.full[m] = {distinct: a.distinct, lowest: a.lowest, highest: a.highest, bias: a.bias, maxErr: a.maxErr, blockMaxErr: a.blockMaxErr};
  }

  // rgb8: the known positive, the options do change the bytes
  const m5N = {}, m5F = {};
  for (const m of Object.keys(MODES)) {
    const out = path.join(dir, `r_${m}.raw`); convert(narrow, W, H, vfOf(m, 'rgb8'), 'rgb8', out);
    const b = fs.readFileSync(out);
    m5N[m] = md5File(out); m5F[m] = ffmpegMd5(out, W, H, 'rgb8');
    ev.rgb8[m] = {distinct: new Set(b).size, md5: m5N[m]};
  }
  ev.rgb8Classes = classesOf(m5N); ev.rgb8ClassesFfmpeg = classesOf(m5F);

  // flat tiles: the dither cell
  for (const m of ['default', 'none']) {
    const out = path.join(dir, `t_${m}.raw`);
    convert(tiles, 64, 16, m === 'default' ? 'format=yuv420p' : 'scale=64:16:sws_dither=none,format=yuv420p', 'yuv420p', out);
    const b = fs.readFileSync(out); const res = [];
    for (let t = 0; t < 4; t++) {
      let up = 0, other = 0; const cells = new Set();
      for (let cy = 0; cy < 8; cy++) for (let cx = 0; cx < 8; cx++) {
        const bits = [0, 1].flatMap((dy) => [0, 1].map((dx) => b[(2 * cy + dy) * 64 + t * 16 + 2 * cx + dx])).map((v) => (v === 101 ? 1 : v === 100 ? 0 : 9));
        cells.add(bits.join('')); up += bits.filter((v) => v === 1).length; other += bits.filter((v) => v === 9).length;
      }
      const first = [0, 1].flatMap((dy) => [0, 1].map((dx) => (b[dy * 64 + t * 16 + dx] === 101 ? 1 : 0)));
      res.push({frac: t / 4, upOf256: up, other, cellPatterns: cells.size, cell: first});
    }
    ev.tiles[m] = res;
  }
  return ev;
}
