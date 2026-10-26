// Episode 14 fixture: "Why does my FFmpeg GIF look bad, and is palettegen worth it?"
// Synthetic sources only (lavfi), 320x180, 10 fps, 2 seconds: "mandelbrot" (smooth gradients, many colors) and "testsrc2" (flat shapes, few colors).
// Each GIF is decoded back to RGB and compared with its lossless source three ways: PSNR, SSIM, and the number of distinct colors actually used.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const SOURCES = {mandelbrot: 'mandelbrot=size=320x180:rate=10', testsrc2: 'testsrc2=size=320x180:rate=10'};
export const VARIANTS = {
  default:   {command: 'ffmpeg -i in.mkv out.gif',                                                               vf: null},
  palette:   {command: 'ffmpeg -i in.mkv -vf "split[a][b];[a]palettegen[p];[b][p]paletteuse" out.gif',            vf: 'split[a][b];[a]palettegen[p];[b][p]paletteuse'},
  nodither:  {command: 'ffmpeg -i in.mkv -vf "split[a][b];[a]palettegen[p];[b][p]paletteuse=dither=none" out.gif', vf: 'split[a][b];[a]palettegen[p];[b][p]paletteuse=dither=none'},
  four:      {command: 'ffmpeg -i in.mkv -vf "split[a][b];[a]palettegen=max_colors=4:reserve_transparent=0[p];[b][p]paletteuse" out.gif', vf: 'split[a][b];[a]palettegen=max_colors=4:reserve_transparent=0[p];[b][p]paletteuse'},
};

const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };
const metric = (a, b, filter, key, cwd) => {
  const r = spawnSync('ffmpeg', ['-v', 'info', '-i', a, '-i', b, '-lavfi', `[0:v]format=rgb24[x];[1:v]format=rgb24[y];[x][y]${filter}`, '-f', 'null', '-'], {encoding: 'utf8', cwd, maxBuffer: 1 << 26});
  const m = new RegExp(`${key}:(\\S+)`).exec(r.stderr);
  if (!m) throw new Error(`no ${filter} result: ${r.stderr}`);
  return m[1] === 'inf' ? Infinity : Number(m[1]);
};
// every distinct RGB value used anywhere in the decoded clip
function colorsUsed(file, cwd) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], {cwd, maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
  const seen = new Set(); const b = r.stdout;
  for (let i = 0; i + 2 < b.length; i += 3) seen.add((b[i] << 16) | (b[i + 1] << 8) | b[i + 2]);
  return seen.size;
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const out = {ffmpeg: ffmpegVersion(), frames: 20, sources: {}};
  for (const [sname, lavfi] of Object.entries(SOURCES)) {
    ff(['-f', 'lavfi', '-i', lavfi, '-t', '2', '-c:v', 'ffv1', `${sname}.mkv`], dir);
    const s = {sourceColors: colorsUsed(path.join(dir, `${sname}.mkv`), dir), control: {psnr: metric(`${sname}.mkv`, `${sname}.mkv`, 'psnr', 'average', dir)}, variants: {}};
    for (const [vname, v] of Object.entries(VARIANTS)) {
      const gif = `${sname}_${vname}.gif`;
      ff(['-i', `${sname}.mkv`, ...(v.vf ? ['-vf', v.vf] : []), gif], dir);
      s.variants[vname] = {
        command: v.command, bytes: fs.statSync(path.join(dir, gif)).size,
        psnr: metric(gif, `${sname}.mkv`, 'psnr', 'average', dir), ssim: metric(gif, `${sname}.mkv`, 'ssim', 'All', dir), colors: colorsUsed(path.join(dir, gif), dir),
      };
    }
    out.sources[sname] = s;
  }
  return out;
}
