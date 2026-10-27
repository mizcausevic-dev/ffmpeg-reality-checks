// Episode 88 fixture: "chromakey or colorkey: what does similarity mean, and how many edge pixels survive?"
// Synthetic input only: four 96x72 rgb24 cards written by Node as raw frames (no lavfi, no files from outside), read by ffmpeg as rawvideo.
//   probe  6x4 blocks of 16x18 flat colours: the key colour, the key plus or minus a gray offset (same chroma, other luma), darker greens, hue neighbours, subject colours
//   soft   a green card (the key colour) with an orange disc whose edge is soft: radius 26, mixing fraction m from 1 (inside 21 px) to 0 (outside 31 px), so the ideal matte is known per pixel
//   noisy  the same green with uniform noise of +-24 on every channel, a hard edged subject: orange left half and lime right half (170,190,60)
//   flat   the key colour on every pixel (used to see what a pixel that equals the key colour scores)
// Filters (blend and similarity swept): colorkey on rgba, chromakey on yuva444p, chromakey on yuva420p, chromakey on yuva444p with the key given in yuv (yuv=1, read back from the same conversion).
// Readers: reader 1 = alphaextract to raw gray; reader 2 = the same filter output written as PNG rgba and decoded by a PNG decoder written here (zlib inflate, unfilter).
// Models: colorkey is a pure function of the pixel's RGB distance; chromakey is the mean over the 3x3 neighbourhood of the U,V distance. Both are written in Node and compared with the filters.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 96, H = 72, NPIX = W * H;
export const KEY = [20, 180, 60], KEYHEX = '0x14B43C', ORANGE = [230, 140, 90], LIME = [170, 190, 60], NZ = 24;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

// ---- the cards ----
const mk = (fn) => { const b = Buffer.alloc(NPIX * 3); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = fn(x, y); const o = (y * W + x) * 3; b[o] = c[0]; b[o + 1] = c[1]; b[o + 2] = c[2]; } return b; };
const clip = (v) => Math.max(0, Math.min(255, Math.round(v)));
// the probes, in block order (6 columns x 4 rows)
export const PROBES = [
  {id: 'key', rgb: KEY, note: 'the key colour'},
  {id: 'bright16', rgb: KEY.map((v) => clip(v + 16)), note: 'key + 16 on every channel (same chroma)'},
  {id: 'bright40', rgb: KEY.map((v) => clip(v + 40)), note: 'key + 40 on every channel (same chroma)'},
  {id: 'dark16', rgb: KEY.map((v) => clip(v - 16)), note: 'key - 16 on every channel (same chroma)'},
  {id: 'dark20', rgb: KEY.map((v) => clip(v - 20)), note: 'key - 20 on every channel (same chroma, red clipped at 0)'},
  {id: 'dim80', rgb: KEY.map((v) => clip(v * 0.8)), note: 'key x 0.8'},
  {id: 'dim60', rgb: KEY.map((v) => clip(v * 0.6)), note: 'key x 0.6'},
  {id: 'dim40', rgb: KEY.map((v) => clip(v * 0.4)), note: 'key x 0.4'},
  {id: 'nominal', rgb: [0, 255, 0], note: 'nominal green 00FF00'},
  {id: 'hueR', rgb: [60, 180, 60], note: 'key with red + 40'},
  {id: 'hueB', rgb: [20, 180, 100], note: 'key with blue + 40'},
  {id: 'hueG', rgb: [20, 140, 60], note: 'key with green - 40'},
  {id: 'orange', rgb: ORANGE, note: 'subject orange'},
  {id: 'lime', rgb: LIME, note: 'subject lime'},
  {id: 'gray', rgb: [128, 128, 128], note: 'mid gray'},
  {id: 'white', rgb: [255, 255, 255], note: 'white'},
  {id: 'black', rgb: [0, 0, 0], note: 'black'},
  {id: 'red', rgb: [255, 0, 0], note: 'red'},
  {id: 'blue', rgb: [0, 0, 255], note: 'blue'},
  {id: 'cyanish', rgb: [20, 180, 180], note: 'key with blue + 120'},
  {id: 'yellow', rgb: [220, 220, 60], note: 'yellow'},
  {id: 'olive', rgb: [90, 130, 40], note: 'olive'},
  {id: 'mint', rgb: [120, 220, 150], note: 'mint'},
  {id: 'flesh', rgb: [225, 170, 140], note: 'flesh tone'},
];
// key colours for the exact key test: a flat card of exactly this colour, keyed with this colour
export const KEYS = [
  {id: 'card', hex: '0x14B43C', rgb: [20, 180, 60]}, {id: 'nominal', hex: '0x00FF00', rgb: [0, 255, 0]}, {id: 'studio', hex: '0x00B140', rgb: [0, 177, 64]},
  {id: 'blue', hex: '0x0000FF', rgb: [0, 0, 255]}, {id: 'pale', hex: '0x90C090', rgb: [144, 192, 144]}, {id: 'gray', hex: '0x808080', rgb: [128, 128, 128]},
];
const pcell = (x, y) => PROBES[Math.floor(y / 18) * 6 + Math.floor(x / 16)].rgb;
export const probeCenter = (i) => { const col = i % 6, row = Math.floor(i / 6); return (row * 18 + 9) * W + col * 16 + 8; };
export const mOf = (x, y) => { const d = Math.hypot(x - 47.5, y - 35.5); return Math.min(1, Math.max(0, (26 + 5 - d) / 10)); };
let seed = 12345;
const lcg = () => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return seed / 4294967296; };
const noiseCard = () => { seed = 12345; const kind = new Uint8Array(NPIX); const b = Buffer.alloc(NPIX * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; let base = KEY, k = 0;
    if (x >= 28 && x < 68 && y >= 21 && y < 51) { k = x < 48 ? 2 : 3; base = x < 48 ? ORANGE : LIME; } // 2 orange, 3 lime
    kind[i] = k;
    for (let c = 0; c < 3; c++) { const nz = k ? 0 : Math.round((lcg() * 2 - 1) * NZ); b[i * 3 + c] = clip(base[c] + nz); }
  }
  return {buf: b, kind}; };
export function makeCards() {
  const soft = mk((x, y) => { const m = mOf(x, y); return KEY.map((g, i) => Math.round(g * (1 - m) + ORANGE[i] * m)); });
  const probe = mk((x, y) => pcell(x, y));
  const noisy = noiseCard();
  const flat = mk(() => KEY);
  const matte = new Float64Array(NPIX); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) matte[y * W + x] = mOf(x, y);
  return {frames: [probe, soft, noisy.buf, flat], names: ['probe', 'soft', 'noisy', 'flat'], softMatte: matte, noisyKind: noisy.kind, soft, noisy: noisy.buf, probe, flat};
}

// ---- running ffmpeg ----
const ffm = (args, opts = {}) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {maxBuffer: 1 << 28, ...opts});
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${String(r.stderr)}`);
  return r;
};
export const FILTERS = {
  colorkey: {pre: 'format=rgba', f: 'colorkey', fmt: 'rgba'},
  chroma444: {pre: 'format=yuva444p', f: 'chromakey', fmt: 'yuva444p'},
  chroma420: {pre: 'format=yuva420p', f: 'chromakey', fmt: 'yuva420p'},
  chromayuv: {pre: 'format=yuva444p', f: 'chromakey', fmt: 'yuva444p', yuv: true},
};
export const SIMS = [0.01, 0.02, 0.03, 0.05, 0.075, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5];
export const BLENDS = [0, 0.1, 0.2, 0.5];

export class Lab {
  constructor(dir) {
    this.dir = dir; fs.mkdirSync(dir, {recursive: true});
    this.cards = makeCards();
    this.inFile = path.join(dir, 'cards.rgb');
    fs.writeFileSync(this.inFile, Buffer.concat(this.cards.frames));
    this.yuvKey = null; this.runs = 0;
  }
  input(file = this.inFile) { return ['-f', 'rawvideo', '-pixel_format', 'rgb24', '-video_size', `${W}x${H}`, '-i', file]; }
  // what the converter makes of the card: planar yuv444p (the same conversion the filter sees), one frame per card
  yuv444() {
    const r = ffm([...this.input(), '-vf', 'format=yuv444p', '-f', 'rawvideo', '-pix_fmt', 'yuv444p', '-']);
    const b = r.stdout, fsz = NPIX * 3, n = b.length / fsz;
    return Array.from({length: n}, (_, k) => ({y: b.subarray(k * fsz, k * fsz + NPIX), u: b.subarray(k * fsz + NPIX, k * fsz + 2 * NPIX), v: b.subarray(k * fsz + 2 * NPIX, k * fsz + 3 * NPIX)}));
  }
  keyYuv() { // the key colour pixel after the same conversion: the flat card
    if (!this.yuvKey) { const f = this.yuv444()[3]; this.yuvKey = {y: f.y[0], u: f.u[0], v: f.v[0]}; }
    return this.yuvKey;
  }
  filterString(name, sim, blend) {
    const d = FILTERS[name];
    if (d.yuv) { const k = this.keyYuv(); const hex = '0x' + [k.y, k.u, k.v].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase(); return `${d.pre},chromakey=color=${hex}:yuv=1:similarity=${sim}:blend=${blend}`; }
    return `${d.pre},${d.f}=color=${KEYHEX}:similarity=${sim}:blend=${blend}`;
  }
  // one invocation, two readers: reader 1 is alphaextract to raw gray, reader 2 is the PNG (rgba) of the same filter output
  run(name, sim, blend, inFile = this.inFile, filterOverride = null) {
    this.runs++;
    const raw = path.join(this.dir, 'alpha.raw'), pngPat = path.join(this.dir, 'o_%d.png');
    const fg = `[0:v]${filterOverride ?? this.filterString(name, sim, blend)},split[a][b];[a]alphaextract,format=gray[al];[b]format=rgba[c]`;
    const inp = ['-f', 'rawvideo', '-pixel_format', 'rgb24', '-video_size', `${W}x${H}`, '-i', inFile];
    ffm([...inp, '-filter_complex', fg, '-map', '[al]', '-f', 'rawvideo', '-pix_fmt', 'gray', raw, '-map', '[c]', '-f', 'image2', '-start_number', '0', '-pix_fmt', 'rgba', pngPat]);
    const r1 = fs.readFileSync(raw), n = r1.length / NPIX;
    const out = [];
    for (let k = 0; k < n; k++) {
      const png = decodePng(fs.readFileSync(path.join(this.dir, `o_${k}.png`)));
      const a2 = Buffer.alloc(NPIX); for (let i = 0; i < NPIX; i++) a2[i] = png.data[i * 4 + 3];
      out.push({alpha1: r1.subarray(k * NPIX, (k + 1) * NPIX), alpha2: a2, rgba: png.data, pngW: png.w, pngH: png.h});
    }
    for (let k = n; k < 64; k++) { const f = path.join(this.dir, `o_${k}.png`); if (fs.existsSync(f)) fs.rmSync(f); else break; }
    return out;
  }
  // the YUV a flat card of this colour gets from the converter (limited range BT.601, what the filter sees)
  pixelYuv(rgb) {
    const f = path.join(this.dir, 'px.rgb'); fs.writeFileSync(f, mk(() => rgb));
    const b = ffm([...this.input(f), '-vf', 'format=yuv444p', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'yuv444p', '-']).stdout;
    return {y: b[0], u: b[NPIX], v: b[2 * NPIX]};
  }
  // a flat card of exactly the key colour, keyed with that colour: alpha at the centre (spec: 'colorkey' | 'chromakey' | 'chromayuv')
  keyAlpha(k, spec, sim, blend) {
    const f = path.join(this.dir, 'key1.rgb'); fs.writeFileSync(f, mk(() => k.rgb));
    let flt;
    if (spec === 'colorkey') flt = `format=rgba,colorkey=color=${k.hex}:similarity=${sim}:blend=${blend}`;
    else if (spec === 'chromakey') flt = `format=yuva444p,chromakey=color=${k.hex}:similarity=${sim}:blend=${blend}`;
    else { const y = this.pixelYuv(k.rgb); flt = `format=yuva444p,chromakey=color=0x${[y.y, y.u, y.v].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase()}:yuv=1:similarity=${sim}:blend=${blend}`; }
    return this.run(null, sim, blend, f, flt)[0].alpha1[NPIX >> 1];
  }
}

// ---- a PNG decoder (8 bit, non interlaced, colour types 2, 4, 6): reader 2 ----
export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let p = 8, w = 0, h = 0, depth = 0, ct = 0, il = 0; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('latin1', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; ct = d[9]; il = d[12]; }
    else if (type === 'IDAT') idat.push(d);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (depth !== 8 || il !== 0 || ![2, 4, 6].includes(ct)) throw new Error(`unsupported PNG ${depth} ${ct} ${il}`);
  const bpp = ct === 6 ? 4 : ct === 4 ? 2 : 3, stride = w * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat)), out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[dst + x - bpp] : 0, b = y ? out[dst - stride + x] : 0, c = x >= bpp && y ? out[dst - stride + x - bpp] : 0;
      let v = raw[src + x];
      if (ft === 1) v += a; else if (ft === 2) v += b; else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[dst + x] = v & 255;
    }
  }
  if (ct === 6) return {w, h, data: out};
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) { if (ct === 2) { rgba[i * 4] = out[i * 3]; rgba[i * 4 + 1] = out[i * 3 + 1]; rgba[i * 4 + 2] = out[i * 3 + 2]; rgba[i * 4 + 3] = 255; } else { rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = out[i * 2]; rgba[i * 4 + 3] = out[i * 2 + 1]; } }
  return {w, h, data: rgba};
}
// a PNG encoder, only to test the decoder against a known image (filter 0 on every row)
export function encodePng(w, h, rgba) {
  const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = (b) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (t, d) => { const h2 = Buffer.alloc(8); h2.writeUInt32BE(d.length, 0); h2.write(t, 4, 'latin1'); const body = Buffer.concat([h2.subarray(4), d]); const tail = Buffer.alloc(4); tail.writeUInt32BE(crc(body), 0); return Buffer.concat([h2.subarray(0, 4), body, tail]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const rows = Buffer.alloc(h * (w * 4 + 1)); for (let y = 0; y < h; y++) { rows[y * (w * 4 + 1)] = 0; rgba.copy(rows, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}

// ---- models ----
// colorkey: normalised RGB distance, then the blend ramp
export const rampAlpha = (diff, sim, blend) => (blend > 0.0001 ? Math.max(0, Math.min(1, (diff - sim) / blend)) * 255 : diff > sim ? 255 : 0);
export const rgbDiff = (rgb, key) => Math.sqrt(((rgb[0] - key[0]) ** 2 + (rgb[1] - key[1]) ** 2 + (rgb[2] - key[2]) ** 2) / (255 * 255 * 3));
export const uvDiff = (du, dv) => Math.sqrt((du * du + dv * dv) / (255 * 255 * 2));
export function colorkeyModel(frame, sim, blend) {
  const out = Buffer.alloc(NPIX);
  for (let i = 0; i < NPIX; i++) out[i] = Math.trunc(rampAlpha(rgbDiff([frame[i * 3], frame[i * 3 + 1], frame[i * 3 + 2]], KEY), sim, blend));
  return out;
}
// chromakey: mean over the 3x3 neighbourhood (outside the picture counts 0, still divided by 9) of the U,V distance to the key's U,V
export function chromakeyModel(yuvFrame, ku, kv, sim, blend) {
  const out = Buffer.alloc(NPIX);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let d = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; // a neighbour outside the picture adds nothing, but the sum is still divided by 9
      d += uvDiff(yuvFrame.u[yy * W + xx] - ku, yuvFrame.v[yy * W + xx] - kv);
    }
    out[y * W + x] = Math.trunc(rampAlpha(d / 9, sim, blend));
  }
  return out;
}
// full range BT.601 conversion of the key colour (what the filter appears to do with color=...) and limited range (what the converter does to the pixels)
export const fullUV = (rgb) => [128 + (-0.168736 * rgb[0] - 0.331264 * rgb[1] + 0.5 * rgb[2]), 128 + (0.5 * rgb[0] - 0.418688 * rgb[1] - 0.081312 * rgb[2])];

// ---- measures ----
export const distinct = (a) => new Set(a).size;
export function measureProbe(alpha) { return PROBES.map((_, i) => alpha[probeCenter(i)]); }
export function measureSoft(alpha, matte, rgba = null, input = null) {
  let drift = 0, driftSum = 0, driftN = 0;
  let nearN = 0, edge = 0, edgeKept = 0, edgeOpaque = 0, edgeMid = 0, bg = 0, bgKept = 0, sub = 0, subLost = 0, fringe = 0, absErr = 0, over = 0;
  for (let i = 0; i < NPIX; i++) {
    const m = matte[i], a = alpha[i];
    if (rgba && a === 255) { const d = Math.max(Math.abs(rgba[i * 4] - input[i * 3]), Math.abs(rgba[i * 4 + 1] - input[i * 3 + 1]), Math.abs(rgba[i * 4 + 2] - input[i * 3 + 2])); drift = Math.max(drift, d); driftSum += d; driftN++; }
    if (m === 0) { bg++; if (a > 0) bgKept++; }
    else if (m === 1) { sub++; if (a < 128) subLost++; }
    else { edge++; if (a > 0) edgeKept++; if (a === 255) edgeOpaque++; else if (a > 0) edgeMid++; absErr += Math.abs(a - 255 * m); if (Math.abs(a - 255 * m) <= 25.5) nearN++; if (m < 0.5 && a >= 128) fringe++; if (a > 255 * m + 25.5) over++; }
  }
  return {levels: distinct(alpha), edge, edgeKept, edgeOpaque, edgeMid, bg, bgKept, sub, subLost, fringe, over, mae: Math.round((absErr / edge) * 100) / 100, near: nearN, drift, driftMean: driftN ? Math.round((driftSum / driftN) * 100) / 100 : 0};
}
export function measureNoisy(alpha, kind) {
  let bg = 0, bgOpaque = 0, bgAny = 0, o = 0, oLost = 0, l = 0, lLost = 0;
  for (let i = 0; i < NPIX; i++) {
    const a = alpha[i];
    if (kind[i] === 0) { bg++; if (a >= 128) bgOpaque++; if (a > 0) bgAny++; }
    else if (kind[i] === 2) { o++; if (a < 128) oLost++; }
    else { l++; if (a < 128) lLost++; }
  }
  return {bg, bgOpaque, bgAny, bgKeyed: bg - bgOpaque, orange: o, orangeLost: oLost, lime: l, limeLost: lLost};
}
// largest difference between two alpha planes, over the pixels with a full 3x3 neighbourhood (the outer ring of the picture is left out: the filter reads past the edge there)
export function interiorDev(a, b) { let m = 0; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) m = Math.max(m, Math.abs(a[y * W + x] - b[y * W + x])); return m; }
export const key = (name, sim, blend) => `${name}|${sim}|${blend}`;

export function runExperiment(dir) {
  const lab = new Lab(dir);
  const ev = {ffmpeg: ffmpegVersion(), grid: {sims: SIMS, blends: BLENDS}, runs: {}, agree: {rawVsPng: 0, runs: 0, mismatches: 0}};
  const yuv = lab.yuv444();
  ev.keyYuv = lab.keyYuv();
  ev.keyFull = fullUV(KEY).map((x) => Math.round(x));
  for (const name of Object.keys(FILTERS)) for (const b of BLENDS) for (const s of SIMS) {
    const frames = lab.run(name, s, b);
    ev.agree.runs++;
    let same = true; frames.forEach((f) => { if (!f.alpha1.equals(f.alpha2)) same = false; });
    if (!same) ev.agree.mismatches++;
    const [pr, so, no, fl] = frames;
    let modelDev = null;
    if (name === 'colorkey') modelDev = Math.max(...frames.map((f, k) => { const m = colorkeyModel(lab.cards.frames[k], s, b); let e = 0; for (let i = 0; i < NPIX; i++) e = Math.max(e, Math.abs(m[i] - f.alpha1[i])); return e; }));
    else if (name === 'chroma444') modelDev = Math.max(...frames.map((f, k) => interiorDev(chromakeyModel(yuv[k], ev.keyFull[0], ev.keyFull[1], s, b), f.alpha1)));
    else if (name === 'chromayuv') modelDev = Math.max(...frames.map((f, k) => interiorDev(chromakeyModel(yuv[k], ev.keyYuv.u, ev.keyYuv.v, s, b), f.alpha1)));
    ev.runs[key(name, s, b)] = {
      name, sim: s, blend: b, rawEqualsPng: same, modelDev,
      probe: measureProbe(pr.alpha1), soft: measureSoft(so.alpha1, lab.cards.softMatte, so.rgba, lab.cards.soft), noisy: measureNoisy(no.alpha1, lab.cards.noisyKind),
      flat: {min: Math.min(...fl.alpha1), max: Math.max(...fl.alpha1), at: fl.alpha1[NPIX >> 1]},
    };
  }
  ev.keys = KEYS.map((k) => {
    const px = lab.pixelYuv(k.rgb), full = fullUV(k.rgb);
    const modelDiff = uvDiff(px.u - Math.round(full[0]), px.v - Math.round(full[1]));
    return {
      id: k.id, hex: k.hex, rgb: k.rgb, pixelUV: [px.u, px.v], keyFullUV: full.map((x) => Math.round(x)), modelAlpha: Math.trunc(modelDiff * 255),
      colorTiny: lab.keyAlpha(k, 'colorkey', 0.00001, 1), chromaTiny: lab.keyAlpha(k, 'chromakey', 0.00001, 1), yuvTiny: lab.keyAlpha(k, 'chromayuv', 0.00001, 1),
      chromaAt: [0.01, 0.03, 0.05, 0.1].map((sim) => lab.keyAlpha(k, 'chromakey', sim, 0)), colorAt001: lab.keyAlpha(k, 'colorkey', 0.01, 0), yuvAt001: lab.keyAlpha(k, 'chromayuv', 0.01, 0),
    };
  });
  // matched blend: similarity near 0 and blend equal to the distance between the subject and the key (read from a flat orange card), so alpha should follow the mixing fraction
  ev.matched = {};
  for (const [name, spec] of [['colorkey', 'colorkey'], ['chroma444', 'chromakey']]) {
    const orange = {id: 'orange', hex: '0x' + ORANGE.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase(), rgb: ORANGE};
    const keyOnOrange = (() => { const f = path.join(lab.dir, 'o1.rgb'); fs.writeFileSync(f, mk(() => ORANGE)); const fl = spec === 'colorkey' ? `format=rgba,colorkey=color=${KEYHEX}:similarity=0.00001:blend=1` : `format=yuva444p,chromakey=color=${KEYHEX}:similarity=0.00001:blend=1`; return lab.run(null, 0, 0, f, fl)[0].alpha1[NPIX >> 1]; })();
    const blend = Math.round((keyOnOrange / 255) * 10000) / 10000 + 0.002;
    const fr = lab.run(name, 0.00001, blend);
    ev.matched[name] = {orangeAlphaAtBlend1: keyOnOrange, blend, soft: measureSoft(fr[1].alpha1, lab.cards.softMatte, fr[1].rgba, lab.cards.soft), noisy: measureNoisy(fr[2].alpha1, lab.cards.noisyKind), orangeId: orange.id};
  }
  // alpha along one row through the soft edge (row 35, columns 14 to 30), for the film's profile bars
  const PX = [14, 30], PY = 35;
  const profile = (alpha) => Array.from({length: PX[1] - PX[0] + 1}, (_, i) => alpha[PY * W + PX[0] + i]);
  ev.profileCols = PX; ev.profileRow = PY;
  ev.profiles = {ideal: Array.from({length: PX[1] - PX[0] + 1}, (_, i) => Math.round(255 * lab.cards.softMatte[PY * W + PX[0] + i]))};
  for (const [id, name, sim, blend] of [['ck_0.1_0', 'colorkey', 0.1, 0], ['ck_0.1_0.1', 'colorkey', 0.1, 0.1], ['ck_matched', 'colorkey', 0.00001, ev.matched.colorkey.blend], ['ch_0.1_0', 'chroma444', 0.1, 0], ['ch_0.1_0.1', 'chroma444', 0.1, 0.1], ['ch_matched', 'chroma444', 0.00001, ev.matched.chroma444.blend]]) ev.profiles[id] = profile(lab.run(name, sim, blend)[1].alpha1);
  // the noisy card: one letter per setting (rows = blends, columns = similarities): C clean (no opaque speck, nothing lost), S specks left, L subject lost, B both
  ev.windows = {};
  for (const name of ['colorkey', 'chroma444', 'chroma420', 'chromayuv']) {
    ev.windows[name] = BLENDS.map((b) => SIMS.map((sm) => { const r = ev.runs[key(name, sm, b)].noisy; const sp = r.bgOpaque > 0, lo = r.orangeLost + r.limeLost > 0; return sp && lo ? 'B' : sp ? 'S' : lo ? 'L' : 'C'; }).join(''));
  }
  ev.cleanSettings = Object.fromEntries(Object.entries(ev.windows).map(([n, rows]) => [n, rows.join('').split('C').length - 1]));
  ev.cards = lab.cards; ev.yuv = yuv; ev.lab = lab;
  return ev;
}
