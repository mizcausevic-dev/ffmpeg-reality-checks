// Episode 82 fixture: "What do blackdetect's pix_th, pic_th and d really mean on a fade to black?"
// Synthetic source only. Raw yuv420p clips, 160 x 90, 25 fps, written byte by byte in Node (no encoder in the way, so every luma level is known):
//   fadeOut   25 frames of gray 180, a linear fade of 50 frames from 180 down to 16 (frame 74), 25 frames of black 16, then gray 180 again (125 frames)
//   fadeEnd   the same, but the clip ends inside the black (100 frames)
//   partial   25 frames of gray 180, then six runs of 25 frames in which the top 90, 88, 86, 81, 72, 54 of 90 rows are black (16) and the rest gray 180, then 25 frames of gray (200 frames)
//   levels    runs of 10 flat frames at luma 16, 24, 32, 36, 37, 38, 39, 40, 48, 64, 100 (each between 5 frames of gray 180, 170 frames)
//   fadeX264  fadeOut after libx264 -crf 23 (a lossy encode in between)
// Readers:
//   reader 1  ffmpeg: blackdetect=d=..:pix_th=..:pic_th=.. prints black_start, black_end and black_duration in the log
//   reader 2  Node: decodes the frames to raw luma and counts, per frame, the pixels at or below 16 + 219 * pix_th, calls a frame black when that share reaches pic_th,
//             joins runs of black frames and keeps those at least d seconds long
// Control: the luma Node reads back from the decoded raw clips is the luma it wrote (the ramp is known, frame by frame); flat frames have a black share of exactly 0 or 1.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 160, H = 90, FPS = 25, FS = (W * H * 3) / 2;
export const GRAY = 180, BLACK = 16;
export const FADE_AT = 25, FADE_LEN = 50; // fade frames 25..74, black from frame 75
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, {maxBuffer: 1 << 28, ...opts});
const ffm = (args, opts = {}) => { const r = run('ffmpeg', ['-v', 'error', '-y', ...args], opts); if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${String(r.stderr)}`); return r; };

// ---- frames: the top `rows` rows get `top`, the rest `rest`; chroma stays at 128 ----
const frame = (rows, top, rest) => { const b = Buffer.alloc(FS, 128); b.fill(rest, 0, W * H); b.fill(top, 0, rows * W); return b; };
export const flat = (Y) => frame(0, Y, Y);
export const fadeLuma = (k) => (k < FADE_AT ? GRAY : k >= FADE_AT + FADE_LEN ? BLACK : Math.round(GRAY - ((GRAY - BLACK) * (k - FADE_AT + 1)) / FADE_LEN));
export const LEVELS = [16, 24, 32, 36, 37, 38, 39, 40, 48, 64, 100];
export const PARTIAL_ROWS = [90, 88, 86, 81, 72, 54];
export function rawClip(name) {
  const rep = (f, n) => Array.from({length: n}, () => f);
  if (name === 'fadeOut' || name === 'fadeEnd') {
    const out = Array.from({length: FADE_AT + FADE_LEN + 25}, (_, k) => flat(fadeLuma(k)));
    return name === 'fadeOut' ? out.concat(rep(flat(GRAY), 25)) : out;
  }
  if (name === 'partial') return [...rep(flat(GRAY), 25), ...PARTIAL_ROWS.flatMap((r) => rep(frame(r, BLACK, GRAY), 25)), ...rep(flat(GRAY), 25)];
  if (name === 'levels') return [...LEVELS.flatMap((L) => [...rep(flat(GRAY), 5), ...rep(flat(L), 10)]), ...rep(flat(GRAY), 5)];
  throw new Error(`unknown clip ${name}`);
}
export const RAW_CLIPS = ['fadeOut', 'fadeEnd', 'partial', 'levels'];
export const ENCODED = {fadeX264: 'fadeOut'};

// ---- reader 2: Node ----
export function decodeFrames(inputArgs) {
  const r = ffm([...inputArgs, '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-'], {});
  const b = r.stdout, n = Math.floor(b.length / FS);
  return Array.from({length: n}, (_, k) => b.subarray(k * FS, (k + 1) * FS));
}
export const lumaTh = (pix_th) => Math.floor(16 + 219 * pix_th + 1e-9); // luma at or below this counts as black
export const blackShare = (fr, pix_th) => { const th = lumaTh(pix_th); let n = 0; for (let i = 0; i < W * H; i++) if (fr[i] <= th) n++; return n / (W * H); };
export const meanLuma = (fr) => { let s = 0; for (let i = 0; i < W * H; i++) s += fr[i]; return s / (W * H); };
// runs of black frames -> [{start, end, duration}] in seconds; a run that is still open at the last frame ends at the end of that frame
export function nodeIntervals(frames, {pix_th = 0.1, pic_th = 0.98, d = 2} = {}) {
  const flags = frames.map((f) => blackShare(f, pix_th) >= pic_th);
  const out = [];
  let s = -1;
  for (let k = 0; k <= flags.length; k++) {
    const on = k < flags.length && flags[k];
    if (on && s < 0) s = k;
    if (!on && s >= 0) { out.push({start: s / FPS, end: k / FPS, duration: (k - s) / FPS, open: k === flags.length}); s = -1; }
  }
  return out.filter((i) => i.duration >= d - 1e-9);
}

// ---- reader 1: ffmpeg ----
const rawIn = (file) => ['-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-s', `${W}x${H}`, '-r', String(FPS), '-i', file];
export function ffBlack(inputArgs, {pix_th = 0.1, pic_th = 0.98, d = 2, defaults = false} = {}) {
  const filter = defaults ? 'blackdetect' : `blackdetect=d=${d}:pix_th=${pix_th}:pic_th=${pic_th}`;
  const r = run('ffmpeg', ['-v', 'info', '-nostats', ...inputArgs, '-vf', filter, '-f', 'null', '-'], {encoding: 'utf8'});
  if (r.status !== 0) throw new Error(`blackdetect run failed: ${r.stderr}`);
  const out = [];
  for (const l of String(r.stderr).split(/\r?\n/)) {
    const m = /black_start:(-?[0-9.]+)\s+black_end:(-?[0-9.]+)\s+black_duration:(-?[0-9.]+)/.exec(l);
    if (m) out.push({start: Number(m[1]), end: Number(m[2]), duration: Number(m[3])});
  }
  return out;
}

export const SWEEPS = {
  // d against the black that a fade leaves: pix_th at the default 0.1, d from 0 up to the 2 s default
  fadeOut: [{defaults: true}, ...[0, 0.5, 1, 1.2, 1.5, 2].map((d) => ({pix_th: 0.1, pic_th: 0.98, d})),
    ...[0, 0.05, 0.1, 0.2, 0.3, 0.5].map((pix_th) => ({pix_th, pic_th: 0.98, d: 0.5}))],
  fadeEnd: [{pix_th: 0.1, pic_th: 0.98, d: 0.5}, {pix_th: 0.1, pic_th: 0.98, d: 0}],
  fadeX264: [{pix_th: 0.1, pic_th: 0.98, d: 0.5}, {pix_th: 0.02, pic_th: 0.98, d: 0.5}],
  partial: [0.5, 0.7, 0.85, 0.92, 0.95, 0.97, 0.98, 0.99, 1].map((pic_th) => ({pix_th: 0.1, pic_th, d: 0.5})),
  levels: [0, 0.05, 0.1, 0.15, 0.2, 0.3].map((pix_th) => ({pix_th, pic_th: 0.98, d: 0.2})),
};

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const ev = {ffmpeg: ffmpegVersion().split('\n')[0], clips: {}};
  const sources = {};
  for (const name of RAW_CLIPS) {
    const frames = rawClip(name), file = path.join(dir, `${name}.yuv`);
    fs.writeFileSync(file, Buffer.concat(frames));
    sources[name] = {args: rawIn(file), file, wrote: frames};
  }
  for (const [name, from] of Object.entries(ENCODED)) {
    const out = path.join(dir, `${name}.mp4`);
    ffm([...rawIn(path.join(dir, `${from}.yuv`)), '-c:v', 'libx264', '-crf', '23', '-pix_fmt', 'yuv420p', out]);
    sources[name] = {args: ['-i', out], file: out, wrote: rawClip(from)};
  }
  for (const [name, src] of Object.entries(sources)) {
    const frames = decodeFrames(src.args);
    const luma = frames.map((f) => meanLuma(f));
    const wroteLuma = src.wrote.map((f) => meanLuma(f));
    let lumaDiff = 0;
    for (let k = 0; k < frames.length; k++) lumaDiff = Math.max(lumaDiff, Math.abs(luma[k] - wroteLuma[k]));
    const runs = (SWEEPS[name] ?? []).map((o) => ({opts: o, ffmpeg: ffBlack(src.args, o), node: nodeIntervals(frames, o)}));
    ev.clips[name] = {frames: frames.length, luma, wroteLuma, lumaDiff, runs};
  }
  return ev;
}
