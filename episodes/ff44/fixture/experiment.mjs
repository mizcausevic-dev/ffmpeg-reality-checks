// Episode 44 fixture: "I converted an HDR video to SDR with a plain -pix_fmt or scale: why does it look grey and washed out?"
// Synthetic sources only, made in Node as raw 16-bit planes and fed to ffmpeg:
//   hdr.mkv  320x240, 10 frames, yuv420p10le, FFV1 (lossless), tagged HDR10-style: color_primaries bt2020, color_trc smpte2084 (PQ), colorspace bt2020nc, range tv.
//            Ten neutral grey patches (64 x 80), left to right, top row then bottom row, at known light levels:
//            0, 1, 10, 50, 100, 203, 600, 1000, 4000, 10000 nits, each written with the exact ST 2084 code value.
//   sdr.mkv  the known-positive control: the same ten patches as an ordinary SDR clip (tagged bt709 / bt709 / bt709, 10 bit), whose code values
//            are the ones a correct HDR to SDR conversion should produce (expected8 below), so the same command must leave it alone.
// "Expected" SDR value of a patch: the 8-bit limited-range code that makes a 100 nit BT.1886 (gamma 2.4) SDR screen emit the original light,
// clipped at 100 nits: 16 + 219 * min(nits / 100, 1) ^ (1 / 2.4). This is also what zscale produces for 0 to 100 nits (checked by a test).
// Two independent readers on every output file:
//   reader 1  the decoded raw yuv420p planes, mean Y / Cb / Cr of the interior of each patch, computed in Node
//   reader 2  ffmpeg signalstats (YAVG) on a crop of the same window, plus ffprobe for pix_fmt and the color tags
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 320, H = 240, FRAMES = 10, PW = 64, PH = 80;
export const NITS = [0, 1, 10, 50, 100, 203, 600, 1000, 4000, 10000];
export const MID = [2, 3, 4];             // patch indices 10, 50, 100 nits: the mid-tones
export const HIGH = [5, 6, 7, 8, 9];      // 203 .. 10000 nits: above SDR white
export const TAGS_HDR = {color_primaries: 'bt2020', color_transfer: 'smpte2084', color_space: 'bt2020nc', color_range: 'tv'};
export const TAGS_SDR = {color_primaries: 'bt709', color_transfer: 'bt709', color_space: 'bt709', color_range: 'tv'};

// SMPTE ST 2084: nits -> signal 0..1
const m1 = 2610 / 16384, m2 = 2523 / 4096 * 128, c1 = 3424 / 4096, c2 = 2413 / 4096 * 32, c3 = 2392 / 4096 * 32;
export const pq = (nits) => { const p = Math.pow(Math.max(nits, 0) / 10000, m1); return Math.pow((c1 + c2 * p) / (1 + c3 * p), m2); };
export const pqCode10 = (nits) => Math.round(64 + 876 * pq(nits));
export const expected8 = (nits) => Math.round(16 + 219 * Math.pow(Math.min(Math.max(nits, 0) / 100, 1), 1 / 2.4));
// the light a 100 nit gamma 2.4 screen emits for an 8-bit limited-range code (for the on-screen sentence only)
export const screenNits = (code8) => 100 * Math.pow(Math.min(Math.max((code8 - 16) / 219, 0), 1), 2.4);

export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

export function hasFilter(name) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-filters'], {encoding: 'utf8', maxBuffer: 1 << 26});
  return r.status === 0 && r.stdout.split(/\r?\n/).some((l) => l.trim().split(/\s+/)[1] === name);
}

function rawClip(codes10) {
  const Y = new Uint16Array(W * H).fill(64), Cb = new Uint16Array(W * H / 4).fill(512), Cr = new Uint16Array(W * H / 4).fill(512);
  codes10.forEach((v, i) => {
    const cx = (i % 5) * PW, cy = Math.floor(i / 5) * PH;
    for (let y = cy; y < cy + PH; y++) for (let x = cx; x < cx + PW; x++) Y[y * W + x] = v;
  });
  const one = [Buffer.from(Y.buffer), Buffer.from(Cb.buffer), Buffer.from(Cr.buffer)];
  const all = []; for (let f = 0; f < FRAMES; f++) all.push(...one);
  return Buffer.concat(all);
}

// setparams, not the output options -color_primaries and -color_trc: on 8.1.2 those output options tag the matrix and range but leave primaries and transfer unknown.
const tagArgs = (t) => ['-vf', `setparams=color_primaries=${t.color_primaries}:color_trc=${t.color_transfer}:colorspace=${t.color_space}:range=${t.color_range}`];
function makeClip(dir, file, codes10, tags) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'yuv420p10le', '-s', `${W}x${H}`, '-r', '25', '-i', '-', '-c:v', 'ffv1', ...tagArgs(tags), file], {cwd: dir, input: rawClip(codes10), maxBuffer: 1 << 26, encoding: 'utf8'});
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
}

export const HABLE = 'zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p';
export const ZPLAIN = 'zscale=t=bt709:m=bt709:p=bt709:r=tv';
// vf: the filter chain under test (null = none); needs: optional filters; expectFail: the command is expected to be refused
export const CASES = {
  hdr: {
    pix: {vf: null, command: 'ffmpeg -i hdr.mkv -pix_fmt yuv420p out.mp4'},
    scale: {vf: 'scale=out_color_matrix=bt709', command: 'ffmpeg -i hdr.mkv -vf scale=out_color_matrix=bt709 -pix_fmt yuv420p out.mp4'},
    csIall: {vf: 'colorspace=all=bt709:iall=bt2020', command: 'ffmpeg -i hdr.mkv -vf colorspace=all=bt709:iall=bt2020 -pix_fmt yuv420p out.mp4'},
    csPlain: {vf: 'colorspace=all=bt709', expectFail: true, command: 'ffmpeg -i hdr.mkv -vf colorspace=all=bt709 -pix_fmt yuv420p out.mp4'},
    zsPlain: {vf: ZPLAIN, needs: ['zscale'], command: 'ffmpeg -i hdr.mkv -vf zscale=t=bt709:m=bt709:p=bt709:r=tv -pix_fmt yuv420p out.mp4'},
    zsHable: {vf: HABLE, needs: ['zscale', 'tonemap'], command: 'ffmpeg -i hdr.mkv -vf zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p -pix_fmt yuv420p out.mp4'},
  },
  sdr: {
    pix: {vf: null, command: 'ffmpeg -i sdr.mkv -pix_fmt yuv420p out.mp4'},
    scale: {vf: 'scale=out_color_matrix=bt709', command: 'ffmpeg -i sdr.mkv -vf scale=out_color_matrix=bt709 -pix_fmt yuv420p out.mp4'},
    zsPlain: {vf: ZPLAIN, needs: ['zscale'], command: 'ffmpeg -i sdr.mkv -vf zscale=t=bt709:m=bt709:p=bt709:r=tv -pix_fmt yuv420p out.mp4'},
  },
};

function probe(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=pix_fmt,color_space,color_transfer,color_primaries,color_range', '-of', 'json', file], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`ffprobe failed: ${r.stderr}`);
  const s = (JSON.parse(r.stdout).streams ?? [])[0] ?? {};
  return {pixFmt: s.pix_fmt ?? null, color_primaries: s.color_primaries ?? 'unknown', color_transfer: s.color_transfer ?? 'unknown', color_space: s.color_space ?? 'unknown', color_range: s.color_range ?? 'unknown'};
}
const window = (i) => ({x: (i % 5) * PW + 16, y: Math.floor(i / 5) * PH + 16, w: 32, h: 48});

// reader 1: decoded raw yuv420p, mean Y / Cb / Cr of the interior of each patch, averaged over all frames
export function nodePatches(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-an', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-'], {maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${String(r.stderr)}`);
  const fsz = W * H * 3 / 2, n = r.stdout.length / fsz;
  if (!Number.isInteger(n) || n < 1) throw new Error(`unexpected raw size ${r.stdout.length}`);
  const y = [], cb = [], cr = [];
  for (let i = 0; i < NITS.length; i++) {
    const g = window(i); let sy = 0, scb = 0, scr = 0, cy = 0, cc = 0;
    for (let f = 0; f < n; f++) {
      const base = f * fsz;
      for (let yy = g.y; yy < g.y + g.h; yy++) for (let xx = g.x; xx < g.x + g.w; xx++) { sy += r.stdout[base + yy * W + xx]; cy++; }
      for (let yy = g.y / 2; yy < (g.y + g.h) / 2; yy++) for (let xx = g.x / 2; xx < (g.x + g.w) / 2; xx++) { const o = base + W * H + yy * (W / 2) + xx; scb += r.stdout[o]; scr += r.stdout[o + W * H / 4]; cc++; }
    }
    y.push(sy / cy); cb.push(scb / cc); cr.push(scr / cc);
  }
  return {frames: n, y, cb, cr};
}
// reader 2: ffmpeg signalstats YAVG on a crop of the same window (the mean over the frames it prints)
export function statsY(file) {
  const out = [];
  for (let i = 0; i < NITS.length; i++) {
    const g = window(i);
    const r = spawnSync('ffmpeg', ['-hide_banner', '-v', 'info', '-i', file, '-vf', `crop=${g.w}:${g.h}:${g.x}:${g.y},signalstats,metadata=print:file=-`, '-an', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
    if (r.status !== 0) throw new Error(`signalstats failed: ${r.stderr}`);
    const vals = [...r.stdout.matchAll(/lavfi\.signalstats\.YAVG=([0-9.]+)/g)].map((m) => Number(m[1]));
    out.push(vals.reduce((s, v) => s + v, 0) / (vals.length || 1));
  }
  return out;
}

const mean = (xs) => xs.reduce((s, v) => s + v, 0) / (xs.length || 1);
const r1 = (v) => Math.round(v * 10) / 10;

// run one conversion and measure it; src is a path in dir
export function runCase(dir, srcFile, name, c, outName) {
  const rec = {name, command: c.command, vf: c.vf, needs: c.needs ?? [], unsupported: false, failed: false};
  const missing = (c.needs ?? []).filter((f) => !hasFilter(f));
  if (missing.length) { rec.unsupported = true; rec.missing = missing; return rec; }
  const args = ['-v', 'error', '-y', '-i', srcFile, ...(c.vf ? ['-vf', c.vf] : []), '-c:v', 'libx264', '-qp', '0', '-pix_fmt', 'yuv420p', outName];
  const r = spawnSync('ffmpeg', args, {cwd: dir, encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) {
    rec.failed = true; rec.error = (r.stderr ?? '').split(/\r?\n/).filter(Boolean).slice(0, 2).join(' | ');
    return rec;
  }
  const file = path.join(dir, outName);
  rec.tags = probe(file);
  rec.node = nodePatches(file);
  rec.stats = statsY(file);
  rec.y = rec.node.y.map(r1);
  rec.cbMaxDev = r1(Math.max(...rec.node.cb.map((v) => Math.abs(v - 128)), ...rec.node.cr.map((v) => Math.abs(v - 128))));
  rec.readerGap = r1(Math.max(...rec.node.y.map((v, i) => Math.abs(v - rec.stats[i]))));
  return rec;
}

// summary numbers from a measured case
export function summarize(rec, ref = NITS.map(expected8)) {
  if (!rec.y) return {};
  const err = rec.y.map((v, i) => v - ref[i]);
  const low = [0, 1, 2, 3, 4];
  return {
    err: err.map(r1),
    maeLow: r1(mean(low.map((i) => Math.abs(err[i])))),
    maeMid: r1(mean(MID.map((i) => Math.abs(err[i])))),
    maxLowErr: r1(Math.max(...low.map((i) => Math.abs(err[i])))),
    highDistinct: new Set(HIGH.map((i) => Math.round(rec.y[i]))).size,
    highMax: Math.max(...HIGH.map((i) => rec.y[i])),
    white100: rec.y[4],
  };
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const out = {ffmpeg: ffmpegVersion(), zscale: hasFilter('zscale'), tonemap: hasFilter('tonemap'), colorspace: hasFilter('colorspace'), nits: NITS, pqCodes10: NITS.map(pqCode10), pq8: NITS.map((n) => r1((16 + 219 * ((pqCode10(n) - 64) / 876)))), expected: NITS.map(expected8), hdr: {}, sdr: {}};
  makeClip(dir, 'hdr.mkv', NITS.map(pqCode10), TAGS_HDR);
  makeClip(dir, 'sdr.mkv', NITS.map((n) => expected8(n) * 4), TAGS_SDR);
  out.srcTags = {hdr: probe(path.join(dir, 'hdr.mkv')), sdr: probe(path.join(dir, 'sdr.mkv'))};
  for (const kind of ['hdr', 'sdr']) {
    for (const [name, c] of Object.entries(CASES[kind])) {
      const rec = runCase(dir, path.join(dir, `${kind}.mkv`), name, c, `${kind}_${name}.mp4`);
      rec.sum = summarize(rec);
      out[kind][name] = rec;
    }
  }
  // does a reader that trusts the surviving tags recover the picture? feed the naive output (still tagged PQ) to zscale
  const naive = out.hdr.pix;
  out.recover = naive.tags && out.zscale ? runCase(dir, path.join(dir, 'hdr_pix.mp4'), 'recover', {vf: ZPLAIN, needs: ['zscale'], command: 'ffmpeg -i hdr_pix.mp4 -vf zscale=t=bt709:m=bt709:p=bt709:r=tv -pix_fmt yuv420p out.mp4'}, 'hdr_recover.mp4') : {unsupported: true};
  if (out.recover.y) out.recover.sum = summarize(out.recover);
  // the same for the relabelled file: its tags now say bt709, so a tag reader sees nothing to fix
  out.recoverRelabel = out.hdr.csIall.tags && out.zscale ? runCase(dir, path.join(dir, 'hdr_csIall.mp4'), 'recoverRelabel', {vf: ZPLAIN, needs: ['zscale'], command: 'ffmpeg -i hdr_csIall.mp4 -vf zscale=t=bt709:m=bt709:p=bt709:r=tv -pix_fmt yuv420p out.mp4'}, 'hdr_recoverRelabel.mp4') : {unsupported: true};
  if (out.recoverRelabel.y) out.recoverRelabel.sum = summarize(out.recoverRelabel);
  out.screen100 = {naiveNits: r1(screenNits(out.hdr.pix.y[4])), expectedNits: r1(screenNits(expected8(100)))};
  return out;
}
