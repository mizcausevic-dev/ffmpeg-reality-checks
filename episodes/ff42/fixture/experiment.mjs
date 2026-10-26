// Episode 42 fixture: "Should I add -vf yadif to every video? What does it do to progressive footage?"
// Synthetic sources only (lavfi), 320x240, 50 frames each, lossless x264 (-qp 0) so that decoded pixels are exact:
//   fine      progressive, 25 fps. Three vertical patches, each 240 rows tall:
//               stripes  x 0..99    one-pixel rows alternating luma 220 / 40 (the finest row detail there is)
//               lines    x 100..199 one-pixel horizontal lines (rows 0 and 3 of every 8), static
//               move     x 200..319 a 50 x 120 box filled with one-pixel stripes, sliding right 3 px per frame (wraps)
//   plain     progressive, 25 fps. A smooth box sliding right on a gradient, no fine row detail.
//   inter     truly interlaced: a 50 p smooth box (6 px per field) woven two fields per frame with the interlace filter, 25 fps, flagged top field first.
//   mislabel  the pixels of fine, encoded with -flags +ilme+ildct so that the file claims to be interlaced.
// Every output is read two independent ways, plus a third for the frame count:
//   reader 1  raw decoded luma planes, read in Node (frame compare, combing metric, row energy, PSNR)
//   reader 2  ffmpeg framemd5 (one md5 per decoded frame, with pts) AND ffmpeg's idet filter (counts of progressive / interlaced frames, from stderr)
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 320, H = 240, FRAMES = 50;
export const REGIONS = {
  stripes: {x0: 0, x1: 100, y0: 0, y1: 240},
  lines: {x0: 100, x1: 200, y0: 0, y1: 240},
  move: {x0: 200, x1: 320, y0: 0, y1: 240},
  whole: {x0: 0, x1: 320, y0: 0, y1: 240},
  box: {x0: 0, x1: 320, y0: 50, y1: 190},
};

const stripeExpr = 'if(mod(Y,2),220,40)';
export const SOURCES = {
  fine: {
    file: 'fine.mp4',
    graph: `color=c=black:s=320x240:r=25:d=2,format=yuv420p,geq=lum='if(lt(X,100),${stripeExpr},if(lt(X,200),if(lt(mod(Y,8),1)+eq(mod(Y,8),3),235,60),if(between(X,200+mod(N*3,70),250+mod(N*3,70))*between(Y,60,180),${stripeExpr},60)))':cb=128:cr=128`,
    note: 'progressive, fine one-pixel row detail',
  },
  plain: {
    file: 'plain.mp4',
    graph: `color=c=gray:s=320x240:r=25:d=2,format=yuv420p,geq=lum='if(between(X,40+N*4,110+N*4)*between(Y,60,180),235,if(lt(Y,20),16,100+X/4))':cb=128:cr=128`,
    note: 'progressive, smooth content',
  },
  inter: {
    file: 'inter.mp4',
    graph: `color=c=gray:s=320x240:r=50:d=2,format=yuv420p,geq=lum='if(between(X,40+abs(mod(N*6,360)-180),110+abs(mod(N*6,360)-180))*between(Y,60,180),235,if(lt(Y,20),16,100))':cb=128:cr=128`,
    vf: 'interlace=scan=tff:lowpass=0',
    flags: ['-flags', '+ilme+ildct'],
    note: 'truly interlaced (two fields from two moments), flagged top field first',
  },
  mislabel: {
    file: 'mislabel.mp4',
    from: 'fine',
    flags: ['-flags', '+ilme+ildct'],
    note: 'the fine progressive pixels, but encoded with ilme+ildct so the file claims to be interlaced',
  },
};

// source: which clip; vf: the filter chain under test (null = no filter, plain decode)
export const CASES = {
  fineNone:      {src: 'fine', vf: null, command: 'ffmpeg -i fine.mp4 out'},
  fineYadif:     {src: 'fine', vf: 'yadif', command: 'ffmpeg -i fine.mp4 -vf yadif out'},
  fineIlOnly:    {src: 'fine', vf: 'yadif=deint=interlaced', command: 'ffmpeg -i fine.mp4 -vf yadif=deint=interlaced out'},
  fineField:     {src: 'fine', vf: 'yadif=mode=1', command: 'ffmpeg -i fine.mp4 -vf yadif=mode=1 out'},
  fineSetfield:  {src: 'fine', vf: 'setfield=tff,yadif=deint=interlaced', command: 'ffmpeg -i fine.mp4 -vf setfield=tff,yadif=deint=interlaced out'},
  plainNone:     {src: 'plain', vf: null, command: 'ffmpeg -i plain.mp4 out'},
  plainYadif:    {src: 'plain', vf: 'yadif', command: 'ffmpeg -i plain.mp4 -vf yadif out'},
  plainIlOnly:   {src: 'plain', vf: 'yadif=deint=interlaced', command: 'ffmpeg -i plain.mp4 -vf yadif=deint=interlaced out'},
  interNone:     {src: 'inter', vf: null, command: 'ffmpeg -i inter.mp4 out'},
  interYadif:    {src: 'inter', vf: 'yadif', command: 'ffmpeg -i inter.mp4 -vf yadif out'},
  interIlOnly:   {src: 'inter', vf: 'yadif=deint=interlaced', command: 'ffmpeg -i inter.mp4 -vf yadif=deint=interlaced out'},
  interField:    {src: 'inter', vf: 'yadif=mode=1', command: 'ffmpeg -i inter.mp4 -vf yadif=mode=1 out'},
  mislabelNone:  {src: 'mislabel', vf: null, command: 'ffmpeg -i mislabel.mp4 out'},
  mislabelIlOnly:{src: 'mislabel', vf: 'yadif=deint=interlaced', command: 'ffmpeg -i mislabel.mp4 -vf yadif=deint=interlaced out'},
};

export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };
const vfArgs = (vf) => (vf ? ['-vf', vf] : []);

// reader 1: the raw decoded luma plane of every frame (first W*H bytes of each yuv420p frame), as an array of Buffers
export function lumaFrames(file, vf) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, ...vfArgs(vf), '-an', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-'], {maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${String(r.stderr)}`);
  const fsz = W * H * 3 / 2, n = Math.floor(r.stdout.length / fsz);
  if (n * fsz !== r.stdout.length) throw new Error(`unexpected raw size ${r.stdout.length}`);
  const out = [];
  for (let i = 0; i < n; i++) out.push(r.stdout.subarray(i * fsz, i * fsz + W * H));
  return out;
}

// reader 2a: framemd5, one md5 and one pts (in seconds) per decoded frame
export function framemd5(file, vf) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, ...vfArgs(vf), '-an', '-f', 'framemd5', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
  let tb = 1;
  const md5 = [], pts = [];
  for (const l of r.stdout.split(/\r?\n/)) {
    const m = /^#tb\s+0:\s*(\d+)\/(\d+)/.exec(l);
    if (m) { tb = Number(m[1]) / Number(m[2]); continue; }
    if (!l || l.startsWith('#')) continue;
    const c = l.split(',').map((s) => s.trim());
    md5.push(c[c.length - 1]); pts.push(Number(c[2]) * tb);
  }
  return {md5, pts};
}

// reader 2b: ffmpeg's idet filter. It prints its summary to stderr (possibly twice); the last summary is the one that counts frames.
const IDET = /TFF:\s*(\d+)\s+BFF:\s*(\d+)\s+Progressive:\s*(\d+)\s+Undetermined:\s*(\d+)/;
export function idetCounts(file, vf) {
  const chain = (vf ? vf + ',' : '') + 'idet';
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-vf', chain, '-an', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
  const pick = (label) => {
    const hits = r.stderr.split(/\r?\n/).filter((l) => l.includes(label) && IDET.test(l)).map((l) => IDET.exec(l).slice(1).map(Number));
    const h = hits.length ? hits[hits.length - 1] : [0, 0, 0, 0];
    return {tff: h[0], bff: h[1], progressive: h[2], undetermined: h[3], interlaced: h[0] + h[1]};
  };
  return {single: pick('Single frame detection'), multi: pick('Multi frame detection')};
}

// flags as ffprobe reports them, read defensively (any field may be missing in some builds)
export function probeFlags(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=field_order,nb_frames:frame=interlaced_frame', '-of', 'json', file], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`ffprobe failed: ${r.stderr}`);
  let j = {}; try { j = JSON.parse(r.stdout); } catch { j = {}; }
  const s = (j.streams ?? [])[0] ?? {};
  const fr = (j.frames ?? []).map((f) => f.interlaced_frame).filter((v) => v !== undefined);
  return {fieldOrder: s.field_order ?? null, frameFlag: fr.length ? fr.map(Number) : null};
}

const reg = (name) => REGIONS[name];
// mean absolute difference between rows `gap` apart, inside a region (rows y and y+gap, same column)
export function rowDiff(buf, region, gap) {
  const g = reg(region); let s = 0, n = 0;
  for (let y = g.y0; y + gap < g.y1; y++) for (let x = g.x0; x < g.x1; x++) { s += Math.abs(buf[y * W + x] - buf[(y + gap) * W + x]); n++; }
  return s / n;
}
// adjacent-row energy (detail) and combing ratio: adjacent-row difference over two-apart difference. Natural smooth content is well below 1, a woven field mismatch is far above 1.
export const rowEnergy = (buf, region) => rowDiff(buf, region, 1);
export const combRatio = (buf, region) => rowDiff(buf, region, 1) / Math.max(rowDiff(buf, region, 2), 0.01);
export function psnr(a, b, region) {
  const g = reg(region); let s = 0, n = 0;
  for (let y = g.y0; y < g.y1; y++) for (let x = g.x0; x < g.x1; x++) { const d = a[y * W + x] - b[y * W + x]; s += d * d; n++; }
  return s === 0 ? 99 : Math.min(99, 10 * Math.log10(255 * 255 / (s / n)));
}
export const differs = (a, b) => Buffer.compare(a, b) !== 0;
export const diffPixels = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };
const mean = (xs) => xs.reduce((s, v) => s + v, 0) / (xs.length || 1);
const r1 = (v) => Math.round(v * 10) / 10;

export function measure(srcFile, vf, refFrames, refMd5) {
  const luma = lumaFrames(srcFile, vf);
  const md = framemd5(srcFile, vf);
  const same = luma.length === refFrames.length;
  const changedLuma = same ? luma.filter((f, i) => differs(f, refFrames[i])).length : null;
  const changedMd5 = same ? md.md5.filter((m, i) => m !== refMd5[i]).length : null;
  const regions = {};
  for (const name of Object.keys(REGIONS)) {
    regions[name] = {
      rowEnergy: r1(mean(luma.map((f) => rowEnergy(f, name)))),
      twoApart: r1(mean(luma.map((f) => rowDiff(f, name, 2)))),
      comb: r1(mean(luma.map((f) => combRatio(f, name)))),
      psnrMin: same ? r1(Math.min(...luma.map((f, i) => psnr(f, refFrames[i], name)))) : null,
      psnrMean: same ? r1(mean(luma.map((f, i) => psnr(f, refFrames[i], name)))) : null,
    };
  }
  const diffPx = same ? Math.round(mean(luma.map((f, i) => diffPixels(f, refFrames[i])))) : null;
  const dt = md.pts.length > 1 ? md.pts.slice(1).map((p, i) => p - md.pts[i]) : [];
  return {
    frames: luma.length, framesMd5: md.md5.length, changedLuma, changedMd5, diffPx, regions,
    pts: {first: md.pts[0] ?? null, step: dt.length ? Math.round(mean(dt) * 1e4) / 1e4 : null, last: md.pts.length ? Math.round(md.pts[md.pts.length - 1] * 1e4) / 1e4 : null},
    idet: idetCounts(srcFile, vf),
    md5s: md.md5,
  };
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const out = {ffmpeg: ffmpegVersion(), sources: {}, flags: {}, runs: {}};
  const enc = ['-c:v', 'libx264', '-qp', '0', '-pix_fmt', 'yuv420p'];
  for (const [k, s] of Object.entries(SOURCES)) {
    if (s.graph) ff(['-f', 'lavfi', '-i', s.graph, ...(s.vf ? ['-vf', s.vf] : []), ...enc, ...(s.flags ?? []), s.file], dir);
    else ff(['-i', SOURCES[s.from].file, ...enc, ...(s.flags ?? []), s.file], dir);
    out.sources[k] = {note: s.note};
    out.flags[k] = probeFlags(path.join(dir, s.file));
  }
  const refs = {};
  for (const [k, s] of Object.entries(SOURCES)) {
    const f = path.join(dir, s.file);
    refs[k] = {luma: lumaFrames(f, null), md5: framemd5(f, null).md5};
  }
  for (const [name, c] of Object.entries(CASES)) {
    const f = path.join(dir, SOURCES[c.src].file);
    out.runs[name] = {command: c.command, src: c.src, vf: c.vf, ...measure(f, c.vf, refs[c.src].luma, refs[c.src].md5)};
  }
  // does the mislabeled clip carry the same pixels as fine? (it must, for the comparison to mean anything)
  out.mislabelSamePixels = refs.mislabel.luma.length === refs.fine.luma.length && refs.mislabel.luma.every((f, i) => !differs(f, refs.fine.luma[i]));
  // truth for the interlaced control: the 50 p frames it was woven from, and how close yadif mode=1 gets (fields back to frames)
  return out;
}
