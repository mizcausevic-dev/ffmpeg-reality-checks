// Episode 76 fixture: "Black and white three ways: format=gray, hue=s=0 and colorchannelmixer. Do they match?"
// Synthetic input only: raw rgb24 frames written by Node and piped to ffmpeg. Nine flat patches (16x8, one frame each):
// red, green, blue, yellow, white, black, mid gray, cyan, magenta; and a ramp frame 256x4 whose column x is (x, x, x).
// Three kinds of source reach the filter: rgb (the patches as they are), sd (converted to yuv420p with the BT.601 matrix, tagged bt470bg, tv range)
// and hd (converted with the BT.709 matrix, tagged bt709, tv range).
// Methods: gray = format=gray, hue = hue=s=0, ccm601 and ccm709 = colorchannelmixer with the two usual sets of weights, eq = eq=saturation=0,
// grayYuv = format=gray,format=yuv420p (what an encode to yuv420p sees), none = no filter (the control: the source read back).
// Readers:
//   reader 1  the raw bytes of the native output, parsed in Node (the format and range come from ffmpeg's own log): the number stored in the file
//   reader 2  the same graph with format=rgb24 appended, parsed in Node: the number a viewer sees (R, G and B of every frame)
// Controls: the source read back by both readers (none); a gray patch (mid gray, white, black) that every method must agree on; and the Node formula
// for each matrix applied to the nine patches, which the mixer results must match within 1 and which differ from each other by more than 30 on green.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const PW = 16, PH = 8, RW = 256, RH = 4;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
export const PATCHES = {
  red: [255, 0, 0], green: [0, 255, 0], blue: [0, 0, 255], yellow: [255, 255, 0], white: [255, 255, 255], black: [0, 0, 0], gray: [128, 128, 128], cyan: [0, 255, 255], magenta: [255, 0, 255],
};
export const NAMES = Object.keys(PATCHES);
export const WEIGHTS = {'601': [0.299, 0.587, 0.114], '709': [0.2126, 0.7152, 0.0722]};
export const grayOf = (rgb, m) => Math.round(rgb[0] * WEIGHTS[m][0] + rgb[1] * WEIGHTS[m][1] + rgb[2] * WEIGHTS[m][2]);
// a viewer sees limited-range luma stretched back to full range
export const seenOfTv = (y) => Math.max(0, Math.min(255, Math.round(((y - 16) * 255) / 219)));
export const tvOfFull = (v) => Math.round(16 + (v * 219) / 255);

export const SOURCES = {
  rgb: '',
  sd: 'scale=out_color_matrix=bt601:out_range=tv,format=yuv420p,setparams=colorspace=bt470bg:range=tv',
  hd: 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=colorspace=bt709:range=tv',
};
const mixer = (w) => `colorchannelmixer=${[0, 1, 2].map(() => `${w[0]}:${w[1]}:${w[2]}:0`).join(':').replace(/:0$/, '')}`;
export const METHODS = {
  none: '',
  gray: 'format=gray',
  hue: 'hue=s=0',
  ccm601: mixer(WEIGHTS['601']),
  ccm709: mixer(WEIGHTS['709']),
  eq: 'eq=saturation=0',
  grayYuv: 'format=gray,format=yuv420p',
};
export const graphOf = (source, method) => [SOURCES[source], METHODS[method]].filter(Boolean).join(',') || 'null';
export const commandOf = (source, method) => `ffmpeg -f rawvideo -pix_fmt rgb24 -s 16x8 -i patches.rgb -vf "${graphOf(source, method)}" out`;

const flat = (w, h, rgb) => { const b = Buffer.alloc(w * h * 3); for (let i = 0; i < w * h; i++) { b[i * 3] = rgb[0]; b[i * 3 + 1] = rgb[1]; b[i * 3 + 2] = rgb[2]; } return b; };
const patchInput = () => Buffer.concat(NAMES.map((n) => flat(PW, PH, PATCHES[n])));
const rampInput = () => { const b = Buffer.alloc(RW * RH * 3); for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) { const o = (y * RW + x) * 3; b[o] = b[o + 1] = b[o + 2] = x; } return b; };

function ff(input, w, h, vf) {
  const r = spawnSync('ffmpeg', ['-v', 'info', '-hide_banner', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${w}x${h}`, '-r', '25', '-i', '-', '-vf', vf, '-f', 'rawvideo', '-'], {input, maxBuffer: 1 << 28});
  if (r.status !== 0) return {ok: false, error: String(r.stderr).trim().split('\n').slice(-1)[0]};
  const log = String(r.stderr).split('\n').filter((l) => /Stream #0:0: Video: rawvideo/.test(l) && /tv|pc|progressive/.test(l)).pop() ?? '';
  const m = /\), (\w+)(?:\(([^)]*)\))?, \d+x\d+/.exec(log);
  if (!m) return {ok: false, error: `no output format in log: ${log}`};
  const range = /(?:^|, |\()(tv|pc)(?:,|\)|$)/.exec(m[2] ?? '')?.[1] ?? null;
  return {ok: true, fmt: m[1], range, buf: r.stdout};
}
// split one frame of the native output into the numbers of its first, second and third channel (flat frames) or the first row of the first channel (ramp)
const SIZES = {gray: 1, yuv420p: 1.5, yuv444p: 3, rgb24: 3, yuvj420p: 1.5, yuvj444p: 3};
function frames(out, w, h) {
  const fsz = w * h * SIZES[out.fmt], n = out.buf.length / fsz;
  if (!Number.isInteger(n)) throw new Error(`unexpected size ${out.buf.length} for ${out.fmt}`);
  return Array.from({length: n}, (_, i) => out.buf.subarray(i * fsz, (i + 1) * fsz));
}
// the three channel values of a flat frame: [Y,U,V] for yuv, [R,G,B] for rgb, [Y] for gray, with a flag for flatness
function flatValues(buf, fmt, w, h) {
  const ysz = w * h;
  const planeFlat = (o, len) => { const v = buf[o]; for (let k = 1; k < len; k++) if (buf[o + k] !== v) return null; return v; };
  if (fmt === 'gray') { const y = planeFlat(0, ysz); return {v: [y], flat: y !== null}; }
  if (fmt === 'rgb24') { const v = [buf[0], buf[1], buf[2]]; let flat = true; for (let k = 3; k < ysz * 3; k++) if (buf[k] !== v[k % 3]) { flat = false; break; } return {v, flat}; }
  const csz = fmt.endsWith('420p') ? ysz / 4 : ysz;
  const y = planeFlat(0, ysz), u = planeFlat(ysz, csz), vv = planeFlat(ysz + csz, csz);
  return {v: [y, u, vv], flat: y !== null && u !== null && vv !== null};
}
function rampValues(buf, fmt, w) {
  if (fmt === 'rgb24') { const r = [], neutral = []; for (let x = 0; x < w; x++) { r.push(buf[x * 3]); neutral.push(buf[x * 3] === buf[x * 3 + 1] && buf[x * 3] === buf[x * 3 + 2]); } return {v: r, neutral: neutral.every(Boolean)}; }
  return {v: Array.from(buf.subarray(0, w)), neutral: true};
}

export function measurePatches(source, method) {
  const g = graphOf(source, method);
  const a = ff(patchInput(), PW, PH, g), b = ff(patchInput(), PW, PH, `${g},format=rgb24`);
  if (!a.ok || !b.ok) return {source, method, graph: g, error: a.error ?? b.error};
  const fa = frames(a, PW, PH), fb = frames(b, PW, PH);
  const native = {}, shown = {}, flatAll = [];
  NAMES.forEach((n, i) => {
    const x = flatValues(fa[i], a.fmt, PW, PH), y = flatValues(fb[i], 'rgb24', PW, PH);
    native[n] = x.v; shown[n] = y.v; flatAll.push(x.flat, y.flat);
  });
  const spread = Math.max(...NAMES.map((n) => Math.max(shown[n][0], shown[n][1], shown[n][2]) - Math.min(shown[n][0], shown[n][1], shown[n][2])));
  return {source, method, graph: g, command: commandOf(source, method), fmt: a.fmt, range: a.range, shownFmt: b.fmt, frames: fa.length, native, shown, allFlat: flatAll.every(Boolean), spread};
}
export function measureRamp(source, method) {
  const g = graphOf(source, method);
  const a = ff(rampInput(), RW, RH, g), b = ff(rampInput(), RW, RH, `${g},format=rgb24`);
  if (!a.ok || !b.ok) return {source, method, error: a.error ?? b.error};
  const na = rampValues(frames(a, RW, RH)[0], a.fmt, RW), nb = rampValues(frames(b, RW, RH)[0], 'rgb24', RW);
  const identityDev = (arr) => Math.max(...arr.map((v, x) => Math.abs(v - x)));
  const mono = (arr) => arr.every((v, i) => !i || v >= arr[i - 1]);
  return {source, method, fmt: a.fmt, range: a.range, native: na.v, shown: nb.v, neutral: nb.neutral,
    nativeMin: Math.min(...na.v), nativeMax: Math.max(...na.v), shownMin: Math.min(...nb.v), shownMax: Math.max(...nb.v),
    nativeMono: mono(na.v), shownMono: mono(nb.v), shownDev: identityDev(nb.v), distinctShown: new Set(nb.v).size};
}

export function runExperiment() {
  const ev = {ffmpeg: ffmpegVersion(), patches: {}, ramp: {}};
  for (const s of Object.keys(SOURCES)) {
    ev.patches[s] = {}; ev.ramp[s] = {};
    for (const m of Object.keys(METHODS)) { ev.patches[s][m] = measurePatches(s, m); ev.ramp[s][m] = measureRamp(s, m); }
  }
  ev.model = Object.fromEntries(Object.keys(WEIGHTS).map((k) => [k, Object.fromEntries(NAMES.map((n) => [n, grayOf(PATCHES[n], k)]))]));
  return ev;
}
export const write = (file, ev) => fs.writeFileSync(file, JSON.stringify(ev, null, 2));
