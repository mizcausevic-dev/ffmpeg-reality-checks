// Deep dive 08 fixture: "colordetect (new in ffmpeg 8.0): what can it tell about color range and alpha mode, and what can it not?"
//
// The question: a file TAGS a color range (ffprobe color_range) and, for alpha, says nothing at all. colordetect (ffmpeg 8.0+) looks at the
// PIXELS and prints a verdict at the end of the run. What does it prove, what does it echo, and what do you use on a build without it?
//
// Everything is synthetic and written byte by byte from Node, so the truth is known exactly:
//   range clips   256x16, 3 frames, yuv420p, luma ramps: full (0..255), limited (16..235), mid (64..191), plus outlier clips
//                 (one pixel at 236, one at 15, a full-range chroma ramp), each encoded as FFV1 in Matroska with tag none / tv / pc.
//                 Three ways to write the tag, measured separately (probe-pc.mjs found which ones are a pure label on which build):
//                   label  (no key suffix)  `-vf setparams=range=T -color_range T`: the frames AND the encoder say T. A pure label on 6.1.1 and 8.1.2.
//                   option (_opt)           the output option `-color_range T` alone: on 6.1.1 it only relabels; on 8.1.2 it converts tv to pc.
//                   vf     (_vf)            `-vf setparams=range=T` alone: a pure label on 6.1.1; on 8.1.2 FFV1 converts a pc frame to limited and the file reads tv.
//   alpha clips   64x16, 3 frames, rgba, written from Node (opaque, straight, premultiplied-consistent, boundary, ramps, one bad pixel)
//                 plus the three lavfi sources the orchestrator probed (red@0.5, red, 0x800000@0.5)
// Readers (build independent, work on 6.1.1 and 8.x):
//   reader 1  raw pixels: `-f rawvideo` in the clip's own pixel format, min and max per plane read in Node
//   reader 2  `signalstats` (YMIN/YMAX/UMIN/UMAX/VMIN/VMAX per frame) and, for alpha, `alphaextract,format=yuvj420p,signalstats`
//   reader 3  `ffprobe` stream color_range: what the FILE CLAIMS
//   reader 4  `colordetect` (8.x only): what the filter INFERS. Skipped, never faked, when the filter does not exist.
// Controls: a full-range ramp must be seen outside 16..235 by readers 1 and 2; a limited ramp must be seen inside it; an opaque frame must have
// alpha 255 everywhere; a pixel with a channel above its alpha must be seen by the raw reader.
// Nothing here is read from a real video, and no byte count of an encoder is asserted.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const buildOf = (versionLine) => (/version (n?6\.)/.test(versionLine) ? 'v6' : /version (n?8\.)/.test(versionLine) ? 'v8' : 'other');

// ---------------------------------------------------------------------------------------------------------------- process helpers
const ENV = {...process.env};
export function ffRaw(cmd, args, input) {
  const r = spawnSync(cmd, args, {maxBuffer: 1 << 28, input, env: ENV});
  return {status: r.status, stdout: r.stdout ?? Buffer.alloc(0), stderr: (r.stderr ?? Buffer.alloc(0)).toString('utf8').replace(/\r/g, '')};
}
const ff = (args, input) => ffRaw('ffmpeg', ['-hide_banner', '-nostats', '-v', 'error', '-y', ...args], input);
const must = (r, what) => { if (r.status !== 0) throw new Error(`${what} failed (exit ${r.status}): ${r.stderr}`); return r; };
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const sameArr = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// ---------------------------------------------------------------------------------------------------------------- synthetic content
export const RW = 256, RH = 16, RFRAMES = 3;           // range clips
export const AW = 64, AH = 16, AFRAMES = 3;            // alpha clips

// luma functions of the column x (0..255)
export const LUMA = {
  full:    (x) => x,                                   // 0..255
  limited: (x) => 16 + Math.floor((x * 220) / 256),    // 16..235
  mid:     (x) => 64 + Math.floor((x * 128) / 256),    // 64..191
};
// range clips: name -> {luma(x,y,f), cb(x,y,f), cr(x,y,f)}; the outliers touch ONE pixel of ONE frame
export const RANGE_CONTENT = {
  full:     {note: 'luma ramp 0..255',                          y: (x) => LUMA.full(x)},
  limited:  {note: 'luma ramp 16..235',                         y: (x) => LUMA.limited(x)},
  mid:      {note: 'luma ramp 64..191',                         y: (x) => LUMA.mid(x)},
  hi1:      {note: 'limited ramp, ONE pixel of the LAST frame at 236', y: (x, y, f) => (f === RFRAMES - 1 && x === 0 && y === 0 ? 236 : LUMA.limited(x))},
  lo1:      {note: 'limited ramp, ONE pixel of the FIRST frame at 15', y: (x, y, f) => (f === 0 && x === 255 && y === 15 ? 15 : LUMA.limited(x))},
  cbfull:   {note: 'limited luma ramp, Cb ramp 0..254 (chroma outside 16..240)', y: (x) => LUMA.limited(x), cb: (x) => x},
  edge:     {note: 'limited ramp, exactly 16 and 235 only (two flat halves)', y: (x) => (x < 128 ? 16 : 235)},
};
export const TAGS = ['none', 'tv', 'pc'];
export const MAIN_RANGE = ['full', 'limited', 'mid'];   // each with every tag
export const EXTRA_RANGE = ['hi1', 'lo1', 'cbfull', 'edge']; // tagged tv only

export function yuvClip(def) {
  const Y = RW * RH, C = (RW / 2) * (RH / 2), frames = [];
  for (let f = 0; f < RFRAMES; f++) {
    const y = Buffer.alloc(Y), u = Buffer.alloc(C, 128), v = Buffer.alloc(C, 128);
    for (let r = 0; r < RH; r++) for (let x = 0; x < RW; x++) y[r * RW + x] = def.y(x, r, f);
    if (def.cb) for (let r = 0; r < RH / 2; r++) for (let x = 0; x < RW / 2; x++) u[r * (RW / 2) + x] = def.cb(x * 2, r * 2, f);
    frames.push(Buffer.concat([y, u, v]));
  }
  return Buffer.concat(frames);
}

// alpha content: name -> {note, px(x,y,f) -> [r,g,b,a]}
const ar = (v) => Math.round(v);
export const ALPHA_CONTENT = {
  opaque_red:        {note: 'red, alpha 255',                                    px: () => [255, 0, 0, 255]},
  straight_half_red: {note: 'red 255, alpha 128 (r above a)',                    px: () => [255, 0, 0, 128]},
  premult_half_red:  {note: 'half red premultiplied: r 128, alpha 128 (r equals a)', px: () => [128, 0, 0, 128]},
  dark_half:         {note: 'r 64, alpha 128 (every channel below alpha)',       px: () => [64, 0, 0, 128]},
  boundary_127:      {note: 'r 128, alpha 127 (one above a): the shape of 0x800000@0.5', px: () => [128, 0, 0, 127]},
  transparent:       {note: 'all zero, alpha 0',                                 px: () => [0, 0, 0, 0]},
  ramp_straight:     {note: 'alpha ramp 0..255, rgb 255',                        px: (x) => [255, 255, 255, ar((x * 255) / (AW - 1))]},
  ramp_premult:      {note: 'alpha ramp 0..255, rgb = alpha / 2 (always below alpha)', px: (x) => { const a = ar((x * 255) / (AW - 1)); return [ar(a / 2), ar(a / 2), ar(a / 2), a]; }},
  one_bad_pixel:     {note: 'half red premultiplied everywhere, ONE pixel of the LAST frame with r 255', px: (x, y, f) => (f === AFRAMES - 1 && x === 0 && y === 0 ? [255, 0, 0, 128] : [128, 0, 0, 128])},
};
// the lavfi sources the orchestrator probed on 8.1.2: replicated verbatim, then read by pixel
export const ALPHA_LAVFI = {
  lavfi_red_half:    {note: 'color=c=red@0.5',       src: `color=c=red@0.5:s=${AW}x${AH}:r=3:d=1,format=rgba`},
  lavfi_red:         {note: 'color=c=red',           src: `color=c=red:s=${AW}x${AH}:r=3:d=1,format=rgba`},
  lavfi_800000_half: {note: 'color=c=0x800000@0.5',  src: `color=c=0x800000@0.5:s=${AW}x${AH}:r=3:d=1,format=rgba`},
};

export function rgbaClip(def) {
  const frames = [];
  for (let f = 0; f < AFRAMES; f++) {
    const b = Buffer.alloc(AW * AH * 4);
    for (let r = 0; r < AH; r++) for (let x = 0; x < AW; x++) { const p = def.px(x, r, f); b.set(p, (r * AW + x) * 4); }
    frames.push(b);
  }
  return Buffer.concat(frames);
}

// ---------------------------------------------------------------------------------------------------------------- readers
// reader 1: raw planar yuv420p min/max per plane
export function planeStats(buf, w, h, frames) {
  const Y = w * h, C = (w / 2) * (h / 2), st = {y: [255, 0], u: [255, 0], v: [255, 0], yFrames: []};
  for (let f = 0; f < frames; f++) {
    const o = f * (Y + 2 * C);
    const part = (name, a, n) => { let mn = 255, mx = 0; for (let i = a; i < a + n; i++) { const d = buf[i]; if (d < mn) mn = d; if (d > mx) mx = d; } st[name][0] = Math.min(st[name][0], mn); st[name][1] = Math.max(st[name][1], mx); return [mn, mx]; };
    st.yFrames.push(part('y', o, Y)); part('u', o + Y, C); part('v', o + Y + C, C);
  }
  return {frames: Math.floor(buf.length / (Y + 2 * C)), ymin: st.y[0], ymax: st.y[1], umin: st.u[0], umax: st.u[1], vmin: st.v[0], vmax: st.v[1], yPerFrame: st.yFrames};
}
export function rawYuv(file) {
  const buf = must(ff(['-i', file, '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-']), 'raw read').stdout;
  return {...planeStats(buf, RW, RH, RFRAMES), sha: sha(buf)};
}

// reader 2: signalstats printed by the metadata filter on stdout
export function parseStats(text) {
  const frames = [];
  for (const l of text.split(/\r?\n/)) {
    if (l.startsWith('frame:')) frames.push({});
    const m = /^lavfi\.signalstats\.(\w+)=(-?[\d.]+)/.exec(l.trim());
    if (m && frames.length) frames[frames.length - 1][m[1]] = Number(m[2]);
  }
  const g = (k, f) => f(...frames.map((x) => x[k]));
  return {frames: frames.length, ymin: g('YMIN', Math.min), ymax: g('YMAX', Math.max), umin: g('UMIN', Math.min), umax: g('UMAX', Math.max), vmin: g('VMIN', Math.min), vmax: g('VMAX', Math.max),
    yPerFrame: frames.map((x) => [x.YMIN, x.YMAX])};
}
export const signalstats = (inArgs, input, pre = '') => parseStats(must(ff([...inArgs, '-vf', `${pre}signalstats,metadata=mode=print:file=-`, '-an', '-f', 'null', '-'], input), 'signalstats').stdout.toString('utf8'));

// reader 3: the tag
export function probeStream(file) {
  const r = must(ffRaw('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_streams', '-of', 'json', file]), 'ffprobe');
  const s = JSON.parse(r.stdout.toString('utf8')).streams[0];
  const alphaKeys = Object.entries(s).filter(([k, v]) => /alpha/i.test(k) || (k === 'tags' && Object.keys(v).some((t) => /alpha/i.test(t)))).map(([k]) => k);
  return {pix_fmt: s.pix_fmt, color_range: s.color_range ?? null, color_space: s.color_space ?? null, alphaKeys, tags: s.tags ?? {}, raw: s};
}

// consequence of the tag: the same bytes converted to RGB (what a player or `-pix_fmt rgb24` shows)
export function rgbOf(file) {
  const b = must(ff(['-i', file, '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-']), 'rgb read').stdout;
  const g = []; for (let i = 1; i < b.length; i += 3) g.push(b[i]);
  const first = g.slice(0, RW); // first row of the first frame: one value per column
  return {min: Math.min(...first), max: Math.max(...first), distinct: new Set(first).size, columnsAtZero: first.filter((v) => v === 0).length, columnsAt255: first.filter((v) => v === 255).length};
}

// the proof a pixel reader CAN make: any sample outside the limited range proves full; nothing inside it proves limited
export function rangeFromStats(s) {
  const luma = s.ymin < 16 || s.ymax > 235, chroma = s.umin < 16 || s.umax > 240 || s.vmin < 16 || s.vmax > 240;
  return {provesFullByLuma: luma, provesFullByChroma: chroma, verdict: luma || chroma ? 'full' : 'undetermined', lumaOnlyVerdict: luma ? 'full' : 'undetermined'};
}

// ---------------------------------------------------------------------------------------------------------------- colordetect (8.x)
export function filterExists(name) {
  const r = ffRaw('ffmpeg', ['-hide_banner', '-filters']);
  return new RegExp(`^\\s*\\S+\\s+${name}\\s`, 'm').test(r.stdout.toString('utf8'));
}
const normRange = (s) => (s == null ? null : /premult/i.test(s) ? 'premultiplied' : /full|jpeg|pc/i.test(s) && !/undetermined/i.test(s) ? 'full' : /limited|mpeg|tv/i.test(s) && !/undetermined/i.test(s) ? 'limited' : /undetermined|unspecified|unknown/i.test(s) ? 'undetermined' : 'other');
const normAlpha = (s) => (s == null ? null : /premult/i.test(s) ? 'premultiplied' : /opaque/i.test(s) ? 'opaque' : /straight/i.test(s) ? 'straight' : /undetermined|unspecified|unknown/i.test(s) ? 'undetermined' : 'other');
export function parseDetect(stderr) {
  const lines = stderr.split('\n');
  const range = lines.map((l) => /Color range:\s*(.*?)\s*$/.exec(l)).find(Boolean)?.[1] ?? null;
  const alpha = lines.map((l) => /Alpha mode:\s*(.*?)\s*$/.exec(l)).find(Boolean)?.[1] ?? null;
  return {blocks: lines.filter((l) => /Detected color properties/.test(l)).length, rangeText: range, alphaText: alpha, range: normRange(range), alpha: normAlpha(alpha),
    block: lines.filter((l) => /Detected color properties|Color range:|Alpha mode:/.test(l)).map((l) => l.replace(/^\[[^\]]*\]\s*/, '').trim())};
}
export function colordetect(inArgs, input, {mode = 'all', pre = '', opts = null} = {}) {
  const o = opts ?? `mode=${mode}`;
  const r = ffRaw('ffmpeg', ['-hide_banner', '-nostats', '-v', 'info', '-y', ...inArgs, '-vf', `${pre}colordetect${o === '' ? '' : '=' + o}`, '-an', '-f', 'null', '-'], input);
  return {status: r.status, ...parseDetect(r.stderr), stderrTail: r.stderr.split('\n').filter(Boolean).slice(-6)};
}

// where does colordetect leave a trace? (8.x only, recorded not asserted)
export function exploreProps(inArgs, input) {
  const keys = (text, re) => [...new Set(text.split(/\r?\n/).filter((l) => re.test(l)).map((l) => l.trim()))].slice(0, 40);
  const meta = ffRaw('ffmpeg', ['-hide_banner', '-nostats', '-v', 'info', '-y', ...inArgs, '-vf', 'colordetect,metadata=mode=print:file=-', '-an', '-f', 'null', '-'], input);
  const info = ffRaw('ffmpeg', ['-hide_banner', '-nostats', '-v', 'info', '-y', ...inArgs, '-vf', 'colordetect,showinfo', '-an', '-f', 'null', '-'], input);
  return {
    metadataLines: keys(meta.stdout.toString('utf8'), /^lavfi\./),
    metadataHasColordetectKey: /colordetect/i.test(meta.stdout.toString('utf8')),
    showinfoFirst: info.stderr.split('\n').filter((l) => /Parsed_showinfo.*n:\s*0\b/.test(l)).slice(0, 1).map((l) => l.replace(/^\[[^\]]*\]\s*/, '')),
    showinfoMentionsRangeOrAlpha: keys(info.stderr, /showinfo.*(color_range|alpha)/i).map((l) => l.replace(/^\[[^\]]*\]\s*/, '')).slice(0, 3),
  };
}
export function exploreWritten(file, dir) {
  const out = path.join(dir, 'detected_out.mkv');
  const w = ff(['-i', file, '-vf', 'colordetect', '-c:v', 'ffv1', '-an', out]);
  if (w.status !== 0) return {ok: false, err: w.stderr.slice(0, 300)};
  const p = probeStream(out);
  const fr = ffRaw('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_frames', '-read_intervals', '%+#1', '-of', 'json', out]);
  const f0 = JSON.parse(fr.stdout.toString('utf8')).frames?.[0] ?? {};
  fs.rmSync(out, {force: true});
  return {ok: true, streamColorRange: p.color_range, streamAlphaKeys: p.alphaKeys, frameKeysMatching: Object.keys(f0).filter((k) => /range|alpha|color/i.test(k)).map((k) => `${k}=${JSON.stringify(f0[k])}`), frameSideData: f0.side_data_list ?? null};
}

// ---------------------------------------------------------------------------------------------------------------- alpha readers
export function alphaStatsRaw(buf, frames = AFRAMES) {
  let minA = 255, maxA = 0, straightEvidence = 0, firstEvidenceFrame = -1, n = 0, maxOver = 0;
  const per = AW * AH * 4;
  for (let f = 0; f < frames; f++) for (let i = 0; i < per; i += 4) {
    const o = f * per + i, a = buf[o + 3], c = Math.max(buf[o], buf[o + 1], buf[o + 2]); n++;
    if (a < minA) minA = a; if (a > maxA) maxA = a;
    if (c > a) { straightEvidence++; if (firstEvidenceFrame < 0) firstEvidenceFrame = f; maxOver = Math.max(maxOver, c - a); }
  }
  // what the pixels can prove: opaque when alpha is 255 everywhere; straight when some channel exceeds its alpha; otherwise premultiplied is merely possible
  const verdict = minA === 255 ? 'opaque' : straightEvidence > 0 ? 'straight' : 'undetermined';
  return {pixels: n, minA, maxA, straightEvidence, firstEvidenceFrame, maxOver, verdict};
}
const RGBA_IN = ['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${AW}x${AH}`, '-r', '3', '-i', '-'];
export function readAlphaCase(inArgs, input) {
  const raw = must(ff([...inArgs, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], input), 'alpha raw read').stdout;
  const stats = alphaStatsRaw(raw);
  const sig = signalstats(inArgs, input, 'format=rgba,alphaextract,format=yuvj420p,');
  return {raw: stats, alphaSignalstats: {ymin: sig.ymin, ymax: sig.ymax, frames: sig.frames}, first: [...raw.subarray(0, 4)]};
}

// a straight-vs-premultiplied consequence: (128,0,0,128) over mid gray, composited both ways, read as RGB
export function overlayConsequence() {
  const layer = rgbaClip(ALPHA_CONTENT.premult_half_red);
  const R = {};
  for (const mode of ['straight', 'premultiplied']) {
    const out = must(ff([...RGBA_IN, '-f', 'lavfi', '-i', `color=c=0x808080:s=${AW}x${AH}:r=3:d=1,format=rgba`, '-filter_complex', `[1:v][0:v]overlay=format=rgb:alpha=${mode},format=rgb24`, '-frames:v', '1', '-f', 'rawvideo', '-'], layer), `overlay ${mode}`).stdout;
    R[mode] = [out[0], out[1], out[2]];
  }
  return {layer: [128, 0, 0, 128], background: [128, 128, 128], ...R, redDifference: R.premultiplied[0] - R.straight[0]};
}

// ---------------------------------------------------------------------------------------------------------------- encoding with a determinism check
const SUFFIX = {label: '', option: '_opt', vf: '_vf'};
function encodeRange(dir, name, def, tag, via = 'label') {
  const file = path.join(dir, `r_${name}_${tag}${SUFFIX[via]}.mkv`), buf = yuvClip(def), hashes = [];
  const tagArgs = tag === 'none' ? [] : via === 'option' ? ['-color_range', tag] : via === 'vf' ? ['-vf', `setparams=range=${tag}`] : ['-vf', `setparams=range=${tag}`, '-color_range', tag];
  for (let pass = 0; pass < 2; pass++) {
    must(ff(['-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-s', `${RW}x${RH}`, '-r', '3', '-i', '-', ...tagArgs, '-c:v', 'ffv1', '-fflags', '+bitexact', '-flags:v', '+bitexact', file], buf), `encode ${name} ${tag}`);
    hashes.push(sha(fs.readFileSync(file)));
  }
  return {file, sourceSha: sha(buf), fileSha: hashes[0], identicalTwice: hashes[0] === hashes[1]};
}
function encodeAlphaFile(dir, name, def) {
  const file = path.join(dir, `a_${name}.mkv`), buf = rgbaClip(def), hashes = [];
  for (let pass = 0; pass < 2; pass++) {
    must(ff([...RGBA_IN, '-c:v', 'ffv1', '-pix_fmt', 'bgra', '-fflags', '+bitexact', '-flags:v', '+bitexact', file], buf), `encode alpha ${name}`);
    hashes.push(sha(fs.readFileSync(file)));
  }
  return {file, fileSha: hashes[0], identicalTwice: hashes[0] === hashes[1]};
}

// ---------------------------------------------------------------------------------------------------------------- the experiment
export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const version = ffmpegVersion();
  const build = buildOf(version);
  const probeLib = ffRaw('ffmpeg', ['-hide_banner', '-version']).stdout.toString('utf8').split(/\r?\n/);
  const libs = Object.fromEntries(probeLib.filter((l) => /^lib\w+\s+\d+/.test(l)).map((l) => [l.split(/\s+/)[0], l.replace(/^\S+\s+/, '').trim()]));
  const has = filterExists('colordetect');
  const ev = {ffmpeg: version, build, libs, colordetect: {exists: has}};

  // availability: the exact failure on a build without the filter
  const miss = ffRaw('ffmpeg', ['-hide_banner', '-nostats', '-v', 'info', '-f', 'lavfi', '-i', 'color=c=gray:s=64x16:r=3:d=1', '-vf', 'colordetect', '-f', 'null', '-']);
  ev.colordetect.probe = {status: miss.status, noSuchFilter: /No such filter: 'colordetect'/.test(miss.stderr), message: miss.stderr.split('\n').filter((l) => /colordetect|filter/i.test(l)).slice(0, 3)};
  if (has) {
    const help = ffRaw('ffmpeg', ['-hide_banner', '-h', 'filter=colordetect']).stdout.toString('utf8');
    ev.colordetect.help = help.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 20);
    ev.colordetect.hasModeOption = /\bmode\b/.test(help) && /color_range/.test(help) && /alpha_mode/.test(help);
  }

  // ---- range clips ---------------------------------------------------------------------------------------------------------------
  ev.range = {frames: RFRAMES, size: `${RW}x${RH}`, cases: {}};
  const caseList = [...MAIN_RANGE.flatMap((c) => TAGS.map((t) => [c, t, 'label'])), ...EXTRA_RANGE.map((c) => [c, 'tv', 'label']),
    ...MAIN_RANGE.flatMap((c) => ['tv', 'pc'].map((t) => [c, t, 'option'])), ...MAIN_RANGE.flatMap((c) => ['tv', 'pc'].map((t) => [c, t, 'vf']))];
  for (const [content, tag, via] of caseList) {
    const key = `${content}_${tag}${SUFFIX[via]}`, enc = encodeRange(dir, content, RANGE_CONTENT[content], tag, via), file = enc.file;
    const raw = rawYuv(file), sig = signalstats(['-i', file]), pr = probeStream(file), rgb = rgbOf(file);
    const c = {content, tag, via, note: RANGE_CONTENT[content].note, sourceSha: enc.sourceSha, fileSha: enc.fileSha, identicalTwice: enc.identicalTwice, pix_fmt: pr.pix_fmt, probeRange: pr.color_range,
      raw, signalstats: sig, recipe: rangeFromStats(raw), rgb};
    if (has) {
      c.colordetect = {};
      for (const mode of ['all', 'color_range', 'alpha_mode']) c.colordetect[mode] = colordetect(['-i', file], null, {mode});
      c.colordetect.default = colordetect(['-i', file], null, {opts: ''});
    }
    ev.range.cases[key] = c;
  }
  if (has) {
    const f = path.join(dir, 'r_full_tv.mkv'), l = path.join(dir, 'r_limited_tv.mkv');
    ev.colordetect.props = {fullTv: exploreProps(['-i', f], null), limitedTv: exploreProps(['-i', l], null), written: exploreWritten(f, dir)};
  }

  // ---- alpha ---------------------------------------------------------------------------------------------------------------------
  ev.alpha = {frames: AFRAMES, size: `${AW}x${AH}`, cases: {}};
  for (const [name, def] of Object.entries(ALPHA_CONTENT)) {
    const buf = rgbaClip(def), r = readAlphaCase(RGBA_IN, buf);
    const c = {note: def.note, source: 'node', ...r};
    if (has) {
      c.colordetect = {rgba: colordetect(RGBA_IN, buf, {mode: 'all'}), alphaOnly: colordetect(RGBA_IN, buf, {mode: 'alpha_mode'}), yuva420p: colordetect(RGBA_IN, buf, {mode: 'alpha_mode', pre: 'format=yuva420p,'})};
    }
    ev.alpha.cases[name] = c;
  }
  for (const [name, def] of Object.entries(ALPHA_LAVFI)) {
    const inArgs = ['-f', 'lavfi', '-i', def.src], r = readAlphaCase(inArgs, null);
    const c = {note: def.note, source: 'lavfi', src: def.src, ...r};
    if (has) c.colordetect = {rgba: colordetect(inArgs, null, {mode: 'all'}), alphaOnly: colordetect(inArgs, null, {mode: 'alpha_mode'})};
    ev.alpha.cases[name] = c;
  }
  // what the FILE says about alpha: two files, one straight and one premultiplied-consistent, probed
  const fs1 = encodeAlphaFile(dir, 'straight', ALPHA_CONTENT.straight_half_red), fs2 = encodeAlphaFile(dir, 'premult', ALPHA_CONTENT.premult_half_red);
  const p1 = probeStream(fs1.file), p2 = probeStream(fs2.file);
  const strip = (p) => JSON.stringify({...p.raw, tags: undefined, bit_rate: undefined, extradata: undefined, extradata_size: undefined});
  ev.alpha.fileTags = {pix_fmt: [p1.pix_fmt, p2.pix_fmt], alphaKeys: [p1.alphaKeys, p2.alphaKeys], tags: [p1.tags, p2.tags], identicalStreamMetadata: strip(p1) === strip(p2) && JSON.stringify(p1.tags) === JSON.stringify(p2.tags), identicalTwice: fs1.identicalTwice && fs2.identicalTwice};
  if (has) ev.alpha.fileTags.colordetect = {straight: colordetect(['-i', fs1.file], null, {mode: 'alpha_mode'}), premult: colordetect(['-i', fs2.file], null, {mode: 'alpha_mode'})};
  ev.alpha.overlay = overlayConsequence();

  // ---- the full-range ramp lookup from the control: one frame of each content, read once more through the three readers ----------------
  ev.control = {
    fullRamp: {raw: ev.range.cases.full_tv.raw.ymin + '..' + ev.range.cases.full_tv.raw.ymax, stats: ev.range.cases.full_tv.signalstats.ymin + '..' + ev.range.cases.full_tv.signalstats.ymax},
    limitedRamp: {raw: ev.range.cases.limited_tv.raw.ymin + '..' + ev.range.cases.limited_tv.raw.ymax, stats: ev.range.cases.limited_tv.signalstats.ymin + '..' + ev.range.cases.limited_tv.signalstats.ymax},
    opaque: ev.alpha.cases.opaque_red.raw.minA,
  };
  ev.deterministic = Object.values(ev.range.cases).every((c) => c.identicalTwice) && ev.alpha.fileTags.identicalTwice;
  for (const f of fs.readdirSync(dir)) if (/^[ra]_.*\.mkv$/.test(f)) fs.rmSync(path.join(dir, f), {force: true});
  return ev;
}
