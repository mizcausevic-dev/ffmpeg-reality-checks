// Episode 68 fixture: "ffprobe shows three durations (format, stream, packets): which one is true?"
// Synthetic input only. Video: 100 frames, 96x72, 25 fps (4 s), lossless x264, copied into every output. Audio: a 440 Hz sine, 48000 Hz mono, written as
// pcm_s16le in mkv and mov, and as aac in mp4 and ts. Three conditions per container (12 files):
//   same   audio 4 s, starts with the video                (video 4 s, audio 4 s)
//   long   audio 5 s, starts with the video                (video 4 s, audio 5 s)
//   late   audio 4 s, starts 1 s after the video (-itsoffset 1) (video 0 to 4 s, audio 1 to 5 s)
// Readers:
//   reader 1  ffprobe: format.duration and start_time, stream duration and start_time, every packet (pts_time, duration_time)
//   reader 2  the decoder: ffmpeg decodes to raw gray frames and raw s16le samples, Node counts them (frames / 25, samples / 48000)
//   reader 3  the container bytes in Node: mp4 and mov boxes (mvhd, tkhd, mdhd, elst, stts), the matroska Info Duration and block times, the transport stream PES time stamps
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 96, H = 72, FPS = 25, VIDEO_S = 4, VIDEO_FRAMES = VIDEO_S * FPS, RATE = 48000;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
const r3 = (v) => (v === null || v === undefined ? null : Math.round(v * 1000) / 1000);
const r6 = (v) => (v === null || v === undefined ? null : Math.round(v * 1e6) / 1e6);

const ffm = (args, opts = {}) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {maxBuffer: 1 << 28, ...opts});
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${String(r.stderr)}`);
  return r;
};

export const CONTAINERS = {
  mkv: {ext: 'mkv', acodec: 'pcm_s16le'},
  mov: {ext: 'mov', acodec: 'pcm_s16le'},
  mp4: {ext: 'mp4', acodec: 'aac'},
  ts: {ext: 'ts', acodec: 'aac'},
};
export const CONDITIONS = {
  same: {audioS: 4, audioOffset: 0},
  long: {audioS: 5, audioOffset: 0},
  late: {audioS: 4, audioOffset: 1},
};
export const CASES = {};
for (const c of Object.keys(CONTAINERS)) for (const k of Object.keys(CONDITIONS)) CASES[`${c}_${k}`] = {container: c, cond: k, ...CONTAINERS[c], ...CONDITIONS[k]};

export const commandOf = (name) => {
  const c = CASES[name];
  const off = c.audioOffset ? `-itsoffset ${c.audioOffset} ` : '';
  return `ffmpeg -i v.mkv ${off}-i a${c.audioS}.wav -map 0:v -map 1:a -c:v copy -c:a ${c.acodec} out.${c.ext}`;
};

export function makeSources(dir) {
  const v = path.join(dir, 'v.mkv');
  ffm(['-f', 'lavfi', '-i', `testsrc2=s=${W}x${H}:r=${FPS}:d=${VIDEO_S},format=yuv420p`, '-c:v', 'libx264', '-qp', '0', '-pix_fmt', 'yuv420p', v]);
  const wav = {};
  for (const s of [4, 5]) {
    wav[s] = path.join(dir, `a${s}.wav`);
    ffm(['-f', 'lavfi', '-i', `sine=frequency=440:sample_rate=${RATE}:duration=${s},aformat=channel_layouts=mono`, '-c:a', 'pcm_s16le', wav[s]]);
  }
  return {v, wav};
}
export function makeCase(src, dir, name) {
  const c = CASES[name];
  const out = path.join(dir, `${name}.${c.ext}`);
  const args = ['-i', src.v];
  if (c.audioOffset) args.push('-itsoffset', String(c.audioOffset));
  args.push('-i', src.wav[c.audioS], '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', c.acodec, out);
  ffm(args);
  return out;
}

// ---------------- reader 1: ffprobe ----------------
const hms = (t) => { const [h, m, sec] = t.split(':'); return Number(h) * 3600 + Number(m) * 60 + Number(sec); };
const num = (s) => (s === undefined || s === null || s === 'N/A' ? null : Number(s));
export function probeFile(file) {
  const j = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-of', 'json', '-show_entries', 'format=format_name,duration,start_time:stream=index,codec_type,codec_name,start_time,duration,nb_frames:stream_tags=DURATION', file], {encoding: 'utf8', maxBuffer: 1 << 26}).stdout);
  const streams = {};
  for (const s of j.streams) streams[s.codec_type] = {codec: s.codec_name, start: num(s.start_time), duration: num(s.duration), nbFrames: num(s.nb_frames), index: s.index, tagDuration: s.tags?.DURATION ? hms(s.tags.DURATION) : null};
  return {format: {name: j.format.format_name, duration: num(j.format.duration), start: num(j.format.start_time)}, streams};
}
export function packetStats(file, index) {
  const out = spawnSync('ffprobe', ['-v', 'error', '-select_streams', String(index), '-show_entries', 'packet=pts_time,duration_time', '-of', 'csv=p=0', file], {encoding: 'utf8', maxBuffer: 1 << 28}).stdout;
  const pk = out.split(/\r?\n/).map((l) => l.replace(/,$/, '').trim()).filter(Boolean).map((l) => { const [p, d] = l.split(','); return {pts: Number(p), dur: Number(d)}; });
  let first = Infinity, last = -Infinity, lastDur = 0, sum = 0;
  for (const p of pk) { sum += p.dur; if (p.pts < first) first = p.pts; if (p.pts > last) { last = p.pts; lastDur = p.dur; } }
  return {n: pk.length, first, last, lastDur, sumDur: sum, span: last + lastDur - first, end: last + lastDur};
}

// ---------------- reader 2: the decoder ----------------
export function decodedCounts(file) {
  const v = ffm(['-i', file, '-map', '0:v:0', '-an', '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'gray', '-']).stdout;
  const a = ffm(['-i', file, '-map', '0:a:0', '-vn', '-f', 's16le', '-']).stdout;
  if (v.length % (W * H)) throw new Error(`unexpected raw video size ${v.length}`);
  return {frames: v.length / (W * H), samples: a.length / 2};
}

// ---------------- reader 3: container bytes ----------------
// mp4 and mov: walk the boxes. Version 0 and 1 of mvhd, tkhd, mdhd; elst entries; stts total.
const CONTAINER_BOXES = new Set(['moov', 'trak', 'edts', 'mdia', 'minf', 'stbl']);
export function readMp4(buf) {
  const out = {mvhd: null, tracks: []};
  let cur = null;
  const walk = (start, end) => {
    let p = start;
    while (p + 8 <= end) {
      let size = buf.readUInt32BE(p); const type = buf.toString('latin1', p + 4, p + 8); let head = 8;
      if (size === 1) { size = Number(buf.readBigUInt64BE(p + 8)); head = 16; } else if (size === 0) size = end - p;
      if (size < head) break;
      const body = p + head, bodyEnd = p + size;
      if (type === 'moov') { walk(body, bodyEnd); } else if (type === 'trak') { cur = {handler: null, tkhd: null, mdhd: null, elst: [], stts: null, samples: null, offsets: {}}; out.tracks.push(cur); cur.offsets.trak = p; walk(body, bodyEnd); }
      else if (CONTAINER_BOXES.has(type)) walk(body, bodyEnd);
      else if (type === 'mvhd') { const v = buf[body]; const o = v === 1 ? body + 20 : body + 12; out.mvhd = v === 1 ? {timescale: buf.readUInt32BE(o), duration: Number(buf.readBigUInt64BE(o + 4)), at: o + 4, width: 8} : {timescale: buf.readUInt32BE(o), duration: buf.readUInt32BE(o + 4), at: o + 4, width: 4}; }
      else if (type === 'tkhd') { const v = buf[body]; const o = v === 1 ? body + 24 : body + 16; cur.tkhd = {duration: v === 1 ? Number(buf.readBigUInt64BE(o + 4)) : buf.readUInt32BE(o + 4), at: o + 4}; }
      else if (type === 'mdhd') { const v = buf[body]; const o = v === 1 ? body + 20 : body + 12; cur.mdhd = {timescale: buf.readUInt32BE(o), duration: v === 1 ? Number(buf.readBigUInt64BE(o + 4)) : buf.readUInt32BE(o + 4), at: o + 4}; }
      else if (type === 'hdlr') { cur.handler ??= buf.toString('latin1', body + 8, body + 12); }
      else if (type === 'elst') { const v = buf[body]; const n = buf.readUInt32BE(body + 4); let o = body + 8; for (let i = 0; i < n; i++) { if (v === 1) { cur.elst.push({segment: Number(buf.readBigUInt64BE(o)), mediaTime: Number(buf.readBigInt64BE(o + 8)), at: o}); o += 20; } else { cur.elst.push({segment: buf.readUInt32BE(o), mediaTime: buf.readInt32BE(o + 4), at: o}); o += 12; } } }
      else if (type === 'stts') { const n = buf.readUInt32BE(body + 4); let o = body + 8, total = 0, cnt = 0; for (let i = 0; i < n; i++) { cnt += buf.readUInt32BE(o); total += buf.readUInt32BE(o) * buf.readUInt32BE(o + 4); o += 8; } cur.stts = total; cur.samples = cnt; }
      p += size;
    }
  };
  walk(0, buf.length);
  const mt = out.mvhd.timescale;
  out.movieSeconds = out.mvhd.duration / mt;
  out.tracks.forEach((t) => {
    t.tkhdSeconds = t.tkhd.duration / mt;
    t.mediaSeconds = t.mdhd.duration / t.mdhd.timescale;
    t.sttsSeconds = t.stts / t.mdhd.timescale;
    t.elstSeconds = t.elst.reduce((s, e) => s + e.segment, 0) / mt;
    t.emptyEditSeconds = t.elst.filter((e) => e.mediaTime === -1).reduce((s, e) => s + e.segment, 0) / mt;
    t.mediaTimeStart = (t.elst.find((e) => e.mediaTime >= 0) ?? {mediaTime: null}).mediaTime;
    t.mediaTimeStartSeconds = t.mediaTimeStart === null ? null : t.mediaTimeStart / t.mdhd.timescale;
  });
  return out;
}

// matroska: ebml walk over the Segment: Info (TimecodeScale, Duration) and the Cluster blocks (track, time, optional BlockDuration)
const MKV_MASTER = new Set([0x18538067, 0x1549a966, 0x1f43b675, 0xa0, 0x1654ae6b]);
function vint(buf, p, keepMarker) {
  const b = buf[p]; let len = 1, mask = 0x80;
  while (len <= 8 && !(b & mask)) { len++; mask >>= 1; }
  let v = keepMarker ? b : b & (mask - 1);
  for (let i = 1; i < len; i++) v = v * 256 + buf[p + i];
  return {v, len};
}
export function readMkv(buf) {
  const info = {timecodeScale: 1e6, duration: null, durationAt: null, durationWidth: null, blocks: {}};
  let lastBlock = null;
  const walk = (start, end, clusterTime) => {
    let p = start;
    while (p < end) {
      const id = vint(buf, p, true); p += id.len;
      const sz = vint(buf, p, false); p += sz.len;
      const unknown = sz.v === 2 ** (7 * sz.len) - 1;
      const bodyEnd = unknown ? end : Math.min(end, p + sz.v);
      if (MKV_MASTER.has(id.v)) {
        if (id.v === 0x1f43b675) {
          // cluster: find its Timecode first (0xE7) then its blocks
          let ct = 0, q = p;
          while (q < bodyEnd) { const i2 = vint(buf, q, true); q += i2.len; const s2 = vint(buf, q, false); q += s2.len; if (i2.v === 0xe7) { ct = 0; for (let k = 0; k < s2.v; k++) ct = ct * 256 + buf[q + k]; break; } q += s2.v; }
          walk(p, bodyEnd, ct);
        } else walk(p, bodyEnd, clusterTime);
      } else if (id.v === 0x2ad7b1) { let v = 0; for (let k = 0; k < sz.v; k++) v = v * 256 + buf[p + k]; info.timecodeScale = v; }
      else if (id.v === 0x4489) { info.duration = sz.v === 4 ? buf.readFloatBE(p) : buf.readDoubleBE(p); info.durationAt = p; info.durationWidth = sz.v; }
      else if (id.v === 0xa3 || id.v === 0xa1) {
        const tr = vint(buf, p, false); const rel = buf.readInt16BE(p + tr.len);
        lastBlock = {t: (clusterTime + rel) * info.timecodeScale / 1e9, dur: null};
        (info.blocks[tr.v] ??= []).push(lastBlock);
      } else if (id.v === 0x9b) { let v = 0; for (let k = 0; k < sz.v; k++) v = v * 256 + buf[p + k]; if (lastBlock) lastBlock.dur = v * info.timecodeScale / 1e9; }
      p = bodyEnd;
    }
  };
  // skip the EBML header
  let p = 0; const id = vint(buf, p, true); p += id.len; const sz = vint(buf, p, false); p += sz.len + sz.v;
  walk(p, buf.length, 0);
  info.durationSeconds = info.duration === null ? null : info.duration * info.timecodeScale / 1e9;
  info.durationTags = [];
  for (let at = buf.indexOf('DURATION', 0, 'latin1'); at >= 0; at = buf.indexOf('DURATION', at + 8, 'latin1')) {
    let q = at + 8; if (buf[q] !== 0x44 || buf[q + 1] !== 0x87) continue; q += 2;
    const sv = vint(buf, q, false); q += sv.len;
    const txt = buf.toString('latin1', q, q + sv.v).replace(/\0+$/, ''); info.durationTags.push({text: txt, at: q, seconds: hms(txt)});
  }
  info.hasDurationTag = info.durationTags.length > 0;
  const steps = new Set(); const ab = info.blocks[2] ?? [];
  for (let i = 1; i < ab.length; i++) steps.add(Math.round((ab[i].t - ab[i - 1].t) * 1000));
  info.audioStepsMs = [...steps].sort((a, b) => a - b);
  info.wholeMs = Object.values(info.blocks).every((b) => b.every((x) => Math.abs(x.t * 1000 - Math.round(x.t * 1000)) < 1e-6));
  return info;
}

// mpeg transport stream: every 188 byte packet; a PES header (start code 00 00 01, stream id) carries the 33 bit PTS in 90 kHz
export function readTs(buf) {
  const pes = {};
  for (let p = 0; p + 188 <= buf.length; p += 188) {
    if (buf[p] !== 0x47) throw new Error(`lost sync at ${p}`);
    const pusi = (buf[p + 1] & 0x40) !== 0; const pid = ((buf[p + 1] & 0x1f) << 8) | buf[p + 2];
    if (!pusi) continue;
    const afc = (buf[p + 3] >> 4) & 3; let o = p + 4;
    if (afc & 2) o += 1 + buf[o];
    if (!(afc & 1)) continue;
    if (!(buf[o] === 0 && buf[o + 1] === 0 && buf[o + 2] === 1)) continue;
    const sid = buf[o + 3]; if (sid < 0xc0 || sid > 0xef) continue;
    if (!(buf[o + 7] & 0x80)) continue;
    const q = o + 9;
    const pts = ((buf[q] >> 1) & 7) * 2 ** 30 + buf[q + 1] * 2 ** 22 + (buf[q + 2] >> 1) * 2 ** 15 + buf[q + 3] * 2 ** 7 + (buf[q + 4] >> 1);
    (pes[pid] ??= {sid, pts: [], at: []}).pts.push(pts / 90000); pes[pid].at.push({pesAt: o, ptsAt: q});
  }
  const out = {};
  for (const [pid, e] of Object.entries(pes)) { const li = e.pts.indexOf(Math.max(...e.pts)); out[e.sid >= 0xe0 ? 'video' : 'audio'] = {pid: Number(pid), count: e.pts.length, first: Math.min(...e.pts), last: Math.max(...e.pts), lastPesAt: e.at[li].pesAt, lastPtsAt: e.at[li].ptsAt, lastPtsTicks: Math.round(e.pts[li] * 90000), all: e.pts}; }
  return out;
}

export const hexSlice = (file, offset, len) => { const fd = fs.openSync(file, 'r'); const b = Buffer.alloc(len); fs.readSync(fd, b, 0, len, offset); fs.closeSync(fd); return [...b].map((x) => x.toString(16).padStart(2, '0')); };

const readContainer = (file, container) => {
  const buf = fs.readFileSync(file);
  if (container === 'mp4' || container === 'mov') return readMp4(buf);
  if (container === 'mkv') return readMkv(buf);
  return readTs(buf);
};

// ---------------- one case ----------------
export function measure(file, name) {
  const c = CASES[name];
  const pr = probeFile(file);
  const vp = packetStats(file, pr.streams.video.index), ap = packetStats(file, pr.streams.audio.index);
  const dec = decodedCounts(file);
  const cont = readContainer(file, c.container);
  const vStart = pr.streams.video.start, aStart = pr.streams.audio.start;
  const vContent = dec.frames / FPS, aContent = dec.samples / RATE;
  const vEnd = vStart + vContent, aEnd = aStart + aContent;
  const timelineStart = Math.min(vStart, aStart), timelineEnd = Math.max(vEnd, aEnd);
  const m = {
    name, command: commandOf(name), container: c.container, cond: c.cond, bytes: fs.statSync(file).size,
    probe: {format: pr.format, video: pr.streams.video, audio: pr.streams.audio},
    packets: {video: vp, audio: ap},
    decoded: {frames: dec.frames, samples: dec.samples, videoSeconds: vContent, audioSeconds: aContent, expectedSamples: c.audioS * RATE},
    timeline: {start: timelineStart, end: timelineEnd, length: timelineEnd - timelineStart},
    container: cont,
  };
  m.gaps = {
    formatVsTimeline: r6(pr.format.duration - m.timeline.length),
    audioStreamVsDecoded: pr.streams.audio.duration === null ? null : r6(pr.streams.audio.duration - aContent),
    videoStreamVsDecoded: pr.streams.video.duration === null ? null : r6(pr.streams.video.duration - vContent),
    audioPacketSumVsDecoded: r6(ap.sumDur - aContent), audioPacketSpanVsDecoded: r6(ap.span - aContent),
    videoPacketSumVsDecoded: r6(vp.sumDur - vContent),
  };
  // model of the file duration from ffprobe's own stream starts and durations: latest stream end minus earliest stream start
  const sv = pr.streams.video, sa = pr.streams.audio;
  m.formatModel = sv.duration !== null && sa.duration !== null ? r6(Math.max(sv.start + sv.duration, sa.start + sa.duration) - Math.min(sv.start, sa.start)) : null;
  if (c.container === 'ts') {
    const AF = 1024 / RATE, VF = 1 / FPS;
    m.tsModel = {
      audioStream: r6(cont.audio.last + AF - cont.audio.first), videoStream: r6(cont.video.last + VF - cont.video.first),
      audioFramesInLastPes: Math.round((ap.end - cont.audio.last) / AF), audioPackets: ap.n,
    };
  }
  return m;
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const src = makeSources(dir);
  const ev = {ffmpeg: ffmpegVersion(), runs: {}};
  const files = {};
  for (const name of Object.keys(CASES)) { files[name] = makeCase(src, dir, name); ev.runs[name] = measure(files[name], name); }
  // the key bytes, for the picture: where the numbers sit in the files (16 bytes a row, real file offsets, keys are indexes into bytes)
  const R = ev.runs;
  const block = (name, keys, before, minLen = 32, aligned = true) => {
    const k0 = Math.min(...keys.map((k) => k.at)), k1 = Math.max(...keys.map((k) => k.at + k.len));
    const start = aligned ? Math.max(0, Math.floor((k0 - before) / 16) * 16) : Math.max(0, k0 - before);
    const len = Math.max(minLen, Math.ceil((k1 - start) / 16) * 16);
    return {file: path.basename(files[name]), start, bytes: hexSlice(files[name], start, len), keys: keys.map((k) => ({from: k.at - start, len: k.len, label: k.label}))};
  };
  const mvhd = R.mov_same.container.mvhd, el = R.mov_late.container.tracks[1].elst;
  const dur = R.mkv_long.container, pes = R.ts_long.container.audio;
  ev.hex = {
    movMvhd: block('mov_same', [{at: mvhd.at - 4, len: 4, label: 'timescale'}, {at: mvhd.at, len: 4, label: 'duration'}], 20, 48, false),
    movElst: block('mov_late', [{at: el[0].at, len: 4, label: 'segment'}, {at: el[0].at + 4, len: 4, label: 'media time'}], 16, 48, false),
    mkvDuration: block('mkv_long', [{at: dur.durationAt - 3, len: 3 + dur.durationWidth, label: 'Duration'}], 4, 32, false),
    tsLastPes: block('ts_long', [{at: pes.lastPesAt, len: 4, label: 'start code'}, {at: pes.lastPtsAt, len: 5, label: 'pts'}], 0, 48, false),
  };
  // the picture data: the first 16 audio block times of the mkv, and the audio PES time stamps of ts_long
  ev.mkvBlocksMs = R.mkv_same.container.blocks[2].slice(0, 16).map((b) => Math.round(b.t * 1000));
  ev.tsPes = {file: 'ts_long', audioFirst: pes.first, audioLast: pes.last, audioCount: pes.count, audioPts: pes.all};
  return ev;
}
export {r3, r6};
