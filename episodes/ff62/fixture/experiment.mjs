// Episode 62 fixture: "zoompan zooms in slowly, so where does the wobble come from?"
// Synthetic input only: a 960x540 test card from lavfi (grey ground, a fine 8 pixel grid of 1 pixel lines, three pairs of white 9x9 markers), one frame.
// zoompan renders 120 frames of the common recipe z='min(zoom+STEP,1.5)' centred on the picture. A marker sitting still at the centre of a centred zoom should move
// only as far as the ideal zoom moves it, which is smoothly. The fixture measures where each marker really is in every decoded frame and compares it with the ideal path.
// 3 speeds (STEP 0.0005, 0.0015, 0.004) x 5 ways of feeding zoompan (as is in yuv420p, format=yuv444p first, scale 2x, 4x, 8x first) = 15 runs of 120 frames.
// Readers (both in Node, on the Y plane of the decoded frames):
//   reader 1  centroid of the white pixels of the first marker of each pair (weights = luma above the grid level)
//   reader 2  half level edge crossings (left, right, top, bottom, linear interpolation) of the second marker of each pair, 32 pixels away
// Controls: a known sub pixel pan made without zoompan (readers must find it), a known +-1 pixel jitter made with crop (the metric must report it),
//           zoompan with no zoom and with a fixed zoom of 1.25 (the filter itself adds nothing when the zoom does not change).
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 960, H = 540, N = 120, NC = 60, OFF = 32;
export const MARKS = [['A', 240, 136], ['B', 720, 408], ['C', 480, 272]];
export const SPEEDS = [0.0005, 0.0015, 0.004];
export const RECIPE = 0.0015;
export const METHODS = [
  {id: 'd420', label: 'as is, yuv420p', pre: '', k: 1, even: true},
  {id: 'd444', label: 'format=yuv444p first', pre: 'format=yuv444p,', k: 1, even: false},
  {id: 'u2', label: 'scale 2x first', pre: 'scale=iw*2:ih*2,', k: 2, even: true},
  {id: 'u4', label: 'scale 4x first', pre: 'scale=iw*4:ih*4,', k: 4, even: true},
  {id: 'u8', label: 'scale 8x first', pre: 'scale=iw*8:ih*8,', k: 8, even: true},
];
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
export const runId = (m, s) => `${m}@${s}`;

/** the zoom value of every frame, accumulated the way the recipe z='min(zoom+STEP,1.5)' accumulates it (zoom starts at 1, so the first frame is already 1+STEP). */
export function zoomSeq(step, n = N) { const out = []; let z = 1; for (let i = 0; i < n; i++) { z = Math.min(z + step, 1.5); out.push(z); } return out; }

/** the integer lens: the crop window zoompan really takes from an input k times the card (origin rounded down and, in yuv420p, down to an even number; size rounded down). */
export function lensOf(z, k = 1, even = true) {
  const iw = W * k, ih = H * k;
  const xi = iw / 2 - iw / z / 2, yi = ih / 2 - ih / z / 2;
  let X = Math.floor(xi), Y = Math.floor(yi);
  if (even) { X &= ~1; Y &= ~1; }
  return {xIdeal: xi, yIdeal: yi, X, Y, wIdeal: iw / z, hIdeal: ih / z, w: Math.floor(iw / z), h: Math.floor(ih / z)};
}
/** where the integer lens puts a marker whose centre is at (mx+0.5, my+0.5) of the card. */
export function modelPos(mx, my, z, k, even) { const L = lensOf(z, k, even); return [(k * (mx + 0.5) - L.X) * (W / L.w), (k * (my + 0.5) - L.Y) * (H / L.h)]; }
/** where a perfect, continuous zoom puts it. */
export const idealPos = (mx, my, z) => [(mx + 0.5 - W / 2) * z + W / 2, (my + 0.5 - H / 2) * z + H / 2];

const boxes = (extra = 0) => MARKS.map(([, x, y]) => `,drawbox=x=${x - 4}:y=${y - 4}:w=9:h=9:c=white:t=fill,drawbox=x=${x + OFF - 4}:y=${y + OFF - 4}:w=9:h=9:c=white:t=fill`).join('') + (extra ? '' : '');
export const SOURCE = `color=c=0x606060:s=${W}x${H}:r=1:d=1,drawgrid=w=8:h=8:t=1:c=0x8c8c8c${boxes()}`;
const run = (args, opts = {}) => spawnSync('ffmpeg', ['-nostdin', '-y', ...args], {maxBuffer: 1 << 29, timeout: 120000, ...opts});

/** frames of a raw yuv420p stream: the Y plane of frame n starts at n * w * h * 1.5; a gray stream at n * w * h. */
export const frameOf = (buf, w, h, n, bpp = 1.5) => buf.subarray(Math.round(n * w * h * bpp), Math.round(n * w * h * bpp) + w * h);

/** reader 1: centroid of the pixels above thr around (ix, iy). Returns the position in edge coordinates (pixel i covers i to i+1). */
export function centroid(y, w, h, ix, iy, z, thr) {
  const R = Math.ceil(7 * z); let sx = 0, sy = 0, sw = 0;
  for (let j = Math.max(0, Math.round(iy) - R); j <= Math.min(h - 1, Math.round(iy) + R); j++) for (let i = Math.max(0, Math.round(ix) - R); i <= Math.min(w - 1, Math.round(ix) + R); i++) { const v = y[j * w + i] - thr; if (v > 0) { sx += v * i; sy += v * j; sw += v; } }
  return sw ? [sx / sw + 0.5, sy / sw + 0.5] : null;
}
/** reader 2: where a profile (get(i)) crosses `level` going down on either side of c, middle of the two crossings, linear interpolation. */
export function middle(get, c, R, level) {
  const ci = Math.round(c); let l = null, r = null;
  for (let i = ci; i > ci - R; i--) if (get(i - 1) < level && get(i) >= level) { l = (i - 1) + (level - get(i - 1)) / (get(i) - get(i - 1)); break; }
  for (let i = ci; i < ci + R; i++) if (get(i) >= level && get(i + 1) < level) { r = i + (get(i) - level) / (get(i) - get(i + 1)); break; }
  return l === null || r === null ? null : (l + r) / 2 + 0.5;
}
export function edges(y, w, h, ix, iy, z, level) {
  const R = Math.ceil(8 * z), row = Math.round(iy), col = Math.round(ix);
  const x = middle((i) => y[row * w + i], ix, R, level), yy = middle((j) => y[j * w + col], iy, R, level);
  return x === null || yy === null ? null : [x, yy];
}

/** errs: array (markers) of arrays (frames) of [ex, ey]. The error of a frame is measured - ideal. The stutter is the change of that error from one frame to the next. */
export function summarize(errs, limit = 0.5) {
  let ss = 0, steps = 0, stepMax = 0, stutter = 0, stray = 0;
  for (const m of errs) for (let n = 0; n < m.length; n++) {
    stray = Math.max(stray, Math.hypot(m[n][0], m[n][1]));
    if (n) { const d = Math.hypot(m[n][0] - m[n - 1][0], m[n][1] - m[n - 1][1]); ss += d * d; steps++; stepMax = Math.max(stepMax, d); if (d > limit) stutter++; }
  }
  return {stepRms: Math.sqrt(ss / steps), stepMax, stutter, steps, strayMax: stray};
}
const r2 = (v) => Math.round(v * 100) / 100;
const rnd = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'number' ? r2(v) : v]));

function levelsOf() {
  const r = run(['-v', 'error', '-f', 'lavfi', '-i', SOURCE, '-frames:v', '1', '-pix_fmt', 'yuv420p', '-f', 'rawvideo', '-']);
  const y = frameOf(r.stdout, W, H, 0);
  const at = (x, yy) => y[yy * W + x];
  return {bg: at(2, 3), grid: at(8, 3), box: at(240, 136), centreBox: at(480, 272)};
}
function zoompanVf(pre, step, extra = {}) {
  const z = extra.z ?? `min(zoom+${step},1.5)`;
  const x = extra.x ?? 'iw/2-(iw/zoom/2)', y = extra.y ?? 'ih/2-(ih/zoom/2)';
  return `${pre}zoompan=z='${z}':x='${x}':y='${y}':d=${N}:s=${W}x${H}:fps=25`;
}
function formatOf(pre, step) {
  const r = run(['-v', 'info', '-f', 'lavfi', '-i', SOURCE, '-vf', `${zoompanVf(pre, step)},showinfo`, '-frames:v', '1', '-pix_fmt', 'yuv420p', '-f', 'null', '-']);
  return /fmt:(\w+)/.exec(String(r.stderr))?.[1] ?? null;
}

/** read both markers of every pair in every frame, return the errors against an ideal path. idealFn(mx, my, n) -> [x, y] */
function readAll(buf, w, h, bpp, count, zOf, idealFn, lv) {
  const thr = lv.grid + 14, half = (lv.bg + lv.box) / 2;
  const e1 = MARKS.map(() => []), e2 = MARKS.map(() => []), t1 = MARKS.map(() => []);
  for (let n = 0; n < count; n++) {
    const y = frameOf(buf, w, h, n, bpp), z = zOf(n);
    MARKS.forEach(([, mx, my], i) => {
      const q1 = idealFn(mx, my, n), q2 = idealFn(mx + OFF, my + OFF, n);
      const p1 = centroid(y, w, h, q1[0], q1[1], z, thr), p2 = edges(y, w, h, q2[0], q2[1], z, half);
      e1[i].push(p1 ? [p1[0] - q1[0], p1[1] - q1[1]] : [NaN, NaN]); e2[i].push(p2 ? [p2[0] - q2[0], p2[1] - q2[1]] : [NaN, NaN]);
      t1[i].push(p1 ?? [NaN, NaN]);
    });
  }
  return {e1, e2, t1};
}
function agreement(e1, e2) {
  let m = 0; e1.forEach((a, i) => a.forEach((v, n) => { m = Math.max(m, Math.abs(v[0] - e2[i][n][0]), Math.abs(v[1] - e2[i][n][1])); }));
  return m;
}

export function runExperiment() {
  const ev = {ffmpeg: ffmpegVersion(), w: W, h: H, frames: N, speeds: SPEEDS, recipe: RECIPE, levels: levelsOf(), formats: {}, runs: {}, controls: {}, lens: []};
  const lv = ev.levels;
  for (const m of METHODS) ev.formats[m.id] = formatOf(m.pre, RECIPE);
  for (const s of SPEEDS) {
    const zs = zoomSeq(s);
    for (const m of METHODS) {
      const r = run(['-v', 'error', '-f', 'lavfi', '-i', SOURCE, '-vf', zoompanVf(m.pre, s), '-frames:v', String(N), '-pix_fmt', 'yuv420p', '-f', 'rawvideo', '-']);
      const frames = Math.round(r.stdout.length / (W * H * 1.5));
      const {e1, e2, t1} = readAll(r.stdout, W, H, 1.5, frames, (n) => zs[n], (mx, my, n) => idealPos(mx, my, zs[n]), lv);
      const s1 = summarize(e1), s2 = summarize(e2);
      // the integer lens model against reader 1's own positions
      let se = 0, cnt = 0, mx_ = 0;
      MARKS.forEach(([, mx, my], i) => { for (let n = 0; n < frames; n++) { const p = modelPos(mx, my, zs[n], m.k, m.even); const d = Math.hypot(t1[i][n][0] - p[0], t1[i][n][1] - p[1]); se += d * d; cnt++; mx_ = Math.max(mx_, d); } });
      let seN = 0; MARKS.forEach(([, mx, my], i) => { for (let n = 0; n < frames; n++) { const p = modelPos(mx, my, zs[n], m.k, !m.even); const d = Math.hypot(t1[i][n][0] - p[0], t1[i][n][1] - p[1]); seN += d * d; } });
      ev.runs[runId(m.id, s)] = {method: m.id, speed: s, status: r.status, frames, zoomLast: zs[frames - 1] ?? null,
        r1: rnd(s1), r2: rnd(s2), agreeMax: r2(agreement(e1, e2)),
        centre: {r1: rnd(summarize([e1[2]])), err: e1[2].map((v) => [r2(v[0]), r2(v[1])])},
        model: {rms: r2(Math.sqrt(se / cnt)), max: r2(mx_), otherSnapRms: r2(Math.sqrt(seN / cnt))}};
    }
  }

  // control 1: a known sub pixel pan with no zoompan: 4x nearest neighbour, crop at whole upscaled pixels, 4x area scale back: 0.25 px per frame in x, 0.25 px every second frame in y
  {
    const ow = W - 16, oh = H - 16;
    const vf = `format=gray,scale=iw*4:ih*4:flags=neighbor,loop=loop=${NC}:size=1,crop=w=${4 * ow}:h=${4 * oh}:x='n':y='floor(n/2)',scale=${ow}:${oh}:flags=area`;
    const r = run(['-v', 'error', '-f', 'lavfi', '-i', SOURCE, '-vf', vf, '-frames:v', String(NC), '-pix_fmt', 'gray', '-f', 'rawvideo', '-']);
    const frames = Math.round(r.stdout.length / (ow * oh));
    const {e1, e2} = readAll(r.stdout, ow, oh, 1, frames, () => 1, (mx, my, n) => [mx + 0.5 - n * 0.25, my + 0.5 - Math.floor(n / 2) * 0.25], lv);
    ev.controls.pan = {status: r.status, frames, r1: rnd(summarize(e1)), r2: rnd(summarize(e2)), maxErr1: r2(Math.max(...e1.flat().map((v) => Math.hypot(v[0], v[1])))), maxErr2: r2(Math.max(...e2.flat().map((v) => Math.hypot(v[0], v[1]))))};
  }
  // control 2: a known jitter of exactly one pixel, made with crop on gray (no alignment): x alternates 0, 1, 0, 1. The ideal marker does not move.
  {
    const vf = `format=gray,loop=loop=${NC}:size=1,crop=w=${W - 8}:h=${H - 8}:x='mod(n,2)':y=0`;
    const r = run(['-v', 'error', '-f', 'lavfi', '-i', SOURCE, '-vf', vf, '-frames:v', String(NC), '-pix_fmt', 'gray', '-f', 'rawvideo', '-']);
    const frames = Math.round(r.stdout.length / ((W - 8) * (H - 8)));
    const {e1, e2} = readAll(r.stdout, W - 8, H - 8, 1, frames, () => 1, (mx, my) => [mx + 0.5, my + 0.5], lv);
    ev.controls.jitter = {status: r.status, frames, r1: rnd(summarize(e1)), r2: rnd(summarize(e2))};
  }
  // control 3 and 4: zoompan with no zoom at all, and with a fixed zoom of 1.25 (960/1.25 = 768 and 540/1.25 = 432, origin 96 and 54: whole even numbers)
  for (const [id, z] of [['still', 1], ['fixed', 1.25]]) {
    const vf = zoompanVf('', 0, {z: String(z)});
    const r = run(['-v', 'error', '-f', 'lavfi', '-i', SOURCE, '-vf', vf, '-frames:v', String(NC), '-pix_fmt', 'yuv420p', '-f', 'rawvideo', '-']);
    const frames = Math.round(r.stdout.length / (W * H * 1.5));
    const {e1, e2} = readAll(r.stdout, W, H, 1.5, frames, () => z, (mx, my) => idealPos(mx, my, z), lv);
    ev.controls[id] = {status: r.status, frames, z, r1: rnd(summarize(e1)), r2: rnd(summarize(e2)), agreeMax: r2(agreement(e1, e2))};
  }

  // the lens, frame by frame, at the recipe speed (model values; the model is checked against the measured tracks above)
  const zr = zoomSeq(RECIPE);
  for (let n = 0; n < 12; n++) { const L = lensOf(zr[n], 1, true); ev.lens.push({n, z: zr[n], xIdeal: L.xIdeal, X: L.X, wIdeal: L.wIdeal, w: L.w}); }
  return ev;
}
