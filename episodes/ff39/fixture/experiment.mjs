// Episode 39 fixture: "Why do thin lines look jagged or vanish when I scale down? (scale flags: bilinear, bicubic, lanczos, neighbor, area)"
// Synthetic input only: luma planes made in Node (yuv420p, chroma 128), fed to ffmpeg as raw video, so every input value is known exactly.
//   LINES    312x24, background luma 60, twelve 1 px wide vertical lines of luma 200, one every 25 columns (25 = 1 mod 3),
//            so the lines cycle through the three phases of a 3x downscale (source column mod 3 = 0, 1, 2), four lines each.
//   STRIPES  96x24, alternating 1 px columns of luma 0 and 255 (two phases: shifted by one column).
//   DIAG     96x24, a 1 px diagonal (x - y = d), background 60, line 200, three offsets d (phases).
//   STEP     96x24, a hard edge from luma 60 (left) to 200 (right), edge on a block boundary: shows ringing.
//   BOX      96x24, deterministic pseudo-random luma 16..235: the known-positive control for flags=area (exact block means).
// Two independent readers:
//   reader 1  decoded raw output luma bytes, measured in Node (peak, minimum, mean, per line)
//   reader 2  ffmpeg's own filters: signalstats (YMIN, YMAX, YAVG) on a cropped window, and psnr against a reference computed in Node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const FLAGS = ['neighbor', 'bilinear', 'bicubic', 'lanczos', 'area', 'bicublin', 'spline'];
export const F = 3;                       // downscale factor of the main experiment
export const BG = 60, LINE = 200;         // luma of the background and of a thin line
export const LW = 312, LH = 24;           // line card size
export const NLINES = 12, SPACING = 25, FIRST = 18;
export const lineX = (k) => FIRST + SPACING * k;          // source column of line k; phase = (lineX mod 3) = k mod 3
export const SW = 96, SH = 24;            // size of the other cards

const ff = (args, dir, input) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {cwd: dir, maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout;
};

// ---- cards (luma planes, one byte per pixel) ----
export const cardLines = () => { const b = Buffer.alloc(LW * LH, BG); for (let k = 0; k < NLINES; k++) for (let y = 0; y < LH; y++) b[y * LW + lineX(k)] = LINE; return b; };
export const cardStripes = (phase) => { const b = Buffer.alloc(SW * SH); for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) b[y * SW + x] = (x + phase) % 2 === 0 ? 255 : 0; return b; };
export const cardDiag = (d) => { const b = Buffer.alloc(SW * SH, BG); for (let y = 0; y < SH; y++) { const x = y + 30 + d; b[y * SW + x] = LINE; } return b; };
export const cardStep = () => { const b = Buffer.alloc(SW * SH, BG); for (let y = 0; y < SH; y++) for (let x = 48; x < SW; x++) b[y * SW + x] = LINE; return b; };
export const cardBox = () => { const b = Buffer.alloc(SW * SH); let s = 12345; for (let i = 0; i < b.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; b[i] = 16 + (s >> 8) % 220; } return b; };

// exact block mean (rounded half up) of f x f blocks, computed in Node: the reference for flags=area at an integer factor
export function boxMean(luma, w, h, f) {
  const ow = w / f, oh = h / f, o = Buffer.alloc(ow * oh);
  for (let j = 0; j < oh; j++) for (let i = 0; i < ow; i++) { let s = 0; for (let y = 0; y < f; y++) for (let x = 0; x < f; x++) s += luma[(j * f + y) * w + i * f + x]; o[j * ow + i] = Math.floor((s + (f * f) / 2) / (f * f)); }
  return o;
}

const yuv = (luma, w, h) => Buffer.concat([luma, Buffer.alloc(w * h / 2, 128)]);
export function writeCard(dir, name, luma, w, h) { fs.writeFileSync(path.join(dir, name), yuv(luma, w, h)); }
const inArgs = (name, w, h) => ['-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-s', `${w}x${h}`, '-i', name];
const flagText = (flags) => (flags ? `:flags=${flags}` : '');   // flags === null -> no flags option at all (the filter default)

// reader 1: scaled output luma bytes
export function scaleLuma(dir, name, w, h, ow, oh, flags, pre = '') {
  const out = ff([...inArgs(name, w, h), '-vf', `${pre}scale=${ow}:${oh}${flagText(flags)}`, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-'], dir);
  if (out.length !== ow * oh * 3 / 2) throw new Error(`unexpected raw size ${out.length} for ${ow}x${oh}`);
  return out.subarray(0, ow * oh);
}
// reader 2a: signalstats on the (optionally cropped) scaled frame
export function stats(dir, name, w, h, ow, oh, flags, pre = '') {
  const out = ff([...inArgs(name, w, h), '-vf', `${pre}scale=${ow}:${oh}${flagText(flags)},signalstats,metadata=print:file=-`, '-frames:v', '1', '-f', 'null', '-'], dir).toString('utf8');
  const g = (k) => { const m = out.match(new RegExp(`lavfi\\.signalstats\\.${k}=([0-9.]+)`)); return m ? Number(m[1]) : NaN; };
  return {ymin: g('YMIN'), ymax: g('YMAX'), yavg: g('YAVG')};
}
// reader 2b: psnr (luma) of the scaled frame against a reference raw card made in Node; Infinity means identical
export function psnrVs(dir, name, w, h, ow, oh, flags, refName) {
  const r = spawnSync('ffmpeg', ['-v', 'info', '-y', ...inArgs(name, w, h), ...inArgs(refName, ow, oh), '-filter_complex', `[0:v]scale=${ow}:${oh}${flagText(flags)}[a];[a][1:v]psnr`, '-f', 'null', '-'], {cwd: dir, encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`psnr failed: ${r.stderr}`);
  const m = (r.stderr ?? '').match(/PSNR y:(\S+)/);
  if (!m) throw new Error(`no PSNR line: ${r.stderr}`);
  return m[1] === 'inf' ? Infinity : Number(m[1]);
}

const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const sum = (b) => { let s = 0; for (const v of b) s += v; return s; };
const mean = (b) => sum(b) / b.length;

// ---- the line card at 3x ----
const OW = LW / F, OH = LH / F;
// window of output columns around line k, as source-aligned crop (x0 multiple of 3) for reader 2
export const cropOf = (k) => { const x0 = 3 * Math.floor((lineX(k) - 12) / 3); return {x0, w: 24, ox0: x0 / 3, ow: 8}; };
function lineStats(out, k) {
  const c = Math.floor(lineX(k) / F);
  let peak = 0, min = 255, peakAt = -1;
  for (let x = c - 3; x <= c + 3; x++) for (let y = 0; y < OH; y++) { const v = out[y * OW + x]; if (v > peak) { peak = v; peakAt = x; } if (v < min) min = v; }
  const row = []; for (let x = c - 2; x <= c + 2; x++) row.push(out[x + 0 + 3 * OW]);   // the values across one output row, c-2 .. c+2
  let cnt = 0; for (let x = c - 3; x <= c + 3; x++) if (out[3 * OW + x] > BG + 3) cnt++;
  return {peak, min, peakAt, row, wide: cnt, retained: (peak - BG) / (LINE - BG)};
}

export function measureLines(dir, flags) {
  const out = scaleLuma(dir, 'lines.yuv', LW, LH, OW, OH, flags);
  const per = []; for (let k = 0; k < NLINES; k++) per.push({k, phase: lineX(k) % F, ...lineStats(out, k)});
  return {md5: md5(out), mean: mean(out), per, out};
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const ev = {ffmpeg: ffmpegVersion(), factor: F, bg: BG, line: LINE, lines: {}, readers: {}, stripes: {}, diag: {}, step: {}, control: {}, defaults: {}};
  const lines = cardLines();
  writeCard(dir, 'lines.yuv', lines, LW, LH);
  ev.inputMean = mean(lines);
  // main: thin lines at 3x, every flag
  for (const fl of FLAGS) {
    const m = measureLines(dir, fl);
    const byPhase = {};
    for (const p of [0, 1, 2]) {
      const rows = m.per.filter((r) => r.phase === p);
      byPhase[p] = {peaks: rows.map((r) => r.peak), mins: rows.map((r) => r.min), retained: rows.map((r) => r.retained), wide: rows.map((r) => r.wide), row: rows[0].row};
    }
    ev.lines[fl] = {mean: m.mean, md5: m.md5, byPhase, vanished: m.per.filter((r) => r.peak <= BG).length, minPeak: Math.min(...m.per.map((r) => r.peak)), maxPeak: Math.max(...m.per.map((r) => r.peak)), minOfAll: Math.min(...m.per.map((r) => r.min))};
  }
  // default flags equal flags=bicubic (bytes)
  const def = scaleLuma(dir, 'lines.yuv', LW, LH, OW, OH, null), bic = scaleLuma(dir, 'lines.yuv', LW, LH, OW, OH, 'bicubic');
  ev.defaults.lines = {sameBytes: md5(def) === md5(bic), md5: md5(def)};
  ev.defaults.others = {};
  for (const fl of FLAGS.filter((f) => f !== 'bicubic')) ev.defaults.others[fl] = md5(scaleLuma(dir, 'lines.yuv', LW, LH, OW, OH, fl)) === md5(def);
  // reader 2: signalstats on a cropped window around the first line of each phase (k = 0, 1, 2), compared with reader 1 on the same window
  for (const fl of FLAGS) {
    ev.readers[fl] = [];
    for (const k of [0, 1, 2]) {
      const c = cropOf(k);
      const s = stats(dir, 'lines.yuv', LW, LH, 8, OH, fl, `crop=${c.w}:${LH}:${c.x0}:0,`);
      const full = scaleLuma(dir, 'lines.yuv', LW, LH, OW, OH, fl);
      let pk = 0, mn = 255, sm = 0, n = 0;
      for (let y = 0; y < OH; y++) for (let x = c.ox0; x < c.ox0 + c.ow; x++) { const v = full[y * OW + x]; pk = Math.max(pk, v); mn = Math.min(mn, v); sm += v; n++; }
      ev.readers[fl].push({k, phase: lineX(k) % F, signalstats: s, node: {peak: pk, min: mn, mean: sm / n}});
    }
  }
  // psnr of each flag against the exact box average of the line card (computed in Node)
  const ref = boxMean(lines, LW, LH, F);
  writeCard(dir, 'lines_ref.yuv', ref, OW, OH);
  ev.psnrVsBox = {};
  for (const fl of FLAGS) ev.psnrVsBox[fl] = psnrVs(dir, 'lines.yuv', LW, LH, OW, OH, fl, 'lines_ref.yuv');
  const areaOut = scaleLuma(dir, 'lines.yuv', LW, LH, OW, OH, 'area');
  ev.areaIsBox = Buffer.compare(areaOut, ref) === 0;
  ev.areaBoxMaxDiff = 0; for (let i = 0; i < ref.length; i++) ev.areaBoxMaxDiff = Math.max(ev.areaBoxMaxDiff, Math.abs(areaOut[i] - ref[i]));

  // stripes at 2x
  for (const ph of [0, 1]) {
    const name = `stripes${ph}.yuv`; writeCard(dir, name, cardStripes(ph), SW, SH);
    ev.stripes[ph] = {};
    for (const fl of FLAGS) {
      const o = scaleLuma(dir, name, SW, SH, SW / 2, SH / 2, fl);
      let mn = 255, mx = 0; for (const v of o) { if (v < mn) mn = v; if (v > mx) mx = v; }
      const st = stats(dir, name, SW, SH, SW / 2, SH / 2, fl);
      ev.stripes[ph][fl] = {min: mn, max: mx, mean: mean(o), signalstats: st};
    }
  }
  // diagonals at 3x
  for (const d of [0, 1, 2]) {
    const name = `diag${d}.yuv`; writeCard(dir, name, cardDiag(d), SW, SH);
    ev.diag[d] = {};
    for (const fl of FLAGS) {
      const o = scaleLuma(dir, name, SW, SH, SW / F, SH / F, fl);
      let mx = 0; for (const v of o) if (v > mx) mx = v;
      ev.diag[d][fl] = {peak: mx, excess: sum(o) - BG * o.length};
    }
    ev.diag[d].inputExcess = (LINE - BG) * SH / (F * F);
  }
  // step edge at 3x: ringing
  writeCard(dir, 'step.yuv', cardStep(), SW, SH);
  for (const fl of FLAGS) {
    const o = scaleLuma(dir, 'step.yuv', SW, SH, SW / F, SH / F, fl);
    let mn = 255, mx = 0; for (const v of o) { if (v < mn) mn = v; if (v > mx) mx = v; }
    ev.step[fl] = {min: mn, max: mx, undershoot: BG - mn, overshoot: mx - LINE};
  }
  // control: flags=area at integer factors on the pseudo-random box card equals the exact block mean
  const box = cardBox(); writeCard(dir, 'box.yuv', box, SW, SH);
  ev.control.factors = {};
  for (const f of [2, 3, 4]) {
    const o = scaleLuma(dir, 'box.yuv', SW, SH, SW / f, SH / f, 'area'), refBox = boxMean(box, SW, SH, f);
    let maxdiff = 0; for (let i = 0; i < o.length; i++) maxdiff = Math.max(maxdiff, Math.abs(o[i] - refBox[i]));
    writeCard(dir, `box_ref${f}.yuv`, refBox, SW / f, SH / f);
    ev.control.factors[f] = {maxdiff, identical: Buffer.compare(o, refBox) === 0, psnr: psnrVs(dir, 'box.yuv', SW, SH, SW / f, SH / f, 'area', `box_ref${f}.yuv`), signalstatsYavg: stats(dir, 'box.yuv', SW, SH, SW / f, SH / f, 'area').yavg, refYavg: mean(refBox)};
  }
  // control 2: the other flags are NOT the box mean on the same card (3x), so the reader can see a difference
  ev.control.others = {};
  const ref3 = boxMean(box, SW, SH, 3);
  for (const fl of FLAGS) { const o = scaleLuma(dir, 'box.yuv', SW, SH, SW / 3, SH / 3, fl); let md = 0; for (let i = 0; i < o.length; i++) md = Math.max(md, Math.abs(o[i] - ref3[i])); ev.control.others[fl] = {maxdiff: md, psnr: psnrVs(dir, 'box.yuv', SW, SH, SW / 3, SH / 3, fl, 'box_ref3.yuv')}; }
  return ev;
}
