// Episode 90 fixture: "-copyts with -ss: which timestamps does the cut keep, and which frame comes first?"
// Synthetic input only: one 64x48, 10 fps, 100 frame clip written by Node as raw yuv420p, every frame a flat card with luma 16 + 2 x frame number
// (so a decoded frame names itself), encoded lossless (libx264 -qp 0, -g 10 -bf 0: a keyframe every 1.0 s, no reordering, so dts equals pts).
// Containers: mp4, mkv, ts (mpegts, whose muxer starts the clock at 1.4 s) and two controls that move the start time without changing the container:
//   mkv14 = mkv with -output_ts_offset 1.4 (start_time 1.4), ts0 = mpegts with -muxdelay 0 -muxpreload 0 (start_time 0).
// Cut: -ss 3.5 (frame 35, between keyframes 30 and 40), before -i (input seek) and after -i (output seek); flags none, -copyts, -copyts -start_at_zero; transcoding and -c copy.
// Readers of the result: reader 1 = ffprobe (format and stream start_time, every packet pts_time); reader 2 = the decoded pictures read as raw yuv420p in Node
//   (which frame is first, how many, contiguous), plus the first decoded frame's pts_time from ffmpeg showinfo with -copyts (the decoder's own clock).
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 64, H = 48, N = 100, FPS = 10, FSZ = W * H * 3 / 2, SS = 3.5;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
export const CONTAINERS = ['mp4', 'mkv', 'ts', 'mkv14', 'ts0'];
export const EXT = {mp4: 'mp4', mkv: 'mkv', ts: 'ts', mkv14: 'mkv', ts0: 'ts'};
export const FLAGS = {none: [], copyts: ['-copyts'], saz: ['-copyts', '-start_at_zero']};
export const SWEEP = [3.0, 3.2, 3.5, 3.9, 4.0, 4.3];

const ff = (args) => spawnSync('ffmpeg', ['-hide_banner', '-v', 'error', '-y', ...args], {encoding: 'utf8', maxBuffer: 1 << 28});
const ffb = (args) => spawnSync('ffmpeg', ['-hide_banner', '-v', 'error', '-y', ...args], {maxBuffer: 1 << 28});
const probe = (args) => spawnSync('ffprobe', ['-v', 'error', ...args], {encoding: 'utf8'}).stdout ?? '';
const nums = (out) => out.split(/\r?\n/).map((s) => s.replace(/,$/, '').trim()).filter(Boolean).map(Number);
const r6 = (x) => Math.round(x * 1e6) / 1e6;

// the frame identity: luma of frame n
export const lumaOf = (n) => 16 + 2 * n;
export function makeSource() {
  const b = Buffer.alloc(FSZ * N);
  for (let f = 0; f < N; f++) { b.fill(lumaOf(f), f * FSZ, f * FSZ + W * H); b.fill(128, f * FSZ + W * H, (f + 1) * FSZ); }
  return b;
}
// decoded raw yuv420p -> the frame number of each picture
export const idsOf = (raw) => { const n = Math.floor(raw.length / FSZ), ids = []; for (let k = 0; k < n; k++) { const y = raw[k * FSZ]; ids.push((y - 16) / 2); } return ids; };
export const contiguous = (ids) => ids.every((v, i) => i === 0 || v === ids[i - 1] + 1);

const ENC = ['-c:v', 'libx264', '-qp', '0', '-g', '10', '-bf', '0', '-pix_fmt', 'yuv420p'];
const MUX = {mkv14: ['-output_ts_offset', '1.4'], ts0: ['-muxdelay', '0', '-muxpreload', '0']};

export function readFile(file) {
  const pj = JSON.parse(probe(['-select_streams', 'v:0', '-show_entries', 'format=start_time:stream=start_time:packet=pts_time', '-of', 'json', file]) || '{}');
  const pkts = (pj.packets ?? []).map((p) => Number(p.pts_time));
  // one ffmpeg run reads both: the decoded pictures (stdout, raw yuv420p) and the decoder's own clock (showinfo on stderr, with -copyts so nothing is rebased)
  const r = spawnSync('ffmpeg', ['-hide_banner', '-copyts', '-i', file, '-vf', 'showinfo', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-'], {maxBuffer: 1 << 28});
  const ids = idsOf(r.stdout ?? Buffer.alloc(0));
  const shown = [...(r.stderr ?? Buffer.alloc(0)).toString().matchAll(/pts_time:\s*(-?[0-9.]+)/g)].map((m) => Number(m[1]));
  return {fmtStart: Number(pj.format?.start_time), streamStart: Number(pj.streams?.[0]?.start_time), pkts: {n: pkts.length, first: pkts[0], last: pkts.at(-1), list: pkts}, ids, frames: {n: ids.length, first: ids[0], last: ids.at(-1), contiguous: contiguous(ids)}, shownFirst: shown[0], shownN: shown.length};
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const ffmpeg = ffmpegVersion();
  const src = path.join(dir, 'src.yuv'); fs.writeFileSync(src, makeSource());
  const ev = {ffmpeg, clip: {}, cells: {}, sweep: {}, inPts: {}};
  const file = (c, name) => path.join(dir, `${name}_${c}.${EXT[c]}`);
  // the source clips
  for (const c of CONTAINERS) {
    const f = file(c, 'clip');
    const r = ff(['-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-s', `${W}x${H}`, '-r', String(FPS), '-i', src, ...ENC, ...(MUX[c] ?? []), f]);
    if (r.status !== 0) throw new Error(`clip ${c}: ${r.stderr}`);
    const info = readFile(f); ev.clip[c] = {fmtStart: info.fmtStart, streamStart: info.streamStart, n: info.pkts.n, first: info.pkts.first, last: info.pkts.last, ids: info.frames.n, firstId: info.frames.first, contiguous: info.frames.contiguous, shownFirst: info.shownFirst};
    ev.inPts[c] = info.pkts.list; // pts of source frame n in this container, packets in decode order = frame order (no B frames)
  }
  const cut = (c, pos, flags, copy, T, tag) => {
    const out = path.join(dir, `o_${tag}.${EXT[c]}`);
    const enc = copy ? ['-c', 'copy'] : ENC;
    const mux = copy ? [] : [];
    const args = pos === 'in' ? [...FLAGS[flags], '-ss', String(T), '-i', file(c, 'clip'), ...enc, ...mux, out] : [...FLAGS[flags], '-i', file(c, 'clip'), '-ss', String(T), ...enc, ...mux, out];
    const r = ff(args);
    if (r.status !== 0) return {c, pos, flags, copy, T, status: r.status, err: r.stderr.trim().split(/\r?\n/).pop()};
    const info = readFile(out);
    const firstId = info.frames.first;
    const inPtsFirst = firstId !== undefined ? ev.inPts[c][firstId] : undefined;
    const rec = {c, pos, flags, copy, T, status: 0, fmtStart: info.fmtStart, streamStart: info.streamStart, pkts: {n: info.pkts.n, first: info.pkts.first, last: info.pkts.last}, frames: info.frames, shownFirst: info.shownFirst, shownN: info.shownN, inPtsOfFirst: inPtsFirst,
      // how far the output clock is from the input clock for the first decoded picture
      shift: inPtsFirst === undefined || info.shownFirst === undefined ? null : r6(info.shownFirst - inPtsFirst)};
    fs.rmSync(out, {force: true});
    return rec;
  };
  // the matrix at -ss 3.5
  for (const c of CONTAINERS) for (const pos of ['in', 'out']) for (const flags of Object.keys(FLAGS)) for (const copy of (c === 'mkv14' || c === 'ts0') ? [false] : [false, true]) {
    ev.cells[`${c}|${pos}|${flags}|${copy ? 'copy' : 'enc'}`] = cut(c, pos, flags, copy, SS, `m${Object.keys(ev.cells).length}`);
  }
  // the input seek sweep: where does the first picture land for a given -ss
  for (const c of ['mp4', 'mkv', 'ts', 'ts0']) for (const copy of [false, true]) {
    ev.sweep[`${c}|${copy ? 'copy' : 'enc'}`] = SWEEP.map((T) => { const r = cut(c, 'in', 'none', copy, T, `s${c}${copy}${T}`); return {T, firstId: r.frames?.first, n: r.frames?.n}; });
  }
  return ev;
}
