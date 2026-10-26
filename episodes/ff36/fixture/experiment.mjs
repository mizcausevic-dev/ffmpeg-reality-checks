// Episode 36 fixture: "I set -maxrate 2M for my encode and the bitrate is higher. Why?" (libx264 -maxrate needs -bufsize)
// Synthetic source only: 8 s of testsrc2 (320x180, 25 fps, 200 frames) with deterministic hash noise added to luma (lavfi geq), stored losslessly (FFV1). Hard to compress on purpose.
// Every encode uses libx264 -preset medium -threads 1; only the rate control options change.
// Each encode is read back two independent ways:
//   rate       reader 1  ffprobe packet sizes and timestamps, sliding 1 s window     reader 2  ffmpeg -c copy to a raw Annex B stream (access unit delimiters inserted), Node sums frame sizes, window = 25 frames
//   identity   reader 1  ffmpeg md5 of the copied packets                            reader 2  Node md5 of the raw stream bytes, plus the x264 option string stored in the stream
//   quality    reader 1  ffmpeg psnr filter against the lossless source               reader 2  our own PSNR from decoded raw frames in Node
// x264 rate control is build dependent, so the tests assert relations with margins, not exact numbers.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 320, H = 180, FPS = 25, FRAMES = 200, SECONDS = FRAMES / FPS, MAXRATE_KBPS = 2000;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
const BASE = 'ffmpeg -i src.mkv -c:v libx264';
const mk = (args, note) => ({args, note, command: `${BASE} ${args.join(' ')} out.mp4`});
export const CASES = {
  crf:          mk(['-crf', '18'], 'crf only'),
  maxrate_only: mk(['-crf', '18', '-maxrate', '2M'], 'crf + maxrate, no bufsize'),
  maxrate_2000k: mk(['-crf', '18', '-maxrate', '2000k'], 'the same cap spelled 2000k'),
  params_only:  mk(['-x264-params', 'crf=18:vbv-maxrate=2000'], 'the same cap through x264-params'),
  bufsize_only: mk(['-crf', '18', '-bufsize', '2M'], 'crf + bufsize, no maxrate'),
  buf1x:        mk(['-crf', '18', '-maxrate', '2M', '-bufsize', '2M'], 'bufsize equal to maxrate'),
  buf2x:        mk(['-crf', '18', '-maxrate', '2M', '-bufsize', '4M'], 'bufsize 2x maxrate'),
  abr:          mk(['-b:v', '2M'], 'average bitrate only'),
  tiny:         mk(['-crf', '18', '-maxrate', '2M', '-bufsize', '200k'], 'control: tiny bufsize'),
};
const COMMON = ['-preset', 'medium', '-threads', '1'];

const SRC_FILTER = `testsrc2=s=${W}x${H}:r=${FPS}:d=${SECONDS},format=yuv420p,geq=lum='clip(lum(X,Y)+(mod(abs(sin(X*12.9898+Y*78.233+N*37.719))*43758.5453,1)-0.5)*40,0,255)':cb='cb(X,Y)':cr='cr(X,Y)'`;
// returns {stderr}; throws on failure. -v warning keeps the libx264 warnings.
const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'warning', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 28}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); return r.stderr ?? ''; };
export const md5Of = (buf) => crypto.createHash('md5').update(buf).digest('hex');
export const kbps = (bytes) => (bytes * 8) / SECONDS / 1000;

// x264 version line of the libx264 this ffmpeg is linked with, read from the stream it writes (the SEI user data string)
export function x264Info(buf) {
  const s = buf.toString('latin1'), i = s.indexOf('x264 - core');
  if (i < 0) return {core: null, options: ''};
  const j = s.indexOf('\0', i), line = s.slice(i, j < 0 ? i + 2000 : j);
  const m = /^(x264 - core \d+(?: r\d+)?(?: [0-9a-f]+)?)/.exec(line);
  return {core: m ? m[1] : line.slice(0, 40), options: (/options: (.*)$/.exec(line) ?? [, ''])[1]};
}

// rate reader 1: ffprobe packets (size and a timestamp). dts is the decode order clock; fall back to pts if a build prints N/A.
export function packetsProbe(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=pts_time,dts_time,size', '-of', 'json', file], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`ffprobe failed: ${r.stderr}`);
  const list = (JSON.parse(r.stdout).packets ?? []).map((p) => ({size: Number(p.size), t: Number.isFinite(Number(p.dts_time)) && p.dts_time !== 'N/A' ? Number(p.dts_time) : Number(p.pts_time)}));
  list.sort((a, b) => a.t - b.t);
  return list;
}
// worst bytes inside any window [t, t+1 s) starting at a packet, as kbps
export function worstWindowByTime(list, win = 1) {
  let worst = 0;
  for (let i = 0; i < list.length; i++) {
    let s = 0;
    for (let j = i; j < list.length && list[j].t < list[i].t + win - 1e-9; j++) s += list[j].size;
    worst = Math.max(worst, s);
  }
  return (worst * 8) / win / 1000;
}

// rate reader 2: copy the packets into a raw Annex B file with an access unit delimiter before every frame, then walk the NAL units in Node
export function annexBFrames(file, dir) {
  const out = path.join(dir, 'copy.h264');
  ff(['-i', file, '-map', '0:v:0', '-c:v', 'copy', '-bsf:v', 'h264_metadata=aud=insert', '-f', 'h264', 'copy.h264'], dir);
  const b = fs.readFileSync(out), starts = [];
  for (let i = 0; i + 3 < b.length; i++) if (b[i] === 0 && b[i + 1] === 0 && b[i + 2] === 1) { starts.push(i); i += 2; }
  const sizes = []; let cur = -1;
  for (let k = 0; k < starts.length; k++) {
    const nalType = b[starts[k] + 3] & 31;
    let from = starts[k]; if (from > 0 && b[from - 1] === 0) from -= 1; // a four byte start code
    const to = k + 1 < starts.length ? starts[k + 1] - (b[starts[k + 1] - 1] === 0 ? 1 : 0) : b.length;
    if (nalType === 9) { sizes.push(0); cur = sizes.length - 1; }
    if (cur >= 0) sizes[cur] += to - from;
  }
  return {sizes, bytes: b};
}
// window = the number of frames in one second (constant 25 fps)
export function worstWindowByCount(sizes, n = FPS) {
  let worst = 0;
  for (let i = 0; i < sizes.length; i++) { let s = 0; for (let j = i; j < Math.min(sizes.length, i + n); j++) s += sizes[j]; worst = Math.max(worst, s); }
  return (worst * 8) / 1000;
}

export function packetMd5Ffmpeg(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:v:0', '-c:v', 'copy', '-f', 'md5', '-'], {encoding: 'utf8'});
  if (r.status !== 0) throw new Error(`ffmpeg md5 failed: ${r.stderr}`);
  return /MD5=([0-9a-f]+)/.exec(r.stdout)[1];
}
export function decodeRaw(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-pix_fmt', 'yuv420p', '-f', 'rawvideo', '-'], {maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(`decode failed: ${r.stderr}`);
  return r.stdout;
}
const FRAME = W * H * 3 / 2;
// quality reader 2: PSNR pooled over Y, U and V of each frame, MSE averaged over frames (the definition the psnr filter prints as "average")
export function psnrNode(a, b) {
  if (a.length !== b.length || a.length % FRAME) throw new Error('raw sizes differ');
  const n = a.length / FRAME; let sum = 0;
  for (let f = 0; f < n; f++) { let e = 0; const o = f * FRAME; for (let i = 0; i < FRAME; i++) { const d = a[o + i] - b[o + i]; e += d * d; } sum += e / FRAME; }
  const mse = sum / n; return mse === 0 ? Infinity : 10 * Math.log10(255 * 255 / mse);
}
// quality reader 1: ffmpeg psnr filter, encoded file first, lossless source second
export function psnrFfmpeg(file, src) {
  const r = spawnSync('ffmpeg', ['-v', 'info', '-i', file, '-i', src, '-lavfi', '[0:v][1:v]psnr', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`psnr failed: ${r.stderr}`);
  const p = /PSNR y:([\d.]+) u:([\d.]+) v:([\d.]+) average:([\d.]+)/.exec(r.stderr);
  return Number(p[4]);
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  ff(['-f', 'lavfi', '-i', SRC_FILTER, '-c:v', 'ffv1', 'src.mkv'], dir);
  const src = path.join(dir, 'src.mkv'), srcRaw = decodeRaw(src);
  const version = ffmpegVersion();
  const out = {ffmpeg: version, build: buildOf(version), x264: null, source: {file: 'src.mkv', size: `${W}x${H}`, fps: FPS, frames: srcRaw.length / FRAME, seconds: SECONDS, filter: SRC_FILTER}, maxrateKbps: MAXRATE_KBPS, cases: {}};
  for (const [name, c] of Object.entries(CASES)) {
    const file = path.join(dir, `${name}.mp4`);
    const stderr = ff(['-i', 'src.mkv', '-c:v', 'libx264', ...COMMON, ...c.args, `${name}.mp4`], dir);
    const probe = packetsProbe(file), {sizes, bytes} = annexBFrames(file, dir), raw = decodeRaw(file);
    const probeBytes = probe.reduce((x, y) => x + y.size, 0), annexBytes = sizes.reduce((x, y) => x + y, 0);
    const info = x264Info(bytes); out.x264 ??= info.core;
    out.cases[name] = {
      command: c.command, note: c.note, warning: (stderr.split(/\r?\n/).find((l) => /VBV/i.test(l)) ?? '').replace(/^\[[^\]]*\]\s*/, ''),
      packets: probe.length, frames: sizes.length,
      kbpsProbe: kbps(probeBytes), kbpsAnnexB: kbps(annexBytes),
      worstProbe: worstWindowByTime(probe), worstAnnexB: worstWindowByCount(sizes),
      packetMd5Ffmpeg: packetMd5Ffmpeg(file), streamMd5Node: md5Of(bytes), vbvInStream: /vbv_maxrate=(\d+)/.exec(info.options)?.[1] ?? null, bufInStream: /vbv_bufsize=(\d+)/.exec(info.options)?.[1] ?? null, rcInStream: /rc=(\w+)/.exec(info.options)?.[1] ?? null,
      psnrFfmpeg: psnrFfmpeg(file, src), psnrNode: psnrNode(raw, srcRaw),
    };
  }
  return out;
}
