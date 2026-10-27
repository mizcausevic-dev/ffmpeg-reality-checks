// fl07 / fs07 fixture: libsvtav1 vs libaom-av1, and what -crf, -b:v 0, presets and keyframes really do.
// Synthetic input only (lavfi), stored losslessly (FFV1):
//   clean  testsrc2 320x180, 25 fps, 50 frames          noisy  the same plus deterministic hash noise on luma (as ff30)
//   long   testsrc2 160x90, 25 fps, 400 frames (16 s), for keyframes and seeking
// Readers (every claim has two that do not share code):
//   bytes      reader 1  ffprobe packet sizes             reader 2  ffmpeg -c copy -f ivf, then our own OBU walker in Node (temporal delimiters not counted)
//   quality    reader 1  ffmpeg psnr and ssim filters      reader 2  our own PSNR from decoded raw frames in Node, plus the decoded-frame md5
//   keyframes  reader 1  ffprobe packet flags (K)          reader 2  our OBU walker: frame_type of the first frame header in every temporal unit
//   seeking    reader 1  ffprobe -read_intervals landing   reader 2  the keyframe list from the OBU walker; behaviour check: ffmpeg -ss returns the right frame (md5)
// Determinism: every encode runs twice (a few expensive ones once, marked twice:false) and the output file md5 is compared.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const FPS = 25;
export const SRC = {
  clean: {w: 320, h: 180, frames: 50, filter: `testsrc2=s=320x180:r=25:d=2,format=yuv420p`},
  noisy: {w: 320, h: 180, frames: 50, filter: `testsrc2=s=320x180:r=25:d=2,format=yuv420p,geq=lum='clip(lum(X,Y)+(mod(abs(sin(X*12.9898+Y*78.233+N*37.719))*43758.5453,1)-0.5)*40,0,255)':cb='cb(X,Y)':cr='cr(X,Y)'`},
  long:  {w: 160, h: 90, frames: 400, filter: `testsrc2=s=160x90:r=25:d=16,format=yuv420p`},
};
export const SEEK_FRAME = 300; // 12 s at 25 fps
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
export const md5Of = (buf) => crypto.createHash('md5').update(buf).digest('hex');

const svt = (preset, extra = []) => ({lib: 'svt', args: ['-c:v', 'libsvtav1', '-preset', String(preset), ...extra]});
const aom = (cpu, extra = []) => ({lib: 'aom', args: ['-c:v', 'libaom-av1', '-cpu-used', String(cpu), ...extra]});
const cmd = (c, src) => `ffmpeg -i ${src}.mkv ${c.args.join(' ')} out.mkv`;
// name -> {src, enc, twice?, expectFail?}
export const CASES = {
  // libsvtav1, clean
  svt_clean_p4_crf30:       {src: 'clean', enc: svt(4, ['-crf', '30']), twice: false},
  svt_clean_p8_crf30:       {src: 'clean', enc: svt(8, ['-crf', '30'])},
  svt_clean_p12_crf30:      {src: 'clean', enc: svt(12, ['-crf', '30'])},
  svt_clean_p8_crf0:        {src: 'clean', enc: svt(8, ['-crf', '0'])},
  svt_clean_p8_nocrf:       {src: 'clean', enc: svt(8)},
  svt_clean_p8_crf63:       {src: 'clean', enc: svt(8, ['-crf', '63'])},
  svt_clean_p8_crf64:       {src: 'clean', enc: svt(8, ['-crf', '64']), expectFail: true},
  svt_clean_p8_crf30_b0:    {src: 'clean', enc: svt(8, ['-crf', '30', '-b:v', '0'])},
  svt_clean_p8_crf30_b500k: {src: 'clean', enc: svt(8, ['-crf', '30', '-b:v', '500k'])},
  svt_clean_p8_b500k:       {src: 'clean', enc: svt(8, ['-b:v', '500k'])},
  // libaom-av1, clean
  aom_clean_u8_crf30:       {src: 'clean', enc: aom(8, ['-crf', '30'])},
  aom_clean_u8_crf30_b0:    {src: 'clean', enc: aom(8, ['-crf', '30', '-b:v', '0']), twice: false},
  aom_clean_u8_crf30_b500k: {src: 'clean', enc: aom(8, ['-crf', '30', '-b:v', '500k']), twice: false},
  aom_clean_u8_b500k:       {src: 'clean', enc: aom(8, ['-b:v', '500k']), twice: false},
  aom_clean_u8_crf0:        {src: 'clean', enc: aom(8, ['-crf', '0'])},
  aom_clean_u8_lossless:    {src: 'clean', enc: aom(8, ['-crf', '0', '-aom-params', 'lossless=1']), twice: false},
  aom_clean_u8_crf64:       {src: 'clean', enc: aom(8, ['-crf', '64']), expectFail: true},
  // noisy
  svt_noisy_p8_crf30:       {src: 'noisy', enc: svt(8, ['-crf', '30'])},
  svt_noisy_p12_crf30:      {src: 'noisy', enc: svt(12, ['-crf', '30'])},
  svt_noisy_p8_crf30_b500k: {src: 'noisy', enc: svt(8, ['-crf', '30', '-b:v', '500k']), twice: false},
  aom_noisy_u8_crf30:       {src: 'noisy', enc: aom(8, ['-crf', '30']), twice: false},
  aom_noisy_u8_crf30_b500k: {src: 'noisy', enc: aom(8, ['-crf', '30', '-b:v', '500k']), twice: false},
};
// long clip (keyframes): default gop and -g 25, same crf and speed for both encoders
export const LONG_CASES = {
  svt_long_default: {src: 'long', enc: svt(12, ['-crf', '30'])},
  aom_long_default: {src: 'long', enc: aom(8, ['-crf', '30']), twice: false},
  svt_long_g25:     {src: 'long', enc: svt(12, ['-crf', '30', '-g', '25'])},
  aom_long_g25:     {src: 'long', enc: aom(8, ['-crf', '30', '-g', '25']), twice: false},
  svt_long_g100:    {src: 'long', enc: svt(12, ['-crf', '30', '-g', '100'])},
};

const run = (args, cwd) => spawnSync('ffmpeg', ['-hide_banner', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 28});
const ff = (args, cwd) => { const r = run(['-v', 'error', ...args], cwd); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); return r; };
const probe = (args) => { const r = spawnSync('ffprobe', ['-v', 'error', ...args], {encoding: 'utf8', maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffprobe failed: ${r.stderr}`); return r.stdout.split(/\r?\n/).map((l) => l.replace(/,$/, '').trim()).filter(Boolean); };

// ---- readers ---------------------------------------------------------------------------------------------------
export function packetsProbe(file) { // reader 1: [{size, pts, key}] in file order
  return probe(['-select_streams', 'v:0', '-show_entries', 'packet=size,pts_time,flags', '-of', 'csv=p=0', file]).map((l) => { const [pts, size, flags] = l.split(','); return {size: Number(size), pts: Number(pts), key: flags.includes('K')}; });
}
const leb = (buf, p) => { let v = 0, i = 0; for (;;) { const x = buf[p + i]; v += (x & 0x7f) * 2 ** (7 * i); i++; if (!(x & 0x80)) break; } return [v, i]; };
// reader 2: copy the packets into an IVF file (32 byte header, 12 byte frame headers) and walk the AV1 OBUs ourselves
export function obuWalk(file, dir) {
  ff(['-i', file, '-map', '0:v:0', '-c:v', 'copy', '-f', 'ivf', 'copy.ivf'], dir);
  const b = fs.readFileSync(path.join(dir, 'copy.ivf')), tus = [];
  let o = b.readUInt16LE(6);
  while (o + 12 <= b.length) { const n = b.readUInt32LE(o); tus.push(b.subarray(o + 12, o + 12 + n)); o += 12 + n; }
  const sizes = [], keys = [], seqHeaderTus = [];
  tus.forEach((tu, idx) => {
    let p = 0, td = 0, key = false, seen = false, seq = false;
    while (p < tu.length) {
      const h = tu[p], type = (h >> 3) & 15, ext = (h >> 2) & 1, hasSize = (h >> 1) & 1;
      let q = p + 1 + ext, size;
      if (hasSize) { const [v, l] = leb(tu, q); size = v; q += l; } else size = tu.length - q;
      if (type === 2) td += q + size - p;
      if (type === 1) seq = true;
      if ((type === 3 || type === 6) && !seen) { seen = true; const bits = tu[q]; key = !(bits >> 7) && ((bits >> 5) & 3) === 0; } // show_existing_frame = 0 and frame_type = KEY_FRAME
      p = q + size;
    }
    sizes.push(tu.length - td); if (key) keys.push(idx); if (seq) seqHeaderTus.push(idx);
  });
  return {sizes, keys, seqHeaderTus};
}
export function decodeRaw(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-pix_fmt', 'yuv420p', '-f', 'rawvideo', '-'], {maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(`decode failed: ${r.stderr}`);
  return r.stdout;
}
export function psnrNode(a, b, w, h) { // quality reader 2: PSNR pooled over Y, U, V per frame, MSE averaged over frames (the ffmpeg psnr filter's "average"); null when identical
  const FR = w * h * 3 / 2, Y = w * h;
  if (a.length !== b.length || a.length % FR) throw new Error('raw sizes differ');
  const n = a.length / FR; let all = 0, ys = 0;
  for (let f = 0; f < n; f++) { let ea = 0, ey = 0; const o = f * FR; for (let i = 0; i < FR; i++) { const d = a[o + i] - b[o + i]; const s = d * d; ea += s; if (i < Y) ey += s; } all += ea / FR; ys += ey / Y; }
  const db = (m) => (m === 0 ? null : 10 * Math.log10(255 * 255 / m));
  return {avg: db(all / n), y: db(ys / n)};
}
export function qualityFfmpeg(file, src) { // quality reader 1
  const r = spawnSync('ffmpeg', ['-v', 'info', '-i', file, '-i', src, '-lavfi', '[0:v][1:v]psnr;[0:v][1:v]ssim', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`psnr/ssim failed: ${r.stderr}`);
  const num = (s) => (s === 'inf' ? null : Number(s));
  const p = /PSNR y:(inf|[\d.]+) u:(inf|[\d.]+) v:(inf|[\d.]+) average:(inf|[\d.]+)/.exec(r.stderr), s = /SSIM Y:([\d.]+).*? All:([\d.]+)/.exec(r.stderr);
  return {psnrY: num(p[1]), psnrAvg: num(p[4]), ssimY: Number(s[1]), ssimAll: Number(s[2])};
}
// determinism reader: md5 of the copied packets (the mkv file itself carries a random segment UID, so file bytes always differ)
function packetMd5(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:v:0', '-c:v', 'copy', '-f', 'md5', '-'], {encoding: 'utf8'});
  if (r.status !== 0) throw new Error(`ffmpeg md5 failed: ${r.stderr}`);
  return /MD5=([0-9a-f]+)/.exec(r.stdout)[1];
}

// What the encoder library says about itself on stderr (only SVT-AV1 prints a block; it comes through even with -v error)
export function svtReport(stderr) {
  const ver = /SVT-AV1 Encoder Lib v([\w.\-]+)/.exec(stderr), rc = /rate factor\s*:\s*(\w+)\s*\/\s*(\d+)/.exec(stderr), gop = /gop size \/ mini-gop size \/ key-frame type\s*:\s*(\d+)/.exec(stderr), pre = /preset \/ tune \/ pred struct\s*:\s*(\d+)/.exec(stderr);
  return {version: ver ? ver[1] : null, brcMode: rc ? rc[1] : null, rateFactor: rc ? Number(rc[2]) : null, gop: gop ? Number(gop[1]) : null, preset: pre ? Number(pre[1]) : null};
}
export function libVersions(dir, srcFile) { // encoder library versions as the encoders report them
  const s = run(['-v', 'error', '-i', srcFile, '-frames:v', '2', '-c:v', 'libsvtav1', '-preset', '12', 'v_svt.mkv'], dir);
  const a = run(['-v', 'verbose', '-i', srcFile, '-frames:v', '2', '-c:v', 'libaom-av1', '-cpu-used', '8', 'v_aom.mkv'], dir);
  const m = /\[libaom-av1 @ [^\]]+\]\s+(v[\w.\-]+)\s*$/m.exec(a.stderr);
  return {svtav1: svtReport(s.stderr).version, aom: m ? m[1] : null};
}

// ---- one encode, read every way ------------------------------------------------------------------------------------
function encodeOnce(c, dir, name) {
  const out = `${name}.mkv`, file = path.join(dir, out);
  fs.rmSync(file, {force: true});
  const r = run(['-v', 'error', '-i', `${c.src}.mkv`, ...c.enc.args, out], dir);
  return {r, file, exists: fs.existsSync(file)};
}
function measure(name, c, dir, srcInfo) {
  const tStart = Date.now();
  const a = encodeOnce(c, dir, name);
  const rec = {command: cmd(c.enc, c.src), lib: c.enc.lib, src: c.src, exit: a.r.status, outcome: a.r.status === 0 ? 'ok' : 'error'}; // a refused encode is an outcome (error text recorded), not a failure of the run
  if (c.enc.lib === 'svt') rec.svt = svtReport(a.r.stderr);
  if (c.expectFail || a.r.status !== 0) { rec.failed = a.r.status !== 0; rec.error = (a.r.stderr.split(/\r?\n/).filter((l) => /out of range|[Ee]rror/.test(l)).slice(0, 3).join(' | ') || '').slice(0, 300); rec.fileWritten = a.exists && fs.statSync(a.file).size > 0; return rec; }
  rec.failed = false;
  const md5a = packetMd5(a.file), t0 = Date.now();
  if (c.twice !== false) { const b = encodeOnce(c, dir, name); rec.deterministic = packetMd5(b.file) === md5a; rec.ranTwice = true; } else { rec.deterministic = null; rec.ranTwice = false; }
  const pk = packetsProbe(a.file), walk = obuWalk(a.file, dir), raw = decodeRaw(a.file);
  const sum = (x) => x.reduce((s, y) => s + y, 0);
  rec.fileBytes = fs.statSync(a.file).size; rec.packetMd5 = md5a;
  rec.packets = pk.length; rec.packetsObu = walk.sizes.length;
  rec.bytesProbe = sum(pk.map((p) => p.size)); rec.bytesObu = sum(walk.sizes);
  rec.decodedMd5 = md5Of(raw); rec.decodedFrames = raw.length / (srcInfo.w * srcInfo.h * 1.5);
  const q1 = qualityFfmpeg(a.file, path.join(dir, `${c.src}.mkv`)), q2 = psnrNode(raw, srcInfo.raw, srcInfo.w, srcInfo.h);
  rec.ffmpegPsnrAvg = q1.psnrAvg; rec.ffmpegPsnrY = q1.psnrY; rec.ffmpegSsimAll = q1.ssimAll; rec.ffmpegSsimY = q1.ssimY; rec.nodePsnrAvg = q2.avg; rec.nodePsnrY = q2.y;
  rec.lossless = rec.decodedMd5 === srcInfo.rawMd5;
  rec.keyframes = pk.map((p, i) => (p.key ? i : -1)).filter((i) => i >= 0); rec.keyframesObu = walk.keys; rec.seqHeaderTus = walk.seqHeaderTus;
  rec.seconds = Math.round((Date.now() - tStart) / 100) / 10; rec.decodedRaw = raw;
  return rec;
}

export function seekCost(name, dir, srcInfo, fullRaw, pk, walk) {
  const file = path.join(dir, `${name}.mkv`), FR = srcInfo.w * srcInfo.h * 1.5, sec = SEEK_FRAME / FPS;
  // reader 1: where ffprobe lands when it seeks to 12 s
  const first = probe(['-select_streams', 'v:0', '-read_intervals', `${sec}%+#1`, '-show_entries', 'packet=pts_time,flags', '-of', 'csv=p=0', file])[0].split(',');
  const landProbe = Math.round(Number(first[0]) * FPS);
  // reader 2: the last keyframe at or before the target in the keyframe list our OBU walker found
  const landObu = Math.max(...walk.keys.filter((k) => k <= SEEK_FRAME));
  // behaviour: ffmpeg -ss 12 returns exactly frame 300
  const r = spawnSync('ffmpeg', ['-v', 'error', '-ss', String(sec), '-i', file, '-frames:v', '1', '-pix_fmt', 'yuv420p', '-f', 'rawvideo', '-'], {maxBuffer: 1 << 26});
  const gotMd5 = md5Of(r.stdout), wantMd5 = md5Of(fullRaw.subarray(SEEK_FRAME * FR, (SEEK_FRAME + 1) * FR));
  return {target: SEEK_FRAME, landProbe, landObu, framesToDecodeProbe: SEEK_FRAME - landProbe + 1, framesToDecodeObu: SEEK_FRAME - landObu + 1, seekMd5Match: gotMd5 === wantMd5, seekIsNotNeighbour: gotMd5 !== md5Of(fullRaw.subarray((SEEK_FRAME - 1) * FR, SEEK_FRAME * FR))};
}

export function runExperiment(dir, {only} = {}) {
  fs.mkdirSync(dir, {recursive: true});
  const version = ffmpegVersion();
  const out = {ffmpeg: version, build: buildOf(version), platform: process.platform, sources: {}, cases: {}, long: {}};
  const info = {};
  for (const [k, s] of Object.entries(SRC)) {
    ff(['-f', 'lavfi', '-i', s.filter, '-c:v', 'ffv1', `${k}.mkv`], dir);
    const raw = decodeRaw(path.join(dir, `${k}.mkv`));
    info[k] = {w: s.w, h: s.h, raw, rawMd5: md5Of(raw)};
    const uniq = new Set(); for (let f = 0; f < s.frames; f++) uniq.add(md5Of(raw.subarray(f * s.w * s.h * 1.5, (f + 1) * s.w * s.h * 1.5)));
    out.sources[k] = {size: `${s.w}x${s.h}`, fps: FPS, frames: raw.length / (s.w * s.h * 1.5), uniqueFrames: uniq.size, rawMd5: info[k].rawMd5, filter: s.filter};
  }
  out.libs = libVersions(dir, 'clean.mkv');
  for (const [name, c] of Object.entries(CASES)) { if (only && !only.includes(name)) continue; out.cases[name] = measure(name, c, dir, info[c.src]); delete out.cases[name].decodedRaw; }
  for (const [name, c] of Object.entries(LONG_CASES)) {
    if (only && !only.includes(name)) continue;
    const rec = measure(name, c, dir, info.long); const decoded = rec.decodedRaw; delete rec.decodedRaw; const file = path.join(dir, `${name}.mkv`);
    const pk = packetsProbe(file), walk = obuWalk(file, dir);
    rec.keyframeSeconds = rec.keyframes.map((i) => pk[i].pts); rec.ptsMatchIndex = pk.every((p, i) => Math.abs(p.pts * FPS - i) < 0.01);
    rec.seek = seekCost(name, dir, info.long, decoded, pk, walk);
    out.long[name] = rec;
  }
  return out;
}
