// Episode 38 fixture: "My video is stretched or squished after scaling: what are SAR and DAR, and what does setsar do?"
// Synthetic sources only (lavfi). Two test cards, white shape on black, drawn with geq:
//   anamorphic card  720x576 stored pixels, SAR 64:45 (DAR 16:9). The shape is an ellipse 270 x 384 pixels, so that it is a round circle (384 x 384) once the pixels are widened by SAR.
//   square card      640x360 stored pixels, SAR 1:1. The shape is a round circle 200 x 200 pixels (the known-positive control).
// Every output is read three independent ways:
//   reader 1  ffprobe: width, height, sample_aspect_ratio, display_aspect_ratio
//   reader 2  raw pixels: decode the first frame to gray and measure the white shape's bounding box (width and height in stored pixels)
//   reader 3  the container: the mp4 'pasp' box (hSpacing:vSpacing), parsed in Node from the bytes of the file (a missing box means 1:1)
// Ratios are compared by cross-multiplication, never by string equality. Lossless x264 (-qp 0) so that pixel hashes can be compared.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {run, ffmpegVersion} from '../../../tools/ff.mjs';

const shape = (rx, ry) => `color=c=black:s=@SIZE@:r=5:d=0.4,format=yuv420p,geq=lum='if(lt(hypot((X-W/2)/${rx},(Y-H/2)/${ry}),1),235,16)':cb=128:cr=128`;
export const SOURCES = {
  anam:   {file: 'anam.mp4', size: '720x576', graph: shape(135, 192).replace('@SIZE@', '720x576'), sar: '64/45', note: 'anamorphic card 720x576, SAR 64:45'},
  square: {file: 'square.mp4', size: '640x360', graph: shape(100, 100).replace('@SIZE@', '640x360'), sar: '1/1', note: 'square-pixel card 640x360, SAR 1:1'},
};
export const CASES = {
  anamSrc:  {src: 'anam',   command: 'ffmpeg -i anam.mp4 out.mp4',                                              vf: null},
  scale:    {src: 'anam',   command: 'ffmpeg -i anam.mp4 -vf scale=1280:720 out.mp4',                           vf: 'scale=1280:720'},
  setsar:   {src: 'anam',   command: 'ffmpeg -i anam.mp4 -vf setsar=1 out.mp4',                                 vf: 'setsar=1'},
  bake:     {src: 'anam',   command: 'ffmpeg -i anam.mp4 -vf scale=iw*sar:ih,setsar=1 out.mp4',                 vf: 'scale=iw*sar:ih,setsar=1'},
  bakeOnly: {src: 'anam',   command: 'ffmpeg -i anam.mp4 -vf scale=iw*sar:ih out.mp4',                          vf: 'scale=iw*sar:ih'},
  sOpt:     {src: 'anam',   command: 'ffmpeg -i anam.mp4 -s 1280x720 out.mp4',                                 vf: null, extra: ['-s', '1280x720']},
  wrong:    {src: 'anam',   command: 'ffmpeg -i anam.mp4 -vf setsar=1,scale=1280:720 out.mp4',                  vf: 'setsar=1,scale=1280:720'},
  sqSrc:    {src: 'square', command: 'ffmpeg -i square.mp4 out.mp4',                                            vf: null},
  sqSame:   {src: 'square', command: 'ffmpeg -i square.mp4 -vf scale=1280:720 out.mp4',                         vf: 'scale=1280:720'},
  sqTall:   {src: 'square', command: 'ffmpeg -i square.mp4 -vf scale=640:720 out.mp4',                          vf: 'scale=640:720'},
};

const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };
const enc = ['-c:v', 'libx264', '-qp', '0', '-pix_fmt', 'yuv420p'];

// "a:b" or "a/b" -> {n, d}; anything else (N/A, 0:1, 0:0, empty) -> null, meaning "not set"
export function parseRatio(s) {
  const m = String(s ?? '').trim().match(/^(\d+)\s*[:/]\s*(\d+)$/);
  if (!m || Number(m[1]) === 0 || Number(m[2]) === 0) return null;
  return {n: Number(m[1]), d: Number(m[2])};
}
// ratio equality by cross-multiplication; null (not set) counts as 1:1
export const asRatio = (r) => r ?? {n: 1, d: 1};
export const sameRatio = (a, b) => { a = asRatio(a); b = asRatio(b); return a.n * b.d === b.n * a.d; };
export const ratioValue = (r) => { r = asRatio(r); return r.n / r.d; };

// reader 1: ffprobe, read defensively (every field may be missing)
export function probe(file) {
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,sample_aspect_ratio,display_aspect_ratio', '-of', 'json', file]));
  const s = (j.streams ?? [])[0] ?? {};
  const sar = parseRatio(s.sample_aspect_ratio), dar = parseRatio(s.display_aspect_ratio);
  return {width: Number(s.width), height: Number(s.height), sarText: s.sample_aspect_ratio ?? null, darText: s.display_aspect_ratio ?? null, sar, dar};
}

// reader 3: the mp4 'pasp' box (size 16, 'pasp', hSpacing u32, vSpacing u32). Absent box = 1:1 by the spec.
export function readPasp(file) {
  const b = fs.readFileSync(file);
  let from = 0, found = [];
  for (;;) {
    const i = b.indexOf('pasp', from, 'latin1');
    if (i < 0) break;
    if (i >= 4 && b.readUInt32BE(i - 4) === 16) found.push({n: b.readUInt32BE(i + 4), d: b.readUInt32BE(i + 8)});
    from = i + 4;
  }
  return found.length ? {present: true, n: found[0].n, d: found[0].d, boxes: found.length} : {present: false, n: 1, d: 1, boxes: 0};
}

// reader 2: decode the first frame as 8 bit gray and measure the white shape (luma above 125) as a bounding box
export function measureShape(file, width, height) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-an', '-'], {maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
  const px = r.stdout;
  if (px.length !== width * height) throw new Error(`unexpected raw size ${px.length} for ${width}x${height}`);
  let x0 = width, x1 = -1, y0 = height, y1 = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (px[y * width + x] > 125) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return {w: x1 - x0 + 1, h: y1 - y0 + 1, md5: crypto.createHash('md5').update(px).digest('hex')};
}

export function readOutput(file) {
  const p = probe(file);
  const pixels = measureShape(file, p.width, p.height);
  const pasp = readPasp(file);
  const sar = p.sar ?? {n: 1, d: 1};
  const shownW = p.width * sar.n / sar.d; // displayed width of the whole picture if a player honors SAR
  return {
    probe: p, pasp, pixels,
    shapeRatioPixels: Math.round(pixels.w / pixels.h * 1000) / 1000,                           // stored pixels: width / height of the shape
    shown: {width: Math.round(shownW * 10) / 10, height: p.height, dar: Math.round(shownW / p.height * 1000) / 1000,
            shapeW: Math.round(pixels.w * sar.n / sar.d * 10) / 10, shapeRatio: Math.round((pixels.w * sar.n / sar.d) / pixels.h * 1000) / 1000},
  };
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const out = {ffmpeg: ffmpegVersion(), sources: {}, runs: {}};
  for (const [k, s] of Object.entries(SOURCES)) {
    ff(['-f', 'lavfi', '-i', s.graph, '-vf', `setsar=${s.sar}`, ...enc, s.file], dir);
    out.sources[k] = {note: s.note};
  }
  for (const [name, c] of Object.entries(CASES)) {
    const vf = c.vf ? ['-vf', c.vf] : [];
    ff(['-i', SOURCES[c.src].file, ...vf, ...(c.extra ?? []), ...enc, `${name}.mp4`], dir);
    out.runs[name] = {command: c.command, src: c.src, ...readOutput(path.join(dir, `${name}.mp4`))};
  }
  return out;
}
