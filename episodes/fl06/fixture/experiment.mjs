// Deep dive 06 fixture: "Did ffmpeg 8.0 change what my PNGs look like on disk?"
// Question: the png encoder has a -pred option (the PNG scanline filter). On ffmpeg 6.1.1 the help text says "default none".
// Measured here, build-agnostic: the same command is run on any ffmpeg, and everything is written to evidence.json,
// so the evidence of two builds can be compared (see compare.mjs). Exact numbers are asserted in the tests only for the
// build they were measured on (6.1.1); on another build the tests assert relations only.
//
// Synthetic input only: two lavfi sources (testsrc2, mandelbrot) and several images generated in Node from a seeded PRNG
// (flat runs, bands, 4-colour noise, white noise, noisy sinusoid field, smooth gradient, solid, text-like stripes).
// Every encode is run 3 times and the bytes compared (determinism).
//
// Readers (never the same tool twice):
//   reader 1  file size + ffmpeg's own decode of the PNG, hashed by ffmpeg (-c:v rawvideo -f md5), against the md5 of the source pixels
//   reader 2  our own PNG parser in Node (png.mjs): chunks with CRC, zlib inflate of the IDAT stream, the filter-type byte of
//             every scanline (0 none, 1 sub, 2 up, 3 avg, 4 paeth), and our own unfilter to get the pixels back and hash them
// Control: a PNG we build ourselves with known filter bytes (rows cycle 0,1,2,3,4); the parser must read back exactly those
//          bytes, and ffmpeg must decode it to the same pixels as our unfilter and as the source.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';
import {parsePng, buildPng, md5, sha256, FILTER_NAMES} from './png.mjs';

export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
export const W = 320, H = 180;
export const REPEATS = 3;
export const PREDS = ['none', 'sub', 'up', 'avg', 'paeth', 'mixed'];
export const PRED_INDEX = Object.fromEntries(PREDS.map((p, i) => [p, i]));

// ---- synthetic images (rgb24, W x H), seeded so they are identical on every machine ---------------------------------
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const GEN = {
  flat() { const b = Buffer.alloc(W * H * 3), r = rng(1); for (let y = 0; y < H; y++) { let x = 0; while (x < W) { const len = 20 + Math.floor(r() * 60), c = [0, 1, 2].map(() => Math.floor(r() * 4) * 85); for (let i = 0; i < len && x < W; i++, x++) b.set(c, (y * W + x) * 3); } } return b; },
  bands() { const b = Buffer.alloc(W * H * 3); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = Math.floor(x / 40) * 32; b.set([v, 255 - v, (Math.floor(y / 30) * 40) & 255], (y * W + x) * 3); } return b; },
  four_colour_noise() { const b = Buffer.alloc(W * H * 3), r = rng(2), pal = [[0, 0, 0], [255, 255, 255], [200, 30, 30], [30, 30, 200]]; for (let i = 0; i < W * H; i++) b.set(pal[Math.floor(r() * 4)], i * 3); return b; },
  white_noise() { const b = Buffer.alloc(W * H * 3), r = rng(3); for (let i = 0; i < b.length; i++) b[i] = Math.floor(r() * 256); return b; },
  noisy_field() { const b = Buffer.alloc(W * H * 3), r = rng(4); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const base = [128 + 100 * Math.sin(x / 37) * Math.cos(y / 29), 128 + 100 * Math.sin((x + y) / 53), 128 + 100 * Math.cos(x / 23 - y / 41)]; for (let c = 0; c < 3; c++) b[(y * W + x) * 3 + c] = clamp(base[c] + (r() - 0.5) * 12); } return b; },
  smooth_gradient() { const b = Buffer.alloc(W * H * 3); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) b.set([clamp(x * 255 / (W - 1)), clamp(y * 255 / (H - 1)), clamp((x + y) * 255 / (W + H - 2))], (y * W + x) * 3); return b; },
  solid() { return Buffer.alloc(W * H * 3, 200); },
  text_stripes() { const b = Buffer.alloc(W * H * 3, 255); for (let y = 10; y + 9 <= H; y += 14) for (let x = 8; x < W - 8; x++) if (((x * 7 + y * 3) % 11 < 6) && ((x >> 2) % 3 !== 0)) for (let k = 0; k < 9; k++) b.set([0, 0, 0], ((y + k) * W + x) * 3); return b; },
};
// other pixel formats, derived from the noisy field so they are not trivial
const toGray = (rgb) => { const g = Buffer.alloc(W * H); for (let i = 0; i < W * H; i++) g[i] = Math.floor((rgb[i * 3] + rgb[i * 3 + 1] + rgb[i * 3 + 2]) / 3); return g; };
const toRgba = (rgb) => { const o = Buffer.alloc(W * H * 4); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; o[i * 4] = rgb[i * 3]; o[i * 4 + 1] = rgb[i * 3 + 1]; o[i * 4 + 2] = rgb[i * 3 + 2]; o[i * 4 + 3] = clamp(x * 255 / (W - 1)); } return o; };
const toRgb48 = (rgb) => { const o = Buffer.alloc(W * H * 6); for (let i = 0; i < W * H * 3; i++) { const v = rgb[i] * 257; o[i * 2] = v >> 8; o[i * 2 + 1] = v & 255; } return o; };

// name -> {pix: pixel format, from: 'node'|'lavfi', ...}
export const CONTENT = {
  testsrc2:        {pix: 'rgb24', from: 'lavfi', lavfi: 'testsrc2=size=640x360:rate=1', w: 640, h: 360, what: 'lavfi testsrc2 640x360'},
  mandelbrot:      {pix: 'rgb24', from: 'lavfi', lavfi: 'mandelbrot=size=640x360:rate=1', w: 640, h: 360, what: 'lavfi mandelbrot 640x360'},
  noisy_field:     {pix: 'rgb24', from: 'node', make: GEN.noisy_field, w: W, h: H, what: 'smooth sinusoid colour field plus noise of +-6 (photo-like)'},
  smooth_gradient: {pix: 'rgb24', from: 'node', make: GEN.smooth_gradient, w: W, h: H, what: 'smooth two-axis colour gradient, no noise'},
  bands:           {pix: 'rgb24', from: 'node', make: GEN.bands, w: W, h: H, what: 'hard vertical and horizontal colour bands'},
  flat:            {pix: 'rgb24', from: 'node', make: GEN.flat, w: W, h: H, what: 'flat colour runs (4 levels per channel), new run every 20 to 80 pixels'},
  text_stripes:    {pix: 'rgb24', from: 'node', make: GEN.text_stripes, w: W, h: H, what: 'black marks on white, text-like'},
  four_colour_noise: {pix: 'rgb24', from: 'node', make: GEN.four_colour_noise, w: W, h: H, what: 'every pixel one of 4 colours, at random'},
  white_noise:     {pix: 'rgb24', from: 'node', make: GEN.white_noise, w: W, h: H, what: 'uniform random bytes (incompressible)'},
  solid:           {pix: 'rgb24', from: 'node', make: GEN.solid, w: W, h: H, what: 'one flat grey'},
  noisy_field_rgba:   {pix: 'rgba', from: 'node', make: () => toRgba(GEN.noisy_field()), w: W, h: H, what: 'noisy field with an alpha ramp'},
  noisy_field_rgb48:  {pix: 'rgb48be', from: 'node', make: () => toRgb48(GEN.noisy_field()), w: W, h: H, what: 'noisy field as 16-bit samples (8-bit value x 257)'},
  noisy_field_gray:   {pix: 'gray', from: 'node', make: () => toGray(GEN.noisy_field()), w: W, h: H, what: 'noisy field as 8-bit grey'},
  smooth_gradient_rgba:  {pix: 'rgba', from: 'node', make: () => toRgba(GEN.smooth_gradient()), w: W, h: H, what: 'gradient with an alpha ramp'},
  smooth_gradient_rgb48: {pix: 'rgb48be', from: 'node', make: () => toRgb48(GEN.smooth_gradient()), w: W, h: H, what: 'gradient as 16-bit samples'},
  smooth_gradient_gray:  {pix: 'gray', from: 'node', make: () => toGray(GEN.smooth_gradient()), w: W, h: H, what: 'gradient as 8-bit grey'},
};

// ---- ffmpeg plumbing -----------------------------------------------------------------------------------------------
const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {cwd, encoding: 'utf8', maxBuffer: 1 << 28}); if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${r.stderr}`); return r; };
const ffBin = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', ...args], {cwd, maxBuffer: 1 << 28}); if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${r.stderr}`); return r.stdout; };
const md5Line = (out) => /MD5=([0-9a-f]{32})/.exec(out.toString())?.[1];

// ffmpeg's own md5 of its decode of a file / of a lavfi source, as raw frames in pixel format `pix`
export const decodeMd5Ffmpeg = (file, pix, cwd) => md5Line(ffBin(['-i', file, '-map', '0:v', '-c:v', 'rawvideo', '-pix_fmt', pix, '-f', 'md5', '-'], cwd));
export const lavfiMd5 = (lavfi, pix, cwd) => md5Line(ffBin(['-f', 'lavfi', '-i', lavfi, '-frames:v', '1', '-pix_fmt', pix, '-c:v', 'rawvideo', '-f', 'md5', '-'], cwd));

// help text: the default the build itself reports for -pred, and the option names
export function encoderHelp() {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-h', 'encoder=png'], {encoding: 'utf8'});
  const text = (r.stdout ?? '') + (r.stderr ?? '');
  const predLine = text.split(/\r?\n/).find((l) => /^\s*-pred\s/.test(l)) ?? '';
  return {predLine: predLine.trim(), predDefault: /\(default (\w+)\)/.exec(predLine)?.[1] ?? null, hasPred: predLine !== '', pixelFormats: (/Supported pixel formats: (.*)/.exec(text)?.[1] ?? '').trim()};
}

// the encode command a viewer would type (shown on screen) and the argument array we spawn
function encodeSpec(name, c, predArgs, extra) {
  const input = c.from === 'lavfi' ? ['-f', 'lavfi', '-i', c.lavfi] : ['-f', 'rawvideo', '-pixel_format', c.pix, '-video_size', `${c.w}x${c.h}`, '-framerate', '1', '-i', `${name}.raw`];
  const tail = ['-frames:v', '1', '-pix_fmt', c.pix, ...predArgs, ...extra, '-update', '1'];
  const shown = c.from === 'lavfi' ? `ffmpeg -f lavfi -i ${c.lavfi} -frames:v 1 -pix_fmt ${c.pix}${[...predArgs, ...extra].length ? ' ' + [...predArgs, ...extra].join(' ') : ''} out.png`
    : `ffmpeg -f rawvideo -pixel_format ${c.pix} -video_size ${c.w}x${c.h} -i in.raw -frames:v 1${[...predArgs, ...extra].length ? ' ' + [...predArgs, ...extra].join(' ') : ''} out.png`;
  return {input, tail, shown};
}

// Several encodes of one source, all in ONE ffmpeg process (one output per item, each with its own -pred): this keeps the
// fixture fast. The batch is run REPEATS times and the bytes compared; the commands shown on screen are the single-output
// form, so the items marked `single` are also run that way, once, to prove the batch gives the same bytes.
function batch(dir, name, c, srcMd5, items) {
  const {input} = encodeSpec(name, c, [], []);
  const outName = (r, it) => `${name}__${it.label}__r${r}.png`;
  for (let r = 0; r < REPEATS; r++) {
    const args = [...input];
    for (const it of items) args.push('-frames:v', '1', '-pix_fmt', c.pix, ...it.predArgs, ...(it.extra ?? []), '-c:v', 'png', '-update', '1', outName(r, it));
    ff(args, dir);
  }
  const out = {};
  // reader 1: ffmpeg decodes every run-0 file, hashed by ffmpeg (one process, one md5 per input)
  const dargs = [];
  items.forEach((it, i) => dargs.push('-i', outName(0, it)));
  items.forEach((it, i) => dargs.push('-map', `${i}:v`, '-c:v', 'rawvideo', '-pix_fmt', c.pix, '-f', 'md5', `${name}__${it.label}.md5`));
  ff(dargs, dir);
  for (const it of items) {
    const files = Array.from({length: REPEATS}, (_, r) => fs.readFileSync(path.join(dir, outName(r, it))));
    const png = files[0], p = parsePng(png);
    const decodedMd5Ffmpeg = /MD5=([0-9a-f]{32})/.exec(fs.readFileSync(path.join(dir, `${name}__${it.label}.md5`), 'utf8'))?.[1];
    let singleSame = null;
    if (it.single) { const {input: i2, tail, shown} = encodeSpec(name, c, it.predArgs, it.extra ?? []); ff([...i2, ...tail, '-c:v', 'png', `${name}__single.png`], dir); singleSame = sha256(fs.readFileSync(path.join(dir, `${name}__single.png`))) === sha256(png); fs.rmSync(path.join(dir, `${name}__single.png`), {force: true}); it.shown = shown; }
    out[it.label] = {
      command: it.shown ?? encodeSpec(name, c, it.predArgs, it.extra ?? []).shown, bytes: png.length, sha256: sha256(png),
      repeatsIdentical: files.every((f) => f.equals(png)), singleCommandSame: singleSame,
      reader2: {histogram: p.histogram, firstRows: p.firstRows, idatBytes: p.idatBytes, inflatedBytes: p.inflatedBytes, inflatedMd5: p.inflatedMd5, idatLengths: p.idatLengths, zlibHeader: p.zlibHeader, chunkTypes: p.chunkTypes, allCrcOk: p.allCrcOk, bitDepth: p.bitDepth, colorType: p.colorType, pixelMd5: p.pixelMd5},
      reader1: {decodedMd5: decodedMd5Ffmpeg},
      srcMd5, pixelsMatchSource: decodedMd5Ffmpeg === srcMd5 && p.pixelMd5 === srcMd5, readersAgree: decodedMd5Ffmpeg === p.pixelMd5,
      dominantFilter: p.histogram.indexOf(Math.max(...p.histogram)),
    };
    for (let r = 0; r < REPEATS; r++) fs.rmSync(path.join(dir, outName(r, it)), {force: true});
    fs.rmSync(path.join(dir, `${name}__${it.label}.md5`), {force: true});
  }
  return out;
}

// ---- the control: a PNG with filter bytes we chose ----------------------------------------------------------------
function control(dir) {
  const px = GEN.noisy_field();
  const out = {};
  const cases = {
    cycle: {filterOf: (y) => y % 5, expect: Array.from({length: H}, (_, y) => y % 5)},
    all_paeth: {filterOf: () => 4, expect: Array(H).fill(4)},
    all_none: {filterOf: () => 0, expect: Array(H).fill(0)},
  };
  for (const [k, c] of Object.entries(cases)) {
    const png = buildPng({width: W, height: H, pixels: px, filterOf: c.filterOf});
    const f = `control_${k}.png`;
    fs.writeFileSync(path.join(dir, f), png);
    const p = parsePng(png);
    const srcMd5 = md5(px);
    out[k] = {
      bytes: png.length, expectedRows: c.expect.slice(0, 12), parsedRows: p.firstRows, rowsMatchExactly: p.rows.every((v, i) => v === c.expect[i]), histogram: p.histogram,
      allCrcOk: p.allCrcOk, nodePixelMd5: p.pixelMd5, ffmpegDecodedMd5: decodeMd5Ffmpeg(f, 'rgb24', dir), srcMd5,
    };
    fs.rmSync(path.join(dir, f), {force: true});
  }
  return out;
}

// ---- everything ----------------------------------------------------------------------------------------------------
export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const ver = ffmpegVersion();
  const t0 = Date.now();
  const ev = {ffmpeg: ver, build: buildOf(ver), help: encoderHelp(), repeats: REPEATS, source: {width: W, height: H}, control: control(dir), contents: {}, levels: {}};
  const vtext = spawnSync('ffmpeg', ['-version'], {encoding: 'utf8'}).stdout ?? '';
  ev.libs = vtext.split(/\r?\n/).filter((l) => /^lib(avcodec|avutil)\s/.test(l)).map((l) => l.replace(/\s+/g, ' ').trim());
  ev.deflateLibs = (vtext.match(/--enable-(zlib|libdeflate|zlib-ng)\b/g) ?? []).map((m) => m.replace('--enable-', ''));
  ev.versionHead = vtext.split(/\r?\n/).slice(0, 2).map((l) => l.slice(0, 120));

  for (const [name, c] of Object.entries(CONTENT)) {
    let srcMd5;
    if (c.from === 'node') { const buf = c.make(); fs.writeFileSync(path.join(dir, `${name}.raw`), buf); srcMd5 = md5(buf); }
    else { const a = lavfiMd5(c.lavfi, c.pix, dir), b = lavfiMd5(c.lavfi, c.pix, dir), d = lavfiMd5(c.lavfi, c.pix, dir); srcMd5 = a; if (a !== b || a !== d) srcMd5 = `NONDETERMINISTIC:${a},${b},${d}`; }
    const rec = {what: c.what, pix: c.pix, width: c.w, height: c.h, srcMd5, runs: {}};
    const items = [{label: 'default', predArgs: [], single: true}, ...PREDS.map((p) => ({label: p, predArgs: ['-pred', p], single: p === 'paeth'}))];
    rec.runs = batch(dir, name, c, srcMd5, items);
    ev.contents[name] = rec;
  }

  // -compression_level interplay (zlib level), default predictor and explicit paeth, on three contents
  for (const name of ['noisy_field', 'smooth_gradient', 'flat']) {
    const c = CONTENT[name], srcMd5 = ev.contents[name].srcMd5, rec = {};
    const items = [];
    for (const lvl of [0, 1, 6, 9]) for (const k of ['default', 'none', 'paeth']) items.push({label: `${k}_l${lvl}`, predArgs: k === 'default' ? [] : ['-pred', k], extra: ['-compression_level', String(lvl)]});
    Object.assign(rec, batch(dir, name, c, srcMd5, items));
    ev.levels[name] = rec;
  }

  for (const f of fs.readdirSync(dir)) if (/\.raw$/.test(f)) fs.rmSync(path.join(dir, f), {force: true});
  ev.seconds = Math.round((Date.now() - t0) / 100) / 10;
  ev.summary = summarize(ev);
  return ev;
}

// compact table used by run.mjs, compare.mjs and PLAN.md: bytes per pred per content, plus the filter the default used
export function summarize(ev) {
  const table = {};
  for (const [name, c] of Object.entries(ev.contents)) {
    const d = c.runs.default;
    table[name] = {
      default: {bytes: d.bytes, histogram: d.reader2.histogram, dominant: FILTER_NAMES[d.dominantFilter]},
      ...Object.fromEntries(PREDS.map((p) => [p, {bytes: c.runs[p].bytes, histogram: c.runs[p].reader2.histogram}])),
      defaultEqualsExplicit: PREDS.filter((p) => c.runs[p].sha256 === d.sha256),
      defaultVsNone: d.bytes / c.runs.none.bytes, defaultVsPaeth: d.bytes / c.runs.paeth.bytes,
    };
  }
  return table;
}

// Compare two evidence files (two builds). For every content and every -pred: do the files have the same bytes, the same
// decoded pixels, the same filter histogram? Also: which explicit -pred on build A has the same bytes as build B's default.
export function compareEvidence(a, b) {
  const rows = [];
  for (const [name, ca] of Object.entries(a.contents)) {
    const cb = b.contents[name];
    if (!cb) continue;
    for (const [label, ra] of Object.entries(ca.runs)) {
      const rb = cb.runs[label];
      if (!rb) continue;
      rows.push({content: name, run: label, bytesA: ra.bytes, bytesB: rb.bytes, sameBytes: ra.sha256 === rb.sha256, samePixels: ra.reader1.decodedMd5 === rb.reader1.decodedMd5 && ra.reader2.pixelMd5 === rb.reader2.pixelMd5,
        histA: ra.reader2.histogram, histB: rb.reader2.histogram, sameHistogram: JSON.stringify(ra.reader2.histogram) === JSON.stringify(rb.reader2.histogram), sameChunks: JSON.stringify(ra.reader2.chunkTypes) === JSON.stringify(rb.reader2.chunkTypes),
        sameFilteredData: ra.reader2.inflatedMd5 && rb.reader2.inflatedMd5 ? ra.reader2.inflatedMd5 === rb.reader2.inflatedMd5 : null});
    }
  }
  const explicit = rows.filter((r) => r.run !== 'default');
  const defaults = rows.filter((r) => r.run === 'default');
  const defaultVsExplicit = {};
  for (const name of Object.keys(b.contents)) {
    const d = b.contents[name].runs.default, m = Object.entries(a.contents[name]?.runs ?? {}).filter(([, r]) => r.sha256 === d.sha256).map(([k]) => k);
    defaultVsExplicit[name] = {bytesB: d.bytes, histB: d.reader2.histogram, aExplicitWithSameBytes: m};
  }
  return {
    a: a.ffmpeg, b: b.ffmpeg, rows,
    allPixelsSame: rows.every((r) => r.samePixels),
    filteredDataKnown: rows.filter((r) => r.sameFilteredData !== null).length,
    explicitSameFilteredData: explicit.filter((r) => r.sameFilteredData === true).length,
    explicitSameHistogram: explicit.filter((r) => r.sameHistogram).length,
    explicitSameBytes: explicit.filter((r) => r.sameBytes).length, explicitTotal: explicit.length,
    explicitDifferent: explicit.filter((r) => !r.sameBytes).map((r) => `${r.content}/${r.run}`),
    defaultSameBytes: defaults.filter((r) => r.sameBytes).length, defaultTotal: defaults.length,
    defaultVsExplicit,
  };
}
