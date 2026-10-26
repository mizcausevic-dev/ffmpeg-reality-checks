// Episode 45 fixture: "I cut a clip with the trim filter: why is the start frozen or black, and the audio out of sync?"
// Synthetic source only (lavfi): a 4 s clip, 96x72, 25 fps, lossless x264 (-qp 0), plus a 48 kHz mono tone, lossless pcm, in mkv.
//   video  every frame N is a flat card whose luma is 16 + 2 * N (N = 0..99), so a decoded frame names its own source index
//   audio  a 480 Hz sine whose amplitude is 0.05 + 0.2 * t (t = source seconds), so a stretch of samples names its own source time
// The cut under test is the second second: source frames 25..49 and source audio 1.0 s .. 2.0 s.
// Cases (each written to .mov and to .mkv, lossless x264 + pcm_s16le):
//   ctl    control: -ss 1 -t 1 before -i (input seek), no filters
//   ctlout control: -ss 1 -t 1 after -i (output seek), no filters
//   raw    trim=start=1:end=2 and atrim=start=1:end=2, no setpts
//   fix    the same plus setpts=PTS-STARTPTS and asetpts=PTS-STARTPTS
//   vonly  setpts on the video only (audio keeps its source timestamps)
//   aonly  asetpts on the audio only (video keeps its source timestamps)
//   rawCfr, rawPass   raw with -fps_mode cfr / -fps_mode passthrough written out explicitly
// Readers:
//   frames   reader 1 = ffmpeg framemd5 (hash and pts per decoded frame, read with -copyts);
//            reader 2 = raw decoded luma in Node (marker = source frame index) and ffprobe packet timestamps
//   audio    reader 1 = ffprobe audio packet timestamps (start and end);
//            reader 2 = raw decoded samples in Node (count and amplitude, which gives the source time of the first sample)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 96, H = 72, FPS = 25, SRC_FRAMES = 100, SR = 48000, S = 1, E = 2;
export const FRAME_DT = 1 / FPS;
export const markerOfLuma = (v) => Math.round((v - 16) / 2);
export const lumaOfMarker = (n) => 16 + 2 * n;

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

export const VF = 'trim=start=1:end=2';
export const VF_FIX = 'trim=start=1:end=2,setpts=PTS-STARTPTS';
export const AF = 'atrim=start=1:end=2';
export const AF_FIX = 'atrim=start=1:end=2,asetpts=PTS-STARTPTS';

// in: options placed before -i; vf/af: filter chains; out: extra output options
export const VARIANTS = {
  ctl: {in: ['-ss', '1', '-t', '1'], vf: null, af: null, out: [], command: 'ffmpeg -ss 1 -t 1 -i src.mkv out'},
  ctlout: {in: [], vf: null, af: null, out: ['-ss', '1', '-t', '1'], command: 'ffmpeg -i src.mkv -ss 1 -t 1 out'},
  raw: {in: [], vf: VF, af: AF, out: [], command: 'ffmpeg -i src.mkv -vf trim=start=1:end=2 -af atrim=start=1:end=2 out'},
  fix: {in: [], vf: VF_FIX, af: AF_FIX, out: [], command: 'ffmpeg -i src.mkv -vf trim=start=1:end=2,setpts=PTS-STARTPTS -af atrim=start=1:end=2,asetpts=PTS-STARTPTS out'},
  vonly: {in: [], vf: VF_FIX, af: AF, out: [], command: 'ffmpeg -i src.mkv -vf trim=start=1:end=2,setpts=PTS-STARTPTS -af atrim=start=1:end=2 out'},
  aonly: {in: [], vf: VF, af: AF_FIX, out: [], command: 'ffmpeg -i src.mkv -vf trim=start=1:end=2 -af atrim=start=1:end=2,asetpts=PTS-STARTPTS out'},
  rawCfr: {in: [], vf: VF, af: AF, out: ['-fps_mode', 'cfr'], command: 'ffmpeg -i src.mkv -vf trim=start=1:end=2 -af atrim=start=1:end=2 -fps_mode cfr out'},
  rawPass: {in: [], vf: VF, af: AF, out: ['-fps_mode', 'passthrough'], command: 'ffmpeg -i src.mkv -vf trim=start=1:end=2 -af atrim=start=1:end=2 -fps_mode passthrough out'},
};
export const CONTAINERS = ['mov', 'mkv'];

export function makeSource(dir) {
  const file = path.join(dir, 'src.mkv');
  ffm(['-f', 'lavfi', '-i', `color=c=black:s=${W}x${H}:r=${FPS}:d=4,format=yuv420p,geq=lum=16+2*N:cb=128:cr=128`,
    '-f', 'lavfi', '-i', `aevalsrc=exprs=sin(2*PI*480*t)*(0.05+0.2*t):s=${SR}:d=4:c=mono`,
    '-c:v', 'libx264', '-qp', '0', '-pix_fmt', 'yuv420p', '-c:a', 'pcm_s16le', '-t', '4', file]);
  return file;
}

export function makeCase(src, dir, container, name) {
  const v = VARIANTS[name];
  const out = path.join(dir, `${name}.${container}`);
  const args = [...v.in, '-i', src];
  if (v.vf) args.push('-vf', v.vf);
  if (v.af) args.push('-af', v.af);
  args.push(...v.out, '-c:v', 'libx264', '-qp', '0', '-pix_fmt', 'yuv420p', '-c:a', 'pcm_s16le', out);
  ffm(args);
  return out;
}

// ---- video readers ----
// reader 2a: raw decoded luma of every frame; the marker is read from the flat card (mean of the top-left 8x8 block)
export function rawMarkers(file) {
  const r = ffm(['-i', file, '-an', '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-'], {});
  const buf = r.stdout, fsz = W * H * 3 / 2, n = Math.floor(buf.length / fsz);
  if (n * fsz !== buf.length) throw new Error(`unexpected raw size ${buf.length}`);
  const out = [];
  for (let i = 0; i < n; i++) {
    let s = 0; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) s += buf[i * fsz + y * W + x];
    out.push(markerOfLuma(s / 64));
  }
  return out;
}
// reader 1: framemd5 with -copyts, so that a start offset is not shifted away. Returns md5 and pts (seconds) per decoded frame.
export function framemd5(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-copyts', '-i', file, '-an', '-fps_mode', 'passthrough', '-f', 'framemd5', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`framemd5 failed: ${r.stderr}`);
  let tb = 1; const md5 = [], pts = [];
  for (const l of r.stdout.split(/\r?\n/)) {
    const m = /^#tb\s+0:\s*(\d+)\/(\d+)/.exec(l);
    if (m) { tb = Number(m[1]) / Number(m[2]); continue; }
    if (!l || l.startsWith('#')) continue;
    const c = l.split(',').map((s) => s.trim());
    md5.push(c[c.length - 1]); pts.push(Number(c[2]) * tb);
  }
  return {md5, pts};
}
export const videoPacketPts = (file) => probe(['-select_streams', 'v:0', '-show_entries', 'packet=pts_time', '-of', 'csv=p=0', file]).map(Number).sort((a, b) => a - b);

// ---- audio readers ----
// reader 2b: raw decoded samples (mono s16le at 48 kHz), as a Float64 array in -1..1
export function rawSamples(file) {
  const r = ffm(['-i', file, '-vn', '-f', 's16le', '-ac', '1', '-ar', String(SR), '-'], {});
  const b = r.stdout, n = Math.floor(b.length / 2), out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = b.readInt16LE(i * 2) / 32768;
  return out;
}
// Source time of sample index i0 (a window of 1200 samples = 12 whole cycles of 480 Hz): rms * sqrt(2) is the amplitude, amplitude = 0.05 + 0.2 t, centred half a window in.
export function sourceTimeAt(samples, i0 = 0, win = 1200) {
  let s = 0; for (let i = i0; i < i0 + win; i++) s += samples[i] * samples[i];
  const amp = Math.sqrt(s / win) * Math.SQRT2;
  const tCentre = (amp - 0.05) / 0.2;
  return tCentre - (win / 2) / SR;
}
export function audioPackets(file) {
  const rows = probe(['-select_streams', 'a:0', '-show_entries', 'packet=pts_time,duration_time', '-of', 'csv=p=0', file]).map((l) => l.split(',').map(Number));
  rows.sort((a, b) => a[0] - b[0]);
  return {first: rows[0][0], end: rows[rows.length - 1][0] + rows[rows.length - 1][1], count: rows.length};
}

const r3 = (v) => Math.round(v * 1000) / 1000;
const r2 = (v) => Math.round(v * 100) / 100;
const maxRun = (xs) => { let best = 0, run = 0; xs.forEach((x, i) => { run = i && x === xs[i - 1] ? run + 1 : 1; best = Math.max(best, run); }); return best; };
export const repeats = (xs) => xs.filter((x, i) => i && x === xs[i - 1]).length;

export function measure(file) {
  const fm = framemd5(file);
  const mk = rawMarkers(file);
  const pk = videoPacketPts(file);
  const sm = rawSamples(file);
  const ap = audioPackets(file);
  const lastMk = mk[mk.length - 1];
  const vFirst = pk[0], vEnd = pk[pk.length - 1] + FRAME_DT;
  const aSrc0 = sourceTimeAt(sm, 0);
  // delay of each stream = timestamp minus the source time of its content. Video: judged by its LAST frame, because a leading frame can be a repeat. Audio: its first sample.
  const vDelay = pk[pk.length - 1] - lastMk * FRAME_DT;
  const aDelay = ap.first - aSrc0;
  return {
    video: {
      framesMd5: fm.md5.length, framesRaw: mk.length, packets: pk.length,
      markers: mk, firstMarker: mk[0], lastMarker: lastMk,
      repeatsMd5: repeats(fm.md5), repeatsRaw: repeats(mk), uniqueMd5: new Set(fm.md5).size, longestRunMd5: maxRun(fm.md5),
      firstPtsProbe: r3(vFirst), firstPtsMd5: r3(fm.pts[0]), lastPtsProbe: r3(pk[pk.length - 1]), lastPtsMd5: r3(fm.pts[fm.pts.length - 1]),
      endTime: r3(vEnd), md5: fm.md5,
      delay: r2(vDelay),
    },
    audio: {
      audioHash: crypto.createHash('md5').update(Buffer.from(sm.buffer)).digest('hex'), samples: sm.length, seconds: r3(sm.length / SR), packets: ap.count,
      firstPtsProbe: r3(ap.first), endProbe: r3(ap.end), firstSourceTime: r2(aSrc0), delay: r2(aDelay),
    },
    // positive = the audio arrives later than its picture, negative = earlier
    audioLate: r2(aDelay - vDelay),
  };
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const src = makeSource(dir);
  const sm = rawSamples(src);
  const mk = rawMarkers(src);
  const ev = {
    ffmpeg: ffmpegVersion(),
    source: {frames: mk.length, markersAreIndexes: mk.every((m, i) => m === i), audioSeconds: r3(sm.length / SR), audioAt1: r2(sourceTimeAt(sm, SR * 1)), audioAt2: r2(sourceTimeAt(sm, SR * 2)), audioAt0: r2(sourceTimeAt(sm, 0))},
    srcMd5: framemd5(src).md5,
    srcCutAudioHash: crypto.createHash('md5').update(Buffer.from(sm.slice(S * SR, E * SR).buffer)).digest('hex'),
    cut: {start: S, end: E, frames: (E - S) * FPS},
    runs: {},
  };
  for (const c of CONTAINERS) for (const name of Object.keys(VARIANTS)) {
    const f = makeCase(src, dir, c, name);
    ev.runs[`${c}.${name}`] = {container: c, variant: name, command: VARIANTS[name].command.replace(' out', ` out.${c}`), ...measure(f)};
  }
  return ev;
}
