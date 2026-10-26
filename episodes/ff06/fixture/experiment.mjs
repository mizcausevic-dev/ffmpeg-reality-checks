// Episode 06 fixture: "Two clips look the same. Can I join them with -c copy?"
// Synthetic sources only (ffmpeg testsrc2). Three joins: clips of different sizes with -c copy, clips of the same size with -c copy,
// and the different-size clips again with a re-encode that scales and pads them to one size.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, lines, ffmpegVersion} from '../../../tools/ff.mjs';

export const CLIPS = {a: {size: '320x180', hue: 0}, b: {size: '640x360', hue: 0}, c: {size: '320x180', hue: 60}};
const SECONDS = 2, FPS = 25;

function sh(args, cwd) { // returns status and every line ffmpeg printed on stderr at -v warning
  const r = spawnSync('ffmpeg', ['-v', 'warning', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26});
  return {exit: r.status, stderrLines: lines(r.stderr ?? '')};
}
const probeStream = (file) => JSON.parse(run('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,nb_read_frames:format=duration', '-of', 'json', file]));
// How many decoded frames have each size: the sizes ffprobe finds inside the stream, not the one the header claims.
function frameSizes(file) {
  const out = {};
  for (const l of lines(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'frame=width,height', '-of', 'csv=p=0', file]))) { out[l.replace(',', 'x')] = (out[l.replace(',', 'x')] ?? 0) + 1; }
  return out;
}
const decodeProblems = (file) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 26}); return {exit: r.status, stderrLines: lines(r.stderr ?? '').length}; };

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  for (const [n, c] of Object.entries(CLIPS)) {
    const vf = c.hue ? ['-vf', `hue=h=${c.hue}`] : [];
    run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `testsrc2=size=${c.size}:rate=${FPS}:duration=${SECONDS}`, ...vf, '-c:v', 'libx264', '-crf', '23', '-pix_fmt', 'yuv420p', path.join(dir, `${n}.mp4`)]);
  }
  fs.writeFileSync(path.join(dir, 'mixed.txt'), "file 'a.mp4'\nfile 'b.mp4'\n");
  fs.writeFileSync(path.join(dir, 'same.txt'), "file 'a.mp4'\nfile 'c.mp4'\n");
  const fit = 'scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2,setsar=1';
  const joins = {
    mixed_copy: {command: 'ffmpeg -f concat -i mixed.txt -c copy out.mp4', clips: 'a (320x180) + b (640x360)', args: ['-f', 'concat', '-safe', '0', '-i', 'mixed.txt', '-c', 'copy', 'mixed_copy.mp4']},
    same_copy: {command: 'ffmpeg -f concat -i same.txt -c copy out.mp4', clips: 'a (320x180) + c (320x180)', args: ['-f', 'concat', '-safe', '0', '-i', 'same.txt', '-c', 'copy', 'same_copy.mp4']},
    mixed_reencode: {command: `ffmpeg -f concat -i mixed.txt -vf "${fit}" -c:v libx264 -crf 23 out.mp4`, clips: 'a (320x180) + b (640x360)', args: ['-f', 'concat', '-safe', '0', '-i', 'mixed.txt', '-vf', fit, '-c:v', 'libx264', '-crf', '23', '-pix_fmt', 'yuv420p', 'mixed_reencode.mp4']},
  };
  const out = {ffmpeg: ffmpegVersion(), source: {seconds: SECONDS, fps: FPS, clips: CLIPS}, joins: {}};
  for (const [name, j] of Object.entries(joins)) {
    const r = sh(j.args, dir);
    const file = path.join(dir, `${name}.mp4`);
    const exists = fs.existsSync(file);
    const p = exists ? probeStream(file) : null;
    out.joins[name] = {command: j.command, clips: j.clips, exit: r.exit, stderrLines: r.stderrLines, produced: exists,
      header: p ? `${p.streams[0].width}x${p.streams[0].height}` : null,
      frames: p ? Number(p.streams[0].nb_read_frames) : 0, duration: p ? parseFloat(p.format.duration) : 0,
      frameSizes: exists ? frameSizes(file) : {}, decode: exists ? decodeProblems(file) : null};
  }
  return out;
}
