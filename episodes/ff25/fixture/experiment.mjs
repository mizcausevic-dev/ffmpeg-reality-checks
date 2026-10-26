// Episode 25 fixture: "Which frame does -vf fps=1 keep from each second?"
// Synthetic sources only: gray 64x64 clips where frame N has luma value N (lavfi color + geq), stored losslessly (FFV1):
//   25 fps for 5 s (125 frames), 30 fps for 5 s (150 frames), 60 fps for 2 s (120 frames)
// Each output is written losslessly and read back two independent ways:
//   reader 1  frame md5: which SOURCE frame each output frame is, by matching md5
//   reader 2  decoded luma: the Y value of an output pixel IS the source frame number (raw yuv420p bytes)
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion, frameMd5} from '../../../tools/ff.mjs';

const SIZE = 64;
export const SOURCES = {s25: {fps: 25, seconds: 5}, s30: {fps: 30, seconds: 5}, s60: {fps: 60, seconds: 2}};
export const CASES = {
  s25_near:   {src: 's25', command: 'ffmpeg -i src25.mkv -vf fps=1 out.mkv',                  vf: 'fps=1',                          extra: []},
  s25_up:     {src: 's25', command: 'ffmpeg -i src25.mkv -vf fps=1:round=up out.mkv',          vf: 'fps=1:round=up',                 extra: []},
  s25_down:   {src: 's25', command: 'ffmpeg -i src25.mkv -vf fps=1:round=down out.mkv',        vf: 'fps=1:round=down',               extra: []},
  s25_select: {src: 's25', command: "ffmpeg -i src25.mkv -vf select='not(mod(n,25))' -fps_mode vfr out.mkv", vf: "select='not(mod(n\\,25))'", extra: ['-fps_mode', 'vfr']},
  s30_near:   {src: 's30', command: 'ffmpeg -i src30.mkv -vf fps=1 out.mkv',                  vf: 'fps=1',                          extra: []},
  s30_up:     {src: 's30', command: 'ffmpeg -i src30.mkv -vf fps=1:round=up out.mkv',          vf: 'fps=1:round=up',                 extra: []},
  s60_to_24:  {src: 's60', command: 'ffmpeg -i src60.mkv -vf fps=24 out.mkv',                  vf: 'fps=24',                         extra: []},
};

const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };

// reader 2: raw yuv420p, Y byte at a fixed position of every frame
export function lumaCodes(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-'], {maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
  const size = SIZE * SIZE * 3 / 2, n = r.stdout.length / size, out = [];
  for (let i = 0; i < n; i++) out.push(r.stdout[i * size + 100]);
  return out;
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const md5 = {};
  for (const [name, s] of Object.entries(SOURCES)) {
    ff(['-f', 'lavfi', '-i', `color=c=gray:s=${SIZE}x${SIZE}:r=${s.fps}:d=${s.seconds},format=yuv420p,geq=lum='N':cb=128:cr=128`, '-c:v', 'ffv1', `src${name.slice(1)}.mkv`], dir);
    md5[name] = frameMd5(path.join(dir, `src${name.slice(1)}.mkv`));
  }
  const out = {ffmpeg: ffmpegVersion(), sources: Object.fromEntries(Object.entries(SOURCES).map(([k, s]) => [k, {...s, frames: md5[k].length, unique: new Set(md5[k]).size}])), runs: {}};
  for (const [name, c] of Object.entries(CASES)) {
    ff(['-i', `src${c.src.slice(1)}.mkv`, '-vf', c.vf, ...c.extra, '-c:v', 'ffv1', `${name}.mkv`], dir);
    const f = path.join(dir, `${name}.mkv`);
    const byMd5 = frameMd5(f).map((m) => md5[c.src].indexOf(m));
    const byLuma = lumaCodes(f);
    out.runs[name] = {command: c.command, src: c.src, fps: SOURCES[c.src].fps, byMd5, byLuma};
  }
  return out;
}
