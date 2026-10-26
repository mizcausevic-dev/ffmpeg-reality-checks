// Episode 61 fixture: "cropdetect says crop 1072 but the picture is 1078 rows: what does round do?"
// Synthetic input only: 1920x1080 yuv420p frames from lavfi, a mid gray picture (luma about 126) inside black bars (luma 16), six frames of 5 fps, nothing else.
// The picture is drawn with known bars (top T, bottom B, left L, right R): the true picture is (1920-L-R) x (1080-T-B) at (L, T).
// Ten bar layouts (odd, even, not multiples of 16, asymmetric, none at all, side bars) x nine values of round (option not given, 0, 1, 2, 3, 4, 8, 16, 32) = 90 runs.
// Readers:
//   reader 1  the filter's own output: the crop=w:h:x:y line it prints in the log, cross-checked with its frame metadata (lavfi.cropdetect.w/h/x/y)
//   reader 2  Node on decoded pixels: (a) the bounding box of the picture found by scanning the Y plane (luma above the filter's default limit 24), and
//             (b) the crop that the filter reported applied with the crop filter, then the Y plane of that output counted pixel by pixel: picture pixels kept, black pixels kept
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 1920, H = 1080, LIMIT = 24;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

// bar layouts: T top, B bottom, L left, R right (rows or columns of black)
export const CASES = [
  {id: 'one', T: 1, B: 1, L: 0, R: 0, what: '1 row of black above and below'},
  {id: 'two', T: 2, B: 2, L: 0, R: 0, what: '2 and 2'},
  {id: 'five', T: 5, B: 5, L: 0, R: 0, what: '5 and 5'},
  {id: 'asym', T: 3, B: 10, L: 0, R: 0, what: '3 above, 10 below'},
  {id: 'wide', T: 138, B: 138, L: 0, R: 0, what: '138 and 138 (a 804 row picture)'},
  {id: 'odd141', T: 141, B: 141, L: 0, R: 0, what: '141 and 141 (a 798 row picture)'},
  {id: 'exact', T: 140, B: 140, L: 0, R: 0, what: '140 and 140 (an 800 row picture, a multiple of 16)'},
  {id: 'none', T: 0, B: 0, L: 0, R: 0, what: 'no bars at all'},
  {id: 'pillar', T: 0, B: 0, L: 141, R: 141, what: '141 columns of black on both sides'},
  {id: 'four', T: 38, B: 38, L: 141, R: 141, what: 'bars on all four sides'},
];
export const ROUNDS = [null, 0, 1, 2, 3, 4, 8, 16, 32];
export const rkey = (r) => (r === null ? 'default' : String(r));
export const pictureOf = (c) => ({x: c.L, y: c.T, w: W - c.L - c.R, h: H - c.T - c.B});

const sourceOf = (c, pf = 'yuv420p') => { const p = pictureOf(c); return `color=c=black:s=${W}x${H}:r=5:d=1.2,format=${pf},drawbox=x=${p.x}:y=${p.y}:w=${p.w}:h=${p.h}:color=0x808080:t=fill`; };
const run = (args, opts = {}) => spawnSync('ffmpeg', ['-nostdin', '-y', ...args], {maxBuffer: 1 << 28, timeout: 60000, ...opts});

/** reader 1: the filter's log line and its metadata, last frame. */
export function detect(c, round, pf = 'yuv420p') {
  const opt = round === null ? 'cropdetect' : `cropdetect=round=${round}`;
  const r = run(['-v', 'info', '-f', 'lavfi', '-i', sourceOf(c, pf), '-vf', `${opt},metadata=mode=print:file=-`, '-f', 'null', '-']);
  const logs = [...String(r.stderr).matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)].map((m) => ({w: +m[1], h: +m[2], x: +m[3], y: +m[4]}));
  const meta = {};
  for (const m of String(r.stdout).matchAll(/lavfi\.cropdetect\.(w|h|x|y)=(\d+)/g)) meta[m[1]] = +m[2];
  return {status: r.status, log: logs.at(-1) ?? null, logLines: logs.length, meta: Object.keys(meta).length === 4 ? meta : null};
}

/** reader 2a: the Y plane of the first frame, and the box of pixels above the limit. */
export function lumaOf(c) {
  const r = run(['-v', 'error', '-f', 'lavfi', '-i', sourceOf(c), '-frames:v', '1', '-pix_fmt', 'yuv420p', '-f', 'rawvideo', '-']);
  return r.stdout.subarray(0, W * H);
}
export function boxOf(y, w = W, h = H, limit = LIMIT) {
  let x0 = w, x1 = -1, y0 = h, y1 = -1;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (y[j * w + i] > limit) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
  return x1 < 0 ? null : {x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1};
}
/** reader 2b: apply a crop with the crop filter and count the pixels of the output, Y plane only. */
export function applied(c, g) {
  const r = run(['-v', 'error', '-f', 'lavfi', '-i', sourceOf(c), '-vf', `crop=${g.w}:${g.h}:${g.x}:${g.y}`, '-frames:v', '1', '-pix_fmt', 'yuv420p', '-f', 'rawvideo', '-']);
  const y = r.stdout.subarray(0, g.w * g.h);
  let picture = 0;
  for (let i = 0; i < y.length; i++) if (y[i] > LIMIT) picture++;
  return {w: g.w, h: g.h, area: g.w * g.h, picturePixels: picture, blackPixels: g.w * g.h - picture};
}
export const inter = (a, b) => { const x0 = Math.max(a.x, b.x), x1 = Math.min(a.x + a.w, b.x + b.w), y0 = Math.max(a.y, b.y), y1 = Math.min(a.y + a.h, b.y + b.h); return Math.max(0, x1 - x0) * Math.max(0, y1 - y0); };
/** how many rows or columns of the true picture a crop throws away on each side (0 when the crop reaches the edge of the picture). */
export const lostOf = (pic, g) => ({top: Math.max(0, g.y - pic.y), bottom: Math.max(0, pic.y + pic.h - (g.y + g.h)), left: Math.max(0, g.x - pic.x), right: Math.max(0, pic.x + pic.w - (g.x + g.w))});

export function runExperiment() {
  const ev = {ffmpeg: ffmpegVersion(), w: W, h: H, limit: LIMIT, cases: {}};
  for (const c of CASES) {
    const y = lumaOf(c);
    const truth = pictureOf(c);
    const scan = boxOf(y);
    let barMax = 0, picMin = 255; // black bars never above the limit, the picture never at or below it
    const rec = {...c, truth, scan, barLuma: null, pictureLuma: null, runs: {}};
    const barPx = [], picPx = [];
    for (const [i, j] of [[0, 0], [W - 1, H - 1], [W >> 1, 0], [W >> 1, H - 1]]) if (!(i >= truth.x && i < truth.x + truth.w && j >= truth.y && j < truth.y + truth.h)) barPx.push(y[j * W + i]);
    picPx.push(y[(truth.y + (truth.h >> 1)) * W + truth.x + (truth.w >> 1)], y[truth.y * W + truth.x], y[(truth.y + truth.h - 1) * W + truth.x + truth.w - 1]);
    rec.barLuma = barPx.length ? [Math.min(...barPx), Math.max(...barPx)] : null; rec.pictureLuma = [Math.min(...picPx), Math.max(...picPx)];
    void barMax; void picMin;
    const cache = new Map();
    for (const r of ROUNDS) {
      const d = detect(c, r);
      const g = d.log;
      const key = `${g.w}:${g.h}:${g.x}:${g.y}`;
      if (!cache.has(key)) cache.set(key, applied(c, g));
      const a = cache.get(key);
      const lost = lostOf(truth, g);
      rec.runs[rkey(r)] = {status: d.status, log: g, meta: d.meta, logLines: d.logLines, lost, lostRows: lost.top + lost.bottom, lostCols: lost.left + lost.right,
        picturePixelsLost: truth.w * truth.h - a.picturePixels, blackPixelsKept: a.blackPixels, applied: a};
    }
    ev.cases[c.id] = rec;
  }
  // does the pixel format change the rule that x and y are even? top bar 3, bottom bar 1, round=2
  ev.pixfmt = {};
  const probe = {id: 'p', T: 3, B: 1, L: 0, R: 0};
  for (const pf of ['gray', 'yuv444p', 'yuv420p']) ev.pixfmt[pf] = detect(probe, 2, pf).log;
  return ev;
}
