// Episode 66 fixture: "What speeds does atempo accept, and what does the sound do?"
// Synthetic input only (lavfi), 48000 Hz mono, 4.000 s = 192000 samples, written as 16 bit wav:
//   tone    a 1000 Hz sine (amplitude 0.9 of full scale)
//   clicks  one single-sample click (0.9 of full scale) every 4800 samples (0.1 s): 40 clicks
// Every case runs `-af <filter>` on both sources, with a hard -t 30 and a 60 s process timeout, so nothing can run unbounded.
// Cases: atempo with one factor (0.25 to 200), atempo chains, and a control that changes speed by resampling (asetrate then aresample), which does change pitch.
// Readers:
//   length   reader 1  raw s16le sample count on a pipe, counted in Node
//            reader 2  ffprobe duration_ts of a wav written by the same filter (the stream time base is 1/48000)
//   pitch    reader 1  zero crossings per second of the output tone (Node)
//            reader 2  Goertzel magnitude at 1000 Hz, at 1000 x factor and at 1000 / factor (Node, on the same samples)
//   clicks   reader 1  Node scan: samples at or above 0.1 of full scale, events closer than 480 samples (10 ms) merged
//            reader 2  ffmpeg silencedetect=noise=-20dB:d=0.01 on the same output, silence_end lines counted
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const SR = 48000, SRC_SAMPLES = 192000, CLICK_EVERY = 4800, CLICKS = 40, TONE_HZ = 1000, GUARD_S = 30, TIMEOUT_MS = 60000;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
export const expectedSamples = (factor) => Math.round(SRC_SAMPLES / factor);

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, {maxBuffer: 1 << 28, timeout: TIMEOUT_MS, ...opts});
const ffm = (args) => {
  const r = run('ffmpeg', ['-v', 'error', '-y', ...args]);
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${String(r.stderr)}`);
  return r;
};

// id, filter chain, and the speed factor the chain is meant to give (the product of its atempo values)
export function cases() {
  const out = [{id: 'anull', kind: 'plain', vals: [1], af: 'anull', factor: 1}];
  const at = (id, vals) => out.push({id, kind: 'atempo', vals, af: vals.map((v) => `atempo=${v}`).join(','), factor: vals.reduce((p, v) => p * v, 1)});
  for (const v of [0.25, 0.4, 0.5, 0.8, 1, 1.5, 2, 2.5, 4, 10, 100, 100.5, 200]) at(`t${v}`, [v]);
  at('c0.5x0.8', [0.5, 0.8]); at('c0.5x0.5', [0.5, 0.5]); at('c2x2', [2, 2]); at('c2x1.25', [2, 1.25]); at('c10x10', [10, 10]); at('c100x2', [100, 2]);
  for (const f of [0.5, 2, 4]) out.push({id: `r${f}`, kind: 'resample', vals: [f], af: `asetrate=${SR * f},aresample=${SR}`, factor: f});
  return out;
}
export const commandOf = (c) => `ffmpeg -i source.wav -af ${c.af} -t ${GUARD_S} -f s16le -`;

export function makeSources(dir) {
  const tone = path.join(dir, 'tone.wav'), clicks = path.join(dir, 'clicks.wav');
  ffm(['-f', 'lavfi', '-i', `sine=frequency=${TONE_HZ}:sample_rate=${SR}:duration=4`, '-af', 'volume=0.9', '-t', '6', '-c:a', 'pcm_s16le', tone]);
  ffm(['-f', 'lavfi', '-i', `aevalsrc=exprs='if(eq(mod(n\\,${CLICK_EVERY})\\,0)\\,0.9\\,0)':s=${SR}:d=4`, '-t', '6', '-c:a', 'pcm_s16le', clicks]);
  return {tone, clicks};
}

// ---- readers ----
const toI16 = (buf) => new Int16Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length - (buf.length % 2)));
export function filterRaw(file, af) {
  const r = run('ffmpeg', ['-v', 'error', '-i', file, '-af', af, '-t', String(GUARD_S), '-f', 's16le', '-']);
  return {ok: r.status === 0, err: String(r.stderr), x: r.status === 0 ? toI16(r.stdout) : new Int16Array(0)};
}
export function probeSamples(file, af, dir, tag) {
  const out = path.join(dir, `${tag}.wav`);
  const r = run('ffmpeg', ['-v', 'error', '-y', '-i', file, '-af', af, '-t', String(GUARD_S), '-c:a', 'pcm_s16le', out]);
  if (r.status !== 0) return NaN;
  const p = run('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=duration_ts,time_base', '-of', 'csv=p=0', out], {encoding: 'utf8'});
  const [tb, ts] = String(p.stdout).trim().split(','); // ffprobe prints time_base before duration_ts
  return tb === `1/${SR}` ? Number(ts) : NaN;
}
// pitch readers on the interior of the tone (the first and last 4800 samples are left out)
export function toneReaders(x, factor) {
  const n = x.length, a = Math.min(4800, n >> 2), e = n - a;
  if (e - a < 64) return null;
  let zc = 0;
  for (let i = a + 1; i < e; i++) if (x[i - 1] < 0 && x[i] >= 0) zc++;
  const hz = zc / ((e - a - 1) / SR);
  const g = (fr) => { let re = 0, im = 0; const w = (2 * Math.PI * fr) / SR; for (let i = a; i < e; i++) { re += x[i] * Math.cos(w * i); im += x[i] * Math.sin(w * i); } return Math.hypot(re, im) / (e - a); };
  const fast = TONE_HZ * factor, slow = TONE_HZ / factor;
  return {zcHz: Math.round(hz * 100) / 100, g1000: Math.round(g(TONE_HZ)), gFast: fast < SR / 2 ? Math.round(g(fast)) : null, gSlow: Math.round(g(slow))};
}
// click readers
export function clickEvents(x) {
  const T = 0.1 * 32768, pos = [];
  let last = -1e9;
  for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) >= T) { if (i - last > 480) pos.push(i); last = i; }
  return pos;
}
// the first events with their peak sample value (event = samples at or above 0.1 of full scale, merged within 480 samples)
export function clickPeaks(x, count = 10) {
  const T = 0.1 * 32768, ev = [];
  let last = -1e9;
  for (let i = 0; i < x.length && ev.length <= count; i++) if (Math.abs(x[i]) >= T) {
    if (i - last > 480) ev.push({pos: i, peak: x[i]});
    else if (Math.abs(x[i]) > Math.abs(ev[ev.length - 1].peak)) ev[ev.length - 1].peak = x[i];
    last = i;
  }
  return ev.slice(0, count);
}
// the 16 bytes of the s16le stream (little endian) that hold sample `pos`, with the byte offset of the row
export function hexRow(x, pos) {
  const off = Math.floor((pos * 2) / 16) * 16, bytes = [];
  for (let i = 0; i < 8; i++) { const v = x[off / 2 + i] ?? 0; bytes.push(v & 255, (v >> 8) & 255); }
  return {off, pos, bytes};
}
// identity readers: reader 1 compares samples with the source in Node (first index that differs), reader 2 is ffmpeg -f md5 of the decoded output
export function firstDiff(x, ref) {
  const n = Math.min(x.length, ref.length);
  for (let i = 0; i < n; i++) if (x[i] !== ref[i]) return i;
  return x.length === ref.length ? -1 : n;
}
export function md5Of(file, af) {
  const r = run('ffmpeg', ['-v', 'error', '-i', file, '-af', af, '-t', String(GUARD_S), '-f', 'md5', '-'], {encoding: 'utf8'});
  return r.status === 0 ? String(r.stdout).trim().replace(/^MD5=/, '') : '';
}
// worst distance (in ms) of an event from the nearest point of the ideal grid k x 4800 / factor
export function gridErrorMs(pos, factor) {
  const per = CLICK_EVERY / factor;
  return Math.max(0, ...pos.map((p) => Math.abs(p - Math.round(p / per) * per))) / (SR / 1000);
}
export function silenceEvents(file, af) {
  const r = run('ffmpeg', ['-hide_banner', '-i', file, '-af', `${af},silencedetect=noise=-20dB:d=0.01`, '-t', String(GUARD_S), '-f', 'null', '-'], {encoding: 'utf8'});
  if (r.status !== 0) return NaN;
  return (String(r.stderr).match(/silence_end/g) ?? []).length;
}

export function measureCase(src, dir, c, ref) {
  const tone = filterRaw(src.tone, c.af);
  if (!tone.ok) return {...c, command: commandOf(c), accepted: false, message: (tone.err.match(/Value [^\n]*out of range[^\n]*/) ?? [tone.err.trim().split('\n')[0]])[0].replace(/\[Parsed_atempo_\d+ @ 0x[0-9a-f]+\] /, '')};
  const clicks = filterRaw(src.clicks, c.af);
  const pos = clickEvents(clicks.x);
  const samples = tone.x.length;
  return {
    ...c, command: commandOf(c), accepted: true, message: '',
    samples, samplesProbe: probeSamples(src.tone, c.af, dir, c.id), expected: expectedSamples(c.factor), diff: samples - expectedSamples(c.factor),
    tone: toneReaders(tone.x, c.factor),
    clickSamples: clicks.x.length, clickEvents: pos.length, clickPeaks: clickPeaks(clicks.x, 1000), clickHex: clickPeaks(clicks.x, 4).map((e) => hexRow(clicks.x, e.pos)), clickEventsSd: silenceEvents(src.clicks, c.af), clickPos: pos,
    clickFirstDiff: firstDiff(clicks.x, ref.x), clickMd5: md5Of(src.clicks, c.af), identical: md5Of(src.clicks, c.af) === ref.md5,
  };
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const src = makeSources(dir);
  const ref = {x: filterRaw(src.clicks, 'anull').x, md5: md5Of(src.clicks, 'anull')};
  const ev = {ffmpeg: ffmpegVersion(), sources: {toneSamples: filterRaw(src.tone, 'anull').x.length, clickSamples: ref.x.length, clickPos: clickEvents(ref.x), clickMd5: ref.md5, clickValue: ref.x[0], clickHex: [hexRow(ref.x, 0), hexRow(ref.x, CLICK_EVERY)], clickBytes: [ref.x[0] & 255, (ref.x[0] >> 8) & 255], nonzero: ref.x.reduce((n, v) => n + (v !== 0 ? 1 : 0), 0)}, runs: {}};
  for (const c of cases()) ev.runs[c.id] = measureCase(src, dir, c, ref);
  return ev;
}
