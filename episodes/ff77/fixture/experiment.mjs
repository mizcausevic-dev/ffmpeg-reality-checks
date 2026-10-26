// Episode 77 fixture: "I wrote a fragmented MP4 (-movflags frag_keyframe+empty_moov): why is the duration missing, and can I still seek?"
// Synthetic input only: a lavfi counter clip, 100 frames, 64x48, 10 fps (10 s), one keyframe every 10 frames, encoded lossless (libx264 -qp 0), every
// frame a flat card whose luma names it: luma = 16 + 2 x frame number, so a decoded frame reports its own id and a seek reports where it landed.
// Files written from that clip, each with its own movflags: reg (none), frag (frag_keyframe+empty_moov), fragbase (+default_base_moof), fragdur
// (empty_moov with frag_duration 2 s), fragfirst (frag_keyframe, no empty_moov), dash (+dash), sidx (+global_sidx), sidxbase (+global_sidx+default_base_moof).
// Readers:
//   reader 1  a box reader written in Node: walks ftyp, moov, moof, mdat, sidx, mfra; reads mvhd, mdhd, mehd, trex, stts, sidx, tfhd, tfdt, trun and tfra;
//             its own duration is the sum of every sample duration (stts plus all trun) over the track timescale, which does not trust any header total
//   reader 2  ffprobe and ffmpeg: format and stream duration, nb_frames, frames decoded, and which frame a seek lands on, from a file on disk and from stdin
//             (a non seekable pipe, as in a streaming client)
// Controls: the regular file (header total present, 10 s by both readers); a mehd box injected by hand (the reader must find it); a file truncated at
// 55 percent (a writer that died: the fragments before the cut are whole); and a fragmented file remuxed with -c copy (the repair).
// Every command is plain ffmpeg or ffprobe called with an argument array, no shell, so the tests also run on Windows.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 64, H = 48, FPS = 10, TOTAL = 100, GOP = 10, SECONDS = TOTAL / FPS;
export const FRAME_BYTES = W * H * 3 / 2;
export const lumaOf = (n) => 16 + 2 * n;
export const idOfLuma = (y) => Math.round((y - 16) / 2);
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

const run = (args, opts = {}) => spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {maxBuffer: 1 << 28, ...opts});
const SRC = ['-f', 'lavfi', '-i', `color=c=black:s=${W}x${H}:r=${FPS}:d=${SECONDS},format=yuv420p,geq=lum='16+2*N':cb=100:cr=150`];
const ENC = ['-c:v', 'libx264', '-preset', 'ultrafast', '-qp', '0', '-g', String(GOP), '-keyint_min', String(GOP), '-sc_threshold', '0', '-bf', '0', '-pix_fmt', 'yuv420p'];

// the files under test: name -> extra muxer arguments
export const VARIANTS = {
  reg: [],
  frag: ['-movflags', '+frag_keyframe+empty_moov'],
  fragbase: ['-movflags', '+frag_keyframe+empty_moov+default_base_moof'],
  fragdur: ['-movflags', '+empty_moov', '-frag_duration', '2000000'],
  fragfirst: ['-movflags', '+frag_keyframe'],
  dash: ['-movflags', '+frag_keyframe+empty_moov+dash'],
  sidx: ['-movflags', '+frag_keyframe+empty_moov+global_sidx'],
  sidxbase: ['-movflags', '+frag_keyframe+empty_moov+global_sidx+default_base_moof'],
};
export const commandOf = (name) => `ffmpeg -i counter.mkv -c:v libx264 -qp 0 -g 10 ${VARIANTS[name].join(' ')} ${name}.mp4`.replace(/\s+/g, ' ');

// ---------- reader 1: the box reader ----------
const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts', 'dinf', 'moof', 'traf', 'mvex', 'mfra', 'udta']);
export function readBoxes(buf) {
  const out = [];
  const walk = (s, e, depth, parent) => {
    let o = s;
    while (o + 8 <= e) {
      let size = buf.readUInt32BE(o), hdr = 8; const type = buf.toString('latin1', o + 4, o + 8);
      if (size === 1) { if (o + 16 > e) break; size = Number(buf.readBigUInt64BE(o + 8)); hdr = 16; } else if (size === 0) size = e - o;
      const truncated = o + size > e;
      const b = {type, off: o, size, hdr, depth, parent, truncated};
      out.push(b);
      if (truncated || size < hdr) break;
      if (CONTAINERS.has(type)) walk(o + hdr, o + size, depth + 1, b);
      o += size;
    }
  };
  walk(0, buf.length, 0, null);
  return out;
}
const body = (buf, b) => buf.subarray(b.off + b.hdr, b.off + b.size);
const u32 = (x, o) => x.readUInt32BE(o);
const u64 = (x, o) => Number(x.readBigUInt64BE(o));

function parseSidx(x) {
  const v = x[0]; let o = 4;
  const refId = u32(x, o); o += 4; const timescale = u32(x, o); o += 4;
  let earliest, first;
  if (v === 0) { earliest = u32(x, o); first = u32(x, o + 4); o += 8; } else { earliest = u64(x, o); first = u64(x, o + 8); o += 16; }
  o += 2; const n = x.readUInt16BE(o); o += 2;
  const refs = [];
  for (let i = 0; i < n; i++) { const a = u32(x, o), d = u32(x, o + 4); refs.push({type: a >>> 31, size: a & 0x7fffffff, duration: d}); o += 12; }
  return {refId, timescale, earliest, first, refs, total: refs.reduce((s, r) => s + r.duration, 0) / timescale};
}
function parseTfhd(x) {
  const flags = x.readUIntBE(1, 3); let o = 8; const t = {flags, baseOffset: null, defaultDuration: null, defaultBaseIsMoof: !!(flags & 0x20000)};
  if (flags & 0x1) { t.baseOffset = u64(x, o); o += 8; }
  if (flags & 0x2) o += 4;
  if (flags & 0x8) { t.defaultDuration = u32(x, o); o += 4; }
  return t;
}
function parseTrun(x, dflt) {
  const flags = x.readUIntBE(1, 3), n = u32(x, 4); let o = 8;
  if (flags & 0x1) o += 4;
  if (flags & 0x4) o += 4;
  let total = 0;
  for (let i = 0; i < n; i++) {
    let d = dflt;
    if (flags & 0x100) { d = u32(x, o); o += 4; }
    if (flags & 0x200) o += 4;
    if (flags & 0x400) o += 4;
    if (flags & 0x800) o += 4;
    total += d ?? 0;
  }
  return {samples: n, duration: total};
}

// describe(buf): everything the film quotes about the structure of one file
export function describe(buf) {
  const bx = readBoxes(buf);
  const first = (type, within) => bx.find((b) => b.type === type && (!within || b.parent === within || isInside(b, within)));
  function isInside(b, p) { for (let a = b.parent; a; a = a.parent) if (a === p) return true; return false; }
  const top = bx.filter((b) => b.depth === 0);
  const d = {size: buf.length, top: top.map((b) => b.type), layout: top.map((b) => ({type: b.type, off: b.off, size: b.size})), truncatedAt: top.find((b) => b.truncated)?.type ?? null};
  const hex = (b, n) => [...buf.subarray(b.off, b.off + Math.min(n, b.size))].map((v) => v.toString(16).padStart(2, '0'));
  const moov = first('moov');
  const mvhd = moov && first('mvhd', moov);
  if (mvhd) d.mvhdHex = hex(mvhd, 28);
  if (mvhd) { const x = body(buf, mvhd); const v = x[0]; d.mvhd = v === 0 ? {timescale: u32(x, 12), duration: u32(x, 16)} : {timescale: u32(x, 20), duration: u64(x, 24)}; }
  const mdhd = moov && first('mdhd', moov);
  let ts = d.mvhd?.timescale ?? 1000;
  if (mdhd) { const x = body(buf, mdhd); const v = x[0]; ts = v === 0 ? u32(x, 12) : u32(x, 20); d.mdhd = {timescale: ts, duration: v === 0 ? u32(x, 16) : u64(x, 24)}; }
  const mehd = moov && first('mehd', moov);
  d.mehd = mehd ? (() => { const x = body(buf, mehd); return {duration: x[0] === 0 ? u32(x, 4) : u64(x, 4)}; })() : null;
  const trex = moov && first('trex', moov);
  const trexDur = trex ? u32(body(buf, trex), 12) : null;
  const stts = moov && first('stts', moov);
  let sttsDur = 0, sttsSamples = 0;
  if (stts) { const x = body(buf, stts); const n = u32(x, 4); for (let i = 0; i < n; i++) { sttsSamples += u32(x, 8 + i * 8); sttsDur += u32(x, 8 + i * 8) * u32(x, 12 + i * 8); } }
  d.header = {samples: sttsSamples, duration: sttsDur / ts};
  const sidxBox = bx.find((b) => b.type === 'sidx' && !b.truncated); if (sidxBox) d.sidxHex = hex(sidxBox, 44);
  d.sidx = bx.filter((b) => b.type === 'sidx' && !b.truncated).map((b) => parseSidx(body(buf, b)));
  const tfra = bx.find((b) => b.type === 'tfra' && !b.truncated);
  d.mfra = bx.some((b) => b.type === 'mfra') ? {entries: tfra ? u32(body(buf, tfra), 12) : 0} : null;
  // fragments
  const mdats = top.filter((b) => b.type === 'mdat');
  d.moofs = []; let fragSamples = 0, fragDur = 0;
  for (const m of top.filter((b) => b.type === 'moof')) {
    const complete = !m.truncated;
    const next = top[top.indexOf(m) + 1];
    const dataComplete = complete && next && next.type === 'mdat' && !next.truncated;
    const f = {off: m.off, complete, dataComplete, samples: 0, duration: 0, baseOk: true, baseOffset: null};
    if (complete) {
      const traf = bx.find((b) => b.type === 'traf' && b.parent === m);
      const tfhdB = traf && bx.find((b) => b.type === 'tfhd' && b.parent === traf);
      const tfh = tfhdB ? parseTfhd(body(buf, tfhdB)) : null;
      if (tfh) { f.baseOffset = tfh.baseOffset; f.baseOk = tfh.baseOffset === null || tfh.baseOffset === m.off; }
      for (const t of bx.filter((b) => b.type === 'trun' && b.parent === traf)) { const r = parseTrun(body(buf, t), tfh?.defaultDuration ?? trexDur); f.samples += r.samples; f.duration += r.duration; }
    }
    d.moofs.push(f);
    if (dataComplete) { fragSamples += f.samples; fragDur += f.duration; }
  }
  d.fragments = d.moofs.length;
  d.wholeFragments = d.moofs.filter((f) => f.dataComplete).length;
  d.baseOk = d.moofs.every((f) => f.baseOk);
  d.samples = sttsSamples + fragSamples;
  d.seconds = (sttsDur + fragDur) / ts; // the reader's own duration: every sample duration, no header total
  d.mdatCount = mdats.length;
  d.moovAfterMdat = top.findIndex((b) => b.type === 'moov') > top.findIndex((b) => b.type === 'mdat') && top.some((b) => b.type === 'mdat');
  return d;
}

// ---------- reader 2: ffprobe and ffmpeg ----------
const num = (v) => (v === undefined || v === 'N/A' || v === null ? null : Number(v));
export function probe(file, {stdin = null} = {}) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=duration,nb_frames', '-of', 'json', stdin ? '-' : file], {encoding: 'utf8', input: stdin ?? undefined, maxBuffer: 1 << 26});
  if (r.status !== 0) return {ok: false, exit: r.status, error: String(r.stderr).trim().split(/\r?\n/)[0], format: null, stream: null, nbFrames: null};
  const j = JSON.parse(r.stdout);
  return {ok: true, exit: 0, format: num(j.format?.duration), stream: num(j.streams?.[0]?.duration), nbFrames: num(j.streams?.[0]?.nb_frames)};
}
export function decodeIds(file, {stdin = null} = {}) {
  const r = run(['-i', stdin ? '-' : file, '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-'], {input: stdin ?? undefined});
  const buf = r.stdout, n = Math.floor(buf.length / FRAME_BYTES), ids = [];
  for (let i = 0; i < n; i++) ids.push(idOfLuma(buf[i * FRAME_BYTES]));
  return {exit: r.status, frames: n, ids, error: r.status === 0 ? null : String(r.stderr).trim().split(/\r?\n/)[0]};
}
export function frameMd5(file) {
  const r = run(['-i', file, '-an', '-f', 'framemd5', '-'], {encoding: 'utf8'});
  return r.status !== 0 ? [] : r.stdout.split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());
}
// which frame does a seek land on: {id} or {id: null, error}
export function seekId(file, kind, t, {stdin = null} = {}) {
  const r = run([kind === 'ss' ? '-ss' : '-sseof', String(t), '-i', stdin ? '-' : file, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-'], {input: stdin ?? undefined});
  if (r.status !== 0 || r.stdout.length < FRAME_BYTES) return {id: null, error: String(r.stderr).trim().split(/\r?\n/)[0] || `exit ${r.status}`};
  return {id: idOfLuma(r.stdout[0]), error: null};
}
// where a correct seek lands: the first frame at or after the requested time
export const expectedId = (seconds) => Math.max(0, Math.min(TOTAL - 1, Math.ceil(seconds * FPS - 1e-9)));

export const SEEKS = [{kind: 'ss', t: 0}, {kind: 'ss', t: 3.5}, {kind: 'ss', t: 9.9}, {kind: 'sseof', t: -2}];
export const expectedSeek = (s) => expectedId(s.kind === 'ss' ? s.t : SECONDS + s.t);

// a mehd box added by hand to a default_base_moof file (no flag of this build writes one); mfra dropped because its offsets would be stale
export function injectMehd(buf, seconds, {mvhdSeconds = null} = {}) {
  const b = Buffer.from(buf);
  const moovAt = b.indexOf('moov') - 4, mvexAt = b.indexOf('mvex') - 4;
  const moovSize = b.readUInt32BE(moovAt), mvexSize = b.readUInt32BE(mvexAt);
  const mehd = Buffer.alloc(16); mehd.writeUInt32BE(16, 0); mehd.write('mehd', 4, 'latin1'); mehd.writeUInt32BE(Math.round(seconds * 1000), 12);
  const out = Buffer.concat([b.subarray(0, mvexAt + 8), mehd, b.subarray(mvexAt + 8)]);
  out.writeUInt32BE(moovSize + 16, moovAt); out.writeUInt32BE(mvexSize + 16, mvexAt);
  const mfraAt = out.lastIndexOf('mfra') - 4;
  const res = mfraAt > 0 ? out.subarray(0, mfraAt) : out;
  if (mvhdSeconds !== null) res.writeUInt32BE(Math.round(mvhdSeconds * 1000), res.indexOf('mvhd') + 20);
  return res;
}

const rd = (f) => fs.readFileSync(f);
function measureFile(dir, name, file) {
  const buf = rd(file);
  const node = describe(buf);
  const disk = probe(file), pipe = probe(file, {stdin: buf});
  const dec = decodeIds(file);
  const seeks = {disk: [], pipe: []};
  for (const s of SEEKS) {
    const e = expectedSeek(s);
    const a = seekId(file, s.kind, s.t); seeks.disk.push({...s, expected: e, id: a.id, error: a.error});
    const p = seekId(file, s.kind, s.t, {stdin: buf}); seeks.pipe.push({...s, expected: e, id: p.id, error: p.error});
  }
  return {name, file: path.basename(file), command: VARIANTS[name] ? commandOf(name) : null, node, disk, pipe, decoded: {frames: dec.frames, ordered: dec.ids.every((v, i) => v === i), exit: dec.exit}, seeks};
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const ev = {ffmpeg: ffmpegVersion(), source: {frames: TOTAL, fps: FPS, seconds: SECONDS, gop: GOP}, files: {}, controls: {}, truncated: {}, remux: {}, pipeWrite: {}};
  const p = (n) => path.join(dir, n);
  for (const [name, extra] of Object.entries(VARIANTS)) {
    const r = run([...SRC, ...ENC, ...extra, p(`${name}.mp4`)]);
    if (r.status !== 0) throw new Error(`could not write ${name}: ${r.stderr}`);
    ev.files[name] = measureFile(dir, name, p(`${name}.mp4`));
  }
  // control: a mehd box injected by hand, with and without a matching mvhd total
  const base = rd(p('fragbase.mp4'));
  for (const [name, opts] of [['mehd', {}], ['mehdMvhd', {mvhdSeconds: SECONDS}]]) {
    fs.writeFileSync(p(`${name}.mp4`), injectMehd(base, SECONDS, opts));
    const f = measureFile(dir, name, p(`${name}.mp4`)); ev.controls[name] = f;
  }
  // control: the source frame hashes, from the regular file
  const srcMd5 = frameMd5(p('reg.mp4'));
  ev.source.hashes = srcMd5.length;
  // a writer that died: cut at 55 percent
  for (const name of ['reg', 'frag']) {
    const buf = rd(p(`${name}.mp4`)); const cut = Math.floor(buf.length * 0.55);
    fs.writeFileSync(p(`cut_${name}.mp4`), buf.subarray(0, cut));
    const cb = buf.subarray(0, cut);
    const dec = decodeIds(p(`cut_${name}.mp4`));
    ev.truncated[name] = {cut, of: buf.length, node: describe(cb), disk: probe(p(`cut_${name}.mp4`)), decoded: {frames: dec.frames, ordered: dec.ids.every((v, i) => v === i), exit: dec.exit, error: dec.error}};
  }
  // the repair: remux a fragmented file with -c copy
  const rm = run(['-i', p('frag.mp4'), '-c', 'copy', p('remux.mp4')]);
  if (rm.status !== 0) throw new Error(`remux failed: ${rm.stderr}`);
  const rf = measureFile(dir, 'remux', p('remux.mp4'));
  ev.remux = {file: rf, sameHashes: JSON.stringify(frameMd5(p('remux.mp4'))) === JSON.stringify(srcMd5), command: 'ffmpeg -i frag.mp4 -c copy remux.mp4'};
  // writing to a pipe: a regular mp4 needs to seek back, a fragmented one does not
  const w = (extra) => run([...SRC, ...ENC, ...extra, '-f', 'mp4', '-']);
  const wr = w([]); ev.pipeWrite.reg = {exit: wr.status, bytes: wr.stdout.length, error: String(wr.stderr).split(/\r?\n/).find((l) => /seekable/.test(l)) ?? null};
  const wf = w(VARIANTS.frag); fs.writeFileSync(p('fragpipe.mp4'), wf.stdout);
  const pf = measureFile(dir, 'fragpipe', p('fragpipe.mp4'));
  ev.pipeWrite.frag = {exit: wf.status, bytes: wf.stdout.length, file: pf};
  const ws = w(VARIANTS.sidxbase); ev.pipeWrite.sidxbase = {exit: ws.status, bytes: ws.stdout.length, sidx: describe(ws.stdout).sidx.length};
  return ev;
}

export function write(file, ev) { fs.writeFileSync(file, JSON.stringify(ev, null, 1)); }
