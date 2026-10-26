// Episode 30 fixture: "Why does my VP9 -crf look bad? It needs -b:v 0."
// Synthetic source only: 2 s of testsrc2 (320x180, 25 fps, 50 frames) with deterministic hash noise added to luma (lavfi geq), stored losslessly (FFV1).
// Every encode uses libvpx-vp9 -deadline good -cpu-used 5 -row-mt 1 (fast, and the same for every case); only -crf and -b:v change.
// Each encode is read back two independent ways:
//   bitrate   reader 1  ffprobe packet sizes          reader 2  ffmpeg -c copy -f ivf, frame sizes parsed in Node
//   identity  reader 1  ffmpeg md5 of the copied packets   reader 2  Node md5 of the IVF payloads, plus md5 of the decoded raw frames
//   quality   reader 1  ffmpeg psnr and ssim filters against the lossless source   reader 2  our own PSNR from decoded raw frames in Node (ssim has reader 1 only)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 320, H = 180, FPS = 25, FRAMES = 50, SECONDS = FRAMES / FPS;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
const BASE = 'ffmpeg -i src.mkv -c:v libvpx-vp9 -deadline good -cpu-used 5 -row-mt 1';
const mk = (crf, extra = []) => ({crf, extra, args: ['-crf', String(crf), ...extra], command: `${BASE} -crf ${crf}${extra.length ? ' ' + extra.join(' ') : ''} out.webm`});
export const CASES = {
  crf30:         mk(30),
  crf30_b0:      mk(30, ['-b:v', '0']),
  crf30_b256k:   mk(30, ['-b:v', '256k']),
  crf30_b500k:   mk(30, ['-b:v', '500k']),
  crf20:         mk(20),
  crf20_b0:      mk(20, ['-b:v', '0']),
  crf20_b500k:   mk(20, ['-b:v', '500k']),
  crf40:         mk(40),
  crf40_b0:      mk(40, ['-b:v', '0']),
  crf40_b500k:   mk(40, ['-b:v', '500k']),
};

const SRC_FILTER = `testsrc2=s=${W}x${H}:r=${FPS}:d=${SECONDS},format=yuv420p,geq=lum='clip(lum(X,Y)+(mod(abs(sin(X*12.9898+Y*78.233+N*37.719))*43758.5453,1)-0.5)*40,0,255)':cb='cb(X,Y)':cr='cr(X,Y)'`;
const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 28}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };
export const md5Of = (buf) => crypto.createHash('md5').update(buf).digest('hex');
export const kbps = (bytes) => (bytes * 8) / SECONDS / 1000;

// bitrate reader 1: ffprobe packet sizes (the real video payload, not the container header)
export function packetSizesProbe(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=size', '-of', 'csv=p=0', file], {encoding: 'utf8'});
  if (r.status !== 0) throw new Error(`ffprobe failed: ${r.stderr}`);
  return r.stdout.split(/\r?\n/).map((l) => l.replace(/,$/, '').trim()).filter(Boolean).map(Number);
}

// bitrate reader 2: copy the packets into an IVF file and walk it in Node (32 byte header, then 12 byte frame headers: u32 size, u64 pts)
export function ivfPayloads(file, dir) {
  const out = path.join(dir, 'copy.ivf');
  ff(['-i', file, '-map', '0:v:0', '-c:v', 'copy', '-f', 'ivf', 'copy.ivf'], dir);
  const b = fs.readFileSync(out), payloads = [];
  let o = b.readUInt16LE(6);
  while (o + 12 <= b.length) { const n = b.readUInt32LE(o); payloads.push(b.subarray(o + 12, o + 12 + n)); o += 12 + n; }
  return payloads;
}

// identity reader 1: ffmpeg's own md5 over the copied packets
export function packetMd5Ffmpeg(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:v:0', '-c:v', 'copy', '-f', 'md5', '-'], {encoding: 'utf8'});
  if (r.status !== 0) throw new Error(`ffmpeg md5 failed: ${r.stderr}`);
  return /MD5=([0-9a-f]+)/.exec(r.stdout)[1];
}

// decoded frames as raw yuv420p, for the Node PSNR and a decoded-frame md5
export function decodeRaw(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-pix_fmt', 'yuv420p', '-f', 'rawvideo', '-'], {maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(`decode failed: ${r.stderr}`);
  return r.stdout;
}
const FRAME = W * H * 3 / 2, YSIZE = W * H;

// quality reader 2: PSNR from raw bytes. Pooled over Y, U and V of each frame, then the MSE averaged over frames (the same definition the ffmpeg psnr filter prints as "average"); Y-only too.
export function psnrNode(a, b) {
  if (a.length !== b.length || a.length % FRAME) throw new Error('raw sizes differ');
  const n = a.length / FRAME; let sumAll = 0, sumY = 0;
  for (let f = 0; f < n; f++) {
    let ey = 0, eall = 0; const o = f * FRAME;
    for (let i = 0; i < FRAME; i++) { const d = a[o + i] - b[o + i]; const s = d * d; eall += s; if (i < YSIZE) ey += s; }
    sumAll += eall / FRAME; sumY += ey / YSIZE;
  }
  const db = (mse) => (mse === 0 ? Infinity : 10 * Math.log10(255 * 255 / mse));
  return {avg: db(sumAll / n), y: db(sumY / n)};
}

// quality reader 1: ffmpeg psnr and ssim filters, encoded file first, lossless source second
export function qualityFfmpeg(file, src) {
  const r = spawnSync('ffmpeg', ['-v', 'info', '-i', file, '-i', src, '-lavfi', '[0:v][1:v]psnr;[0:v][1:v]ssim', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`psnr/ssim failed: ${r.stderr}`);
  const p = /PSNR y:([\d.]+) u:([\d.]+) v:([\d.]+) average:([\d.]+)/.exec(r.stderr), s = /SSIM Y:([\d.]+).*? All:([\d.]+)/.exec(r.stderr);
  return {psnrY: Number(p[1]), psnrAvg: Number(p[4]), ssimY: Number(s[1]), ssimAll: Number(s[2])};
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  ff(['-f', 'lavfi', '-i', SRC_FILTER, '-c:v', 'ffv1', 'src.mkv'], dir);
  const src = path.join(dir, 'src.mkv'), srcRaw = decodeRaw(src);
  const out = {ffmpeg: ffmpegVersion(), build: buildOf(ffmpegVersion()), source: {file: 'src.mkv', size: `${W}x${H}`, fps: FPS, frames: srcRaw.length / FRAME, seconds: SECONDS, filter: SRC_FILTER}, cases: {}};
  for (const [name, c] of Object.entries(CASES)) {
    const file = path.join(dir, `${name}.webm`);
    ff(['-i', 'src.mkv', '-c:v', 'libvpx-vp9', '-deadline', 'good', '-cpu-used', '5', '-row-mt', '1', ...c.args, `${name}.webm`], dir);
    const probe = packetSizesProbe(file), pay = ivfPayloads(file, dir), raw = decodeRaw(file);
    const bytesProbe = probe.reduce((x, y) => x + y, 0), bytesIvf = pay.reduce((x, y) => x + y.length, 0);
    const q1 = qualityFfmpeg(file, src), q2 = psnrNode(raw, srcRaw);
    out.cases[name] = {
      command: c.command, crf: c.crf, bFlag: c.extra.length ? c.extra[1] : 'none',
      packets: probe.length, packetsIvf: pay.length, bytesProbe, bytesIvf, kbpsProbe: kbps(bytesProbe), kbpsIvf: kbps(bytesIvf),
      fileBytes: fs.statSync(file).size,
      packetMd5Ffmpeg: packetMd5Ffmpeg(file), packetMd5Node: md5Of(Buffer.concat(pay)), decodedMd5: md5Of(raw),
      ffmpegPsnrY: q1.psnrY, ffmpegPsnrAvg: q1.psnrAvg, ffmpegSsimY: q1.ssimY, ffmpegSsimAll: q1.ssimAll,
      nodePsnrY: q2.y, nodePsnrAvg: q2.avg,
    };
  }
  return out;
}
