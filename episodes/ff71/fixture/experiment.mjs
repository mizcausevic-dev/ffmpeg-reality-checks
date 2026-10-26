// Episode 71 fixture: "eq=brightness=0.1: how many levels does it add, and where does it clip?"
// Synthetic input only (ffmpeg lavfi). Two kinds of source, all lossless ffv1 in mkv, yuv420p, chroma fixed at 128:
//   levels  256 frames of 16x16, frame n is a flat card with luma Y = n (0..255). One file tagged limited range (tv), one tagged full range (pc).
//           One frame holds exactly one input level, so the output level of a frame is the mapping f(n) of the filter.
//   ramp    one frame of 256x16 where every column x has luma Y = x (a 0..255 ramp).
// Readers (independent):
//   reader 1  Node, decoded Y plane: ffmpeg writes raw yuv420p and Node reads the first Y byte of every frame (and the 256 bytes of the first ramp row).
//   reader 2  ffmpeg signalstats: YAVG (and YMIN, YMAX) per frame, printed by the metadata filter. On a flat frame YAVG is the output level.
// Controls: no filter maps every level to itself in both readers; the range tag (tv or pc) is read back with ffprobe.
// Known positive for the readers: lutyuv=y=clip(val+25,0,255) is a shift by exactly +25 that we wrote ourselves; both readers must see +25 and the clip at 230.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const N = 256, S = 16; // levels: 256 frames of S x S
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
const FS = S * S * 3 / 2; // bytes of one yuv420p frame

const ffm = (args, opts = {}) => {
  const r = spawnSync('nice', ['-n', '10', 'ffmpeg', '-v', 'error', '-y', ...args], {maxBuffer: 1 << 28, ...opts});
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${String(r.stderr)}`);
  return r;
};

export function makeSources(dir) {
  const lv = (range) => {
    const f = path.join(dir, `levels_${range}.mkv`);
    ffm(['-f', 'lavfi', '-i', `nullsrc=s=${S}x${S}:r=25,format=yuv420p,geq=lum='N':cb=128:cr=128,setparams=range=${range}`, '-frames:v', String(N), '-c:v', 'ffv1', f]);
    return f;
  };
  const ramp = path.join(dir, 'ramp.mkv');
  ffm(['-f', 'lavfi', '-i', `nullsrc=s=${N}x${S}:r=25,format=yuv420p,geq=lum='X':cb=128:cr=128,setparams=range=tv`, '-frames:v', '1', '-c:v', 'ffv1', ramp]);
  return {tv: lv('tv'), pc: lv('pc'), ramp};
}

function rawOf(file, vf, pre = []) {
  const r = ffm([...pre, '-i', file, ...(vf ? ['-vf', vf] : []), '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-']);
  return r.stdout;
}

// reader 1: the luma of every flat frame (first Y byte), from the decoded Y plane
export function lumaOfFrames(buf, size = S) {
  const fsz = size * size * 3 / 2; const out = [];
  for (let i = 0; i < buf.length / fsz; i++) out.push(buf[i * fsz]);
  return out;
}
export const nodeMap = (file, vf, size = S, pre = []) => lumaOfFrames(rawOf(file, vf, pre), size);
// reader 1 on the chroma planes: every U and V byte of every frame
export function nodeChroma(file, vf) {
  const buf = rawOf(file, vf); const set = new Set();
  for (let i = 0; i < buf.length / FS; i++) for (let k = S * S; k < FS; k++) set.add(buf[i * FS + k]);
  return [...set].sort((a, b) => a - b);
}
// reader 1 on the ramp: the 256 luma bytes of the first row
export function nodeRamp(file, vf) { const buf = rawOf(file, vf); return [...buf.subarray(0, N)]; }
// reader 2: ffmpeg signalstats per frame
export function statsOf(file, vf) {
  const chain = `${vf ? vf + ',' : ''}signalstats,metadata=print:file=-`;
  const r = ffm(['-i', file, '-vf', chain, '-f', 'null', '-']);
  return parseStats(String(r.stdout));
}
export function parseStats(txt) {
  const pick = (key) => [...txt.matchAll(new RegExp(`lavfi\\.signalstats\\.${key}=([-\\d.]+)`, 'g'))].map((m) => parseFloat(m[1]));
  return {yavg: pick('YAVG'), ymin: pick('YMIN'), ymax: pick('YMAX')};
}
export const rangeTag = (file) => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=color_range', '-of', 'csv=p=0', file], {encoding: 'utf8'});
  return r.stdout.trim();
};

// what a mapping (an array of 256 outputs) does
export function summarize(m) {
  const shifts = m.map((v, i) => v - i);
  const first255 = m.indexOf(255);                         // first input level that reaches 255
  const lastFloor = (() => { let k = -1; for (let i = 0; i < m.length; i++) if (m[i] === m[0]) k = i; return k; })();
  return {
    at0: m[0], at16: m[16], at100: m[100], at128: m[128], at235: m[235], at255: m[255],
    shift100: m[100] - 100,
    first255,
    mergedHigh: first255 < 0 ? 0 : N - first255,            // input levels that all end at 255
    floorEnd: lastFloor,                                     // last input level that still maps to the output at level 0
    distinct: new Set(m).size,
    max: Math.max(...m), min: Math.min(...m),
    shifts: [...new Set(shifts)],
  };
}

export const BRIGHT = [-0.1, -0.05, 0.01, 0.02, 0.05, 0.09, 0.1, 0.11, 0.12, 0.2, 0.3, 0.5, 1.0];
export const STAIR = Array.from({length: 31}, (_, k) => +(k / 100).toFixed(2)); // 0.00 .. 0.30

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const src = makeSources(dir);
  const ev = {ffmpeg: ffmpegVersion(), levels: N};
  ev.tags = {tv: rangeTag(src.tv), pc: rangeTag(src.pc)};
  ev.control = {nodeIdentity: nodeMap(src.tv).every((v, i) => v === i), statsIdentity: statsOf(src.tv).yavg.every((v, i) => v === i)};
  // brightness grid (limited-range file; the pc file is compared separately)
  ev.bright = {};
  for (const b of BRIGHT) { const m = nodeMap(src.tv, `eq=brightness=${b}`); ev.bright[b] = {map: m, ...summarize(m)}; }
  // staircase, both readers
  ev.stair = STAIR.map((b) => {
    const vf = `eq=brightness=${b}`;
    const m = nodeMap(src.tv, vf); const s = statsOf(src.tv, vf);
    return {b, shift100: m[100] - 100, stats100: s.yavg[100] - 100, agree: m.every((v, i) => v === s.yavg[i])};
  });
  // the same mapping with SIMD switched off (-cpuflags 0): is the staircase a property of the filter or of one code path?
  ev.cpu0 = [0.01, 0.02, 0.05, 0.1, 0.12].map((b) => {
    const a = nodeMap(src.tv, `eq=brightness=${b}`), z = nodeMap(src.tv, `eq=brightness=${b}`, S, ['-cpuflags', '0']);
    return {b, same: a.every((v, k) => v === z[k])};
  });
  // the headline: eq=brightness=0.1 on both range tags, both readers
  const vf = 'eq=brightness=0.1';
  const tv = nodeMap(src.tv, vf), pc = nodeMap(src.pc, vf);
  const stTv = statsOf(src.tv, vf), stPc = statsOf(src.pc, vf);
  ev.head = {vf, tv, pc, sameTvPc: tv.every((v, i) => v === pc[i]), statsTv: stTv.yavg, statsPc: stPc.yavg, agreeTv: tv.every((v, i) => v === stTv.yavg[i]), agreePc: pc.every((v, i) => v === stPc.yavg[i]), ...summarize(tv)};
  const legal = [];
  for (let i = 16; i <= 235; i++) legal.push(tv[i]);
  ev.limited = {blackIn: 16, blackOut: tv[16], whiteIn: 235, whiteOut: tv[235], legalSpan: 219, legalAbove235: legal.filter((v) => v > 235).length,
    legalLevelsAt255: legal.filter((v) => v === 255).length, firstLegalAt255: tv.indexOf(255), pctOfLegal: +(25 / 219 * 100).toFixed(1), pctOfFull: +(25 / 255 * 100).toFixed(1)};
  ev.chromaAfter = nodeChroma(src.tv, vf);
  // known positive: lutyuv +25 clipped, the reader must see the same shift and clip
  const lut = 'lutyuv=y=clip(val+25\\,0\\,255)';
  const lm = nodeMap(src.tv, lut), ls = statsOf(src.tv, lut);
  ev.positive = {vf: lut, ...summarize(lm), nodeEqualsEq: lm.every((v, i) => v === tv[i]), statsEqualsNode: ls.yavg.every((v, i) => v === lm[i])};
  // contrast and gamma and a combination
  ev.other = {};
  for (const [k, f] of Object.entries({contrast15: 'eq=contrast=1.5', contrast05: 'eq=contrast=0.5', gamma22: 'eq=gamma=2.2', gamma05: 'eq=gamma=0.5', both: 'eq=contrast=1.5:brightness=0.1'})) {
    const m = nodeMap(src.tv, f); const s = statsOf(src.tv, f);
    ev.other[k] = {vf: f, ...summarize(m), statsAgree: m.every((v, i) => v === s.yavg[i]), map: m};
  }
  // a fix that respects the legal range
  const fixVf = 'lutyuv=y=clip(val+22\\,16\\,235)';
  const fm = nodeMap(src.tv, fixVf), fs2 = statsOf(src.tv, fixVf);
  ev.fix = {vf: fixVf, ...summarize(fm), at16: fm[16], at213: fm[213], at235: fm[235], first235: fm.indexOf(235), statsAgree: fm.every((v, i) => v === fs2.yavg[i])};
  // the ramp frame itself
  const rin = nodeRamp(src.ramp), rout = nodeRamp(src.ramp, vf), rs = statsOf(src.ramp, vf), rsIn = statsOf(src.ramp);
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  ev.ramp = {inIsRamp: rin.every((v, i) => v === i), out: rout, nodeMean: mean(rout), statsYavg: rs.yavg[0], statsYmin: rs.ymin[0], statsYmax: rs.ymax[0], inYavg: rsIn.yavg[0], inYmin: rsIn.ymin[0], inYmax: rsIn.ymax[0],
    nodeMin: Math.min(...rout), nodeMax: Math.max(...rout), flatRun: rout.filter((v) => v === 255).length};
  return ev;
}
