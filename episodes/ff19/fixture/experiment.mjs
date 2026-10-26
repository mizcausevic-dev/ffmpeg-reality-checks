// Episode 19 fixture: "What does -ac 1 do to a stereo track?"
// Synthetic sources only: four 2.0 s stereo files made by lavfi, 48 kHz, 16-bit, left channel a 440 Hz sine at 0.4 amplitude (-7.96 dBFS).
//   same      right channel identical to left
//   anti      right channel is left, inverted (out of phase)
//   leftonly  right channel silent
//   diff      right channel a different tone (660 Hz, same level)
// Each is turned to mono three ways and read back two independent ways:
//   reader 1  ffmpeg astats: peak and RMS level of the file
//   reader 2  the raw 16-bit samples read in JS: peak and RMS computed here
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

const AMP = 0.4;
export const SOURCES = {
  same:     `aevalsrc=${AMP}*sin(2*PI*440*t)|${AMP}*sin(2*PI*440*t):s=48000:d=2`,
  anti:     `aevalsrc=${AMP}*sin(2*PI*440*t)|-${AMP}*sin(2*PI*440*t):s=48000:d=2`,
  leftonly: `aevalsrc=${AMP}*sin(2*PI*440*t)|0:s=48000:d=2`,
  diff:     `aevalsrc=${AMP}*sin(2*PI*440*t)|${AMP}*sin(2*PI*660*t):s=48000:d=2`,
};
export const WAYS = {
  stereo: {command: 'unchanged stereo source',                          args: []},
  ac1:    {command: 'ffmpeg -i in.wav -ac 1 out.wav',                    args: ['-ac', '1']},
  left:   {command: 'ffmpeg -i in.wav -af pan=mono|c0=c0 out.wav',       args: ['-af', 'pan=mono|c0=c0']},
  sum:    {command: 'ffmpeg -i in.wav -af pan=mono|c0=c0+c1 out.wav',    args: ['-af', 'pan=mono|c0=c0+c1']},
};

const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };
const db = (x) => (x <= 0 ? -Infinity : 20 * Math.log10(x));
const round2 = (x) => (x === -Infinity ? -Infinity : Math.round(x * 100) / 100);

// reader 1: astats, overall block
export function astats(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'astats', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  const err = r.stderr.split(/\r?\n/);
  const at = err.findIndex((l) => /Overall/.test(l));
  const get = (name) => { const l = err.slice(at).find((x) => x.includes(name + ':')); const v = l ? l.split(':').pop().trim() : null; return v === null ? null : v === '-inf' ? -Infinity : Number(v); };
  return {peakDb: round2(get('Peak level dB')), rmsDb: round2(get('RMS level dB'))};
}

// reader 2: raw 16-bit samples, all channels together
export function samples(file) {
  const b = fs.readFileSync(file);
  const off = b.indexOf('data') + 8;
  let peak = 0, sum = 0, n = 0;
  for (let i = off; i + 1 < b.length; i += 2) { const v = b.readInt16LE(i) / 32768; n++; sum += v * v; if (Math.abs(v) > peak) peak = Math.abs(v); }
  return {peakDb: round2(db(peak)), rmsDb: round2(db(Math.sqrt(sum / n)))};
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const out = {ffmpeg: ffmpegVersion(), amplitude: AMP, runs: {}};
  for (const [src, graph] of Object.entries(SOURCES)) {
    ff(['-f', 'lavfi', '-i', graph, '-c:a', 'pcm_s16le', `${src}.wav`], dir);
    for (const [way, w] of Object.entries(WAYS)) {
      let file = `${src}.wav`;
      if (w.args.length) { file = `${src}_${way}.wav`; ff(['-i', `${src}.wav`, ...w.args, '-c:a', 'pcm_s16le', file], dir); }
      const p = path.join(dir, file);
      out.runs[`${src}_${way}`] = {source: src, way, command: w.command, astats: astats(p), samples: samples(p)};
    }
  }
  return out;
}
