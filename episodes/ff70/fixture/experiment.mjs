// Episode 70 fixture: "rotate by 45 degrees cuts the corners: how big must the output be?"
// Synthetic input only. A test card, 320x240 rgb24: mid gray (128,128,128) with four 24x24 corner markers: red top left, lime top right, blue bottom left, yellow bottom right.
// A second card is plain gray (no markers). Both are written as one frame of lossless ffv1 and rotated with the rotate filter, then decoded to raw rgb24 (or rgba).
// Readers:
//   reader 1  Node, decoded pixels: count the pixels that are not the fill color (the card pixels that survive), the bounding box of those pixels, and per marker the pixels
//             within 40 of the marker color (exact colors with bilinear=0)
//   reader 2  ffmpeg: ffprobe reports the output size; signalstats on the plain gray card gives YAVG, and YAVG / 128 * width * height is the surviving area (fill is black = 0)
// Controls: rotate by 0 keeps all 76800 pixels and all 4 markers. Known positives for the readers: pad by 40/30 px of black adds exactly 43200 black pixels (area readers), and a crop that
// removes 30 px at the left and the right removes all 4 markers (marker reader).
// "big" is a 600x600 output, larger than the 400 px diagonal of the card, so nothing can be cut: it is the reference for what a rotation should keep.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 320, H = 240, M = 24, MARKER_AREA = M * M, BIG = 600, TOL = 40;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
export const MARKERS = [
  {name: 'red', x: 0, y: 0, rgb: [255, 0, 0]},
  {name: 'lime', x: W - M, y: 0, rgb: [0, 255, 0]},
  {name: 'blue', x: 0, y: H - M, rgb: [0, 0, 255]},
  {name: 'yellow', x: W - M, y: H - M, rgb: [255, 255, 0]},
];
export const ANGLES = [15, 30, 45, 60, 90];
export const MODES = {n: 'bilinear=0', b: 'bilinear=1'}; // n: nearest, exact colors; b: the filter default

const ffm = (args, opts = {}) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {maxBuffer: 1 << 28, ...opts});
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${String(r.stderr)}`);
  return r;
};

export function makeCards(dir) {
  const card = path.join(dir, 'card.mkv'), gray = path.join(dir, 'gray.mkv');
  const boxes = MARKERS.map((m) => `drawbox=x=${m.x}:y=${m.y}:w=${M}:h=${M}:color=${m.name}:t=fill`).join(',');
  ffm(['-f', 'lavfi', '-i', `color=c=0x808080:s=${W}x${H}:r=1:d=1,format=rgb24,${boxes}`, '-frames:v', '1', '-c:v', 'ffv1', card]);
  ffm(['-f', 'lavfi', '-i', `color=c=0x808080:s=${W}x${H}:r=1:d=1,format=rgb24`, '-frames:v', '1', '-c:v', 'ffv1', gray]);
  return {card, gray};
}

// the rotate filter text for an angle in degrees, a size and a mode
export const rotateOf = (deg, size, mode, extra = '') => {
  const a = `${deg}*PI/180`;
  const sz = size === 'default' ? '' : size === 'rotw' ? `:ow=rotw(${a}):oh=roth(${a})` : size === 'big' ? `:ow=${BIG}:oh=${BIG}` : typeof size === 'number' ? `:ow=${size}:oh=${size}` : `:ow=${size[0]}:oh=${size[1]}`;
  return `rotate=${a}${sz}:${MODES[mode]}${extra}`;
};

const rawOf = (src, vf, pix = 'rgb24') => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', src, '-vf', vf, '-f', 'rawvideo', '-pix_fmt', pix, '-'], {maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(`ffmpeg ${vf} failed: ${String(r.stderr)}`);
  return r.stdout;
};
// reader 2a: ffprobe reads the size of the written output
export function sizeOf(src, vf, dir) {
  const png = path.join(dir, 'dim.png');
  ffm(['-i', src, '-vf', vf, '-frames:v', '1', '-update', '1', png]);
  const q = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', png], {encoding: 'utf8'});
  const [w, h] = q.stdout.trim().split(',').map(Number);
  return [w, h];
}
// reader 2b: signalstats YAVG on the gray card: surviving area = YAVG / 128 * w * h
export function areaFF(gray, vf, w, h) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', gray, '-vf', `${vf},format=gray,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-`, '-f', 'null', '-'], {encoding: 'utf8'});
  const m = /YAVG=([\d.]+)/.exec(r.stdout);
  if (!m) throw new Error(`no YAVG for ${vf}: ${r.stderr}`);
  return {yavg: parseFloat(m[1]), area: Math.round((parseFloat(m[1]) / 128) * w * h)};
}

// reader 1: Node pixel scan
export function analyse(buf, w, h, fill = [0, 0, 0]) {
  let non = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  const marks = {red: 0, lime: 0, blue: 0, yellow: 0};
  const near = (p, c) => Math.abs(p[0] - c[0]) <= TOL && Math.abs(p[1] - c[1]) <= TOL && Math.abs(p[2] - c[2]) <= TOL;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 3, p = [buf[i], buf[i + 1], buf[i + 2]];
    if (p[0] !== fill[0] || p[1] !== fill[1] || p[2] !== fill[2]) { non++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    for (const m of MARKERS) if (near(p, m.rgb)) marks[m.name]++;
  }
  const bbox = non ? {x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1} : null;
  return {nonfill: non, bbox, touches: bbox ? {left: x0 === 0, top: y0 === 0, right: x1 === w - 1, bottom: y1 === h - 1} : null, markers: marks};
}

export function measureRun(src, gray, dir, vf, {withArea = false} = {}) {
  const [w, h] = sizeOf(src, vf, dir);
  const buf = rawOf(src, vf);
  if (buf.length !== w * h * 3) throw new Error(`raw size ${buf.length} does not match ${w}x${h}`);
  const r = {vf, out: [w, h], ...analyse(buf, w, h)};
  if (withArea) r.ff = areaFF(gray, vf, w, h);
  return r;
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const {card, gray} = makeCards(dir);
  const ev = {ffmpeg: ffmpegVersion(), card: {w: W, h: H, marker: M, markerArea: MARKER_AREA, pixels: W * H}, angles: ANGLES, runs: {}};

  // controls and known positives
  const ident = measureRun(card, gray, dir, rotateOf(0, 'default', 'n'), {withArea: true});
  const pad = measureRun(card, gray, dir, `pad=w=${W + 80}:h=${H + 60}:x=40:y=30:color=black`, {withArea: true});
  const crop = measureRun(card, gray, dir, `crop=w=${W - 60}:h=${H}:x=30:y=0`);
  ev.controls = {identity: ident, pad, crop, padBlack: (W + 80) * (H + 60) - W * H};

  // every angle, three sizes, two modes
  for (const mode of Object.keys(MODES)) for (const deg of ANGLES) {
    const big = measureRun(card, gray, dir, rotateOf(deg, 'big', mode), {withArea: mode === 'n'});
    for (const size of ['default', 'rotw', 'big']) {
      const r = size === 'big' ? big : measureRun(card, gray, dir, rotateOf(deg, size, mode), {withArea: mode === 'n'});
      const key = `${mode}${deg}_${size}`;
      ev.runs[key] = {mode, deg, size, ...r, formula: {w: +(W * Math.abs(Math.cos((deg * Math.PI) / 180)) + H * Math.abs(Math.sin((deg * Math.PI) / 180))).toFixed(3), h: +(W * Math.abs(Math.sin((deg * Math.PI) / 180)) + H * Math.abs(Math.cos((deg * Math.PI) / 180))).toFixed(3)}};
      ev.runs[key].lost = size === 'big' ? 0 : big.nonfill - r.nonfill;
      ev.runs[key].lostMarkers = Object.fromEntries(MARKERS.map((m) => [m.name, Math.max(0, big.markers[m.name] - r.markers[m.name])]));
    }
  }

  // a sweep of square canvases around the size rotw gives at 45 degrees (nearest)
  ev.sweep45 = [];
  const big45 = ev.runs.n45_big;
  for (let n = 388; n <= 400; n++) {
    const r = measureRun(card, gray, dir, rotateOf(45, n, 'n'));
    ev.sweep45.push({n, out: r.out, nonfill: r.nonfill, lost: big45.nonfill - r.nonfill, markers: r.markers});
  }

  // fill colors (default size, 45 degrees, nearest), read as rgba
  const rgba = (src, vf) => { const b = rawOf(src, vf, 'rgba'); const first = Array.from(b.subarray(0, 4)); let count = 0; return {corner: first, bytes: b.length}; };
  ev.fill = {};
  for (const [k, vf] of Object.entries({
    black: 'rotate=45*PI/180:bilinear=0',
    white: 'rotate=45*PI/180:bilinear=0:fillcolor=white',
    orange: 'rotate=45*PI/180:bilinear=0:fillcolor=0xff8000',
    rgba_default: 'format=rgba,rotate=45*PI/180:bilinear=0',
    rgba_none: 'format=rgba,rotate=45*PI/180:bilinear=0:fillcolor=none',
    yuv420p_none: 'format=yuv420p,rotate=45*PI/180:bilinear=0:fillcolor=none',
  })) ev.fill[k] = {vf, ...rgba(card, vf)};
  // the number of pixels of exactly the fill color (white and orange never occur in the card)
  const countColor = (vf, c) => { const b = rawOf(card, vf, 'rgb24'); let n = 0; for (let i = 0; i < b.length; i += 3) if (b[i] === c[0] && b[i + 1] === c[1] && b[i + 2] === c[2]) n++; return n; };
  ev.fill.white.count = countColor(ev.fill.white.vf, [255, 255, 255]);
  ev.fill.orange.count = countColor(ev.fill.orange.vf, [255, 128, 0]);

  // encoding: rotw can return an odd size, x264 with yuv420p refuses it; an even rounding is the fix
  const enc = (vf, out) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', card, '-vf', `${vf},format=yuv420p`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', path.join(dir, out)], {encoding: 'utf8'}); return {vf, status: r.status, stderr: (r.stderr ?? '').split(/\r?\n/).filter(Boolean)}; };
  ev.encode = {odd: enc(rotateOf(30, 'rotw', 'b'), 'odd.mp4')};
  ev.encode.odd.size = sizeOf(card, rotateOf(30, 'rotw', 'b'), dir);
  const evenVf = 'rotate=30*PI/180:ow=ceil(rotw(30*PI/180)/2)*2:oh=ceil(roth(30*PI/180)/2)*2:bilinear=1';
  ev.encode.even = enc(evenVf, 'even.mp4');
  const q = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path.join(dir, 'even.mp4')], {encoding: 'utf8'});
  ev.encode.even.size = q.stdout.trim().split(',').map(Number);
  ev.encode.even.measure = measureRun(card, gray, dir, evenVf);
  return ev;
}
