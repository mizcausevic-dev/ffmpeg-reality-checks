// Episode 37 fixture: "I scaled to 1920x1080 and padded: why is there a 1 pixel black line, or an odd-size error?"
// Synthetic sources only (lavfi testsrc2, one frame, yuv420p unless a case says yuv444p), stored losslessly (FFV1) in Matroska.
// Every output is read back two independent ways:
//   reader 1  ffprobe width and height (of the output, and of the same graph without pad)
//   reader 2  decoded raw planes read in Node: rows and columns that are all black (Y 16, Cb 128, Cr 128), and a row by row comparison with the same graph without pad
// Control: a 4:3 source whose scaled size is even and whose offset is even gives symmetric black bars.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, ffmpegVersion} from '../../../tools/ff.mjs';

const SCALE = 'scale=1920:1080:force_original_aspect_ratio=decrease';
const PSCALE = 'scale=1080:1920:force_original_aspect_ratio=decrease';
const CENTER = (w, h) => `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`;
const L = CENTER(1920, 1080), P = CENTER(1080, 1920);
// name: source size, filter chain, pixel format, and the command shown on screen
export const CASES = {
  ctrl:    {src: '640x480',  vf: `${SCALE},${L}`, pix: 'yuv420p', box: [1920, 1080], note: '4:3 into 1920x1080: even size, even offset'},
  oddH:    {src: '1280x690', vf: `${SCALE},${L}`, pix: 'yuv420p', box: [1920, 1080], note: '1.855:1 into 1920x1080: scaled height odd'},
  oddHfix: {src: '1280x690', vf: `${SCALE}:force_divisible_by=2,${L}`, pix: 'yuv420p', box: [1920, 1080], note: 'same, force_divisible_by=2'},
  oddW:    {src: '1278x720', vf: `${SCALE},${L}`, pix: 'yuv420p', box: [1920, 1080], note: '1.775:1 into 1920x1080: scaled width odd'},
  oddWfix: {src: '1278x720', vf: `${SCALE}:force_divisible_by=2,${L}`, pix: 'yuv420p', box: [1920, 1080], note: 'same, force_divisible_by=2'},
  port:    {src: '640x480',  vf: `${PSCALE},${P}`, pix: 'yuv420p', box: [1080, 1920], note: '4:3 into 1080x1920: even size, odd offset'},
  portOdd: {src: '720x390',  vf: `${PSCALE},${P}`, pix: 'yuv420p', box: [1080, 1920], note: '1.85:1 into 1080x1920: scaled height odd'},
  explicit21: {src: '1280x690', vf: `${SCALE},pad=1920:1080:0:21`, pix: 'yuv420p', box: [1920, 1080], note: 'explicit y=21'},
  oddH444: {src: '1280x690', vf: `${SCALE},${L}`, pix: 'yuv444p', box: [1920, 1080], note: 'same as oddH in 4:4:4'},
  explicit21_444: {src: '1280x690', vf: `${SCALE},pad=1920:1080:0:21`, pix: 'yuv444p', box: [1920, 1080], note: 'explicit y=21 in 4:4:4'},
  padOdd:  {src: '1278x720', vf: 'pad=1917:1080:0:0', pix: 'yuv420p', box: [1917, 1080], note: 'pad asked for an odd width'},
};

const ff = (args) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };
const srcArg = (c) => `testsrc2=s=${c.src}:r=25:d=0.04,format=${c.pix}`;
const encode = (c, vf, file) => ff(['-f', 'lavfi', '-i', srcArg(c), '-vf', vf, '-frames:v', '1', '-c:v', 'ffv1', file]);

// reader 1: ffprobe, defensive about missing fields
export function probeSize(file) {
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,pix_fmt,sample_aspect_ratio', '-of', 'json', file]));
  const s = (j.streams ?? [])[0] ?? {};
  return {width: Number(s.width), height: Number(s.height), pix_fmt: s.pix_fmt, sar: s.sample_aspect_ratio ?? '1:1'};
}

// reader 2: raw planes of the first frame
export function readPlanes(file, width, height, pix) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', pix, '-'], {maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
  const c444 = pix === 'yuv444p', cw = c444 ? width : Math.ceil(width / 2), ch = c444 ? height : Math.ceil(height / 2);
  if (r.stdout.length !== width * height + 2 * cw * ch) throw new Error(`raw size ${r.stdout.length} does not match ${width}x${height} ${pix}`);
  const b = r.stdout;
  return {width, height, cw, ch, Y: b.subarray(0, width * height), Cb: b.subarray(width * height, width * height + cw * ch), Cr: b.subarray(width * height + cw * ch)};
}
const rowIs = (p, plane, w, y, v) => { for (let x = 0; x < w; x++) if (p[plane][y * w + x] !== v) return false; return true; };
const colIs = (p, plane, w, h, x, v) => { for (let y = 0; y < h; y++) if (p[plane][y * w + x] !== v) return false; return true; };
const blackRow = (p, y) => rowIs(p, 'Y', p.width, y, 16);
const blackCol = (p, x) => colIs(p, 'Y', p.width, p.height, x, 16);
const chromaRowFlat = (p, y) => rowIs(p, 'Cb', p.cw, y, 128) && rowIs(p, 'Cr', p.cw, y, 128);
const chromaColFlat = (p, x) => colIs(p, 'Cb', p.cw, p.ch, x, 128) && colIs(p, 'Cr', p.cw, p.ch, x, 128);
const lead = (n, f) => { let k = 0; while (k < n && f(k)) k++; return k; };
const trail = (n, f) => { let k = 0; while (k < n && f(n - 1 - k)) k++; return k; };

// where the picture starts and ends: black bars in luma pixels, and where chroma stops being flat gray (in chroma samples)
export function bars(p) {
  const top = lead(p.height, (y) => blackRow(p, y)), bottom = trail(p.height, (y) => blackRow(p, y));
  const left = lead(p.width, (x) => blackCol(p, x)), right = trail(p.width, (x) => blackCol(p, x));
  return {
    top, bottom, left, right,
    contentRows: p.height - top - bottom, contentCols: p.width - left - right,
    chromaTop: lead(p.ch, (y) => chromaRowFlat(p, y)), chromaLeft: lead(p.cw, (x) => chromaColFlat(p, x)),
  };
}
// does padded row (top + i) equal row i of the same graph without pad, for every row the pad kept? Same for columns. Also the first row dropped, if any.
export function matchesScaled(pad, bar, scaled) {
  let rows = 0, cols = 0;
  for (let i = 0; i < Math.min(bar.contentRows, scaled.height); i++) {
    let same = true;
    for (let x = 0; x < Math.min(bar.contentCols, scaled.width) && same; x++) same = pad.Y[(bar.top + i) * pad.width + bar.left + x] === scaled.Y[i * scaled.width + x];
    if (!same) break; rows++;
  }
  for (let j = 0; j < Math.min(bar.contentCols, scaled.width); j++) {
    let same = true;
    for (let y = 0; y < Math.min(bar.contentRows, scaled.height) && same; y++) same = pad.Y[(bar.top + y) * pad.width + bar.left + j] === scaled.Y[y * scaled.width + j];
    if (!same) break; cols++;
  }
  return {rows, cols};
}

export function readCase(dir, name) {
  const c = CASES[name], padFile = path.join(dir, `${name}.mkv`), scFile = path.join(dir, `${name}-scaled.mkv`);
  encode(c, c.vf, padFile);
  const noPad = c.vf.split(',').filter((s) => !s.startsWith('pad=')).join(',') || 'null';
  const hasPad = noPad !== c.vf;
  const pp = probeSize(padFile);
  const pad = readPlanes(padFile, pp.width, pp.height, c.pix), bar = bars(pad);
  const out = {command: `ffmpeg -f lavfi -i testsrc2=s=${c.src} -vf ${c.vf}`, src: c.src, vf: c.vf, pix: c.pix, note: c.note, box: c.box, probed: pp, bars: bar};
  if (hasPad) {
    encode(c, noPad, scFile);
    const sp = probeSize(scFile), sc = readPlanes(scFile, sp.width, sp.height, c.pix);
    out.scaled = {width: sp.width, height: sp.height, sar: sp.sar, firstRowBlack: blackRow(sc, 0), lastRowBlack: blackRow(sc, sp.height - 1)};
    out.match = matchesScaled(pad, bar, sc);
    if (c.vf.includes('(ow-iw)/2')) out.ask = {x: (c.box[0] - sp.width) / 2, y: (c.box[1] - sp.height) / 2};
  }
  return out;
}

// the libx264 error for an odd size, and the padded graph that avoids it
export function haveEncoder(name) { return new RegExp(`\\b${name}\\b`).test(run('ffmpeg', ['-hide_banner', '-encoders'])); }
export function x264(dir, vf, src = '1280x690') {
  const file = path.join(dir, 'x264.mp4');
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `testsrc2=s=${src}:r=25:d=0.04,format=yuv420p`, '-vf', vf, '-frames:v', '1', '-c:v', 'libx264', '-preset', 'ultrafast', file], {encoding: 'utf8', maxBuffer: 1 << 26});
  const m = /(width|height) not divisible by 2 \((\d+)x(\d+)\)/.exec(r.stderr ?? '');
  return {status: r.status, which: m ? m[1] : null, size: m ? [Number(m[2]), Number(m[3])] : null, wrote: r.status === 0 && fs.existsSync(file) ? probeSize(file) : null};
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const out = {ffmpeg: ffmpegVersion(), cases: {}, x264: null};
  for (const name of Object.keys(CASES)) out.cases[name] = readCase(dir, name);
  if (haveEncoder('libx264')) {
    out.x264 = {
      odd: x264(dir, SCALE),
      oddW: x264(dir, SCALE, '1278x720'),
      fixed: x264(dir, `${SCALE}:force_divisible_by=2`),
      padded: x264(dir, `${SCALE},${L}`),
    };
  }
  return out;
}
