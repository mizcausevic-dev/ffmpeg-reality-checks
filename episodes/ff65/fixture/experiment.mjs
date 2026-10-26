// Episode 65 fixture: "I padded my audio with apad and the output never ends: what stops it?"
// Synthetic input only: a 96x72 flat colour clip (lavfi color, 25 fps unless noted, 5 s = 125 frames) and a 440 Hz sine at 48000 Hz (lavfi) of 3 s (144000 samples) or 7 s, written as 16 bit wav.
// Every output: libx264 (ultrafast, yuv420p) plus the audio as pcm_s16le in mkv, or aac in mp4.
// Every command carries a hard -t (the guard), so nothing can run unbounded. Cases that are meant to stop by themselves get a guard of 20 s;
// the cases that show the missing stop get a guard of 8 s and 12 s, and the guard is what ends them.
// Readers:
//   reader 1  ffprobe: end of the video and of the audio from packet pts + duration, and the format duration
//   reader 2  ffmpeg decode read in Node: framemd5 line count (decoded video frames) and raw s16le sample count of the decoded audio
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const SR = 48000, GUARD_S = 20, TIMEOUT_MS = 60000;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
export const samplesOf = (sec) => Math.round(sec * SR);

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, {maxBuffer: 1 << 28, timeout: TIMEOUT_MS, ...opts});
const ffm = (args) => {
  const r = run('ffmpeg', ['-v', 'error', '-y', ...args]);
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${String(r.stderr)}`);
  return r;
};

// vid: seconds of picture (a finite lavfi clip) or 'loop' (a still image looped without end); aud: seconds of song; af: the audio filter (null = none)
// stop: '' or 'shortest'; guard: the hard -t in seconds
export const caseId = (c) => c.id;
export function cases() {
  const out = [];
  const add = (id, c) => out.push({vid: 5, fps: 25, aud: 3, fmt: 'pcm', af: null, stop: '', guard: GUARD_S, ...c, id});
  // controls: no apad at all
  add('noapad', {});
  add('noapad_shortest', {stop: 'shortest'});
  // apad alone: nothing stops it but the guard
  add('apad_g8', {af: 'apad', guard: 8});
  add('apad_g12', {af: 'apad', guard: 12});
  add('apad_g8_aac', {af: 'apad', guard: 8, fmt: 'aac'});
  // the ways to stop it
  add('apad_shortest', {af: 'apad', stop: 'shortest'});
  add('apad_shortest_aac', {af: 'apad', stop: 'shortest', fmt: 'aac'});
  add('apad_t5', {af: 'apad', guard: 5});
  add('whole5', {af: 'apad=whole_dur=5'});
  add('whole5_aac', {af: 'apad=whole_dur=5', fmt: 'aac'});
  add('whole4', {af: 'apad=whole_dur=4'});
  add('padd2', {af: 'apad=pad_dur=2'});
  add('padd2_aac', {af: 'apad=pad_dur=2', fmt: 'aac'});
  add('padlen', {af: 'apad=pad_len=96000'});
  add('wholelen', {af: 'apad=whole_len=240000'});
  // the song is longer than the picture
  add('long_noapad_shortest', {aud: 7, stop: 'shortest'});
  add('long_apad_shortest', {aud: 7, af: 'apad', stop: 'shortest'});
  add('long_whole5', {aud: 7, af: 'apad=whole_dur=5'});
  // other frame rates, same shortest rule
  add('apad_shortest_30', {af: 'apad', stop: 'shortest', fps: 30});
  add('apad_shortest_1', {af: 'apad', stop: 'shortest', fps: 1});
  // a picture that is not a whole number of seconds: 4.3 s at 25 fps shows 108 frames (4.32 s)
  add('v43_shortest', {vid: 4.3, af: 'apad', stop: 'shortest'});
  add('v43_whole', {vid: 4.3, af: 'apad=whole_dur=4.3'});
  add('v43_padd', {vid: 4.3, af: 'apad=pad_dur=1.3'});
  // the looped still image: both streams are endless
  add('loop_noapad_shortest', {vid: 'loop', stop: 'shortest'});
  add('loop_apad_shortest', {vid: 'loop', af: 'apad', stop: 'shortest', guard: 8});
  add('loop_whole5_shortest', {vid: 'loop', af: 'apad=whole_dur=5', stop: 'shortest'});
  return out;
}
const extOf = (c) => (c.fmt === 'pcm' ? 'mkv' : 'mp4');
const vInput = (c) => (c.vid === 'loop' ? ['-loop', '1', '-framerate', String(c.fps), '-i', 'still.png'] : ['-f', 'lavfi', '-i', `color=c=0x303030:s=96x72:r=${c.fps}:d=${c.vid},format=yuv420p`]);
const outArgs = (c) => ['-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', c.fmt === 'pcm' ? 'pcm_s16le' : 'aac', ...(c.stop ? ['-shortest'] : []), '-t', String(c.guard)];
export const commandOf = (c) => `ffmpeg ${vInput(c).join(' ')} -i song_${c.aud}.wav${c.af ? ` -af ${c.af}` : ''} ${outArgs(c).join(' ')} out.${extOf(c)}`;

export function makeSources(dir) {
  const wav = {};
  for (const aud of [3, 7]) {
    wav[aud] = path.join(dir, `song_${aud}.wav`);
    ffm(['-f', 'lavfi', '-i', `sine=frequency=440:sample_rate=${SR}:duration=${aud}`, '-t', '10', '-c:a', 'pcm_s16le', wav[aud]]);
  }
  const still = path.join(dir, 'still.png');
  ffm(['-f', 'lavfi', '-i', 'color=c=0x303030:s=96x72,format=yuv420p', '-frames:v', '1', still]);
  return {wav, still};
}

export function makeCase(src, dir, c) {
  const out = path.join(dir, `${c.id}.${extOf(c)}`);
  const vin = c.vid === 'loop' ? ['-loop', '1', '-framerate', String(c.fps), '-i', src.still] : vInput(c);
  ffm([...vin, '-i', src.wav[c.aud], ...(c.af ? ['-af', c.af] : []), ...outArgs(c), out]);
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
    packetsV: p.v.length, vEnd: r3(vEnd), aEnd: r3(aEnd), fmtDur: r3(p.fmt),
    framesDecoded: frames, samplesDecoded: samples, vSec: r3(frames / c.fps), aSec: r3(samples / SR),
    hitGuard: p.fmt >= c.guard - 0.05,
  };
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const src = makeSources(dir);
  const ev = {
    ffmpeg: ffmpegVersion(),
    sources: {wavSamples: {3: decodedSamples(src.wav[3]), 7: decodedSamples(src.wav[7])}, still: fs.statSync(src.still).size > 0},
    runs: {},
  };
  for (const c of cases()) {
    const f = makeCase(src, dir, c);
    ev.runs[c.id] = {...c, command: commandOf(c), ...measure(f, c)};
  }
  return ev;
}
