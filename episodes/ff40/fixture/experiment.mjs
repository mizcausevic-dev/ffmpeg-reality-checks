// Episode 40 fixture: "I cropped with crop=w:h:x:y at an odd offset: is the picture really where I asked? (yuv420p chroma and crop)"
// Synthetic sources only (lavfi color + geq, one frame each), stored losslessly (FFV1) in Matroska.
// Two coded cards of 192x108, so that every pixel position can be identified:
//   x card   luma = column (X), Cb = chroma column, Cr = chroma row
//   y card   luma = row (Y),    Cb = chroma column, Cr = chroma row
// The same crop is run on both cards. Every output is read back two independent ways:
//   reader 1  ffprobe width, height, pix_fmt
//   reader 2  decoded raw planes read in Node: the first luma column and row the crop kept (read off the coded luma values),
//             the first chroma column and row (read off the coded chroma values), and whether the coded values keep counting up by one
// plus a third check on the pixels: the framemd5 of the decoded file, to compare one crop with another.
// Control: the same crops in yuv444p (no chroma subsampling), and an even offset in yuv420p.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, ffmpegVersion} from '../../../tools/ff.mjs';

export const SRC = {w: 192, h: 108};
// name: crop filter, pixel format, note. The command shown on screen is the filter only.
export const CASES = {
  evenRef:   {vf: 'crop=96:54:4:6',               pix: 'yuv420p', note: 'even offset, 4:2:0 (control)'},
  odd:       {vf: 'crop=96:54:3:5',               pix: 'yuv420p', note: 'odd offset, default'},
  oddRef:    {vf: 'crop=96:54:2:4',               pix: 'yuv420p', note: 'the even offset below (3,5)'},
  oddExact0: {vf: 'crop=96:54:3:5:exact=0',       pix: 'yuv420p', note: 'odd offset, exact=0 written out'},
  oddExact1: {vf: 'crop=96:54:3:5:exact=1',       pix: 'yuv420p', note: 'odd offset, exact=1'},
  one:       {vf: 'crop=96:54:1:1',               pix: 'yuv420p', note: 'offset 1,1 default'},
  zeroRef:   {vf: 'crop=96:54:0:0',               pix: 'yuv420p', note: 'offset 0,0'},
  oddSize:   {vf: 'crop=95:53:3:5',               pix: 'yuv420p', note: 'odd size and odd offset, default'},
  oddSizeE1: {vf: 'crop=95:53:3:5:exact=1',       pix: 'yuv420p', note: 'odd size and odd offset, exact=1'},
  center:    {vf: 'crop=90:50',                   pix: 'yuv420p', note: 'centered, the expression gives x=51 y=29'},
  centerE1:  {vf: 'crop=90:50:exact=1',           pix: 'yuv420p', note: 'centered, exact=1'},
  odd444:    {vf: 'crop=96:54:3:5',               pix: 'yuv444p', note: 'odd offset, 4:4:4 (control)'},
  odd444E1:  {vf: 'crop=96:54:3:5:exact=1',       pix: 'yuv444p', note: 'odd offset, 4:4:4, exact=1'},
  size444:   {vf: 'crop=95:53:3:5',               pix: 'yuv444p', note: 'odd size and odd offset, 4:4:4'},
  odd422:    {vf: 'crop=96:54:3:5',               pix: 'yuv422p', note: 'odd offset, 4:2:2'},
  odd422E1:  {vf: 'crop=96:54:3:5:exact=1',       pix: 'yuv422p', note: 'odd offset, 4:2:2, exact=1'},
};
// chroma subsampling factors (horizontal, vertical)
export const SUB = {yuv420p: [2, 2], yuv422p: [2, 1], yuv444p: [1, 1]};

const ff = (args) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };
const geq = {x: "geq=lum='X':cb='X':cr='Y'", y: "geq=lum='Y':cb='X':cr='Y'"};
const srcArg = (card, pix) => `color=c=black:s=${SRC.w}x${SRC.h}:r=25:d=0.04,format=${pix},${geq[card]},format=${pix}`;
const encode = (card, c, file) => ff(['-f', 'lavfi', '-i', srcArg(card, c.pix), '-vf', c.vf, '-frames:v', '1', '-c:v', 'ffv1', '-pix_fmt', c.pix, file]);

// reader 1: ffprobe, defensive about missing fields
export function probeSize(file) {
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,pix_fmt', '-of', 'json', file]));
  const s = (j.streams ?? [])[0] ?? {};
  return {width: Number(s.width), height: Number(s.height), pix_fmt: s.pix_fmt};
}

// reader 2: raw planes of the first frame
export function readPlanes(file, width, height, pix) {
  const [sx, sy] = SUB[pix];
  const cw = Math.ceil(width / sx), ch = Math.ceil(height / sy);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', pix, '-'], {maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
  if (r.stdout.length !== width * height + 2 * cw * ch) throw new Error(`raw size ${r.stdout.length} does not match ${width}x${height} ${pix}`);
  const b = r.stdout;
  return {width, height, cw, ch, Y: b.subarray(0, width * height), Cb: b.subarray(width * height, width * height + cw * ch), Cr: b.subarray(width * height + cw * ch)};
}
// do the coded values count up by one along the row (or the column)? Then nothing was scaled or moved inside the output.
const counts = (get, n, start) => { for (let i = 0; i < n; i++) if (get(i) !== ((start + i) & 255)) return false; return true; };

const md5 = (file) => run('ffmpeg', ['-v', 'error', '-i', file, '-f', 'framemd5', '-an', '-'])
  .split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim()).join('+');

export function readCase(dir, name) {
  const c = CASES[name], fx = path.join(dir, `${name}-x.mkv`), fy = path.join(dir, `${name}-y.mkv`);
  encode('x', c, fx); encode('y', c, fy);
  const px = probeSize(fx), py = probeSize(fy);
  const X = readPlanes(fx, px.width, px.height, c.pix), Yp = readPlanes(fy, py.width, py.height, c.pix);
  const [sx, sy] = SUB[c.pix];
  const startX = X.Y[0], startY = Yp.Y[0];               // source column and row of the first luma sample kept
  const cbStart = X.Cb[0], crStart = X.Cr[0];            // source chroma column and chroma row of the first chroma sample kept
  return {
    vf: c.vf, pix: c.pix, note: c.note, command: `ffmpeg -i in.mkv -vf ${c.vf} out.mkv`,
    probed: px, probedY: {width: py.width, height: py.height},
    startX, startY, chromaStartCol: cbStart, chromaStartRow: crStart,
    // where the first chroma sample sits relative to the first luma pixel, in luma pixels (0 = aligned)
    chromaShiftX: startX - sx * cbStart, chromaShiftY: startY - sy * crStart,
    lastX: X.Y[px.width - 1], lastY: Yp.Y[(py.height - 1) * py.width],
    lumaCounts: counts((i) => X.Y[i], px.width, startX) && counts((i) => Yp.Y[i * py.width], py.height, startY),
    chromaCounts: counts((i) => X.Cb[i], X.cw, cbStart) && counts((i) => X.Cr[i * X.cw], X.ch, crStart),
    md5: md5(fx) + '/' + md5(fy),
  };
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const out = {ffmpeg: ffmpegVersion(), source: SRC, cases: {}};
  for (const name of Object.keys(CASES)) out.cases[name] = readCase(dir, name);
  return out;
}
