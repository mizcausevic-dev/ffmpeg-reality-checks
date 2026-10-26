// Episode 21 fixture: "Does -g 100 give a keyframe every 100 frames?"
// Synthetic source only: a 10.0 s clip at 25 fps (250 frames), 320x180, three hard cuts of content made by lavfi:
//   0.0 to 3.2 s  smptebars
//   3.2 to 6.8 s  testsrc2
//   6.8 to 10.0 s rgbtestsrc
// Each encode is read back two ways:
//   reader 1  ffprobe packets: the pts_time of every packet flagged as a keyframe
//   reader 2  ffprobe decoded frames: the pts_time of every frame whose picture type is I
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, ffmpegVersion} from '../../../tools/ff.mjs';

export const CUTS = [3.2, 6.8];
export const CASES = {
  g100:          {command: 'ffmpeg -i src.mkv -c:v libx264 -pix_fmt yuv420p -g 100 out.mp4',                                              args: ['-g', '100']},
  g100_nosc:     {command: 'ffmpeg -i src.mkv -c:v libx264 -pix_fmt yuv420p -g 100 -sc_threshold 0 out.mp4',                              args: ['-g', '100', '-sc_threshold', '0']},
  g100_forced:   {command: 'ffmpeg -i src.mkv -c:v libx264 -pix_fmt yuv420p -g 100 -sc_threshold 0 -force_key_frames 3.2,6.8 out.mp4',      args: ['-g', '100', '-sc_threshold', '0', '-force_key_frames', '3.2,6.8']},
  g100_force_2s: {command: 'ffmpeg -i src.mkv -c:v libx264 -pix_fmt yuv420p -g 100 -force_key_frames 2 out.mp4',                            args: ['-g', '100', '-force_key_frames', '2']},
};

const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };
const nums = (out) => out.split(/\r?\n/).map((l) => l.replace(/,$/, '').trim()).filter(Boolean);
const t2 = (x) => Math.round(Number(x) * 100) / 100;

// reader 1: packets flagged K
export function keyPackets(file) {
  return nums(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=pts_time,flags', '-of', 'csv=p=0', file]))
    .map((l) => l.split(',')).filter(([, f]) => f.includes('K')).map(([t]) => t2(t)).sort((a, b) => a - b);
}

// reader 2: decoded frames whose picture type is I
export function iFrames(file) {
  return nums(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'frame=pts_time,pict_type', '-of', 'csv=p=0', file]))
    .map((l) => l.split(',')).filter(([, p]) => p === 'I').map(([t]) => t2(t)).sort((a, b) => a - b);
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  ff(['-f', 'lavfi', '-i', 'smptebars=size=320x180:rate=25:duration=3.2', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=25:duration=3.6', '-f', 'lavfi', '-i', 'rgbtestsrc=size=320x180:rate=25:duration=3.2',
      '-filter_complex', '[0]format=yuv420p[a];[1]format=yuv420p[b];[2]format=yuv420p[c];[a][b][c]concat=n=3:v=1:a=0[o]', '-map', '[o]', '-c:v', 'ffv1', 'src.mkv'], dir);
  const frames = Number(run('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', path.join(dir, 'src.mkv')]).trim());
  const out = {ffmpeg: ffmpegVersion(), source: {frames, seconds: 10, fps: 25, cuts: CUTS}, runs: {}};
  for (const [name, c] of Object.entries(CASES)) {
    ff(['-i', 'src.mkv', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', ...c.args, `${name}.mp4`], dir);
    const f = path.join(dir, `${name}.mp4`);
    out.runs[name] = {command: c.command, keyframes: keyPackets(f), iFrames: iFrames(f)};
  }
  return out;
}
