// Episode 13 fixture: "Does FFmpeg rotate my phone video for me?"
// Synthetic source only: a 320x180 test pattern with a display-rotation tag of 90 degrees (counterclockwise) written by -display_rotation, which is how a
// phone says "hold this sideways file upright". The pixels are NOT rotated; only the tag says so. Each command's output is read back two independent ways:
//   reader 1  ffprobe: the stored size and the rotation tag
//   reader 2  what a decoder shows: decode the video (autorotate on, as ffmpeg and most players do), read the first picture's own width and height from its
//             PNG header, and name its orientation by comparing all frames with four reference pictures made from the source pattern, using the PSNR filter.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, ffmpegVersion} from '../../../tools/ff.mjs';

export const COMMANDS = {
  plain:      {command: 'ffmpeg -i in.mp4 -c:v libx264 out.mp4',                              pre: [], post: ['-c:v', 'libx264']},
  noautorot:  {command: 'ffmpeg -noautorotate -i in.mp4 -c:v libx264 out.mp4',                 pre: ['-noautorotate'], post: ['-c:v', 'libx264']},
  copy:       {command: 'ffmpeg -i in.mp4 -c copy out.mp4',                                    pre: [], post: ['-c', 'copy']},
  transpose:  {command: 'ffmpeg -i in.mp4 -vf transpose=1 -c:v libx264 out.mp4',               pre: [], post: ['-vf', 'transpose=1', '-c:v', 'libx264']},
  manual:     {command: 'ffmpeg -noautorotate -i in.mp4 -vf transpose=2 -c:v libx264 out.mp4', pre: ['-noautorotate'], post: ['-vf', 'transpose=2', '-c:v', 'libx264']},
};

const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };

export function stored(file) {
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:stream_side_data=rotation', '-of', 'json', file]));
  const s = j.streams[0];
  const rot = (s.side_data_list ?? []).find((d) => d.rotation !== undefined);
  return {size: `${s.width}x${s.height}`, rotation: rot ? rot.rotation : null};
}

// Four reference pictures made from the untouched source pattern, so a result can be named: how the pattern was recorded, turned upright (90 degrees
// counterclockwise, what the tag asks for), turned upside down (180), or turned the other way (90 clockwise).
export const REFS = {upright: 'transpose=2', recorded: 'null', upsidedown: 'hflip,vflip', clockwise: 'transpose=1'};

// Decode the video (autorotate on, as ffmpeg and most players do). The picture's own size is read from the first frame's PNG header; the orientation is
// the reference whose PSNR against all frames is at least 35 dB (references of a different size are skipped).
export function shown(file, dir) {
  const png = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'png', '-'], {cwd: dir, maxBuffer: 1 << 26});
  if (png.status !== 0) throw new Error(`ffmpeg failed: ${png.stderr}`);
  const size = `${png.stdout.readUInt32BE(16)}x${png.stdout.readUInt32BE(20)}`;
  const psnr = {};
  for (const name of Object.keys(REFS)) {
    if (stored(path.join(dir, `ref_${name}.mkv`)).size !== size) continue;
    const r = spawnSync('ffmpeg', ['-v', 'info', '-i', file, '-i', `ref_${name}.mkv`, '-lavfi', '[0:v][1:v]psnr', '-f', 'null', '-'], {encoding: 'utf8', cwd: dir, maxBuffer: 1 << 26});
    const m = /average:(\S+)/.exec(r.stderr);
    if (m) psnr[name] = m[1] === 'inf' ? Infinity : Number(m[1]);
  }
  const orientation = Object.keys(REFS).find((n) => psnr[n] >= 35) ?? null;
  return {size, orientation, psnr};
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  ff(['-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=25:duration=1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', 'base.mp4'], dir);
  ff(['-display_rotation', '90', '-i', 'base.mp4', '-c', 'copy', 'in.mp4'], dir);
  for (const [name, vf] of Object.entries(REFS)) ff(['-i', 'base.mp4', '-vf', vf, '-c:v', 'ffv1', `ref_${name}.mkv`], dir);
  const read = (f) => ({stored: stored(path.join(dir, f)), shown: shown(path.join(dir, f), dir)});
  const out = {ffmpeg: ffmpegVersion(), controls: {unrotated: read('base.mp4')}, source: read('in.mp4'), runs: {}};
  for (const [name, c] of Object.entries(COMMANDS)) {
    ff([...c.pre, '-i', 'in.mp4', ...c.post, `${name}.mp4`], dir);
    out.runs[name] = {command: c.command, ...read(`${name}.mp4`)};
  }
  return out;
}
