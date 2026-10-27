// Episode 81 fixture: "What does select='gt(scene,T)' really measure: which cuts, fades, drifts and noisy frames does it select at T = 0.1 to 0.5?"
// Synthetic source only. Raw yuv420p clips of 60 frames, 160 x 90, 25 fps, written byte by byte in Node (no encoder in the way):
//   fade1 (a hard cut)  picture A for frames 0..29, picture B from frame 30
//   fade2 fade4 fade8 fade16 fade32  A, then a linear cross-fade to B over 2, 4, 8, 16, 32 frames starting at frame 30, then B
//   slow     picture A made 2 levels brighter every frame (a slow drift)
//   noise    flat gray 128 for frames 0..29, then flat 128 plus fresh uniform noise (+-40) on every frame
//   flash    A, one frame of B at frame 30, A again
//   double   A, B for frames 20..23, A again (two cuts four frames apart)
//   cutH264 noiseH264   the cut and noise clips after libx264 -crf 23 (a lossy encode in between)
// Readers:
//   reader 1  ffmpeg: select='gte(scene,0)' + metadata=print prints lavfi.scene_score for every frame; select='gt(scene,T)' + metadata=print lists the frames that pass
//   reader 2  Node: mean absolute luma difference between consecutive frames (mafd, in levels), model score = min(mafd, |mafd - previous mafd|) / 100, selected = model score > T
// Control: the slow, flat and identical frames score exactly 0 where nothing changes; frame 0 has no previous frame and scores 0.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 160, H = 90, N = 60, FPS = 25, FS = (W * H * 3) / 2, CUT_AT = 30;
export const FADES = [1, 2, 4, 8, 16, 32];
export const THRESHOLDS = [0, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5];
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, {maxBuffer: 1 << 28, ...opts});
const ffm = (args, opts = {}) => { const r = run('ffmpeg', ['-v', 'error', '-y', ...args], opts); if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${String(r.stderr)}`); return r; };

// ---- pictures ----
export const pictureA = (x, y) => { let v = 40 + Math.round((x * 160) / W); if (x > 20 && x < 60 && y > 20 && y < 50) v = 230; if ((x - 110) ** 2 + (y - 60) ** 2 < 400) v = 20; return v; };
export const pictureB = (x, y) => { let v = 200 - Math.round((y * 150) / H); if (x > 90 && x < 140 && y > 10 && y < 40) v = 30; if ((x - 40) ** 2 + (y - 60) ** 2 < 500) v = 240; return v; };
const mulberry = (s) => () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const picture = (f) => { const b = Buffer.alloc(FS, 128); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) b[j * W + i] = Math.max(0, Math.min(255, f(i, j))); return b; };
export function rawClip(name) {
  const fade = /^fade(\d+)$/.exec(name);
  if (fade) {
    const L = Number(fade[1]);
    return Array.from({length: N}, (_, k) => { const a = k < CUT_AT ? 0 : k >= CUT_AT + L ? 1 : (k - CUT_AT + 1) / L; return picture((x, y) => Math.round(pictureA(x, y) * (1 - a) + pictureB(x, y) * a)); });
  }
  if (name === 'slow') return Array.from({length: N}, (_, k) => picture((x, y) => pictureA(x, y) + 2 * k));
  if (name === 'noise') { const r = mulberry(7); return Array.from({length: N}, (_, k) => picture(() => (k < CUT_AT ? 128 : 128 + Math.round((r() * 2 - 1) * 40)))); }
  if (name === 'flash') return Array.from({length: N}, (_, k) => picture(k === CUT_AT ? pictureB : pictureA));
  if (name === 'double') return Array.from({length: N}, (_, k) => picture(k >= 20 && k < 24 ? pictureB : pictureA));
  throw new Error(`unknown clip ${name}`);
}
export const RAW_CLIPS = ['fade1', 'fade2', 'fade4', 'fade8', 'fade16', 'fade32', 'slow', 'noise', 'flash', 'double'];
export const ENCODED = {cutH264: 'fade1', noiseH264: 'noise'};

// ---- reader 2: Node ----
export function mafdList(frames) {
  const out = [0];
  for (let k = 1; k < frames.length; k++) { let s = 0; const a = frames[k - 1], b = frames[k]; for (let i = 0; i < W * H; i++) s += Math.abs(a[i] - b[i]); out.push(s / (W * H)); }
  return out;
}
export const modelScores = (mafd) => mafd.map((m, k) => (k === 0 ? 0 : Math.min(m, Math.abs(m - mafd[k - 1])) / 100));
export const modelSelect = (scores, T) => scores.map((s, k) => (s > T ? k : -1)).filter((k) => k >= 0);
export function decodeFrames(file) {
  const r = ffm(['-i', file, '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-'], {});
  const b = r.stdout, n = Math.floor(b.length / FS);
  return Array.from({length: n}, (_, k) => b.subarray(k * FS, (k + 1) * FS));
}

// ---- reader 1: ffmpeg ----
const rawIn = (file) => ['-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-s', `${W}x${H}`, '-r', String(FPS), '-i', file];
export function ffScores(inputArgs) {
  const r = run('ffmpeg', ['-v', 'error', ...inputArgs, '-vf', "select='gte(scene,0)',metadata=print:key=lavfi.scene_score:file=-", '-f', 'null', '-'], {encoding: 'utf8'});
  if (r.status !== 0) throw new Error(`score run failed: ${r.stderr}`);
  return String(r.stdout).split(/\r?\n/).filter((l) => l.startsWith('lavfi.scene_score=')).map((l) => Number(l.split('=')[1]));
}
export function ffSelect(inputArgs, expr) {
  const r = run('ffmpeg', ['-v', 'error', ...inputArgs, '-vf', `select='${expr}',metadata=print:key=lavfi.scene_score:file=-`, '-f', 'null', '-'], {encoding: 'utf8'});
  if (r.status !== 0) throw new Error(`select run failed: ${r.stderr}`);
  return String(r.stdout).split(/\r?\n/).filter((l) => /^frame:/.test(l)).map((l) => Math.round(Number(/pts_time:([0-9.]+)/.exec(l)[1]) * FPS));
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const ev = {ffmpeg: ffmpegVersion().split('\n')[0], clips: {}};
  const sources = {};
  for (const name of RAW_CLIPS) {
    const frames = rawClip(name), file = path.join(dir, `${name}.yuv`);
    fs.writeFileSync(file, Buffer.concat(frames));
    sources[name] = {args: rawIn(file), frames};
  }
  for (const [name, from] of Object.entries(ENCODED)) {
    const out = path.join(dir, `${name}.mp4`);
    ffm([...rawIn(path.join(dir, `${from}.yuv`)), '-c:v', 'libx264', '-crf', '23', '-pix_fmt', 'yuv420p', out]);
    sources[name] = {args: ['-i', out], frames: decodeFrames(out)};
  }
  for (const [name, s] of Object.entries(sources)) {
    const mafd = mafdList(s.frames), model = modelScores(mafd), ff = ffScores(s.args);
    const selected = {};
    for (const T of THRESHOLDS) selected[T] = {ffmpeg: ffSelect(s.args, `gt(scene,${T})`), model: modelSelect(model, T)};
    let peak = 0, peakAt = 0; ff.forEach((v, k) => { if (v > peak) { peak = v; peakAt = k; } });
    ev.clips[name] = {frames: s.frames.length, scores: ff, model, mafd, maxDiff: Math.max(...ff.map((v, k) => Math.abs(v - model[k]))), peak, peakAt, selected};
  }
  ev.idiom = ffSelect(sources.fade1.args, 'eq(n,0)+gt(scene,0.4)');
  return ev;
}
