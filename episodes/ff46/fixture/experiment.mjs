// Episode 46 fixture: "-itsoffset with -c copy: does the audio really move, in MP4 and in MKV?"
// Synthetic inputs only (lavfi):
//   video  v.mkv  4 s, 96x72, 25 fps, lossless x264, 100 frames (frame N has luma 16 + 2 N)
//   audio  a.m4a  4 s mono 48000 Hz, lossless ALAC (no encoder delay), digital silence until 1.5 s, then a 1000 Hz tone: the onset is sample 72000
// Cases, all stream copy (-c copy) of video and audio into .mp4 and into .mkv, audio and video as two inputs:
//   base     no offset
//   aPlus    -itsoffset 1 before the audio input
//   aMinus   -itsoffset -1 before the audio input
//   vPlus    -itsoffset 1 before the video input
//   delay    control: no offset, but the audio is physically delayed by 1000 ms (-af adelay=1000, re-encoded to ALAC, video still copied)
// Readers of "where does the audio start, and where does the tone start":
//   reader 1  ffprobe stream start_time and packet times (what a tool prints), plus the decoded samples: the onset sample read in Node, added to the start time
//   reader 2  Node on the container bytes: mp4 edit lists (elst) and sample tables (mdhd, stts), mkv EBML (cluster timecodes and block timecodes); no ffmpeg involved,
//             the tone onset predicted from the container alone and the known source onset (sample 72000)
//   reader 3  ffmpeg with -ignore_editlist 1 (mp4 only): what a reader that skips the edit lists sees
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 96, H = 72, FPS = 25, FRAMES = 100, SR = 48000, SAMPLES = 192000, ONSET = 72000, ONSET_THR = 1000;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
export const CONTAINERS = ['mp4', 'mkv'];
export const CASES = {
  base: {vin: [], ain: [], af: null, offset: 0, command: 'ffmpeg -i v.mkv -i a.m4a -map 0:v -map 1:a -c copy out'},
  aPlus: {vin: [], ain: ['-itsoffset', '1'], af: null, offset: 1, command: 'ffmpeg -i v.mkv -itsoffset 1 -i a.m4a -map 0:v -map 1:a -c copy out'},
  aMinus: {vin: [], ain: ['-itsoffset', '-1'], af: null, offset: -1, command: 'ffmpeg -i v.mkv -itsoffset -1 -i a.m4a -map 0:v -map 1:a -c copy out'},
  vPlus: {vin: ['-itsoffset', '1'], ain: [], af: null, offset: -1, command: 'ffmpeg -itsoffset 1 -i v.mkv -i a.m4a -map 0:v -map 1:a -c copy out'},
  delay: {vin: [], ain: [], af: 'adelay=1000', offset: 1, command: 'ffmpeg -i v.mkv -i a.m4a -af adelay=1000 -map 0:v -map 1:a -c:v copy -c:a alac out'},
};
// the shift of the audio relative to the picture that each case asks for, in seconds (positive: audio later)
export const WANT = {base: 0, aPlus: 1, aMinus: -1, vPlus: -1, delay: 1};

const ffm = (args, opts = {}) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {maxBuffer: 1 << 28, ...opts});
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${String(r.stderr)}`);
  return r;
};
const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const r3 = (v) => Math.round(v * 1000) / 1000;

export function makeSources(dir) {
  const v = path.join(dir, 'v.mkv'), a = path.join(dir, 'a.m4a');
  ffm(['-f', 'lavfi', '-i', `color=c=black:s=${W}x${H}:r=${FPS}:d=4,format=yuv420p,geq=lum=16+2*N:cb=128:cr=128`, '-c:v', 'libx264', '-qp', '0', '-pix_fmt', 'yuv420p', v]);
  ffm(['-f', 'lavfi', '-i', `aevalsrc=exprs='if(gte(t,1.5),0.5*sin(2*PI*1000*t),0)':s=${SR}:d=4:c=mono`, '-c:a', 'alac', a]);
  return {v, a};
}
export function makeCase(src, dir, container, name) {
  const c = CASES[name], out = path.join(dir, `${name}.${container}`);
  const args = [...c.vin, '-i', src.v, ...c.ain, '-i', src.a];
  if (c.af) args.push('-af', c.af);
  args.push('-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', c.af ? 'alac' : 'copy', out);
  ffm(args);
  return out;
}

// ---------- reader 1: ffprobe and the decoded samples ----------
const probe = (args) => {
  const r = spawnSync('ffprobe', ['-v', 'error', ...args], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`ffprobe ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout.split(/\r?\n/).map((l) => l.replace(/,$/, '').trim()).filter(Boolean);
};
export function probeStarts(file, extra = []) {
  const rows = probe([...extra, '-show_entries', 'stream=codec_type,start_time', '-of', 'csv=p=0', file]).map((l) => l.split(','));
  const o = {};
  for (const [type, st] of rows) o[type === 'video' ? 'video' : 'audio'] = Number(st);
  return o;
}
export const packetFirst = (file, sel, extra = []) => Math.min(...probe([...extra, '-select_streams', sel, '-show_entries', 'packet=pts_time', '-of', 'csv=p=0', file]).map(Number));
export function decodeAudio(file, extra = []) {
  const r = ffm([...extra, '-i', file, '-vn', '-f', 's16le', '-ac', '1', '-'], {});
  const b = r.stdout, n = Math.floor(b.length / 2), x = new Int16Array(n);
  for (let i = 0; i < n; i++) x[i] = b.readInt16LE(i * 2);
  return x;
}
export const onsetIndex = (x, thr = ONSET_THR) => { for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > thr) return i; return -1; };
export const md5Of = (x) => md5(Buffer.from(x.buffer, x.byteOffset, x.byteLength));
export function videoMd5s(file, extra = []) {
  const r = spawnSync('ffmpeg', ['-v', 'error', ...extra, '-i', file, '-an', '-fps_mode', 'passthrough', '-f', 'framemd5', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`framemd5 failed: ${r.stderr}`);
  return r.stdout.split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());
}

// ---------- reader 2: Node on the bytes ----------
// mp4: for each track, the edit list (segment duration in movie time units, media time in track units), the movie and track time scales, the handler
export function mp4Tracks(buf) {
  const tracks = [];
  const box = (s, e, fn) => { let p = s; while (p + 8 <= e) { let sz = buf.readUInt32BE(p); const t = buf.toString('latin1', p + 4, p + 8); let h = 8; if (sz === 1) { sz = Number(buf.readBigUInt64BE(p + 8)); h = 16; } if (sz === 0) sz = e - p; fn(t, p + h, p + sz); p += sz; } };
  let mvts = 1000;
  box(0, buf.length, (t, s, e) => {
    if (t !== 'moov') return;
    box(s, e, (t2, s2, e2) => {
      if (t2 === 'mvhd') mvts = buf.readUInt32BE(s2 + (buf[s2] === 1 ? 20 : 12));
      if (t2 !== 'trak') return;
      const tr = {edits: [], mdts: 1, type: '', firstDelta: null};
      box(s2, e2, (t3, s3, e3) => {
        if (t3 === 'edts') box(s3, e3, (t4, s4) => { if (t4 === 'elst') { const v = buf[s4], n = buf.readUInt32BE(s4 + 4); let q = s4 + 8; for (let i = 0; i < n; i++) { if (v === 1) { tr.edits.push({dur: Number(buf.readBigUInt64BE(q)), media: Number(buf.readBigInt64BE(q + 8))}); q += 20; } else { tr.edits.push({dur: buf.readUInt32BE(q), media: buf.readInt32BE(q + 4)}); q += 12; } } } });
        if (t3 === 'mdia') box(s3, e3, (t4, s4, e4) => {
          if (t4 === 'mdhd') tr.mdts = buf.readUInt32BE(s4 + (buf[s4] === 1 ? 20 : 12));
          if (t4 === 'hdlr') tr.type = buf.toString('latin1', s4 + 8, s4 + 12);
          if (t4 === 'minf') box(s4, e4, (t5, s5, e5) => { if (t5 === 'stbl') box(s5, e5, (t6, s6) => { if (t6 === 'stts') tr.firstDelta = buf.readUInt32BE(s6 + 12); }); });
        });
      });
      tracks.push(tr);
    });
  });
  return tracks.map((tr) => {
    let lead = 0, i = 0;
    while (i < tr.edits.length && tr.edits[i].media === -1) { lead += tr.edits[i].dur; i++; }
    const first = tr.edits[i];
    return {type: tr.type === 'vide' ? 'video' : tr.type === 'soun' ? 'audio' : tr.type, mdts: tr.mdts, edits: tr.edits, leadSeconds: lead / mvts, skipSeconds: first && first.media > 0 ? first.media / tr.mdts : 0, skipUnits: first && first.media > 0 ? first.media : 0, emptyEdits: tr.edits.filter((e) => e.media === -1).length, nonEmptyEdits: tr.edits.filter((e) => e.media !== -1).length};
  });
}
// mkv: the smallest block time (seconds) of each track type among the first blocks of the file
export function mkvFirst(buf) {
  const vint = (p, keep) => { let b = buf[p], len = 1; while (len <= 8 && !(b & (0x80 >> (len - 1)))) len++; let v = keep ? b : b & (0xff >> len); for (let i = 1; i < len; i++) v = v * 256 + buf[p + i]; return {v, len, unknown: !keep && v === 2 ** (7 * len) - 1}; };
  let scale = 1e6; const types = {}; const first = {1: Infinity, 2: Infinity};
  const CONT = new Set([0x18538067, 0x1654ae6b, 0xae, 0x1f43b675, 0xa0, 0x1549a966]);
  const walk = (s, e, ctx) => {
    let p = s, cluster = ctx.cluster ?? 0, trackNo = ctx.trackNo;
    while (p < e) {
      const id = vint(p, true); const sz = vint(p + id.len, false); const ds = p + id.len + sz.len, de = sz.unknown ? e : Math.min(e, ds + sz.v);
      if (CONT.has(id.v)) walk(ds, de, {cluster, trackNo});
      else if (id.v === 0x2ad7b1) { let v = 0; for (let i = ds; i < de; i++) v = v * 256 + buf[i]; scale = v; }
      else if (id.v === 0xd7) trackNo = buf[ds];
      else if (id.v === 0x83) { types[trackNo] = buf[ds]; }
      else if (id.v === 0xe7) { let v = 0; for (let i = ds; i < de; i++) v = v * 256 + buf[i]; cluster = v; }
      else if (id.v === 0xa3 || id.v === 0xa1) {
        const tn = vint(ds, false); const rel = buf.readInt16BE(ds + tn.len); const t = (cluster + rel) * scale / 1e9; const ty = types[tn.v];
        if (ty && t < first[ty]) first[ty] = t;
      }
      p = de;
    }
  };
  // the track table is filled before the clusters are met: ffmpeg writes Tracks before Clusters
  walk(0, buf.length, {});
  return {video: first[1], audio: first[2]};
}

// ---------- measure one file ----------
export function measure(file, container, srcAudioMd5, srcVideoMd5, srcTailMd5) {
  const ps = probeStarts(file), x = decodeAudio(file), oi = onsetIndex(x), buf = fs.readFileSync(file);
  const out = {
    probe: {videoStart: r3(ps.video), audioStart: r3(ps.audio), videoFirstPacket: r3(packetFirst(file, 'v:0')), audioFirstPacket: r3(packetFirst(file, 'a:0'))},
    audio: {samples: x.length, md5: md5Of(x), onsetIndex: oi, onsetTime: r3(ps.audio + oi / SR), equalsSource: md5Of(x) === srcAudioMd5, equalsSourceTail: x.length === SAMPLES - SR && md5Of(x) === srcTailMd5},
    video: {md5: videoMd5s(file)},
  };
  out.video.frames = out.video.md5.length; out.video.equalsSource = JSON.stringify(out.video.md5) === JSON.stringify(srcVideoMd5);
  if (container === 'mp4') {
    const tr = mp4Tracks(buf), a = tr.find((t) => t.type === 'audio'), v = tr.find((t) => t.type === 'video');
    out.bytes = {audioStart: r3(a.leadSeconds), videoStart: r3(v.leadSeconds), audioSkip: r3(a.skipSeconds), audioSkipUnits: a.skipUnits, audioEdits: a.edits, videoEdits: v.edits, audioEmpty: a.emptyEdits, videoEmpty: v.emptyEdits, audioFirstDelta: a.firstDelta};
    // the first presented sample is source sample `skipUnits`; the onset is then (ONSET - skip) samples later
    out.bytes.onsetTime = r3(a.leadSeconds + (ONSET - a.skipUnits) / SR);
    // reader 3: edit lists ignored
    const ig = probeStarts(file, ['-ignore_editlist', '1']), xi = decodeAudio(file, ['-ignore_editlist', '1']);
    out.ignored = {videoStart: r3(ig.video), audioStart: r3(ig.audio), audioSamples: xi.length, audioMd5: md5Of(xi), audioOnsetTime: r3(ig.audio + onsetIndex(xi) / SR), frames: videoMd5s(file, ['-ignore_editlist', '1']).length};
  } else {
    const f = mkvFirst(buf);
    out.bytes = {audioStart: r3(f.audio), videoStart: r3(f.video), onsetTime: r3(f.audio + ONSET / SR)};
  }
  return out;
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const src = makeSources(dir);
  const sx = decodeAudio(src.a), srcAudioMd5 = md5Of(sx), srcVideoMd5 = videoMd5s(src.v);
  const ev = {ffmpeg: ffmpegVersion(), source: {audioSamples: sx.length, onsetIndex: onsetIndex(sx), audioMd5: srcAudioMd5, tailMd5: md5Of(sx.slice(SR)), frames: srcVideoMd5.length, distinctFrames: new Set(srcVideoMd5).size}, runs: {}};
  for (const c of CONTAINERS) for (const name of Object.keys(CASES)) {
    const f = makeCase(src, dir, c, name);
    const m = measure(f, c, srcAudioMd5, srcVideoMd5, ev.source.tailMd5);
    ev.runs[`${c}.${name}`] = {container: c, variant: name, command: CASES[name].command.replace(' out', ` out.${c}`), ...m};
  }
  // the shift of the audio tone relative to the picture, against the base file of the same container, by the two readers
  for (const c of CONTAINERS) {
    const b = ev.runs[`${c}.base`];
    for (const name of Object.keys(CASES)) {
      const r = ev.runs[`${c}.${name}`];
      r.shift = {
        decoded: r3((r.audio.onsetTime - r.probe.videoStart) - (b.audio.onsetTime - b.probe.videoStart)),
        bytes: r3((r.bytes.onsetTime - r.bytes.videoStart) - (b.bytes.onsetTime - b.bytes.videoStart)),
        container: r3((r.bytes.audioStart - r.bytes.videoStart) - (b.bytes.audioStart - b.bytes.videoStart)),
      };
    }
  }
  return ev;
}
