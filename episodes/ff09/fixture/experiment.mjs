// Episode 09 fixture: "Why does scale=-1:720 sometimes crash?"
// Synthetic sources only (ffmpeg testsrc2). Six scale + libx264 runs on 10-frame clips. For each: the command, the exit code,
// the size scale produced, the encoder's complaint, and what ended up on disk (read back with ffprobe).
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, lines, ffmpegVersion} from '../../../tools/ff.mjs';

const FRAMES = 10;
// size: source size. vf: the scale filter. pix: pixel format given to the encoder (the default for libx264 from this source is yuv420p).
export const CASES = {
  clean_16x9:   {why: 'control: 1920x1080 to height 720',                          size: '1920x1080', vf: 'scale=-1:720',  pix: 'yuv420p'},
  odd_both:     {why: 'the crash: width and height both come out odd',               size: '1000x562',  vf: 'scale=-1:333',  pix: 'yuv420p'},
  odd_width:    {why: 'width odd, height even (16:9 source to height 240)',          size: '640x360',   vf: 'scale=-1:240',  pix: 'yuv420p'},
  odd_height:   {why: 'width forced even by -2, height still odd',                   size: '1000x562',  vf: 'scale=-2:333',  pix: 'yuv420p'},
  fixed:        {why: 'width forced even by -2, height even',                        size: '1000x562',  vf: 'scale=-2:334',  pix: 'yuv420p'},
  odd_444:      {why: 'same odd size as the crash, but 4:4:4 chroma',                size: '1000x562',  vf: 'scale=-1:333',  pix: 'yuv444p'},
};

function sh(args, cwd) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26});
  return {exit: r.status, stderrLines: lines(r.stderr ?? '')};
}
// size and frame count of what is on disk, or null when no usable video stream was written
function readBack(file) {
  if (!fs.existsSync(file)) return {exists: false, bytes: 0, video: null};
  const bytes = fs.statSync(file).size;
  const r = spawnSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,nb_read_frames', '-of', 'json', file], {encoding: 'utf8'});
  let video = null;
  try { const s = JSON.parse(r.stdout).streams?.[0]; if (s) video = {size: `${s.width}x${s.height}`, frames: Number(s.nb_read_frames)}; } catch { /* unreadable file */ }
  return {exists: true, bytes, video};
}
// the size scale produced, read without encoding: run the filter into the null muxer
function scaledSize(c) {
  const out = run('ffprobe', ['-v', 'error', '-f', 'lavfi', '-i', `testsrc2=size=${c.size}:rate=25:duration=0.04,${c.vf}`, '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x']);
  return lines(out)[0];
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const out = {ffmpeg: ffmpegVersion(), frames: FRAMES, cases: {}};
  for (const [name, c] of Object.entries(CASES)) {
    const file = path.join(dir, `${name}.mp4`);
    if (fs.existsSync(file)) fs.rmSync(file);
    const args = ['-f', 'lavfi', '-i', `testsrc2=size=${c.size}:rate=25:duration=${FRAMES / 25}`, '-vf', c.vf, '-c:v', 'libx264', '-pix_fmt', c.pix, `${name}.mp4`];
    const r = sh(args, dir);
    out.cases[name] = {why: c.why, source: c.size, command: `ffmpeg -i in.mp4 -vf ${c.vf} -c:v libx264 -pix_fmt ${c.pix} out.mp4`, scaleTo: scaledSize(c), exit: r.exit,
      encoderLine: r.stderrLines.find((l) => /not divisible/i.test(l)) ?? null, stderrLines: r.stderrLines, disk: readBack(file)};
  }
  return out;
}
