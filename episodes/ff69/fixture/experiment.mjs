// Episode 69 fixture: "adelay=1000 on stereo: why is only one channel late?"
// Synthetic input only. A stereo wav, 48000 Hz, 2 s, 16 bit: left is a 440 Hz sine, right is a 660 Hz sine, both with a start phase of 1 rad so the first
// sample is not zero (a delayed channel starts with exact zeros, an undelayed one does not). The input goes through adelay with different settings, written as wav.
// Readers:
//   reader 1  Node: parses the RIFF chunks of the output and scans the int16 samples of each channel: first non zero sample, trailing run of zeros, frame count, and
//             whether the delayed channel is an exact copy of the input shifted by the delay
//   reader 2  ffmpeg: one channel at a time through pan and silencedetect (noise -70 dB, d 0.005 s); the end of a silence that starts at 0 is the onset, and a silence that
//             reaches the end of the file is the tail
// Known positive: a file built with an expression source where only the left channel is gated to start at 0.25 s (12000 samples); both readers must report 12000 and 0.
// Control: the input with no filter must report an onset of 0 on both channels.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const RATE = 48000, SECONDS = 2, FRAMES = RATE * SECONDS, F_L = 440, F_R = 660, PHASE = 1, AMP = 0.5, BIN = 960; // 20 ms bins for the drawings
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

const ffm = (args, opts = {}) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {maxBuffer: 1 << 28, ...opts});
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${String(r.stderr)}`);
  return r;
};

// expected = what the documentation of the option says, as onsets in samples [left, right]; the readers must agree with it
export const CASES = {
  ctl:        {filter: null,                 note: 'no filter (control)',                       expect: [0, 0]},
  d1000:      {filter: 'adelay=1000',        note: 'one value, two channels',                   expect: [48000, 0]},
  d1000_1000: {filter: 'adelay=1000|1000',   note: 'one value per channel',                     expect: [48000, 48000]},
  d1000_all:  {filter: 'adelay=1000:all=1',  note: 'one value and all=1',                       expect: [48000, 48000]},
  d1000_0:    {filter: 'adelay=1000|0',      note: 'left only, spelled out',                    expect: [48000, 0]},
  d0_1000:    {filter: 'adelay=0|1000',      note: 'right only',                                expect: [0, 48000]},
  d500_1500:  {filter: 'adelay=500|1500',    note: 'a different delay per channel',             expect: [24000, 72000]},
  d1000x3:    {filter: 'adelay=1000|1000|1000', note: 'three values on two channels',           expect: [48000, 48000]},
  d48000S:    {filter: 'adelay=48000S',      note: 'one value in samples (S suffix)',           expect: [48000, 0]},
  d333_777:   {filter: 'adelay=333|777',     note: 'odd values',                                expect: [15984, 37296]},
};
export const KNOWN_POSITIVE = {name: 'kp', note: 'left gated to start at 0.25 s by an expression', expect: [12000, 0]};

export const commandOf = (name) => (CASES[name].filter ? `ffmpeg -i in.wav -af ${CASES[name].filter} out.wav` : 'ffmpeg -i in.wav out.wav');

const sineExpr = (f, gate) => {
  const s = `${AMP}*sin(2*PI*${f}*t+${PHASE})`;
  return gate ? `if(gte(t,${gate}),${s},0)` : s;
};
export function makeInput(dir) {
  const file = path.join(dir, 'in.wav');
  ffm(['-f', 'lavfi', '-i', `aevalsrc=exprs='${sineExpr(F_L)}|${sineExpr(F_R)}':s=${RATE}:d=${SECONDS}`, '-c:a', 'pcm_s16le', file]);
  return file;
}
export function makeKnownPositive(dir) {
  const file = path.join(dir, 'kp.wav');
  ffm(['-f', 'lavfi', '-i', `aevalsrc=exprs='${sineExpr(F_L, 0.25)}|${sineExpr(F_R)}':s=${RATE}:d=${SECONDS}`, '-c:a', 'pcm_s16le', file]);
  return file;
}
export function makeCase(inFile, dir, name) {
  const out = path.join(dir, `${name}.wav`);
  const c = CASES[name];
  ffm(['-i', inFile, ...(c.filter ? ['-af', c.filter] : []), '-c:a', 'pcm_s16le', out]);
  return out;
}

// reader 1: Node parses RIFF chunks, no ffmpeg involved
export function readWav(buf) {
  if (buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WAVE') throw new Error('not a wav');
  let pos = 12, fmt = null, data = null;
  while (pos + 8 <= buf.length) {
    const id = buf.toString('latin1', pos, pos + 4), len = buf.readUInt32LE(pos + 4);
    if (id === 'fmt ') fmt = {format: buf.readUInt16LE(pos + 8), channels: buf.readUInt16LE(pos + 10), rate: buf.readUInt32LE(pos + 12), bits: buf.readUInt16LE(pos + 22)};
    if (id === 'data') { data = buf.subarray(pos + 8, pos + 8 + Math.min(len, buf.length - pos - 8)); break; }
    pos += 8 + len + (len & 1);
  }
  if (!fmt || !data) throw new Error('fmt or data chunk missing');
  if (fmt.format !== 1 || fmt.bits !== 16) throw new Error(`expected pcm 16 bit, got ${JSON.stringify(fmt)}`);
  const frames = Math.floor(data.length / (2 * fmt.channels));
  const ch = [];
  for (let c = 0; c < fmt.channels; c++) {
    const a = new Int16Array(frames);
    for (let i = 0; i < frames; i++) a[i] = data.readInt16LE((i * fmt.channels + c) * 2);
    ch.push(a);
  }
  return {...fmt, frames, ch};
}
export const firstNonZero = (a) => { for (let i = 0; i < a.length; i++) if (a[i] !== 0) return i; return -1; };
export const trailingZeros = (a) => { let n = 0; for (let i = a.length - 1; i >= 0 && a[i] === 0; i--) n++; return n; };
export const peaksPerBin = (a, bin = BIN) => { const out = []; for (let s = 0; s < a.length; s += bin) { let m = 0; for (let i = s; i < Math.min(a.length, s + bin); i++) m = Math.max(m, Math.abs(a[i])); out.push(m); } return out; };

// reader 2: ffmpeg, one channel through pan and silencedetect
export function silenceOf(file, channel, duration) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', `pan=mono|c0=c${channel},silencedetect=noise=-70dB:d=0.005`, '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`silencedetect failed: ${r.stderr}`);
  const starts = [...r.stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m) => parseFloat(m[1]));
  const ends = [...r.stderr.matchAll(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g)].map((m) => ({end: parseFloat(m[1]), dur: parseFloat(m[2])}));
  const spans = starts.map((s, i) => ({start: s, end: ends[i]?.end ?? null, dur: ends[i]?.dur ?? null}));
  const lead = spans.find((s) => s.start === 0 && s.end !== null);
  const last = spans[spans.length - 1];
  const tail = last && last.end !== null && last.end >= duration - 0.001 ? last : null;
  return {
    spans,
    onsetSamples: lead ? Math.round(lead.end * RATE) : 0,
    tailSamples: tail ? Math.round(tail.dur * RATE) : 0,
  };
}

export function probeDuration(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], {encoding: 'utf8'});
  return parseFloat(r.stdout);
}

export function measure(file, input) {
  const w = readWav(fs.readFileSync(file));
  const dur = probeDuration(file);
  const onset = w.ch.map(firstNonZero), tail = w.ch.map(trailingZeros);
  const ff = [0, 1].map((c) => silenceOf(file, c, dur));
  // copy check: the delayed channel, shifted back by its onset, equals the input; the other samples of the output are zero
  const copy = w.ch.map((a, c) => {
    const shift = onset[c], src = input.ch[c];
    if (shift < 0) return false;
    for (let i = 0; i < src.length; i++) if (a[shift + i] !== src[i]) return false;
    for (let i = 0; i < shift; i++) if (a[i] !== 0) return false;
    for (let i = shift + src.length; i < a.length; i++) if (a[i] !== 0) return false;
    return true;
  });
  return {
    frames: w.frames, channels: w.channels, rate: w.rate, durationProbe: dur,
    node: {onset, tail, soundSamples: w.ch.map((a, c) => a.length - onset[c] - tail[c])},
    ff: {onset: ff.map((f) => f.onsetSamples), tail: ff.map((f) => f.tailSamples), spans: ff.map((f) => f.spans)},
    copy,
    peaks: w.ch.map((a) => peaksPerBin(a)),
    ch: w.ch,
  };
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const ev = {ffmpeg: ffmpegVersion(), rate: RATE, seconds: SECONDS, frames: FRAMES, freq: {left: F_L, right: F_R}, startPhase: PHASE, runs: {}};
  const inFile = makeInput(dir);
  const input = readWav(fs.readFileSync(inFile));
  ev.input = {frames: input.frames, firstSamples: [Array.from(input.ch[0].slice(0, 6)), Array.from(input.ch[1].slice(0, 6))], waveLeft: Array.from(input.ch[0].slice(0, 220)), waveRight: Array.from(input.ch[1].slice(0, 220))};
  for (const name of Object.keys(CASES)) {
    const file = makeCase(inFile, dir, name);
    const m = measure(file, input);
    const c = CASES[name];
    ev.runs[name] = {name, filter: c.filter, note: c.note, command: commandOf(name), expect: c.expect, ...m, ch: undefined};
    if (name === 'd1000' || name === 'd333_777') {
      const [l, r] = m.ch;
      const around = (a, at) => Array.from(a.slice(at - 3, at + 3));
      ev.runs[name].around = {leftAt: m.node.onset[0], left: around(l, m.node.onset[0]), rightAt: m.node.onset[1], right: m.node.onset[1] > 3 ? around(r, m.node.onset[1]) : null, rightTailAt: l.length - m.node.tail[1], rightTail: around(r, l.length - m.node.tail[1])};
    }
  }
  const kpFile = makeKnownPositive(dir);
  const kp = measure(kpFile, input);
  ev.knownPositive = {name: 'kp', note: KNOWN_POSITIVE.note, expect: KNOWN_POSITIVE.expect, command: "aevalsrc with if(gte(t,0.25),...) on the left channel", frames: kp.frames, node: kp.node, ff: kp.ff, peaks: kp.peaks, durationProbe: kp.durationProbe};
  return ev;
}
