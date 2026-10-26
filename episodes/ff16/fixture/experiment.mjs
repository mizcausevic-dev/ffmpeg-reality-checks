// Episode 16 fixture: "Does -r mean the same thing before and after -i?"
// Synthetic source only: a 2.0 s test pattern at 30 fps (60 frames), as an MP4 and as a raw H.264 stream with no timestamps.
// Each output is read back two independent ways:
//   reader 1  ffprobe: the file's declared duration and frame rate
//   reader 2  what is really inside: how many packets the container holds, how many frames a full decode produces, and the spacing between packet timestamps
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, ffmpegVersion, packetPts} from '../../../tools/ff.mjs';

export const CASES = {
  after:        {command: 'ffmpeg -i in.mp4 -r 10 out.mp4',                  args: ['-i', 'in.mp4', '-r', '10']},
  fps_filter:   {command: 'ffmpeg -i in.mp4 -vf fps=10 out.mp4',             args: ['-i', 'in.mp4', '-vf', 'fps=10']},
  before:       {command: 'ffmpeg -r 10 -i in.mp4 out.mp4',                  args: ['-r', '10', '-i', 'in.mp4']},
  before_copy:  {command: 'ffmpeg -r 10 -i in.mp4 -c copy out.mp4',          args: ['-r', '10', '-i', 'in.mp4', '-c', 'copy']},
  both:         {command: 'ffmpeg -r 10 -i in.mp4 -r 10 out.mp4',            args: ['-r', '10', '-i', 'in.mp4', '-r', '10']},
  raw_default:  {command: 'ffmpeg -i in.h264 out.mp4',                       args: ['-i', 'in.h264']},
  raw_before:   {command: 'ffmpeg -r 10 -i in.h264 out.mp4',                 args: ['-r', '10', '-i', 'in.h264']},
};

const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };
const round3 = (x) => Math.round(x * 1000) / 1000;
const frac = (s) => { const [a, b] = s.split('/').map(Number); return b ? a / b : a; };

export function read(file) {
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries', 'format=duration:stream=avg_frame_rate', '-of', 'json', file]));
  const frames = Number(run('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', file]).trim());
  const pts = packetPts(file);
  const gaps = pts.slice(1).map((t, i) => t - pts[i]);
  return {
    declared: {duration: round3(Number(j.format.duration)), fps: frac(j.streams[0].avg_frame_rate)},
    inside: {packets: pts.length, framesDecoded: frames, packetGap: round3(gaps.reduce((a, b) => a + b, 0) / gaps.length)},
  };
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  ff(['-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=30:duration=2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', 'in.mp4'], dir);
  ff(['-i', 'in.mp4', '-c', 'copy', '-f', 'h264', 'in.h264'], dir);
  const out = {ffmpeg: ffmpegVersion(), source: {frames: 60, fps: 30, seconds: 2, mp4: read(path.join(dir, 'in.mp4'))}, runs: {}};
  for (const [name, c] of Object.entries(CASES)) {
    ff([...c.args, `${name}.mp4`], dir);
    out.runs[name] = {command: c.command, ...read(path.join(dir, `${name}.mp4`))};
  }
  return out;
}
