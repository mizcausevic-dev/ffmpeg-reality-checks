// Episode 31 fixture: "HEVC in MP4: why won't it play on my iPhone / Safari? (hvc1 vs hev1)"
// Synthetic source only (lavfi testsrc2): 2 s, 128x96, 25 fps = 50 frames, encoded with libx265 (ultrafast). Nothing here plays a file in a player.
// Every file is read three ways:
//   reader 1  ffprobe: codec_tag_string and codec_tag (read defensively from the JSON)
//   reader 2  a raw MP4 box parse in Node: the sample entry FourCC inside stsd, whether an hvcC box is inside it, the parameter set arrays in hvcC
//   reader 3  the video stream itself: packet md5 (ffmpeg -c copy -f md5), decoded frame md5, and a hash of the raw samples read from mdat by the box parse
// Matroska has no stsd, so its reader 2 is a byte search of the header for the CodecID string.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {run, ffmpegVersion} from '../../../tools/ff.mjs';

const SRC = ['-f', 'lavfi', '-i', 'testsrc2=s=128x96:r=25:d=2'];
const ENC = ['-c:v', 'libx265', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-x265-params', 'log-level=none:frame-threads=1:pools=none'];
const ENC_REP = ['-c:v', 'libx265', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-x265-params', 'log-level=none:frame-threads=1:pools=none:repeat-headers=1'];

// Each case: how the file is made. "from" means a stream copy of an earlier file.
export const CASES = {
  def:     {file: 'def.mp4',     command: 'ffmpeg -i in -c:v libx265 out.mp4',                            args: [...ENC]},
  hev:     {file: 'hev.mp4',     command: 'ffmpeg -i in -c:v libx265 -tag:v hev1 out.mp4',                args: [...ENC, '-tag:v', 'hev1']},
  hvc:     {file: 'hvc.mp4',     command: 'ffmpeg -i in -c:v libx265 -tag:v hvc1 out.mp4',                args: [...ENC, '-tag:v', 'hvc1']},
  remux:   {file: 'remux.mp4',   command: 'ffmpeg -i def.mp4 -c copy -tag:v hvc1 out.mp4',                from: 'def', args: ['-c', 'copy', '-tag:v', 'hvc1']},
  back:    {file: 'back.mp4',    command: 'ffmpeg -i hvc.mp4 -c copy -tag:v hev1 out.mp4',                from: 'hvc', args: ['-c', 'copy', '-tag:v', 'hev1']},
  copy:    {file: 'copy.mp4',    command: 'ffmpeg -i def.mp4 -c copy out.mp4',                            from: 'def', args: ['-c', 'copy']},
  mov:     {file: 'def.mov',     command: 'ffmpeg -i def.mp4 -c copy out.mov',                            from: 'def', args: ['-c', 'copy']},
  mkv:     {file: 'def.mkv',     command: 'ffmpeg -i in -c:v libx265 out.mkv',                            args: [...ENC]},
  mkv2mp4: {file: 'mkv2mp4.mp4', command: 'ffmpeg -i def.mkv -c copy out.mp4',                            from: 'mkv', args: ['-c', 'copy']},
  rep:     {file: 'rep.mp4',     command: 'ffmpeg -i in -c:v libx265 -x265-params repeat-headers=1 out.mp4', args: [...ENC_REP]},
  repvc:   {file: 'repvc.mp4',   command: 'ffmpeg -i rep.mp4 -c copy -tag:v hvc1 out.mp4',                from: 'rep', args: ['-c', 'copy', '-tag:v', 'hvc1']},
};

export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

// ---- reader 1: ffprobe -------------------------------------------------------------------------------------------------
export function probeTag(file) {
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_streams', '-of', 'json', file]));
  const s = (j.streams ?? [])[0] ?? {};
  const hex = s.codec_tag == null ? null : String(s.codec_tag);
  return {codec: s.codec_name ?? null, tagString: s.codec_tag_string ?? null, tagHex: hex, frames: s.nb_frames == null ? null : Number(s.nb_frames)};
}

// ---- reader 2: raw MP4 box parse ---------------------------------------------------------------------------------------
function* boxes(buf, start, end) {
  let p = start;
  while (p + 8 <= end) {
    let size = buf.readUInt32BE(p), hdr = 8;
    const type = buf.toString('latin1', p + 4, p + 8);
    if (size === 1) { size = Number(buf.readBigUInt64BE(p + 8)); hdr = 16; } else if (size === 0) size = end - p;
    if (size < hdr || p + size > end) return;
    yield {type, start: p, hdr, end: p + size};
    p += size;
  }
}
const child = (buf, b, type, skip = 0) => { for (const c of boxes(buf, b.start + b.hdr + skip, b.end)) if (c.type === type) return c; return null; };
const path_ = (buf, root, names) => { let b = root; for (const n of names) { b = child(buf, b, n); if (!b) return null; } return b; };

export function parseMp4(buf) {
  const top = {start: 0, hdr: 0, end: buf.length};
  const moov = child(buf, top, 'moov');
  if (!moov) return null;
  const traks = [...boxes(buf, moov.start + moov.hdr, moov.end)].filter((b) => b.type === 'trak');
  const stbl = path_(buf, traks[0], ['mdia', 'minf', 'stbl']);
  const stsd = child(buf, stbl, 'stsd');
  // stsd = box header, 4 bytes version/flags, 4 bytes entry count, then the sample entries
  const entry = [...boxes(buf, stsd.start + stsd.hdr + 8, stsd.end)][0];
  const out = {tracks: traks.length, stsd: [stsd.start, stsd.end], fourcc: entry.type, entryRange: [entry.start, entry.end], hvcC: false, arrays: [], lengthSize: null};
  // a visual sample entry has 8 bytes (header) + 6 reserved + 2 data reference index + 70 bytes of fields before its child boxes
  const kids = [...boxes(buf, entry.start + 8 + 8 + 70, entry.end)];
  out.children = kids.map((k) => k.type);
  const hv = kids.find((k) => k.type === 'hvcC');
  if (hv) {
    out.hvcC = true;
    const p = hv.start + hv.hdr;
    out.lengthSize = (buf[p + 21] & 3) + 1;
    let q = p + 23;
    for (let i = 0; i < buf[p + 22]; i++) {
      const complete = (buf[q] >> 7) & 1, type = buf[q] & 0x3f, n = buf.readUInt16BE(q + 1);
      q += 3;
      for (let j = 0; j < n; j++) q += 2 + buf.readUInt16BE(q);
      out.arrays.push({type, complete, count: n});
    }
  }
  // samples: stsz sizes, stsc runs, stco / co64 chunk offsets
  const stsz = child(buf, stbl, 'stsz'), stsc = child(buf, stbl, 'stsc'), stco = child(buf, stbl, 'stco') ?? child(buf, stbl, 'co64');
  const sp = stsz.start + stsz.hdr + 4, fixed = buf.readUInt32BE(sp), count = buf.readUInt32BE(sp + 4);
  const sizes = Array.from({length: count}, (_, i) => fixed || buf.readUInt32BE(sp + 8 + 4 * i));
  const cp = stsc.start + stsc.hdr + 4, runs = Array.from({length: buf.readUInt32BE(cp)}, (_, i) => ({first: buf.readUInt32BE(cp + 4 + 12 * i), per: buf.readUInt32BE(cp + 8 + 12 * i)}));
  const op = stco.start + stco.hdr + 4, nChunks = buf.readUInt32BE(op), wide = stco.type === 'co64';
  const chunkOffset = (i) => wide ? Number(buf.readBigUInt64BE(op + 4 + 8 * i)) : buf.readUInt32BE(op + 4 + 4 * i);
  const samples = [];
  let s = 0;
  for (let c = 0; c < nChunks && s < count; c++) {
    let per = 0; for (const r of runs) if (r.first <= c + 1) per = r.per;
    let off = chunkOffset(c);
    for (let k = 0; k < per && s < count; k++, s++) { samples.push([off, sizes[s]]); off += sizes[s]; }
  }
  const hist = {}, perSample = [];
  const hash = crypto.createHash('sha256');
  for (const [off, size] of samples) {
    hash.update(buf.subarray(off, off + size));
    const types = [];
    for (let q = off; q < off + size;) { const len = buf.readUIntBE(q, out.lengthSize ?? 4); types.push((buf[q + out.lengthSize] >> 1) & 0x3f); q += out.lengthSize + len; }
    perSample.push(types);
    for (const t of types) hist[t] = (hist[t] ?? 0) + 1;
  }
  out.samples = samples.length;
  out.sampleBytes = samples.reduce((a, x) => a + x[1], 0);
  const bt = kids.find((k) => k.type === 'btrt');
  if (bt) { const q = bt.start + bt.hdr; out.btrt = {bufferSizeDB: buf.readUInt32BE(q), maxBitrate: buf.readUInt32BE(q + 4), avgBitrate: buf.readUInt32BE(q + 8)}; }
  out.sampleSha = hash.digest('hex');
  out.firstSampleNals = perSample[0];
  out.samplesWithParamSets = perSample.filter((t) => t.some((x) => x >= 32 && x <= 34)).length;
  return out;
}


// ---- where does a byte live? Walks the box tree and names the deepest box and, for a few boxes, the field. ----------------
const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts', 'dinf', 'udta', 'ilst']);
const hex2 = (b) => b.toString(16).padStart(2, '0');
export function locate(buf, off) {
  const trail = [];
  let lo = 0, hi = buf.length, leaf = null;
  for (let depth = 0; depth < 12; depth++) {
    let hit = null;
    for (const b of boxes(buf, lo, hi)) if (off >= b.start && off < b.end) { hit = b; break; }
    if (!hit) break;
    trail.push(hit.type); leaf = hit;
    if (hit.type === 'meta') { lo = hit.start + hit.hdr + 4; hi = hit.end; }
    else if (hit.type === 'stsd') {
      const e = [...boxes(buf, hit.start + hit.hdr + 8, hit.end)][0];
      if (e && off >= e.start && off < e.end) {
        trail.push(e.type); leaf = e;
        const kid = [...boxes(buf, e.start + 8 + 8 + 70, e.end)].find((k) => off >= k.start && off < k.end);
        if (kid) { trail.push(kid.type); leaf = kid; }
      }
      break;
    } else if (CONTAINERS.has(hit.type)) { lo = hit.start + hit.hdr; hi = hit.end; }
    else break;
  }
  const rel = off - leaf.start, ver = buf[leaf.start + leaf.hdr];
  let field = `byte ${rel} of the box`;
  const t = leaf.type;
  if (t === 'hev1' || t === 'hvc1') field = rel >= 4 && rel < 8 ? `sample entry FourCC, byte ${rel - 4}` : field;
  else if (t === 'hvcC') {
    const p = leaf.start + leaf.hdr; let q = p + 23; field = 'hvcC header';
    for (let i = 0; i < buf[p + 22]; i++) {
      const n = buf.readUInt16BE(q + 1);
      if (off === q) field = `array ${i} header (completeness bit 7, NAL type in bits 0-5)`;
      q += 3; for (let j = 0; j < n; j++) q += 2 + buf.readUInt16BE(q);
    }
  }
  else if (t === 'mvhd' || t === 'mdhd') field = ver === 0 ? ({12: 'creation_time', 16: 'modification_time', 20: 'timescale', 24: 'duration'}[rel - (rel % 4)] ?? field) + ` (version 0, byte ${rel % 4})` : field;
  else if (t === 'tkhd') field = ver === 0 ? ({12: 'creation_time', 16: 'modification_time', 20: 'track_id', 28: 'duration'}[rel - (rel % 4)] ?? field) + ` (version 0, byte ${rel % 4})` : field;
  else if (t === 'btrt') field = rel >= 8 && rel < 20 ? `${['bufferSizeDB', 'maxBitrate', 'avgBitrate'][Math.floor((rel - 8) / 4)]}, byte ${rel % 4} of 4 (0 is the high byte)` : field;
  else if (t === 'data' && trail.includes('ilst')) field = 'metadata value text';
  const a = Math.max(0, off - 8), z = Math.min(buf.length, off + 9);
  const ctx = (b) => [...b.subarray(a, z)].map((c) => (c >= 32 && c < 127 ? String.fromCharCode(c) : '.')).join('');
  return {path: trail.join('/'), box: t, boxStart: leaf.start, boxEnd: leaf.end, field, ascii: ctx(buf), hex: hex2(buf[off])};
}

// ---- reader 3: the stream -----------------------------------------------------------------------------------------------
export const packetMd5 = (file) => run('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:v:0', '-c', 'copy', '-f', 'md5', '-']).trim().replace(/^MD5=/, '');
export const frameHash = (file) => {
  const rows = run('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:v:0', '-f', 'framemd5', '-']).split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());
  return {frames: rows.length, sha: sha(rows.join('\n'))};
};

// which byte offsets differ between two files of the same length (reader of the "only the tag changed" claim)
export function diffOffsets(a, b) {
  if (a.length !== b.length) return null;
  const out = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i);
  return out;
}

export function readFile(file) {
  const buf = fs.readFileSync(file);
  const probe = probeTag(file);
  const isMp4 = file.endsWith('.mp4') || file.endsWith('.mov');
  const r = {bytes: buf.length, probe, packetMd5: packetMd5(file), decoded: frameHash(file)};
  if (isMp4) r.box = parseMp4(buf);
  else {
    const head = buf.subarray(0, 4096);
    r.mkv = {codecId: head.includes(Buffer.from('V_MPEGH/ISO/HEVC')), hasHvc1: head.includes(Buffer.from('hvc1')), hasHev1: head.includes(Buffer.from('hev1'))};
  }
  return r;
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const out = {ffmpeg: ffmpegVersion(), build: buildOf(ffmpegVersion()), source: {width: 128, height: 96, fps: 25, seconds: 2, frames: 50, encoder: 'libx265 ultrafast'}, files: {}, diffs: {}};
  for (const [name, c] of Object.entries(CASES)) {
    const input = c.from ? [...['-i', CASES[c.from].file]] : SRC;
    ff([...input, ...c.args, c.file], dir);
    out.files[name] = {command: c.command, file: c.file, ...readFile(path.join(dir, c.file))};
  }
  // byte level comparison of pairs that have the same length
  const pairs = {'def:remux': ['def', 'remux'], 'def:hev': ['def', 'hev'], 'def:hvc': ['def', 'hvc'], 'def:copy': ['def', 'copy'], 'def:back': ['def', 'back'], 'hvc:back': ['hvc', 'back'], 'rep:repvc': ['rep', 'repvc'], 'copy:remux': ['copy', 'remux'], 'copy:hvc': ['copy', 'hvc']};
  for (const [k, [a, b]] of Object.entries(pairs)) {
    const A = fs.readFileSync(path.join(dir, CASES[a].file)), B = fs.readFileSync(path.join(dir, CASES[b].file));
    const d = diffOffsets(A, B), box = out.files[a].box;
    out.diffs[k] = d == null ? {sameLength: false} : {sameLength: true, count: d.length, insideSampleEntry: d.every((o) => o >= box.entryRange[0] && o < box.entryRange[1]), offsets: d.slice(0, 12), where: d.slice(0, 12).map((o) => ({offset: o, from: locate(A, o), to: {hex: hex2(B[o]), ascii: locate(B, o).ascii}}))};
  }
  return out;
}
