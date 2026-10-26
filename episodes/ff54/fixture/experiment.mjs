// Episode 54 fixture: "I put -ss before -i in one command and after -i in another, with the same fade filter: where does the fade land?"
// Synthetic source only (lavfi): 6 s, 96x72, 25 fps, a flat card of luma 200 on every frame, lossless x264 (-qp 0) in mkv.
// The cut under test is source second 2 to second 5 (75 frames). The fade is one second long (25 frames), and black is luma 16.
//   ctl           control: -ss 2 -t 3, no fade (75 frames, luma 200 everywhere)
//   beforeIn0     -ss 2 before -i, fade=t=in:st=0:d=1
//   afterIn0      -ss 2 after -i,  fade=t=in:st=0:d=1
//   afterIn2      -ss 2 after -i,  fade=t=in:st=2:d=1
//   beforeIn2     -ss 2 before -i, fade=t=in:st=2:d=1
//   beforeOut2    -ss 2 before -i, fade=t=out:st=2:d=1
//   afterOut2     -ss 2 after -i,  fade=t=out:st=2:d=1
//   afterOut4     -ss 2 after -i,  fade=t=out:st=4:d=1
// Readers (each reads every decoded frame of every output):
//   reader 1  ffmpeg framemd5 (one hash per decoded frame, with -copyts) and ffmpeg signalstats (YAVG, mean luma, printed by the metadata filter)
//   reader 2  raw decoded luma in Node (rawvideo yuv420p, mean of the whole luma plane) and ffprobe packet timestamps
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 96, H = 72, FPS = 25, SRC_SECONDS = 6, FULL = 200, SEEK = 2, CUT = 3, FADE_S = 1;
export const FADE_FRAMES = FADE_S * FPS, CUT_FRAMES = CUT * FPS;
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

// seek: where -ss sits ('before' or 'after' -i), fade: null or [type, st]
export const CASES = {
  ctl: {seek: 'before', fade: null},
  beforeIn0: {seek: 'before', fade: ['in', 0]},
  afterIn0: {seek: 'after', fade: ['in', 0]},
  afterIn2: {seek: 'after', fade: ['in', 2]},
  beforeIn2: {seek: 'before', fade: ['in', 2]},
  beforeOut2: {seek: 'before', fade: ['out', 2]},
  afterOut2: {seek: 'after', fade: ['out', 2]},
  afterOut4: {seek: 'after', fade: ['out', 4]},
};
export const fadeFilter = (f) => `fade=t=${f[0]}:st=${f[1]}:d=${FADE_S}`;
export const commandOf = (name) => {
  const c = CASES[name];
  const ss = `-ss ${SEEK}`;
  const head = c.seek === 'before' ? `ffmpeg ${ss} -i src.mkv -t ${CUT}` : `ffmpeg -i src.mkv ${ss} -t ${CUT}`;
  return `${head}${c.fade ? ` -vf ${fadeFilter(c.fade)}` : ''} out.mkv`;
};

export function makeSource(dir) {
  const file = path.join(dir, 'src.mkv');
  ffm(['-f', 'lavfi', '-i', `color=c=black:s=${W}x${H}:r=${FPS}:d=${SRC_SECONDS},format=yuv420p,geq=lum=${FULL}:cb=128:cr=128`,
    '-c:v', 'libx264', '-qp', '0', '-pix_fmt', 'yuv420p', file]);
  return file;
}

export function makeCase(src, dir, name) {
  const c = CASES[name];
  const out = path.join(dir, `${name}.mkv`);
  const args = [];
  if (c.seek === 'before') args.push('-ss', String(SEEK));
  args.push('-i', src);
  if (c.seek === 'after') args.push('-ss', String(SEEK));
  args.push('-t', String(CUT));
  if (c.fade) args.push('-vf', fadeFilter(c.fade));
  args.push('-c:v', 'libx264', '-qp', '0', '-pix_fmt', 'yuv420p', out);
  ffm(args);
  return out;
}

// ---- readers ----
// reader 2a: raw decoded luma of every frame, mean of the whole luma plane, plus the spread inside the frame (max minus min), to prove the frames are flat cards
export function rawLuma(file) {
  const r = ffm(['-i', file, '-an', '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-'], {});
  const buf = r.stdout, fsz = W * H * 3 / 2, n = Math.floor(buf.length / fsz);
  if (n * fsz !== buf.length) throw new Error(`unexpected raw size ${buf.length}`);
  const mean = [], spread = [];
  for (let i = 0; i < n; i++) {
    let s = 0, lo = 255, hi = 0;
    for (let k = 0; k < W * H; k++) { const v = buf[i * fsz + k]; s += v; if (v < lo) lo = v; if (v > hi) hi = v; }
    mean.push(s / (W * H)); spread.push(hi - lo);
  }
  return {mean, spread};
}
// reader 1a: framemd5 with -copyts: one hash and one timestamp (seconds) per decoded frame
export function framemd5(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-copyts', '-i', file, '-an', '-fps_mode', 'passthrough', '-f', 'framemd5', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`framemd5 failed: ${r.stderr}`);
  let tb = 1; const md5 = [], pts = [];
  for (const l of r.stdout.split(/\r?\n/)) {
    const m = /^#tb\s+0:\s*(\d+)\/(\d+)/.exec(l);
    if (m) { tb = Number(m[1]) / Number(m[2]); continue; }
    if (!l || l.startsWith('#')) continue;
    const c = l.split(',').map((s) => s.trim());
    md5.push(c[c.length - 1]); pts.push(Number(c[2]) * tb);
  }
  return {md5, pts};
}
// reader 1b: ffmpeg's own signalstats filter, printed by the metadata filter (YAVG = mean luma of the frame)
export function signalstatsY(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-an', '-vf', 'signalstats,metadata=mode=print:key=lavfi.signalstats.YAVG:file=-', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`signalstats failed: ${r.stderr}`);
  return r.stdout.split(/\r?\n/).filter((l) => l.startsWith('lavfi.signalstats.YAVG=')).map((l) => Number(l.split('=')[1]));
}
export const videoPacketPts = (file) => probe(['-select_streams', 'v:0', '-show_entries', 'packet=pts_time', '-of', 'csv=p=0', file]).map(Number).sort((a, b) => a - b);

const r2 = (v) => Math.round(v * 100) / 100;
const r3 = (v) => Math.round(v * 1000) / 1000;
export const isFull = (y) => Math.abs(y - FULL) < 0.5;
export const isBlack = (y) => y < 16.5;
const idxs = (xs, pred) => xs.map((x, i) => (pred(x) ? i : -1)).filter((i) => i >= 0);
// runs of equal classes: [{kind, from, to}]
export function runsOf(luma) {
  const kind = (y) => (isFull(y) ? 'full' : isBlack(y) ? 'black' : 'ramp');
  const out = [];
  luma.forEach((y, i) => { const k = kind(y); if (out.length && out[out.length - 1].kind === k) out[out.length - 1].to = i; else out.push({kind: k, from: i, to: i}); });
  return out;
}
export const monotone = (xs, dir) => xs.every((x, i) => !i || (dir > 0 ? x >= xs[i - 1] : x <= xs[i - 1]));

export function measure(file) {
  const fm = framemd5(file);
  const raw = rawLuma(file);
  const ss = signalstatsY(file);
  const pk = videoPacketPts(file);
  const luma = raw.mean.map(r2);
  const notFull = idxs(luma, (y) => !isFull(y));
  const ramp = idxs(luma, (y) => !isFull(y) && !isBlack(y));
  const black = idxs(luma, isBlack);
  const steps = pk.slice(1).map((p, i) => r3(p - pk[i]));
  return {
    frames: raw.mean.length, framesMd5: fm.md5.length, framesStats: ss.length, packets: pk.length,
    luma, lumaStats: ss, md5: fm.md5, flat: raw.spread.every((s) => s === 0),
    uniqueMd5: new Set(fm.md5).size, uniqueLuma: new Set(luma).size,
    notFull: notFull.length, firstNotFull: notFull.length ? notFull[0] : null, lastNotFull: notFull.length ? notFull[notFull.length - 1] : null,
    ramp: ramp.length, black: black.length, runs: runsOf(luma),
    minLuma: Math.min(...luma), maxLuma: Math.max(...luma), lastLuma: luma[luma.length - 1],
    firstPtsProbe: r3(pk[0]), firstPtsMd5: r3(fm.pts[0]), lastPtsProbe: r3(pk[pk.length - 1]),
    stepMin: Math.min(...steps), stepMax: Math.max(...steps),
  };
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const src = makeSource(dir);
  const sm = rawLuma(src);
  const ev = {
    ffmpeg: ffmpegVersion(),
    source: {frames: sm.mean.length, allFull: sm.mean.every(isFull), flat: sm.spread.every((s) => s === 0), seconds: sm.mean.length / FPS},
    cut: {seek: SEEK, seconds: CUT, frames: CUT_FRAMES, fadeFrames: FADE_FRAMES},
    runs: {},
  };
  for (const name of Object.keys(CASES)) {
    const f = makeCase(src, dir, name);
    ev.runs[name] = {name, command: commandOf(name), ...measure(f)};
  }
  return ev;
}
