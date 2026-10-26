// Episode 55 fixture: "29.97 fps and -video_track_timescale: do the timestamps round?"
// Synthetic source only (lavfi): a flat gray card, 96x72, 300 frames at 30000/1001 fps (29.97003 fps, 10.01 s), lossless x264 with no B-frames, into mp4.
// The exact timestamp of frame n is n * 1001 / 30000 seconds. The mp4 stores timestamps as whole ticks of the track timescale, so the question is
// what each frame gets when the timescale is not a multiple of 30000.
// Cases (-video_track_timescale T, or none):
//   default, t30000, t90000       a multiple of 30000: exact in theory
//   t24000, t15360, t1000, t600   not a multiple of 30000: must round
//   ctl25                         control, 25 fps (250 frames) at timescale 1000: 40 ms is a whole number of ticks, so no rounding
//   r2997                         the source made with -r style decimal rate 29.97 (= 2997/100, not 30000/1001), default timescale
// Readers:
//   reader 1  ffprobe: stream time_base, r_frame_rate, avg_frame_rate, stream duration, and the pts of every packet (whole ticks)
//   reader 2  the mp4 file itself, parsed in Node: mdhd timescale and duration, the stts (decode time to sample) table, whether a ctts table exists
//   reader 3  ffprobe on the decoded frames (-show_frames): the pts of every frame the decoder returns, in ticks
//   (ffmpeg framemd5 is also run: it counts the decoded frames, but it prints its times in frames of the frame rate, not in ticks of the track, so it cannot show the rounding)
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 96, H = 72, NTSC = [30000, 1001], FRAMES = 300;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

const ffm = (args, opts = {}) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {maxBuffer: 1 << 28, ...opts});
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${String(r.stderr)}`);
  return r;
};
const probe = (args) => {
  const r = spawnSync('ffprobe', ['-v', 'error', ...args], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`ffprobe ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout.split(/\r?\n/).map((l) => l.replace(/,$/, '').trim()).filter(Boolean);
};

// rate: the lavfi rate string and its exact fraction. ts: the -video_track_timescale value, or null for the default.
export const CASES = {
  default: {rate: '30000/1001', frac: [30000, 1001], frames: 300, ts: null},
  t30000: {rate: '30000/1001', frac: [30000, 1001], frames: 300, ts: 30000},
  t90000: {rate: '30000/1001', frac: [30000, 1001], frames: 300, ts: 90000},
  t24000: {rate: '30000/1001', frac: [30000, 1001], frames: 300, ts: 24000},
  t15360: {rate: '30000/1001', frac: [30000, 1001], frames: 300, ts: 15360},
  t1000: {rate: '30000/1001', frac: [30000, 1001], frames: 300, ts: 1000},
  t600: {rate: '30000/1001', frac: [30000, 1001], frames: 300, ts: 600},
  ctl25: {rate: '25', frac: [25, 1], frames: 250, ts: 1000},
  r2997: {rate: '29.97', frac: [2997, 100], frames: 300, ts: null},
};
export const commandOf = (name) => {
  const c = CASES[name];
  return `ffmpeg -f lavfi -i color=c=gray:s=${W}x${H}:r=${c.rate} -frames:v ${c.frames} -c:v libx264 -bf 0 -qp 0${c.ts ? ` -video_track_timescale ${c.ts}` : ''} out.mp4`;
};

export function makeCase(dir, name) {
  const c = CASES[name];
  const out = path.join(dir, `${name}.mp4`);
  const args = ['-f', 'lavfi', '-i', `color=c=gray:s=${W}x${H}:r=${c.rate}`, '-frames:v', String(c.frames), '-c:v', 'libx264', '-bf', '0', '-qp', '0', '-pix_fmt', 'yuv420p'];
  if (c.ts) args.push('-video_track_timescale', String(c.ts));
  args.push(out);
  ffm(args);
  return out;
}

// ---- the arithmetic the files are compared with ----
// exact timestamp of frame n at rate num/den, in seconds: n * den / num
export const idealSec = (n, [num, den]) => (n * den) / num;
// the tick a muxer should store if it rounds the exact time to the nearest tick, halves up: floor(n * den * T / num + 1/2), in integers
export const modelTick = (n, T, [num, den]) => Math.floor((2 * n * den * T + num) / (2 * num));
// frames whose exact time is exactly half way between two ticks
export const isTie = (n, T, [num, den]) => (2 * n * den * T) % (2 * num) === num;

// ---- reader 2: the mp4 boxes ----
export function boxes(buf, start = 0, end = buf.length) {
  const out = []; let p = start;
  while (p + 8 <= end) {
    let size = buf.readUInt32BE(p); const type = buf.toString('latin1', p + 4, p + 8); let hdr = 8;
    if (size === 1) { size = Number(buf.readBigUInt64BE(p + 8)); hdr = 16; } else if (size === 0) size = end - p;
    if (size < hdr || p + size > end) break;
    out.push({type, start: p + hdr, end: p + size}); p += size;
  }
  return out;
}
const child = (buf, box, type) => boxes(buf, box.start, box.end).find((b) => b.type === type);
const path_ = (buf, root, types) => types.reduce((b, t) => (b ? child(buf, b, t) : undefined), root);
function readHeader(buf, box) { // mvhd and mdhd share the layout up to duration
  const v = buf[box.start]; let p = box.start + 4;
  if (v === 1) return {timescale: buf.readUInt32BE(p + 16), duration: Number(buf.readBigUInt64BE(p + 20))};
  return {timescale: buf.readUInt32BE(p + 8), duration: buf.readUInt32BE(p + 12)};
}
export function parseMp4(file) {
  const buf = fs.readFileSync(file);
  const top = boxes(buf);
  const moov = top.find((b) => b.type === 'moov');
  if (!moov) return null;
  const traks = boxes(buf, moov.start, moov.end).filter((b) => b.type === 'trak');
  const trak = traks[0];
  const mdhd = path_(buf, trak, ['mdia', 'mdhd']);
  const stbl = path_(buf, trak, ['mdia', 'minf', 'stbl']);
  const stts = child(buf, stbl, 'stts');
  const n = buf.readUInt32BE(stts.start + 4);
  const entries = [];
  for (let i = 0; i < n; i++) entries.push([buf.readUInt32BE(stts.start + 8 + 8 * i), buf.readUInt32BE(stts.start + 12 + 8 * i)]);
  const mvhd = child(buf, moov, 'mvhd');
  return {
    tracks: traks.length, mdhd: readHeader(buf, mdhd), mvhd: readHeader(buf, mvhd), stts: entries,
    hasCtts: !!child(buf, stbl, 'ctts'), hasElst: !!path_(buf, trak, ['edts', 'elst']),
  };
}
// decode times of every sample, in ticks, from the stts run-length table
export function sttsTicks(entries) {
  const out = []; let t = 0;
  for (const [count, delta] of entries) for (let i = 0; i < count; i++) { out.push(t); t += delta; }
  return {starts: out, total: t};
}

// ---- reader 1: ffprobe ----
export function ffprobeFacts(file) {
  const raw = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=time_base,r_frame_rate,avg_frame_rate,duration,nb_frames', '-of', 'json', file], {encoding: 'utf8'});
  if (raw.status !== 0) throw new Error(`ffprobe failed: ${raw.stderr}`);
  const j = JSON.parse(raw.stdout);
  const st = j.streams[0];
  const pk = probe(['-select_streams', 'v:0', '-show_entries', 'packet=pts', '-of', 'csv=p=0', file]).map(Number).sort((a, b) => a - b);
  const fmt = probe(['-show_entries', 'format=duration', '-of', 'csv=p=0', file]).map(Number)[0];
  const [a, b] = st.time_base.split('/').map(Number);
  return {timeBase: st.time_base, tbDen: b / a, rFrameRate: st.r_frame_rate, avgFrameRate: st.avg_frame_rate, streamDuration: Number(st.duration), formatDuration: fmt, nbFrames: Number(st.nb_frames), packetPts: pk};
}
// ---- reader 3: decoded frames ----
export const decodedFramePts = (file) => probe(['-select_streams', 'v:0', '-show_entries', 'frame=pts', '-of', 'csv=p=0', file]).map(Number).sort((a, b) => a - b);
// framemd5 with -copyts: count of decoded frames, and their times in the muxer's own time base (the frame rate, 1001/30000), not the track's
export function framemd5Pts(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-copyts', '-i', file, '-an', '-fps_mode', 'passthrough', '-f', 'framemd5', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`framemd5 failed: ${r.stderr}`);
  let den = 1; const pts = [];
  for (const l of r.stdout.split(/\r?\n/)) {
    const m = /^#tb\s+0:\s*(\d+)\/(\d+)/.exec(l);
    if (m) { den = Number(m[2]) / Number(m[1]); continue; }
    if (!l || l.startsWith('#')) continue;
    pts.push(Number(l.split(',')[2]));
  }
  return {pts, tbDen: den};
}

const r3 = (v) => Math.round(v * 1000) / 1000;
const r6 = (v) => Math.round(v * 1e6) / 1e6;
export function measure(file, name) {
  const c = CASES[name];
  const box = parseMp4(file);
  const pr = ffprobeFacts(file);
  const fm = framemd5Pts(file);
  const dec = decodedFramePts(file);
  const T = box.mdhd.timescale;
  const {starts, total} = sttsTicks(box.stts);
  const deltas = {};
  for (const [count, delta] of box.stts) deltas[delta] = (deltas[delta] ?? 0) + count;
  // error of every frame against the exact grid of its own rate and against the 30000/1001 grid, in milliseconds
  const errOwn = starts.map((tk, n) => (tk / T - idealSec(n, c.frac)) * 1000);
  const errNtsc = starts.map((tk, n) => (tk / T - idealSec(n, NTSC)) * 1000);
  const model = starts.map((_, n) => modelTick(n, T, c.frac));
  const modelMismatch = starts.reduce((a, tk, n) => a + (tk === model[n] ? 0 : 1), 0);
  const modelMaxOff = Math.max(...starts.map((tk, n) => Math.abs(tk - model[n])));
  const ties = starts.map((_, n) => n).filter((n) => isTie(n, T, c.frac));
  const durSecExact = (c.frames * c.frac[1]) / c.frac[0];
  const absMax = (xs) => Math.max(...xs.map(Math.abs));
  return {
    name, command: commandOf(name), timescale: T, samples: starts.length, stts: box.stts, deltas, deltaKinds: Object.keys(deltas).length,
    mdhdDuration: box.mdhd.duration, mdhdDurationSec: r6(box.mdhd.duration / T), mvhdTimescale: box.mvhd.timescale, mvhdDuration: box.mvhd.duration, hasCtts: box.hasCtts, hasElst: box.hasElst, tracks: box.tracks,
    exactDurationSec: r6(durSecExact), durationErrUs: r3((box.mdhd.duration / T - durSecExact) * 1e6),
    maxErrMs: r6(absMax(errOwn)), maxErrNtscMs: r6(absMax(errNtsc)), lastErrNtscMs: r6(errNtsc[errNtsc.length - 1]),
    errMin: r6(Math.min(...errOwn)), errMax: r6(Math.max(...errOwn)),
    modelMismatch, modelMaxOff, ties: ties.length, tieTicks: ties.slice(0, 6).map((n) => ({n, tick: starts[n], up: modelTick(n, T, c.frac)})),
    tiesAllRoundedUp: ties.every((n) => starts[n] === modelTick(n, T, c.frac)),
    probe: {timeBase: pr.timeBase, rFrameRate: pr.rFrameRate, avgFrameRate: pr.avgFrameRate, streamDuration: pr.streamDuration, formatDuration: pr.formatDuration, nbFrames: pr.nbFrames, packets: pr.packetPts.length},
    // readers agree when every packet pts equals the stts decode time (no B-frames), and every decoded frame pts equals it too
    probeEqualsBox: pr.tbDen === T && pr.packetPts.length === starts.length && pr.packetPts.every((p, i) => p === starts[i]),
    decodeEqualsBox: dec.length === starts.length && dec.every((p, i) => p === starts[i]),
    decoded: dec.length, framesMd5: fm.pts.length, framemd5TbDen: fm.tbDen, framemd5IsFrameNumber: fm.pts.every((p, i) => p === i), packets: pr.packetPts.length,
    firstTicks: starts.slice(0, 8), firstDeltas: starts.slice(1, 9).map((s, i) => s - starts[i]),
    ticks: starts,
  };
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const ev = {ffmpeg: ffmpegVersion(), grid: {num: NTSC[0], den: NTSC[1], frameMs: r6((NTSC[1] / NTSC[0]) * 1000), exactDurationSec: r6((FRAMES * NTSC[1]) / NTSC[0])}, runs: {}};
  for (const name of Object.keys(CASES)) ev.runs[name] = measure(makeCase(dir, name), name);
  return ev;
}
