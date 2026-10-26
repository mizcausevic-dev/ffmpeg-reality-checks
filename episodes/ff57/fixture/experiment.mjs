// Episode 57 fixture: "Why does my xfade crossfade start at the wrong time or cut early?"
// Synthetic input only (lavfi, lossless x264 in mkv, 96x72, 25 fps, yuv420p). Two clips of 5 s (125 frames) each, every frame a flat card:
//   clip A: frame n has luma 16+n and cb 96      clip B: frame n has luma 235-n and cb 160
// So one frame tells its clip (cb 96 or 160) and its number (from luma), and a blend of the two has cb between 96 and 160.
// xfade=transition=fade:duration=1 with the offset given:
//   off4  offset 4 (= clip A length 5 minus the fade 1)     off3  offset 3     off2  offset 2     off1  offset 1     off5  offset 5 (= clip A length)
//   concat  control: concat of A then B (no blend): 250 frames, every frame pure A or pure B
// Readers (each classifies every output frame as pure A, pure B, or a blend):
//   reader 1  ffmpeg framemd5: the hash of each output frame is looked up in the hashes of the A and B source frames (a match names the clip and the frame)
//   reader 2  raw decoded planes in Node (rawvideo yuv420p): mean luma, mean cb, mean cr of each frame; cb 96 or 160 and a flat frame says the clip, luma says the frame number
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 96, H = 72, FPS = 25, CLIP_S = 5, CLIP_FRAMES = CLIP_S * FPS, FADE_S = 1, FADE_FRAMES = FADE_S * FPS;
export const CB_A = 96, CB_B = 160;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

const ffm = (args, opts = {}) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {maxBuffer: 1 << 28, ...opts});
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${String(r.stderr)}`);
  return r;
};

// offset: seconds (null for the concat control)
export const CASES = {
  off4: {offset: 4}, off3: {offset: 3}, off2: {offset: 2}, off1: {offset: 1}, off5: {offset: 5}, concat: {offset: null},
};
export const commandOf = (name) => {
  const c = CASES[name];
  return c.offset === null
    ? 'ffmpeg -i a.mkv -i b.mkv -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0" out.mkv'
    : `ffmpeg -i a.mkv -i b.mkv -filter_complex "[0:v][1:v]xfade=transition=fade:duration=${FADE_S}:offset=${c.offset}" out.mkv`;
};

export function makeClips(dir) {
  const a = path.join(dir, 'a.mkv'), b = path.join(dir, 'b.mkv');
  const mk = (lum, cb, file) => ffm(['-f', 'lavfi', '-i', `color=c=black:s=${W}x${H}:r=${FPS}:d=${CLIP_S},format=yuv420p,geq=lum='${lum}':cb=${cb}:cr=128`,
    '-c:v', 'libx264', '-qp', '0', '-pix_fmt', 'yuv420p', file]);
  mk('16+N', CB_A, a); mk('235-N', CB_B, b);
  return {a, b};
}

export function makeCase(clips, dir, name) {
  const c = CASES[name];
  const out = path.join(dir, `${name}.mkv`);
  const graph = c.offset === null ? '[0:v][1:v]concat=n=2:v=1:a=0[v]' : `[0:v][1:v]xfade=transition=fade:duration=${FADE_S}:offset=${c.offset}[v]`;
  ffm(['-i', clips.a, '-i', clips.b, '-filter_complex', graph, '-map', '[v]', '-c:v', 'libx264', '-qp', '0', '-pix_fmt', 'yuv420p', out]);
  return out;
}

// ---- readers ----
// reader 1: framemd5 (one hash per decoded frame)
export function framemd5(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-an', '-fps_mode', 'passthrough', '-f', 'framemd5', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`framemd5 failed: ${r.stderr}`);
  const md5 = [];
  for (const l of r.stdout.split(/\r?\n/)) {
    if (!l || l.startsWith('#')) continue;
    const c = l.split(',').map((s) => s.trim());
    md5.push(c[c.length - 1]);
  }
  return md5;
}
// classify output hashes against the clip hashes: [{clip:'A'|'B'|'mix', n}]
export function classifyByHash(outMd5, aMd5, bMd5) {
  const table = new Map();
  aMd5.forEach((h, n) => table.set(h, {clip: 'A', n}));
  bMd5.forEach((h, n) => table.set(h, {clip: 'B', n}));
  return outMd5.map((h) => table.get(h) ?? {clip: 'mix', n: null});
}
// reader 2: raw decoded planes in Node: mean luma, cb, cr of each frame, and whether each plane is flat
export function rawPlanes(file) {
  const r = ffm(['-i', file, '-an', '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-'], {});
  const buf = r.stdout, ysz = W * H, csz = ysz / 4, fsz = ysz + 2 * csz, n = Math.floor(buf.length / fsz);
  if (n * fsz !== buf.length) throw new Error(`unexpected raw size ${buf.length}`);
  const out = [];
  const stat = (o, len) => { let s = 0, lo = 255, hi = 0; for (let k = 0; k < len; k++) { const v = buf[o + k]; s += v; if (v < lo) lo = v; if (v > hi) hi = v; } return {mean: s / len, spread: hi - lo}; };
  for (let i = 0; i < n; i++) {
    const y = stat(i * fsz, ysz), cb = stat(i * fsz + ysz, csz), cr = stat(i * fsz + ysz + csz, csz);
    out.push({y: y.mean, cb: cb.mean, cr: cr.mean, flat: y.spread === 0 && cb.spread === 0 && cr.spread === 0});
  }
  return out;
}
const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;
// classify raw frames: pure A (cb 96, n = luma - 16), pure B (cb 160, n = 235 - luma), else a blend with p = (cb - 96) / 64
export function classifyByPlanes(planes) {
  return planes.map((f) => {
    if (f.flat && near(f.cb, CB_A)) return {clip: 'A', n: Math.round(f.y - 16)};
    if (f.flat && near(f.cb, CB_B)) return {clip: 'B', n: Math.round(235 - f.y)};
    return {clip: 'mix', n: null};
  });
}
// runs of equal clip classes: [{clip, from, to}]
export function runsOf(classes) {
  const out = [];
  classes.forEach((c, i) => { if (out.length && out[out.length - 1].clip === c.clip) out[out.length - 1].to = i; else out.push({clip: c.clip, from: i, to: i}); });
  return out;
}
// the model of a blended frame at output index i for an xfade with the given offset: A frame i against B frame (i - offset*25), weight p = (i - offset*25) / 25
export const modelP = (i, offset) => (i - offset * FPS) / FADE_FRAMES;
export const modelLuma = (i, offset) => (1 - modelP(i, offset)) * (16 + i) + modelP(i, offset) * (235 - (i - offset * FPS));
export const monotone = (xs, dir) => xs.every((x, i) => !i || (dir > 0 ? x >= xs[i - 1] : x <= xs[i - 1]));
const r2 = (v) => Math.round(v * 100) / 100;

export function measure(file, aMd5, bMd5, offset) {
  const h = classifyByHash(framemd5(file), aMd5, bMd5);
  const planes = rawPlanes(file);
  const p = classifyByPlanes(planes);
  const runs = runsOf(h);
  const idx = (clip) => h.map((c, i) => (c.clip === clip ? i : -1)).filter((i) => i >= 0);
  const mix = idx('mix'), pureA = idx('A'), pureB = idx('B');
  const blend = mix.map((i) => r2((planes[i].cb - CB_A) / (CB_B - CB_A)));
  return {
    framesMd5: h.length, framesRaw: planes.length, seconds: planes.length / FPS,
    byHash: h, byPlanes: p, runs, runsRaw: runsOf(p),
    nA: pureA.length, nB: pureB.length, nMix: mix.length,
    mixFrom: mix.length ? mix[0] : null, mixTo: mix.length ? mix[mix.length - 1] : null,
    firstB: pureB.length ? pureB[0] : null, firstBn: pureB.length ? h[pureB[0]].n : null,
    lastA: pureA.length ? pureA[pureA.length - 1] : null, lastAn: pureA.length ? h[pureA[pureA.length - 1]].n : null,
    lastClip: h[h.length - 1].clip, lastN: h[h.length - 1].n,
    blend, blendRises: monotone(blend, 1),
    mixY: mix.map((i) => r2(planes[i].y)),
    // clip A frames that never reach the screen: those after the last frame that has any A in it (a blended frame i holds A frame i)
    aLost: CLIP_FRAMES - 1 - (mix.length ? mix[mix.length - 1] : (pureA.length ? pureA[pureA.length - 1] : -1)),
    modelDevY: offset === null || !mix.length ? null : r2(Math.max(...mix.map((i) => Math.abs(planes[i].y - modelLuma(i, offset))))),
    modelDevP: offset === null || !mix.length ? null : r2(Math.max(...mix.map((i, k) => Math.abs(blend[k] - modelP(i, offset))))),
    cbSamples: {first: r2(planes[0].cb), last: r2(planes[planes.length - 1].cb)},
  };
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const clips = makeClips(dir);
  const aMd5 = framemd5(clips.a), bMd5 = framemd5(clips.b);
  const aRaw = rawPlanes(clips.a), bRaw = rawPlanes(clips.b);
  const ev = {
    ffmpeg: ffmpegVersion(),
    clips: {
      frames: aRaw.length, framesB: bRaw.length, seconds: aRaw.length / FPS, distinctA: new Set(aMd5).size, distinctB: new Set(bMd5).size, overlap: aMd5.filter((x) => bMd5.includes(x)).length,
      aLuma: [aRaw[0].y, aRaw[aRaw.length - 1].y], bLuma: [bRaw[0].y, bRaw[bRaw.length - 1].y], aCb: aRaw[0].cb, bCb: bRaw[0].cb,
      allFlat: aRaw.every((f) => f.flat) && bRaw.every((f) => f.flat),
      lumaRule: aRaw.every((f, i) => f.y === 16 + i) && bRaw.every((f, i) => f.y === 235 - i),
    },
    runs: {},
  };
  for (const name of Object.keys(CASES)) {
    const f = makeCase(clips, dir, name);
    ev.runs[name] = {name, command: commandOf(name), offset: CASES[name].offset, ...measure(f, aMd5, bMd5, CASES[name].offset)};
  }
  return ev;
}
