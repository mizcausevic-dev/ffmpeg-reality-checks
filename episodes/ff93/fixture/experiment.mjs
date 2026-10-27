// Episode 93 fixture: "Timestamps with B-frames: pts, dts, best_effort_timestamp, pkt_dts and showinfo, which value does each tool print?"
// Synthetic input only. testsrc2, 64x48, 25 fps, 50 frames, libx264 -bf 2 (b-adapt 0, scenecut 0: a fixed I P B B pattern) and -bf 0 as the control.
// Files: bf0.mp4 and bf0.mkv (control), bf2.mp4, bf2.mkv (stream copy of bf2.mp4), bf2neg.mp4 (stream copy with -movflags +negative_cts_offsets).
// Readers:
//   reader 1  ffprobe: every packet (pts, dts, flags), every decoded frame (pts, pkt_dts, best_effort_timestamp, pict_type), and the ffmpeg showinfo filter (pts of each frame it sees)
//   reader 2  the container bytes in Node: mp4 stts (stored decode times), ctts (composition offsets), elst (edit list); matroska block times
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 64, H = 48, FPS = 25, N = 50;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
const r6 = (v) => (v === null || v === undefined ? null : Math.round(v * 1e6) / 1e6);
const num = (s) => (s === undefined || s === null || s === 'N/A' ? null : Number(s));

const ffm = (args) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {maxBuffer: 1 << 28, encoding: 'utf8'});
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${r.stderr}`);
  return r;
};
const X264 = 'b-adapt=0:scenecut=0:keyint=25';
export const CASES = {
  bf0_mp4: {file: 'bf0.mp4', container: 'mp4', bf: 0, command: 'ffmpeg -f lavfi -i testsrc2=s=64x48:r=25:d=2 -c:v libx264 -bf 0 bf0.mp4'},
  bf0_mkv: {file: 'bf0.mkv', container: 'mkv', bf: 0, command: 'ffmpeg -i bf0.mp4 -c copy bf0.mkv'},
  bf2_mp4: {file: 'bf2.mp4', container: 'mp4', bf: 2, command: 'ffmpeg -f lavfi -i testsrc2=s=64x48:r=25:d=2 -c:v libx264 -bf 2 bf2.mp4'},
  bf2_mkv: {file: 'bf2.mkv', container: 'mkv', bf: 2, command: 'ffmpeg -i bf2.mp4 -c copy bf2.mkv'},
  bf2neg_mp4: {file: 'bf2neg.mp4', container: 'mp4', bf: 2, command: 'ffmpeg -i bf2.mp4 -c copy -movflags +negative_cts_offsets bf2neg.mp4'},
};

export function makeFiles(dir) {
  const f = (n) => path.join(dir, n);
  const src = ['-f', 'lavfi', '-i', `testsrc2=s=${W}x${H}:r=${FPS}:d=${N / FPS},format=yuv420p`];
  ffm([...src, '-c:v', 'libx264', '-bf', '0', '-x264-params', X264, '-pix_fmt', 'yuv420p', f('bf0.mp4')]);
  ffm(['-i', f('bf0.mp4'), '-c', 'copy', f('bf0.mkv')]);
  ffm([...src, '-c:v', 'libx264', '-bf', '2', '-x264-params', X264, '-pix_fmt', 'yuv420p', f('bf2.mp4')]);
  ffm(['-i', f('bf2.mp4'), '-c', 'copy', f('bf2.mkv')]);
  ffm(['-i', f('bf2.mp4'), '-c', 'copy', '-movflags', '+negative_cts_offsets', f('bf2neg.mp4')]);
  return Object.fromEntries(Object.entries(CASES).map(([k, c]) => [k, f(c.file)]));
}

// ---------------- reader 1: ffprobe and showinfo ----------------
const probeJson = (args) => JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-of', 'json', ...args], {encoding: 'utf8', maxBuffer: 1 << 27}).stdout);
export function packetsOf(file, pre = []) {
  const j = probeJson([...pre, '-select_streams', 'v:0', '-show_entries', 'packet=pts,dts,pts_time,dts_time,flags', file]);
  return j.packets.map((p) => ({pts: num(p.pts), dts: num(p.dts), ptsT: num(p.pts_time), dtsT: num(p.dts_time), key: String(p.flags).startsWith('K')}));
}
export function framesOf(file) {
  const j = probeJson(['-select_streams', 'v:0', '-show_entries', 'frame=pts,pkt_dts,best_effort_timestamp,pts_time,pkt_dts_time,best_effort_timestamp_time,pict_type', file]);
  return j.frames.map((f) => ({pts: num(f.pts), ptsT: num(f.pts_time), dtsT: num(f.pkt_dts_time), beT: num(f.best_effort_timestamp_time), type: f.pict_type}));
}
export function showinfoOf(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-v', 'info', '-i', file, '-an', '-vf', 'showinfo', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 27});
  const out = [];
  for (const l of r.stderr.split(/\r?\n/)) {
    const m = /\bn:\s*(\d+)\s+pts:\s*(-?\d+)\s+pts_time:(-?[\d.]+)/.exec(l);
    if (m) out.push({n: Number(m[1]), pts: Number(m[2]), ptsT: Number(m[3]), type: (/\btype:(\w)/.exec(l) ?? [])[1] ?? null, hasDts: /\bdts:/.test(l)});
  }
  return out;
}
export function formatStart(file) {
  const j = probeJson(['-select_streams', 'v:0', '-show_entries', 'format=start_time:stream=start_time,has_b_frames', file]);
  return {format: num(j.format.start_time), stream: num(j.streams[0].start_time), hasBFrames: j.streams[0].has_b_frames};
}

// ---------------- reader 2: the container bytes ----------------
const BOX_CONTAINERS = new Set(['moov', 'trak', 'edts', 'mdia', 'minf', 'stbl']);
export function readMp4(buf) {
  const out = {mvhdTimescale: null, mdhdTimescale: null, stts: [], ctts: null, elst: [], at: {}};
  const walk = (start, end) => {
    let p = start;
    while (p + 8 <= end) {
      let size = buf.readUInt32BE(p); const type = buf.toString('latin1', p + 4, p + 8); let head = 8;
      if (size === 1) { size = Number(buf.readBigUInt64BE(p + 8)); head = 16; } else if (size === 0) size = end - p;
      if (size < head) break;
      const body = p + head;
      if (BOX_CONTAINERS.has(type)) walk(body, p + size);
      else if (type === 'mvhd') out.mvhdTimescale = buf.readUInt32BE(body + (buf[body] === 1 ? 20 : 12));
      else if (type === 'mdhd') out.mdhdTimescale = buf.readUInt32BE(body + (buf[body] === 1 ? 20 : 12));
      else if (type === 'stts') { out.at.stts = p; const n = buf.readUInt32BE(body + 4); for (let i = 0; i < n; i++) out.stts.push({count: buf.readUInt32BE(body + 8 + 8 * i), delta: buf.readUInt32BE(body + 12 + 8 * i)}); }
      else if (type === 'ctts') { out.at.ctts = p; const v = buf[body]; const n = buf.readUInt32BE(body + 4); out.ctts = {version: v, entries: []}; for (let i = 0; i < n; i++) out.ctts.entries.push({count: buf.readUInt32BE(body + 8 + 8 * i), offset: v === 1 ? buf.readInt32BE(body + 12 + 8 * i) : buf.readUInt32BE(body + 12 + 8 * i)}); }
      else if (type === 'elst') { out.at.elst = p; const v = buf[body]; const n = buf.readUInt32BE(body + 4); let o = body + 8; for (let i = 0; i < n; i++) { if (v === 1) { out.elst.push({segment: Number(buf.readBigUInt64BE(o)), mediaTime: Number(buf.readBigInt64BE(o + 8))}); o += 20; } else { out.elst.push({segment: buf.readUInt32BE(o), mediaTime: buf.readInt32BE(o + 4)}); o += 12; } } }
      p += size;
    }
  };
  walk(0, buf.length);
  // expand to one stored decode time and one composition offset per sample (ticks of the media time scale)
  const dts = []; let t = 0;
  for (const e of out.stts) for (let i = 0; i < e.count; i++) { dts.push(t); t += e.delta; }
  const cts = []; if (out.ctts) for (const e of out.ctts.entries) for (let i = 0; i < e.count; i++) cts.push(e.offset);
  out.storedDts = dts; out.cts = cts;
  out.mediaTime = (out.elst.find((e) => e.mediaTime >= 0) ?? {mediaTime: 0}).mediaTime;
  out.minCts = cts.length ? Math.min(...cts) : 0;
  // what the mov demuxer shows: pts = stored dts + cts - edit list start; dts = stored dts - edit list start, and, for signed ctts, moved by the smallest (negative) offset so that dts <= pts
  out.shownPts = dts.map((d, i) => d + (cts[i] ?? 0) - out.mediaTime);
  out.shownDts = dts.map((d) => d - out.mediaTime + (out.ctts && out.ctts.version === 1 && out.minCts < 0 ? out.minCts : 0));
  return out;
}

function vint(buf, p, keepMarker) {
  const b = buf[p]; let len = 1, mask = 0x80;
  while (len <= 8 && !(b & mask)) { len++; mask >>= 1; }
  let v = keepMarker ? b : b & (mask - 1);
  for (let i = 1; i < len; i++) v = v * 256 + buf[p + i];
  return {v, len};
}
// matroska: every video block time in file order (milliseconds). The format stores one time per block: a presentation time. There is no field for a decode time.
export function readMkv(buf) {
  const blocks = []; let scale = 1e6;
  const MASTER = new Set([0x18538067, 0x1549a966, 0x1f43b675, 0xa0, 0x1654ae6b]);
  const walk = (start, end, ct) => {
    let p = start;
    while (p < end) {
      const id = vint(buf, p, true); p += id.len; const sz = vint(buf, p, false); p += sz.len;
      const unknown = sz.v === 2 ** (7 * sz.len) - 1; const bodyEnd = unknown ? end : Math.min(end, p + sz.v);
      if (MASTER.has(id.v)) {
        if (id.v === 0x1f43b675) {
          let c = 0, q = p;
          while (q < bodyEnd) { const i2 = vint(buf, q, true); q += i2.len; const s2 = vint(buf, q, false); q += s2.len; if (i2.v === 0xe7) { for (let k = 0; k < s2.v; k++) c = c * 256 + buf[q + k]; break; } q += s2.v; }
          walk(p, bodyEnd, c);
        } else walk(p, bodyEnd, ct);
      } else if (id.v === 0x2ad7b1) { let v = 0; for (let k = 0; k < sz.v; k++) v = v * 256 + buf[p + k]; scale = v; }
      else if (id.v === 0xa3 || id.v === 0xa1) { const tr = vint(buf, p, false); blocks.push({track: tr.v, ms: (ct + buf.readInt16BE(p + tr.len)) * scale / 1e6}); }
      p = bodyEnd;
    }
  };
  let p = 0; const id = vint(buf, p, true); p += id.len; const sz = vint(buf, p, false); p += sz.len + sz.v;
  walk(p, buf.length, 0);
  return {blocks, scale};
}
export const hexSlice = (buf, offset, len) => [...buf.subarray(offset, offset + len)].map((x) => x.toString(16).padStart(2, '0'));

// ---------------- one case ----------------
export function measure(file, name) {
  const c = CASES[name];
  const packets = packetsOf(file), frames = framesOf(file), info = showinfoOf(file), start = formatStart(file);
  const buf = fs.readFileSync(file);
  const bytes = c.container === 'mp4' ? readMp4(buf) : readMkv(buf);
  const withDts = packets.filter((p) => p.dts !== null);
  const dtsT = packets.map((p) => p.dtsT), ptsT = packets.map((p) => p.ptsT);
  const m = {
    name, command: c.command, container: c.container, bytes: buf.length, start, packets, frames, showinfo: info,
    types: frames.map((f) => f.type).join(''),
  };
  // packets: the numbers people ask about
  m.pk = {
    n: packets.length, firstPts: ptsT[0], firstDts: dtsT[0], dtsNA: dtsT.filter((d) => d === null).length,
    minDts: Math.min(...dtsT.filter((d) => d !== null)),
    dtsStrictlyIncreasing: withDts.every((p, i) => i === 0 || p.dts > withDts[i - 1].dts),
    ptsMonotonicInFileOrder: packets.every((p, i) => i === 0 || p.pts > packets[i - 1].pts),
    dtsAbovePts: withDts.filter((p) => p.dts > p.pts).length,
    dtsEqualsPts: withDts.filter((p) => p.dts === p.pts).length,
    maxLead: r6(Math.max(...withDts.map((p) => p.ptsT - p.dtsT))),
    ptsSortedStep: (() => { const s = [...ptsT].sort((a, b) => a - b); return s.every((v, i) => i === 0 || Math.abs(v - s[i - 1] - 1 / FPS) < 1e-6); })(),
  };
  // frames: which value is what
  const byPts = new Map(packets.map((p) => [p.ptsT, p]));
  m.fr = {
    n: frames.length, firstPts: frames[0].ptsT, ptsIncreasing: frames.every((f, i) => i === 0 || f.ptsT > frames[i - 1].ptsT),
    pktDtsEqualsPts: frames.filter((f) => f.dtsT !== null && Math.abs(f.dtsT - f.ptsT) < 1e-9).length,
    pktDtsNA: frames.filter((f) => f.dtsT === null).length,
    bestEffortEqualsPts: frames.filter((f) => f.beT !== null && Math.abs(f.beT - f.ptsT) < 1e-9).length,
    // the dts printed on a frame against the dts of the packet that carried that frame (found by equal pts)
    differsFromOwnPacket: frames.filter((f) => { const p = byPts.get(f.ptsT); return p && p.dtsT !== null && f.dtsT !== null && Math.abs(p.dtsT - f.dtsT) > 1e-9; }).length,
    matchedToPacket: frames.filter((f) => byPts.has(f.ptsT)).length,
  };
  m.si = {n: info.length, ptsEqualsFrames: info.length === frames.length && info.every((s, i) => Math.abs(s.ptsT - frames[i].ptsT) < 1e-9), anyDts: info.some((s) => s.hasDts), firstPts: info[0]?.ptsT ?? null};
  // the bytes
  if (c.container === 'mp4') {
    m.bytes_ = {
      timescale: bytes.mdhdTimescale, storedFirstDts: bytes.storedDts[0], cttsVersion: bytes.ctts?.version ?? null, cttsEntries: bytes.ctts?.entries.length ?? 0,
      cttsFirst: bytes.cts.slice(0, 6), minCts: bytes.minCts, elst: bytes.elst, mediaTime: bytes.mediaTime, samples: bytes.storedDts.length,
      shownPtsMatchesFfprobe: bytes.shownPts.length === packets.length && bytes.shownPts.every((v, i) => v === packets[i].pts),
      shownDtsMatchesFfprobe: bytes.shownDts.length === packets.length && bytes.shownDts.every((v, i) => v === packets[i].dts),
      storedDtsNonNegative: bytes.storedDts.every((v) => v >= 0),
    };
  } else {
    const b = bytes.blocks.filter((x) => x.track === 1);
    m.bytes_ = {blocks: b.length, firstMs: b.slice(0, 6).map((x) => x.ms), timesAreWholeMs: b.every((x) => Number.isInteger(x.ms)), matchesFfprobePts: b.length === packets.length && b.every((x, i) => Math.abs(x.ms / 1000 - packets[i].ptsT) < 1e-9), hasDtsField: false};
  }
  m.bytesRaw = bytes;
  return m;
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const files = makeFiles(dir);
  const ev = {ffmpeg: ffmpegVersion(), runs: {}};
  for (const k of Object.keys(CASES)) ev.runs[k] = measure(files[k], k);
  // same pictures in every file: sorted frame hashes agree (the bitstream is the same, only the timestamps differ)
  const md5 = (f) => spawnSync('ffmpeg', ['-v', 'error', '-i', f, '-an', '-f', 'framemd5', '-'], {encoding: 'utf8', maxBuffer: 1 << 27}).stdout.split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());
  ev.sameFramesAsMp4 = {bf2_mkv: md5(files.bf2_mkv).join() === md5(files.bf2_mp4).join(), bf2neg_mp4: md5(files.bf2neg_mp4).join() === md5(files.bf2_mp4).join(), bf0_mkv: md5(files.bf0_mkv).join() === md5(files.bf0_mp4).join()};
  // the key bytes for the picture
  const mp4 = fs.readFileSync(files.bf2_mp4), neg = fs.readFileSync(files.bf2neg_mp4);
  const r = ev.runs.bf2_mp4.bytesRaw, rn = ev.runs.bf2neg_mp4.bytesRaw;
  ev.hex = {
    bf2Stts: {file: 'bf2.mp4', start: r.at.stts, bytes: hexSlice(mp4, r.at.stts, 32)},
    bf2Ctts: {file: 'bf2.mp4', start: r.at.ctts, bytes: hexSlice(mp4, r.at.ctts, 48)},
    bf2Elst: {file: 'bf2.mp4', start: r.at.elst, bytes: hexSlice(mp4, r.at.elst, 32)},
    negCtts: {file: 'bf2neg.mp4', start: rn.at.ctts, bytes: hexSlice(neg, rn.at.ctts, 48)},
  };
  // known positive: ask the mov demuxer to ignore the edit list and the negative start disappears from the dts, the shift moves to the pts
  const ig = packetsOf(files.bf2_mp4, ['-ignore_editlist', '1']);
  ev.ignoreEditlist = {firstPts: ig[0].ptsT, firstDts: ig[0].dtsT, minDts: Math.min(...ig.map((p) => p.dtsT)), n: ig.length, shift: r.mediaTime / r.mdhdTimescale};
  // the picture data: the first 10 decoded frames of bf2.mp4 with every time each reader prints for them, and the first 12 packets in file order with the type of the picture they carry
  const a = ev.runs.bf2_mp4, byPts = new Map(a.packets.map((p) => [p.ptsT, p]));
  ev.frameTable = a.frames.slice(0, 10).map((f, i) => ({type: f.type, pts: f.ptsT, ownDts: byPts.get(f.ptsT).dtsT, pktDts: f.dtsT, bestEffort: f.beT, showinfo: a.showinfo[i].ptsT}));
  const typeOfPts = new Map(a.frames.map((f) => [f.ptsT, f.type]));
  ev.decodeOrder = a.packets.slice(0, 12).map((p) => ({type: typeOfPts.get(p.ptsT), pts: p.ptsT, dts: p.dtsT}));
  for (const run of Object.values(ev.runs)) delete run.bytesRaw;
  return ev;
}
export {r6};
