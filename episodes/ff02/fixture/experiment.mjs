// Episode 02 fixture: "I encoded PNG frames to MP4 with the simplest command. What did x264 pick?"
// Synthetic source only (ffmpeg's testsrc2 pattern written out as PNG frames). No network, no user media.
import fs from 'node:fs';
import path from 'node:path';
import {run, ffmpegVersion} from '../../../tools/ff.mjs';

export const SRC = {size: '320x180', fps: 25, frames: 50};

const probe = (file) => JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,profile,pix_fmt,width,height,nb_frames,color_range', '-of', 'json', file])).streams[0];

// Mean PSNR of a decoded output against the original PNG frames, both compared as rgb24. Higher means closer.
function psnrAgainstPng(pngPattern, mp4) {
  const err = run2('ffmpeg', ['-v', 'info', '-nostats', '-framerate', String(SRC.fps), '-i', pngPattern, '-i', mp4,
    '-lavfi', '[0:v]format=rgb24[a];[1:v]format=rgb24[b];[a][b]psnr', '-f', 'null', '-']);
  const m = err.match(/PSNR[^\n]*average:([\d.]+|inf)/);
  return m ? (m[1] === 'inf' ? Infinity : +parseFloat(m[1]).toFixed(2)) : null;
}
import {spawnSync} from 'node:child_process';
function run2(cmd, args) {
  const r = spawnSync(cmd, args, {encoding: 'utf8', maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(`${cmd} failed (exit ${r.status}): ${r.stderr}`);
  return r.stderr;
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const pngs = path.join(dir, 'f%03d.png');
  // The RGB source: PNG frames, the way a screen recorder, a game or an image-sequence export hands them over.
  run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `testsrc2=size=${SRC.size}:rate=${SRC.fps}:duration=${SRC.frames / SRC.fps}`, '-start_number', '1', pngs]);
  const png = probe(path.join(dir, 'f001.png'));

  const base = ['-v', 'error', '-y', '-framerate', String(SRC.fps), '-i', pngs, '-c:v', 'libx264', '-crf', '18'];
  const variants = {
    default_rgb_input: [...base],
    pix_fmt_yuv420p: [...base, '-pix_fmt', 'yuv420p'],
    forced_yuv444p: [...base, '-pix_fmt', 'yuv444p'], // known-positive control: asking for 4:4:4 explicitly must give what the default gave
  };
  const out = {};
  for (const [name, args] of Object.entries(variants)) {
    const file = path.join(dir, `${name}.mp4`);
    run('ffmpeg', [...args, file]);
    const p = probe(file);
    out[name] = {
      command: `ffmpeg ${args.slice(2).map((a) => (a === pngs ? 'f%03d.png' : a)).join(' ')} ${name}.mp4`,
      profile: p.profile, pixFmt: p.pix_fmt, frames: Number(p.nb_frames), bytes: fs.statSync(file).size,
      psnrVsOriginal: psnrAgainstPng(pngs, file),
    };
  }

  // Control: a source that is already yuv420p. The surprise is specific to RGB input.
  const yuvSrc = path.join(dir, 'source_yuv420p.mp4');
  run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `testsrc2=size=${SRC.size}:rate=${SRC.fps}:duration=${SRC.frames / SRC.fps}`, '-c:v', 'libx264', '-crf', '0', '-pix_fmt', 'yuv420p', yuvSrc]);
  const ctl = path.join(dir, 'control_yuv420p_input.mp4');
  run('ffmpeg', ['-v', 'error', '-y', '-i', yuvSrc, '-c:v', 'libx264', '-crf', '18', ctl]);
  const c = probe(ctl);
  out.control_yuv420p_input = {command: 'ffmpeg -i source_yuv420p.mp4 -c:v libx264 -crf 18 control_yuv420p_input.mp4', profile: c.profile, pixFmt: c.pix_fmt, frames: Number(c.nb_frames), bytes: fs.statSync(ctl).size};

  return {ffmpeg: ffmpegVersion(), request: {frames: SRC.frames, fps: SRC.fps, size: SRC.size}, source: {pngPixFmt: png.pix_fmt, pngFrames: SRC.frames}, variants: out};
}
