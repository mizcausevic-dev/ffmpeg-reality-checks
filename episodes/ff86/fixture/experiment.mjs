// Episode 86 fixture: "overlay at an odd x or y on yuv420p: where does the marker really land in the luma and chroma planes?"
// Synthetic input only. Node writes two raw yuv420p frames (no container): a 64 x 32 base, flat gray (Y 128, U 128, V 128), and an 8 x 8 marker card (Y 50, U 200, V 60).
// ffmpeg overlays the card with overlay=x=X:y=Y (optionally format=yuv444 or yuv422) at every X and Y from 0 to 3, writes raw yuv420p (or yuv444p), and two readers look at the planes:
//   reader 1  Node: bounding box and centroid of the marker in the Y plane (value 50) and in the U and V planes (any value other than 128), md5 of the frame
//   reader 2  ffmpeg: framemd5 of the same file, and extractplanes + scale flags=area to a column profile and a row profile of every plane, from which the box is read (a different method: no per-pixel loop in Node)
// Control: even offsets are honored exactly. Known positive: overlay=format=yuv444 with yuv444p output lands the card exactly at odd offsets in all three planes (so the readers can see an odd position).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const BW = 64, BH = 32, MW = 8, MH = 8;
export const BASE = [128, 128, 128], MARK = [50, 200, 60];
export const OFFS = [0, 1, 2, 3];
export const TOL = 2;   // chroma within 2 levels of the card's or the background's value counts as that value (the 4:4:4 to 4:2:0 conversion rings by a few levels)
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

// name: {fmt (overlay format option, or null), out (pix_fmt of the written frame)}
export const SETUPS = {
  d420: {fmt: null, out: 'yuv420p'},        // plain overlay=x:y on yuv420p
  f444: {fmt: 'yuv444', out: 'yuv420p'},    // overlay format=yuv444, then back to yuv420p
  f422: {fmt: 'yuv422', out: 'yuv420p'},    // overlay format=yuv422, then to yuv420p
  e444: {fmt: 'yuv444', out: 'yuv444p'},    // overlay format=yuv444 kept as yuv444p: the known positive
};

const flat = (w, h, [y, u, v]) => Buffer.concat([Buffer.alloc(w * h, y), Buffer.alloc((w * h) / 4, u), Buffer.alloc((w * h) / 4, v)]);
export const filterOf = (setup, x, y) => `[0:v][1:v]overlay=x=${x}:y=${y}${SETUPS[setup].fmt ? ':format=' + SETUPS[setup].fmt : ''}`;
const ff = (args) => { const r = spawnSync('ffmpeg', ['-hide_banner', '-v', 'error', '-y', ...args], {encoding: 'utf8', maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')}: ${r.stderr}`); return r.stdout; };
export const md5Buf = (b) => crypto.createHash('md5').update(b).digest('hex');
export const planeDims = (pix) => (pix === 'yuv444p' ? {cw: BW, ch: BH} : {cw: BW / 2, ch: BH / 2});

// reader 1: Node. A plane is {w, h, data}. isMark(v) says which values are the marker.
export function boxOf(plane, isMark) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0, sx = 0, sy = 0, sw = 0;
  for (let j = 0; j < plane.h; j++) for (let i = 0; i < plane.w; i++) {
    const v = plane.data[j * plane.w + i];
    if (!isMark(v)) continue;
    n++; x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, j); y1 = Math.max(y1, j);
  }
  return n ? {x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1, n} : {x0: -1, y0: -1, w: 0, h: 0, n: 0};
}
// the centroid of the departure from the background, weighted by how far each sample is from it, in luma pixel units (a chroma sample i covers luma pixels 2i and 2i+1, so its centre is 2i + 0.5)
export function centroidOf(plane, bg, scale) {
  let sw = 0, sx = 0, sy = 0;
  for (let j = 0; j < plane.h; j++) for (let i = 0; i < plane.w; i++) { const w = Math.abs(plane.data[j * plane.w + i] - bg); sw += w; sx += w * (i * scale + (scale - 1) / 2); sy += w * (j * scale + (scale - 1) / 2); }
  return sw ? {x: sx / sw, y: sy / sw} : {x: NaN, y: NaN};
}
export function planesOf(buf, pix) {
  const {cw, ch} = planeDims(pix);
  return {Y: {w: BW, h: BH, data: buf.subarray(0, BW * BH)}, U: {w: cw, h: ch, data: buf.subarray(BW * BH, BW * BH + cw * ch)}, V: {w: cw, h: ch, data: buf.subarray(BW * BH + cw * ch, BW * BH + 2 * cw * ch)}};
}
export function analyze(buf, pix) {
  const P = planesOf(buf, pix), sub = pix === 'yuv444p' ? 1 : 2;
  const Y = boxOf(P.Y, (v) => v === MARK[0]);
  const U = boxOf(P.U, (v) => v !== BASE[1]), V = boxOf(P.V, (v) => v !== BASE[2]);
  const cY = centroidOf(P.Y, BASE[0], 1), cU = centroidOf(P.U, BASE[1], sub), cV = centroidOf(P.V, BASE[2], sub);
  let blended = 0; for (const v of P.U.data) if (v !== BASE[1] && v !== MARK[1]) blended++;
  // pixel level: how many marker luma pixels have the marker's own chroma under them, and how many background luma pixels carry chroma that is not the background's
  let wrong = 0, bleed = 0, marked = 0;
  for (let j = 0; j < BH; j++) for (let i = 0; i < BW; i++) {
    const ci = Math.floor(j / sub) * P.U.w + Math.floor(i / sub), isY = P.Y.data[j * BW + i] === MARK[0];
    const uv = [P.U.data[ci], P.V.data[ci]];
    if (isY) { marked++; if (Math.abs(uv[0] - MARK[1]) > TOL || Math.abs(uv[1] - MARK[2]) > TOL) wrong++; } else if (Math.abs(uv[0] - BASE[1]) > TOL || Math.abs(uv[1] - BASE[2]) > TOL) bleed++;
  }
  return {Y, U, V, cY, cU, cV, blendedU: blended, markU: [...P.U.data].filter((v) => v === MARK[1]).length, markedLuma: marked, wrongChroma: wrong, bgBleed: bleed};
}

// reader 2: ffmpeg column and row profiles (mean over the other axis) of every plane, one run, six small raw outputs
export function ffmpegProfiles(file, pix, tmp) {
  const {cw, ch} = planeDims(pix);
  const names = ['yc', 'yr', 'uc', 'ur', 'vc', 'vr'];
  const fc = `[0:v]extractplanes=y+u+v[y][u][v];[y]split[y1][y2];[u]split[u1][u2];[v]split[v1][v2];[y1]scale=${BW}:1:flags=area[yc];[y2]scale=1:${BH}:flags=area[yr];[u1]scale=${cw}:1:flags=area[uc];[u2]scale=1:${ch}:flags=area[ur];[v1]scale=${cw}:1:flags=area[vc];[v2]scale=1:${ch}:flags=area[vr]`;
  const args = ['-f', 'rawvideo', '-pix_fmt', pix, '-s', `${BW}x${BH}`, '-i', file, '-filter_complex', fc];
  for (const n of names) args.push('-map', `[${n}]`, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', path.join(tmp, `p_${n}.raw`));
  ff(args);
  const prof = {}; for (const n of names) prof[n] = [...fs.readFileSync(path.join(tmp, `p_${n}.raw`))];
  const span = (a, bg) => { const idx = a.map((v, i) => (Math.abs(v - bg) >= 1 ? i : -1)).filter((i) => i >= 0); return idx.length ? [idx[0], idx.at(-1) - idx[0] + 1] : [-1, 0]; };
  const [yx, yw] = span(prof.yc, BASE[0]), [yy, yh] = span(prof.yr, BASE[0]);
  const [ux, uw] = span(prof.uc, BASE[1]), [uy, uh] = span(prof.ur, BASE[1]);
  const [vx, vw] = span(prof.vc, BASE[2]), [vy, vh] = span(prof.vr, BASE[2]);
  return {Y: {x0: yx, y0: yy, w: yw, h: yh}, U: {x0: ux, y0: uy, w: uw, h: uh}, V: {x0: vx, y0: vy, w: vw, h: vh}};
}
export function ffmpegMd5(file, pix) {
  const out = ff(['-f', 'rawvideo', '-pix_fmt', pix, '-s', `${BW}x${BH}`, '-i', file, '-f', 'framemd5', '-']);
  return out.split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim())[0];
}
export const classesOf = (md5s) => { const m = {}; for (const [k, v] of Object.entries(md5s)) (m[v] ??= []).push(k); return Object.values(m); };

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const base = path.join(dir, 'base.yuv'), mark = path.join(dir, 'mark.yuv');
  fs.writeFileSync(base, flat(BW, BH, BASE)); fs.writeFileSync(mark, flat(MW, MH, MARK));
  const ev = {ffmpeg: ffmpegVersion(), setups: {}, classes: {}, classesFfmpeg: {}};
  for (const [s, cfg] of Object.entries(SETUPS)) {
    ev.setups[s] = {}; const md5N = {}, md5F = {};
    for (const y of OFFS) for (const x of OFFS) {
      const out = path.join(dir, `o_${s}_${x}_${y}.raw`);
      ff(['-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-s', `${BW}x${BH}`, '-i', base, '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-s', `${MW}x${MH}`, '-i', mark, '-filter_complex', filterOf(s, x, y), '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', cfg.out, out]);
      const b = fs.readFileSync(out);
      const a = analyze(b, cfg.out), p = ffmpegProfiles(out, cfg.out, dir);
      md5N[`${x},${y}`] = md5Buf(b); md5F[`${x},${y}`] = ffmpegMd5(out, cfg.out);
      ev.setups[s][`${x},${y}`] = {x, y, ...a, ffmpeg: p, md5: md5N[`${x},${y}`], md5Ffmpeg: md5F[`${x},${y}`]};
    }
    ev.classes[s] = classesOf(md5N); ev.classesFfmpeg[s] = classesOf(md5F);
  }
  // negative offsets (plain overlay on yuv420p): the card starts left of the frame
  ev.neg = {};
  for (const x of [-1, -2, -3]) {
    const out = path.join(dir, `o_neg_${-x}.raw`);
    ff(['-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-s', `${BW}x${BH}`, '-i', base, '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-s', `${MW}x${MH}`, '-i', mark, '-filter_complex', filterOf('d420', x, 0), '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', out]);
    ev.neg[x] = analyze(fs.readFileSync(out), 'yuv420p');
  }
  return ev;
}
