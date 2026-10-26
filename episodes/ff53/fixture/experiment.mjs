// Episode 53 fixture: "x264 and x265 at the same CRF: same quality?"
// Synthetic source only (lavfi): testsrc2 (moving pattern, 320x240, 25 fps, 3 s = 75 frames) with temporal noise (noise=alls=6:allf=t),
// stored losslessly (ffv1, yuv420p). Every encode is read back against that source.
// Cases (preset medium, yuv420p, one thread for x264 and one frame thread, no pool for x265, so the files are repeatable):
//   x264 and x265 at -crf 18, 23 and 28; the same two encoders with no -crf at all (their defaults); x264 -qp 0 (lossless, the known positive)
// Readers (each quality number is read two independent ways):
//   quality   reader 1 = ffmpeg's psnr and ssim filters (distorted first, source second)
//             reader 2 = Node: both streams decoded to raw yuv420p, Y plane PSNR (mean of per-frame MSE) and Y plane SSIM (the 8x8 window, stride 4 scheme of ffmpeg's filter), written from scratch
//   size      reader 1 = the file size on disk; reader 2 = ffprobe's format size
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 320, H = 240, FPS = 25, FRAMES = 75;
export const CRFS = [18, 23, 28];
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, {maxBuffer: 1 << 28, ...opts});
const ffm = (args) => { const r = run('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8'}); if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${r.stderr}`); return r; };
const r2 = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : v);
const r4 = (v) => (Number.isFinite(v) ? Math.round(v * 10000) / 10000 : v);

export const SRC_GRAPH = `testsrc2=s=${W}x${H}:r=${FPS}:d=3,noise=alls=6:allf=t,format=yuv420p`;
export const ENC = {
  x264: {lib: 'libx264', extra: ['-threads', '1']},
  x265: {lib: 'libx265', extra: ['-x265-params', 'log-level=error:pools=none:frame-threads=1']},
};
export function makeSource(dir) {
  const f = path.join(dir, 'src.mkv');
  ffm(['-f', 'lavfi', '-i', SRC_GRAPH, '-c:v', 'ffv1', '-level', '3', '-pix_fmt', 'yuv420p', f]);
  return f;
}
export function encode(src, dir, tag, codec, rc) {
  const out = path.join(dir, `${tag}.mp4`), e = ENC[codec];
  ffm(['-i', src, '-c:v', e.lib, ...rc, '-preset', 'medium', '-pix_fmt', 'yuv420p', ...e.extra, '-an', out]);
  return out;
}

// ---- reader 1: ffmpeg psnr and ssim filters ----
const num = (s) => (s === 'inf' ? Infinity : Number(s));
export function parseQuality(stderr) {
  const p = /PSNR y:(\S+) u:(\S+) v:(\S+) average:(\S+)/.exec(stderr), s = /SSIM Y:(\S+) \(\S+\) U:(\S+) \(\S+\) V:(\S+) \(\S+\) All:(\S+)/.exec(stderr);
  if (!p || !s) throw new Error(`no psnr/ssim in: ${stderr.slice(-400)}`);
  return {psnrY: num(p[1]), psnrAvg: num(p[4]), ssimY: num(s[1]), ssimAll: num(s[4])};
}
export function ffmpegQuality(file, src) {
  const r = run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-i', src, '-lavfi', '[0:v][1:v]psnr;[0:v][1:v]ssim', '-f', 'null', '-'], {encoding: 'utf8'});
  if (r.status !== 0) throw new Error(`quality failed: ${r.stderr}`);
  return parseQuality(r.stderr);
}
// ---- reader 2: Node on raw decoded frames ----
export function rawYuv(file) {
  const r = run('ffmpeg', ['-v', 'error', '-i', file, '-an', '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-']);
  if (r.status !== 0) throw new Error(`decode failed: ${r.stderr}`);
  const fsz = W * H * 3 / 2, n = r.stdout.length / fsz;
  if (!Number.isInteger(n)) throw new Error(`raw size ${r.stdout.length}`);
  return {buf: r.stdout, frames: n};
}
export const psnrFromMse = (mse) => (mse === 0 ? Infinity : 10 * Math.log10(255 * 255 / mse));
export function nodePsnrY(a, b, frames) {
  const fsz = W * H * 3 / 2; let sum = 0;
  for (let f = 0; f < frames; f++) { let se = 0; const o = f * fsz; for (let i = 0; i < W * H; i++) { const d = a[o + i] - b[o + i]; se += d * d; } sum += se / (W * H); }
  return psnrFromMse(sum / frames);
}
const C1 = Math.trunc(0.01 * 0.01 * 255 * 255 * 64 + 0.5), C2 = Math.trunc(0.03 * 0.03 * 255 * 255 * 64 * 63 + 0.5);
export function ssimWindow(s1, s2, ss, s12) {
  const vars = ss * 64 - s1 * s1 - s2 * s2, covar = s12 * 64 - s1 * s2;
  return ((2 * s1 * s2 + C1) * (2 * covar + C2)) / ((s1 * s1 + s2 * s2 + C1) * (vars + C2));
}
export function nodeSsimY(a, b, frames) {
  const fsz = W * H * 3 / 2; let total = 0;
  for (let f = 0; f < frames; f++) {
    const o = f * fsz; let acc = 0, cnt = 0;
    for (let by = 0; by + 8 <= H; by += 4) for (let bx = 0; bx + 8 <= W; bx += 4) {
      let s1 = 0, s2 = 0, ss = 0, s12 = 0;
      for (let y = 0; y < 8; y++) { const row = o + (by + y) * W + bx; for (let x = 0; x < 8; x++) { const p = a[row + x], q = b[row + x]; s1 += p; s2 += q; ss += p * p + q * q; s12 += p * q; } }
      acc += ssimWindow(s1, s2, ss, s12); cnt++;
    }
    total += acc / cnt;
  }
  return total / frames;
}
export function sizeFacts(file) {
  const r = run('ffprobe', ['-v', 'error', '-show_entries', 'format=size:stream=codec_name,width,height,nb_read_frames,pix_fmt', '-count_frames', '-of', 'json', file], {encoding: 'utf8'});
  const j = JSON.parse(r.stdout), s = j.streams[0];
  return {probeSize: Number(j.format.size), codec: s.codec_name, width: s.width, height: s.height, frames: Number(s.nb_read_frames), pixFmt: s.pix_fmt};
}
const md5 = (f) => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');
export function framemd5(file) {
  const r = run('ffmpeg', ['-v', 'error', '-i', file, '-an', '-fps_mode', 'passthrough', '-f', 'framemd5', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  return r.stdout.split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());
}

export function measure(file, src, srcRaw) {
  const q = ffmpegQuality(file, src), raw = rawYuv(file);
  const nodePsnr = nodePsnrY(raw.buf, srcRaw.buf, raw.frames), nodeSsim = nodeSsimY(raw.buf, srcRaw.buf, raw.frames);
  const sf = sizeFacts(file);
  return {bytes: fs.statSync(file).size, probeBytes: sf.probeSize, codec: sf.codec, width: sf.width, height: sf.height, frames: sf.frames, rawFrames: raw.frames, pixFmt: sf.pixFmt,
    ffmpeg: {psnrY: q.psnrY, psnrAvg: q.psnrAvg, ssimY: q.ssimY, ssimAll: q.ssimAll}, node: {psnrY: nodePsnr, ssimY: nodeSsim}, md5: md5(file)};
}
const fin = (v) => (Number.isFinite(v) ? v : 'inf');
export const slim = (m) => ({...m, ffmpeg: Object.fromEntries(Object.entries(m.ffmpeg).map(([k, v]) => [k, fin(v)])), node: Object.fromEntries(Object.entries(m.node).map(([k, v]) => [k, fin(v)]))});

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const src = makeSource(dir), srcRaw = rawYuv(src);
  const ev = {ffmpeg: ffmpegVersion(), source: {frames: srcRaw.frames, width: W, height: H, bytes: fs.statSync(src).size, hashes: framemd5(src)}, runs: {}};
  const add = (k, codec, rc, label) => { const f = encode(src, dir, k, codec, rc); ev.runs[k] = {codec, label, ...measure(f, src, srcRaw)}; if (k === 'x264_lossless') ev.runs[k].hashes = framemd5(f); };
  for (const codec of ['x264', 'x265']) {
    for (const crf of CRFS) add(`${codec}_${crf}`, codec, ['-crf', String(crf)], `${codec} -crf ${crf}`);
    add(`${codec}_default`, codec, [], `${codec} with no -crf`);
  }
  add('x264_lossless', 'x264', ['-qp', '0'], 'x264 -qp 0');
  // run-to-run control: the same encode a second time must give the same file, so a difference between codecs is not noise
  ev.repeat = {x264: md5(encode(src, dir, 'x264_23_again', 'x264', ['-crf', '23'])), x265: md5(encode(src, dir, 'x265_23_again', 'x265', ['-crf', '23']))};
  return ev;
}
