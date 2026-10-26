// Episode 64 fixture: "I made a video from a still image and a song with -loop 1 -shortest: is the video longer than the song?"
// Synthetic input only: a 96x72 flat PNG (made by lavfi) and a 440 Hz sine at 48000 Hz (lavfi) of 4.0, 4.3, 4.37 and 4.99 s, written as 16 bit wav (and once as aac in m4a).
// Every output: libx264 (-tune stillimage, yuv420p) from `-loop 1 -framerate FPS -i still.png`, audio pcm_s16le in mkv, aac in mp4, or the aac song copied (-c:a copy) into mp4.
// Options on the output (every command also carries a hard -t, so nothing can run unbounded):
//   shortest  -shortest, -t 20          tdur  -t <audio length>          none  no stop option, -t 8
//   fflags    -fflags +shortest, -t 20  bufdur  -shortest -shortest_buf_duration 0.2, -t 20
// Readers:
// The copied-song cases also run with -bf 0 (no B-frames, so no frames wait inside the encoder) and with ffv1 (no encoder delay).
//   reader 1  ffprobe: video packet count, end of the video (largest pts + duration), end of the audio, format duration
//   reader 2  ffmpeg decode read in Node: framemd5 line count (decoded video frames) and raw s16le sample count of the decoded audio
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const SR = 48000, GUARD_S = 20, NONE_GUARD_S = 8;
export const AUDIO = [4.0, 4.3, 4.37, 4.99];
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
export const samplesOf = (sec) => Math.round(sec * SR);
// frames a video of this rate shows when it stops at the end of the audio: floor (the small epsilon covers 4.3 * 30 = 128.99999999999997)
export const floorFrames = (aud, fps) => Math.floor(aud * fps + 1e-6);
export const roundFrames = (aud, fps) => Math.floor(aud * fps + 0.5 + 1e-6);

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, {maxBuffer: 1 << 28, ...opts});
const ffm = (args) => {
  const r = run('ffmpeg', ['-v', 'error', '-y', ...args]);
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${String(r.stderr)}`);
  return r;
};

export const caseId = (c) => `${c.opt}_${c.aud}_${c.fps}_${c.fmt}${c.src === 'm4a' ? '_m4a' : ''}${c.x ? `_${c.x}` : ''}`;
export function cases() {
  const out = [];
  const add = (c) => out.push({src: 'wav', ...c, id: caseId({src: 'wav', ...c})});
  for (const aud of AUDIO) for (const fps of [25, 30, 24, 1]) for (const fmt of ['pcm', 'aac']) add({opt: 'shortest', aud, fps, fmt});
  for (const aud of AUDIO) for (const fps of [25, 1]) add({opt: 'tdur', aud, fps, fmt: 'pcm'});
  for (const fps of [25, 1]) for (const fmt of ['pcm', 'aac']) { add({opt: 'none', aud: 4.3, fps, fmt}); add({opt: 'bufdur', aud: 4.3, fps, fmt}); }
  for (const fps of [25, 30]) for (const fmt of ['pcm', 'aac']) add({opt: 'fflags', aud: 4.3, fps, fmt});
  // the song as an aac file copied into the output (-c:a copy): the usual real command
  for (const fps of [25, 30, 24, 10, 2, 1]) for (const x of ['', 'bf0']) add({opt: 'shortest', aud: 4.3, fps, fmt: 'copy', src: 'm4a', x});
  for (const fps of [25, 1]) add({opt: 'shortest', aud: 4.3, fps, fmt: 'copy', src: 'm4a', x: 'ffv1'});
  return out;
}
const optArgs = (c) => ({
  shortest: ['-shortest', '-t', String(GUARD_S)],
  tdur: ['-t', String(c.aud)],
  none: ['-t', String(NONE_GUARD_S)],
  fflags: ['-fflags', '+shortest', '-t', String(GUARD_S)],
  bufdur: ['-shortest', '-shortest_buf_duration', '0.2', '-t', String(GUARD_S)],
})[c.opt];
// video encoder arguments: libx264 with the still image tune (default), the same with no B-frames (x = bf0), or ffv1, which has no encoder delay (x = ffv1)
const vArgs = (c) => (c.x === 'ffv1' ? ['-c:v', 'ffv1', '-pix_fmt', 'yuv420p'] : ['-c:v', 'libx264', '-tune', 'stillimage', ...(c.x === 'bf0' ? ['-bf', '0'] : []), '-pix_fmt', 'yuv420p']);
const extOf = (c) => (c.fmt === 'pcm' || c.x === 'ffv1' ? 'mkv' : 'mp4');
export const commandOf = (c) => {
  const ac = c.fmt === 'pcm' ? 'pcm_s16le' : c.fmt === 'aac' ? 'aac' : 'copy';
  const audio = c.src === 'm4a' ? 'song.m4a' : `song_${c.aud}.wav`;
  return `ffmpeg -loop 1 -framerate ${c.fps} -i still.png -i ${audio} ${vArgs(c).join(' ')} -c:a ${ac} ${optArgs(c).join(' ')} out.${extOf(c)}`;
};

export function makeSources(dir) {
  const still = path.join(dir, 'still.png');
  ffm(['-f', 'lavfi', '-i', 'color=c=0x303030:s=96x72,format=yuv420p', '-frames:v', '1', still]);
  const wav = {};
  for (const aud of AUDIO) {
    wav[aud] = path.join(dir, `song_${aud}.wav`);
    ffm(['-f', 'lavfi', '-i', `sine=frequency=440:sample_rate=${SR}:duration=${aud}`, '-t', '6', '-c:a', 'pcm_s16le', wav[aud]]);
  }
  const m4a = path.join(dir, 'song.m4a');
  ffm(['-i', wav[4.3], '-t', '6', '-c:a', 'aac', m4a]);
  return {still, wav, m4a};
}

export function makeCase(src, dir, c) {
  const out = path.join(dir, `${c.id}.${extOf(c)}`);
  const ac = c.fmt === 'pcm' ? 'pcm_s16le' : c.fmt === 'aac' ? 'aac' : 'copy';
  const args = ['-loop', '1', '-framerate', String(c.fps), '-i', src.still, '-i', c.src === 'm4a' ? src.m4a : src.wav[c.aud], ...vArgs(c), '-c:a', ac, ...optArgs(c), out];
  if (c.opt === 'fflags') {
    // ffmpeg 8.1.2 refuses the shortest flag of the output option -fflags: record the refusal instead of throwing
    const r = run('ffmpeg', ['-v', 'error', '-y', ...args]);
    if (r.status !== 0) return {refused: true, error: String(r.stderr).split(/\r?\n/).find((l) => /fflags/.test(l)) ?? String(r.stderr).slice(0, 200)};
    return out;
  }
  ffm(args);
  return out;
}

// ---- readers ----
// reader 1: ffprobe packets of both streams plus the format duration
export function probe(file) {
  const r = run('ffprobe', ['-v', 'error', '-show_entries', 'packet=stream_index,codec_type,pts_time,duration_time:format=duration', '-of', 'csv=p=0', file], {encoding: 'utf8'});
  if (r.status !== 0) throw new Error(`ffprobe failed: ${r.stderr}`);
  const v = [], a = [];
  let fmt = NaN;
  for (const l of String(r.stdout).split(/\r?\n/).map((s) => s.trim()).filter(Boolean)) {
    const f = l.split(',');
    const d = Number(f[3]); // a missing duration (N/A) counts as 0
    if (f[0] === 'video') v.push([Number(f[2]), Number.isFinite(d) ? d : 0]);
    else if (f[0] === 'audio') a.push([Number(f[2]), Number.isFinite(d) ? d : 0]);
    else if (f.length === 1) fmt = Number(f[0]);
  }
  return {v, a, fmt};
}
export const endOf = (pk) => Math.max(...pk.map(([t, d]) => t + d));
// reader 2: decoded video frames (framemd5 lines) and decoded audio samples (raw s16le, mono, 48000 Hz)
export function decodedFrames(file) {
  const r = run('ffmpeg', ['-v', 'error', '-i', file, '-an', '-fps_mode', 'passthrough', '-frames:v', '1000', '-f', 'framemd5', '-'], {encoding: 'utf8'});
  if (r.status !== 0) throw new Error(`framemd5 failed: ${r.stderr}`);
  return String(r.stdout).split(/\r?\n/).filter((l) => l && !l.startsWith('#')).length;
}
export function decodedSamples(file) {
  const r = run('ffmpeg', ['-v', 'error', '-i', file, '-vn', '-ac', '1', '-ar', String(SR), '-t', '30', '-f', 's16le', '-']);
  if (r.status !== 0) throw new Error(`audio decode failed: ${String(r.stderr)}`);
  return r.stdout.length / 2;
}
const r3 = (v) => Math.round(v * 1000) / 1000;

export function measure(file, c) {
  const p = probe(file);
  const vEnd = endOf(p.v), aEnd = endOf(p.a);
  const frames = decodedFrames(file), samples = decodedSamples(file);
  return {
    packetsV: p.v.length, vEnd: r3(vEnd), aEnd: r3(aEnd), fmtDur: r3(p.fmt), gapPts: r3(vEnd - aEnd),
    framesDecoded: frames, samplesDecoded: samples, vSec: r3(frames / c.fps), aSec: r3(samples / SR), gap: r3(frames / c.fps - samples / SR),
    ptsContiguous: Math.abs(vEnd - frames / c.fps) < 1e-6,
  };
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const src = makeSources(dir);
  const ev = {
    ffmpeg: ffmpegVersion(),
    sources: {
      wavSamples: Object.fromEntries(AUDIO.map((a) => [a, decodedSamples(src.wav[a])])),
      m4aSamples: decodedSamples(src.m4a),
      still: fs.statSync(src.still).size > 0,
    },
    runs: {},
  };
  for (const c of cases()) {
    const f = makeCase(src, dir, c);
    if (typeof f === 'object') { ev.runs[c.id] = {...c, command: commandOf(c), refused: true, error: f.error}; continue; }
    ev.runs[c.id] = {...c, command: commandOf(c), ...measure(f, c), srcSamples: c.src === 'm4a' ? ev.sources.m4aSamples : ev.sources.wavSamples[c.aud]};
  }
  return ev;
}
