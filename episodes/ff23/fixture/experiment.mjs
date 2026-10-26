// Episode 23 fixture: "-ss 5 -to 10: how long is the clip?"
// Synthetic source only: a 20 s test pattern (lavfi testsrc2, 25 fps, 500 frames) stored losslessly (FFV1), so every frame has its own md5.
// Every cut is written losslessly too (FFV1), and read back two independent ways:
//   reader 1  ffprobe: frames decoded and container duration
//   reader 2  frame md5: which SOURCE frames the clip holds (first index and last index in the source), by matching md5
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, ffmpegVersion, frameMd5} from '../../../tools/ff.mjs';

const FPS = 25;
export const CASES = {
  to_before_ss:  {command: 'ffmpeg -ss 5 -to 10 -i src.mkv -c:v ffv1 out.mkv',      pre: ['-ss', '5', '-to', '10'],  post: []},
  to_after_ss:   {command: 'ffmpeg -ss 5 -i src.mkv -to 10 -c:v ffv1 out.mkv',      pre: ['-ss', '5'],               post: ['-to', '10']},
  both_after:    {command: 'ffmpeg -i src.mkv -ss 5 -to 10 -c:v ffv1 out.mkv',      pre: [],                         post: ['-ss', '5', '-to', '10']},
  t_after_ss:    {command: 'ffmpeg -ss 5 -i src.mkv -t 5 -c:v ffv1 out.mkv',        pre: ['-ss', '5'],               post: ['-t', '5']},
  to_only_input: {command: 'ffmpeg -to 10 -i src.mkv -c:v ffv1 out.mkv',            pre: ['-to', '10'],              post: []},
};

const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };

export function declared(file) {
  const frames = Number(run('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', file]).trim());
  const seconds = Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).trim());
  return {frames, seconds: Math.round(seconds * 1000) / 1000};
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  ff(['-f', 'lavfi', '-i', `testsrc2=size=320x180:rate=${FPS}:duration=20`, '-c:v', 'ffv1', '-pix_fmt', 'yuv420p', 'src.mkv'], dir);
  const srcMd5 = frameMd5(path.join(dir, 'src.mkv'));
  const out = {ffmpeg: ffmpegVersion(), source: {frames: srcMd5.length, seconds: 20, fps: FPS, uniqueFrames: new Set(srcMd5).size}, runs: {}};
  for (const [name, c] of Object.entries(CASES)) {
    ff([...c.pre, '-i', 'src.mkv', ...c.post, '-c:v', 'ffv1', `${name}.mkv`], dir);
    const f = path.join(dir, `${name}.mkv`);
    const md5 = frameMd5(f);
    const first = srcMd5.indexOf(md5[0]), last = srcMd5.indexOf(md5[md5.length - 1]);
    const contiguous = md5.every((m, i) => srcMd5[first + i] === m);
    out.runs[name] = {command: c.command, declared: declared(f), content: {first, last, firstSeconds: first / FPS, endSeconds: (last + 1) / FPS, contiguous}};
  }
  return out;
}
