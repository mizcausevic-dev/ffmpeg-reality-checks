// Episode 22 fixture: "What does yuv420p do to a 1-pixel red line?"
// Synthetic sources only: a 320x180 blue picture (0,0,255) with ONE red line (255,0,0), one pixel wide:
//   vline   vertical line at x=100
//   hline   horizontal line at y=90
// Each is encoded with libx264 -crf 0 (lossless in YUV, so only the chroma subsampling can change anything) as yuv444p, yuv422p and yuv420p.
// Each file is read back two independent ways:
//   reader 1  decode to rgb24 and read the pixel values across the line (JS)
//   reader 2  ffmpeg signalstats on a 1x1 crop at the line: the U and V chroma values
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, ffmpegVersion} from '../../../tools/ff.mjs';

const W = 320, H = 180, VX = 100, HY = 90;
export const FORMATS = ['yuv444p', 'yuv422p', 'yuv420p'];
export const SOURCES = {
  vline: {draw: `drawbox=x=${VX}:y=0:w=1:h=${H}:color=0xff0000:t=fill`, across: 'x', at: VX, probe: [VX, 90]},
  hline: {draw: `drawbox=x=0:y=${HY}:w=${W}:h=1:color=0xff0000:t=fill`, across: 'y', at: HY, probe: [150, HY]},
};

const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };

// reader 1: rgb24 values at offsets -2..+2 across the line, measured on a row (vline) or column (hline) away from the edges
export function rgbAcross(file, src) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-frames:v', '1', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'], {maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
  const b = r.stdout, s = SOURCES[src], out = {};
  for (let d = -2; d <= 2; d++) {
    const [x, y] = s.across === 'x' ? [s.at + d, 90] : [150, s.at + d];
    const o = (y * W + x) * 3; out[d] = [b[o], b[o + 1], b[o + 2]];
  }
  return out;
}

// reader 2: signalstats on a 1x1 crop at the line (after format=yuv444p so the crop is one real pixel)
export function chromaAt(file, src) {
  const [x, y] = SOURCES[src].probe;
  const r = spawnSync('ffmpeg', ['-hide_banner', '-v', 'info', '-i', file, '-vf', `format=yuv444p,crop=1:1:${x}:${y},signalstats,metadata=print:file=-`, '-frames:v', '1', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  const text = r.stdout + r.stderr;
  const get = (k) => Number((text.match(new RegExp(`lavfi.signalstats.${k}=([0-9.]+)`)) ?? [])[1]);
  return {y: get('YAVG'), u: get('UAVG'), v: get('VAVG')};
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const out = {ffmpeg: ffmpegVersion(), size: `${W}x${H}`, runs: {}};
  for (const [src, s] of Object.entries(SOURCES)) {
    ff(['-f', 'lavfi', '-i', `color=c=0x0000ff:s=${W}x${H}:d=1,format=rgb24,${s.draw}`, '-frames:v', '1', '-update', '1', `${src}.png`], dir);
    for (const pf of FORMATS) {
      const f = `${src}_${pf}.mp4`;
      ff(['-i', `${src}.png`, '-c:v', 'libx264', '-crf', '0', '-pix_fmt', pf, f], dir);
      const p = path.join(dir, f);
      const actual = run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=pix_fmt', '-of', 'csv=p=0', p]).trim();
      out.runs[`${src}_${pf}`] = {source: src, pixFmt: actual, command: `ffmpeg -i ${src}.png -c:v libx264 -crf 0 -pix_fmt ${pf} out.mp4`, rgb: rgbAcross(p, src), chroma: chromaAt(p, src)};
    }
  }
  return out;
}
