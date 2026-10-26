// Episode 75 fixture: "I padded the end of a video with tpad to freeze the last frame and got black: what does tpad add?"
// Synthetic input only: a lavfi counter clip, 50 frames, 64x48, 25 fps, yuv420p, every frame flat: luma 60 + 3 x frame number, cb 100, cr 150.
// So a frame names itself (id = (luma - 60) / 3) and no real frame looks like black (luma 16, cb 128, cr 128).
// The filter under test: tpad (stop, stop_duration, stop_mode, start, start_duration, start_mode, color), and apad for the audio side.
// Readers for the video (each classifies every output frame as a real frame id, black, clone or other):
//   reader 1  raw decoded planes in Node: luma, cb and cr of every frame, and whether the three planes are flat
//   reader 2  ffmpeg framemd5: the hash of every output frame against the hashes of the 50 source frames and of a reference black frame
//             that comes from a different route (lavfi color source, no tpad)
// Readers for the audio: raw s16le samples in Node, and ffmpeg silencedetect (where the silence starts).
// Container reader for durations: ffprobe on a muxed file.
// Known-positive controls, built without tpad: the counter followed by 25 black frames, the counter followed by 25 copies of the last frame (both by concat).
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 64, H = 48, TOTAL = 50, FPS = 25;
export const lumaOf = (n) => 60 + 3 * n;
export const idOfLuma = (y) => (y - 60) / 3;
export const CB = 100, CR = 150;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

export const video = (fps = FPS, n = TOTAL, pre = '') => ['-f', 'lavfi', '-i', `color=c=black:s=${W}x${H}:r=${fps}:d=${n / fps},format=yuv420p,geq=lum='60+3*N':cb=${CB}:cr=${CR}${pre}`];
const run = (args, opts = {}) => spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {maxBuffer: 1 << 28, ...opts});

const bytesPer = {yuv420p: 1.5, yuvj420p: 1.5, gray: 1, rgb24: 3};
// reader 1: [{y, u, v, flat}] for yuv formats, [{y, flat}] for gray, [{r, g, b, flat}] for rgb
export function readPlanes(vf, {fps = FPS, cap = 100000, pix = 'yuv420p', input = null} = {}) {
  const r = run([...(input ?? video(fps)), '-vf', vf, '-frames:v', String(cap), '-f', 'rawvideo', '-pix_fmt', pix, '-']);
  if (r.status !== 0) return {ok: false, exit: r.status, error: String(r.stderr).trim().split('\n')[0], frames: null};
  const buf = r.stdout, ysz = W * H, fsz = ysz * bytesPer[pix], n = buf.length / fsz;
  if (!Number.isInteger(n)) throw new Error(`unexpected raw size ${buf.length}`);
  const frames = [];
  for (let i = 0; i < n; i++) {
    const o = i * fsz;
    if (pix === 'rgb24') {
      let flat = true; for (let k = 3; k < ysz * 3; k++) if (buf[o + k] !== buf[o + (k % 3)]) { flat = false; break; }
      frames.push({r: buf[o], g: buf[o + 1], b: buf[o + 2], flat});
    } else {
      const y = buf[o]; let flat = true;
      for (let k = 1; k < ysz; k++) if (buf[o + k] !== y) { flat = false; break; }
      if (pix === 'gray') frames.push({y, flat});
      else {
        const cs = ysz / 4, u = buf[o + ysz], v = buf[o + ysz + cs];
        for (let k = 1; k < cs && flat; k++) if (buf[o + ysz + k] !== u || buf[o + ysz + cs + k] !== v) flat = false;
        frames.push({y, u, v, flat});
      }
    }
  }
  return {ok: true, exit: 0, frames};
}
// reader 2
export function frameMd5(vf, {fps = FPS, cap = 100000, input = null} = {}) {
  const r = run([...(input ?? video(fps)), '-vf', vf, '-frames:v', String(cap), '-an', '-fps_mode', 'passthrough', '-f', 'framemd5', '-'], {encoding: 'utf8'});
  if (r.status !== 0) return {ok: false, exit: r.status, error: String(r.stderr).trim().split('\n')[0], md5: null, pts: null};
  const md5 = [], pts = [];
  for (const l of r.stdout.split(/\r?\n/)) {
    if (!l || l.startsWith('#')) continue;
    const c = l.split(',').map((s) => s.trim());
    pts.push(Number(c[2])); md5.push(c[c.length - 1]);
  }
  return {ok: true, exit: 0, md5, pts};
}
// reference frames from a route that does not use tpad: a lavfi color frame, converted to yuv420p
const colorMd5 = (color) => {
  const r = run(['-f', 'lavfi', '-i', `color=c=${color}:s=${W}x${H}:r=${FPS}:d=0.04,format=yuv420p`, '-frames:v', '1', '-f', 'framemd5', '-'], {encoding: 'utf8'});
  return r.stdout.split(/\r?\n/).filter((l) => l && !l.startsWith('#'))[0].split(',').pop().trim();
};
export const refs = () => ({black: colorMd5('black'), white: colorMd5('white'), red: colorMd5('red')});

export const srcTable = () => {
  const m = frameMd5('null').md5;
  return {md5: m, ref: refs()};
};

// classify a frame by both readers
const classify1 = (f) => {
  if (!f.flat) return 'mixed';
  if (f.u === CB && f.v === CR && (f.y - 60) % 3 === 0 && f.y >= 60 && f.y <= 207) return 'real:' + idOfLuma(f.y);
  if (f.u === 128 && f.v === 128 && f.y === 16) return 'black';
  if (f.u === 128 && f.v === 128 && f.y === 235) return 'white';
  if (f.y === 81 && f.u === 90 && f.v === 240) return 'red';
  return `other:${f.y}/${f.u}/${f.v}`;
};
const classify2 = (h, src) => {
  const i = src.md5.indexOf(h);
  if (i >= 0) return 'real:' + i;
  if (h === src.ref.black) return 'black';
  if (h === src.ref.white) return 'white';
  if (h === src.ref.red) return 'red';
  return 'other';
};
const coarse = (c) => (c.startsWith('real:') ? 'real' : c.startsWith('other') ? 'other' : c);

// ---- the video cases ----
// cmd names the tpad options as typed
export const VCASES = {
  add1: {vf: 'tpad=stop_duration=1', note: 'default stop_mode (add), 1 s'},
  clone1: {vf: 'tpad=stop_mode=clone:stop_duration=1', note: 'clone, 1 s'},
  cloneOnly: {vf: 'tpad=stop_mode=clone', note: 'clone, no stop and no stop_duration'},
  stop10add: {vf: 'tpad=stop=10', note: 'add, 10 frames'},
  stop10clone: {vf: 'tpad=stop=10:stop_mode=clone', note: 'clone, 10 frames'},
  both: {vf: 'tpad=stop=10:stop_duration=1', note: 'stop 10 and stop_duration 1 s together'},
  cloneColor: {vf: 'tpad=stop_mode=clone:stop_duration=1:color=red', note: 'clone with a colour given'},
  white: {vf: 'tpad=stop_duration=1:color=white', note: 'color white'},
  red: {vf: 'tpad=stop_duration=1:color=red', note: 'color red'},
  start5add: {vf: 'tpad=start=5', note: 'start 5 frames, add'},
  start5clone: {vf: 'tpad=start=5:start_mode=clone', note: 'start 5 frames, clone'},
  startDur: {vf: 'tpad=start_duration=0.2', note: 'start_duration 0.2 s'},
  both35: {vf: 'tpad=start=3:stop=3:stop_mode=clone', note: 'start 3 add, stop 3 clone'},
  dur0_01: {vf: 'tpad=stop_duration=0.01', note: '0.25 frame'},
  dur0_02: {vf: 'tpad=stop_duration=0.02', note: '0.5 frame'},
  dur0_05: {vf: 'tpad=stop_duration=0.05', note: '1.25 frames'},
  dur0_06: {vf: 'tpad=stop_duration=0.06', note: '1.5 frames'},
  dur0_1: {vf: 'tpad=stop_duration=0.1', note: '2.5 frames'},
  dur0_3: {vf: 'tpad=stop_duration=0.3', note: '7.5 frames'},
  dur0_5: {vf: 'tpad=stop_duration=0.5', note: '12.5 frames'},
};
// frames a stop_duration adds at a frame rate: the nearest whole frame, halves up (fitted on 6.1.1)
export const modelAdded = (seconds, fps) => Math.floor(seconds * fps + 0.5 + 1e-9);

export function measureVideo(id, c, src) {
  const a = readPlanes(c.vf, {fps: c.fps ?? FPS, cap: c.cap}), b = frameMd5(c.vf, {fps: c.fps ?? FPS, cap: c.cap});
  if (!a.ok || !b.ok) return {id, ...c, exit: a.exit || b.exit, error: a.error ?? b.error};
  const k1 = a.frames.map(classify1), k2 = b.md5.map((h) => classify2(h, src));
  const total = c.fps && c.fps !== FPS ? null : TOTAL;
  const agree = k1.length === k2.length && k1.every((x, i) => coarse(x) === coarse(k2[i]) && (!x.startsWith('real:') || x === k2[i]));
  const fps = c.fps ?? FPS;
  // the sequence of classes as runs
  const runs = [];
  k1.forEach((x, i) => { const key = x.startsWith('real:') ? 'real' : x; if (runs.length && runs[runs.length - 1].k === key) runs[runs.length - 1].to = i; else runs.push({k: key, from: i, to: i}); });
  const ids = k1.map((x) => (x.startsWith('real:') ? Number(x.slice(5)) : null));
  // frames before the last card 0 and after the first card 49 are padding (a clone is a card 0 or card 49 again)
  const i0 = ids.lastIndexOf(0), i49 = ids.indexOf(TOTAL - 1);
  const hasCore = i0 >= 0 && i49 >= 0 && i49 >= i0;
  const addedBefore = hasCore ? i0 : 0, addedAfter = hasCore ? k1.length - 1 - i49 : 0;
  const kindOf = (xs, same) => (xs.length === 0 ? 'none' : xs.every((x) => x === same) ? 'clone' : [...new Set(xs)].length === 1 ? xs[0] : 'mixed');
  const head = hasCore ? k1.slice(0, i0) : [], tail = hasCore ? k1.slice(i49 + 1) : [];
  const headKind = kindOf(head, 'real:0'), tailKind = kindOf(tail, 'real:' + (TOTAL - 1));
  const core = hasCore ? ids.slice(i0, i49 + 1) : [];
  return {
    id, ...c, fps, exit: 0, frames: k1.length, framesMd5: k2.length, byPlanes: k1, byHash: k2, agree, runs, ids,
    addedBefore, addedAfter, headKind, tailKind,
    tailValues: tail.length ? {y: a.frames[i49 + 1].y, u: a.frames[i49 + 1].u, v: a.frames[i49 + 1].v} : null,
    headValues: head.length ? {y: a.frames[0].y, u: a.frames[0].u, v: a.frames[0].v} : null,
    tailHashEqualsLast: tail.length > 0 && b.md5.slice(i49 + 1).every((h) => h === src.md5[TOTAL - 1]),
    headHashEqualsFirst: head.length > 0 && b.md5.slice(0, i0).every((h) => h === src.md5[0]),
    ptsContiguous: b.pts.every((p, i) => p === i), firstCorePts: hasCore ? b.pts[i0] : null,
    seconds: Math.round((k1.length / fps) * 1000) / 1000,
    coreIntact: core.length === TOTAL && core.every((v, j) => v === j),
  };
}

// ---- the controls: built without tpad ----
const concatGraph = (second) => `[0:v]setpts=PTS-STARTPTS[a];[1:v]setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1:a=0[v]`;
export function control(name, src) {
  const second = name === 'blackCat'
    ? ['-f', 'lavfi', '-i', `color=c=black:s=${W}x${H}:r=${FPS}:d=1,format=yuv420p`]
    : ['-f', 'lavfi', '-i', `color=c=black:s=${W}x${H}:r=${FPS}:d=1,format=yuv420p,geq=lum=${lumaOf(TOTAL - 1)}:cb=${CB}:cr=${CR}`];
  const args = [...video(), ...second, '-filter_complex', concatGraph(), '-map', '[v]'];
  const r1 = run([...args, '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-']);
  const r2 = run([...args, '-an', '-fps_mode', 'passthrough', '-f', 'framemd5', '-'], {encoding: 'utf8'});
  const buf = r1.stdout, fsz = W * H * 1.5, n = buf.length / fsz, ysz = W * H, cs = ysz / 4;
  const k1 = [];
  for (let i = 0; i < n; i++) { const o = i * fsz; k1.push(classify1({y: buf[o], u: buf[o + ysz], v: buf[o + ysz + cs], flat: true})); }
  const md5 = r2.stdout.split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());
  const k2 = md5.map((h) => classify2(h, src));
  return {name, frames: n, byPlanes: k1, byHash: k2, addedKinds: [...new Set(k1.slice(TOTAL))], addedCount: n - TOTAL, tailEqualLast: md5.slice(TOTAL).every((h) => h === md5[TOTAL - 1]),
    reader1: k1.slice(TOTAL).every((x) => x === (name === 'blackCat' ? 'black' : 'real:' + (TOTAL - 1))), reader2: k2.slice(TOTAL).every((x) => x === (name === 'blackCat' ? 'black' : 'real:' + (TOTAL - 1)))};
}

// ---- pixel formats: what black is ----
export function formats() {
  const out = {};
  const cases = {
    yuv420p: {vf: 'tpad=stop=3', pix: 'yuv420p'},
    yuvj420p: {vf: 'format=yuvj420p,tpad=stop=3', pix: 'yuvj420p'},
    rgb24: {vf: 'format=rgb24,tpad=stop=3', pix: 'rgb24'},
    gray: {vf: 'format=gray,tpad=stop=3', pix: 'gray'},
  };
  for (const [k, c] of Object.entries(cases)) {
    const p = readPlanes(c.vf, {pix: c.pix});
    const f = p.frames, last = f[TOTAL - 1], add = f[TOTAL];
    // reader 2: signalstats on the same graph (luma minimum and maximum of every frame, read from the filter's own metadata)
    const r = spawnSync('ffmpeg', ['-v', 'error', ...video(), '-vf', `${c.vf},signalstats,metadata=mode=print:file=-:key=lavfi.signalstats.YMIN`, '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
    const ymin = [...r.stdout.matchAll(/YMIN=(\d+)/g)].map((m) => Number(m[1]));
    out[k] = {frames: f.length, lastReal: last, added: add, addedAllSame: f.slice(TOTAL).every((x) => JSON.stringify(x) === JSON.stringify(add)), statsFrames: ymin.length, statsYminAdded: ymin.slice(TOTAL), statsYminLastReal: ymin[TOTAL - 1]};
  }
  return out;
}

// ---- unbounded stop=-1 (guarded) ----
export function infinite() {
  const g = readPlanes('tpad=stop=-1:stop_mode=clone', {cap: 120});
  const kinds = g.frames.map(classify1);
  const un = spawnSync('ffmpeg', ['-v', 'error', '-y', ...video(), '-vf', 'tpad=stop=-1:stop_mode=clone', '-f', 'null', '-progress', 'pipe:1', '-'], {encoding: 'utf8', timeout: 3000, killSignal: 'SIGKILL', maxBuffer: 1 << 26});
  const fr = [...String(un.stdout ?? '').matchAll(/^frame=(\d+)/gm)].map((x) => Number(x[1]));
  return {guarded: {frames: g.frames.length, realFrames: kinds.filter((x) => x.startsWith('real:')).length, tailAllLast: kinds.slice(TOTAL).every((x) => x === 'real:' + (TOTAL - 1))}, unguarded: {killed: un.status === null, lastFrame: fr.length ? fr[fr.length - 1] : 0}};
}

// ---- audio: apad pads silence, it does not hold ----
const AUDIO = ['-f', 'lavfi', '-i', 'aevalsrc=0.5:s=8000:d=2'];
export const AUDIO_SAMPLES = 16000, AUDIO_LEVEL = 16384;
export function samples(af, extra = []) {
  const r = run([...AUDIO, ...(af ? ['-af', af] : []), ...extra, '-f', 's16le', '-']);
  const b = r.stdout, n = b.length / 2, s = new Int16Array(n);
  for (let i = 0; i < n; i++) s[i] = b.readInt16LE(i * 2);
  return s;
}
export function silenceStart(af) {
  const r = spawnSync('ffmpeg', ['-hide_banner', ...AUDIO, '-af', `${af},silencedetect=n=-80dB:d=0.1`, '-f', 'null', '-'], {encoding: 'utf8'});
  const m = /silence_start: ([0-9.]+)/.exec(r.stderr);
  return m ? Number(m[1]) : null;
}
export function audioCases() {
  const spec = {
    none: null, padDur1: 'apad=pad_dur=1', padLen8000: 'apad=pad_len=8000', whole24000: 'apad=whole_len=24000', wholeDur3: 'apad=whole_dur=3',
  };
  const out = {};
  for (const [k, af] of Object.entries(spec)) {
    const s = samples(af);
    const firstZero = s.findIndex((v, i) => i >= AUDIO_SAMPLES - 1 && v === 0);
    const sil = af ? silenceStart(af) : silenceStart('anull');
    out[k] = {af, samples: s.length, seconds: s.length / 8000, firstLevel: s[0], lastRealLevel: s[AUDIO_SAMPLES - 1], firstAdded: s.length > AUDIO_SAMPLES ? s[AUDIO_SAMPLES] : null, lastLevel: s[s.length - 1],
      addedSamples: s.length - AUDIO_SAMPLES, addedAllZero: s.length > AUDIO_SAMPLES && s.slice(AUDIO_SAMPLES).every((v) => v === 0), realIntact: s.slice(0, AUDIO_SAMPLES).every((v) => v === AUDIO_LEVEL),
      silenceStart: sil, firstZero: s.length > AUDIO_SAMPLES ? firstZero : null};
  }
  return out;
}

// ---- muxed: video 2 s with 1 s of padding, audio 2 s ----
export function mux(dir) {
  const cases = {
    tpadOnly: {vf: 'tpad=stop_mode=clone:stop_duration=1', af: null, extra: []},
    tpadShortest: {vf: 'tpad=stop_mode=clone:stop_duration=1', af: null, extra: ['-shortest']},
    tpadApad: {vf: 'tpad=stop_mode=clone:stop_duration=1', af: 'apad=pad_dur=1', extra: []},
    tpadApadShortest: {vf: 'tpad=stop_mode=clone:stop_duration=1', af: 'apad=pad_dur=1', extra: ['-shortest']},
  };
  const out = {};
  for (const [k, c] of Object.entries(cases)) {
    const f = path.join(dir, `mux-${k}.mkv`);
    const r = run([...video(), ...AUDIO, '-vf', c.vf, ...(c.af ? ['-af', c.af] : []), ...c.extra, '-c:v', 'ffv1', '-c:a', 'pcm_s16le', f]);
    if (r.status !== 0) { out[k] = {ok: false, error: String(r.stderr).split('\n')[0]}; continue; }
    const p = spawnSync('ffprobe', ['-v', 'error', '-count_frames', '-show_entries', 'format=duration:stream=codec_type,nb_read_frames', '-of', 'json', f], {encoding: 'utf8'});
    const j = JSON.parse(p.stdout);
    const v = j.streams.find((s) => s.codec_type === 'video'), a = j.streams.find((s) => s.codec_type === 'audio');
    // audio samples by decoding
    const d = run(['-i', f, '-vn', '-f', 's16le', '-']);
    out[k] = {ok: true, formatDuration: Number(j.format.duration), videoFrames: Number(v.nb_read_frames), videoSeconds: Number(v.nb_read_frames) / FPS, audioSamples: d.stdout.length / 2, audioSeconds: d.stdout.length / 2 / 8000};
  }
  return out;
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const src = srcTable();
  const srcPlanes = readPlanes('null');
  const ev = {
    ffmpeg: ffmpegVersion(),
    source: {frames: srcPlanes.frames.length, distinct: new Set(src.md5).size, allFlat: srcPlanes.frames.every((f) => f.flat), rule: srcPlanes.frames.every((f, i) => f.y === lumaOf(i) && f.u === CB && f.v === CR),
      refBlackDistinct: !src.md5.includes(src.ref.black), refWhiteDistinct: !src.md5.includes(src.ref.white),
      hashes: {first: src.md5[0].slice(0, 8), last: src.md5[TOTAL - 1].slice(0, 8), black: src.ref.black.slice(0, 8)}},
    controls: {blackCat: control('blackCat', src), cloneCat: control('cloneCat', src)},
    video: Object.fromEntries(Object.entries(VCASES).map(([id, c]) => [id, measureVideo(id, c, src)])),
  };
  // frame rates: the same 1 s and 0.5 s
  ev.fps = [24, 25, 30].map((fps) => ({fps, add1: measureVideo('f', {vf: 'tpad=stop_duration=1', fps}, src).addedAfter, add05: measureVideo('f', {vf: 'tpad=stop_duration=0.5', fps}, src).addedAfter}));
  ev.formats = formats();
  ev.infinite = infinite();
  ev.audio = audioCases();
  ev.mux = mux(dir);
  return ev;
}
