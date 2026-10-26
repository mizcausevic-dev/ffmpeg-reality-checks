// Episode 18 fixture: "Does -af volume clip your audio?"
// Synthetic source only: a 2.0 s, 440 Hz sine at -3 dBFS (48 kHz, 16-bit), made by lavfi.
// Each output is read back two independent ways:
//   reader 1  ffmpeg astats: peak level, flat factor (flat tops) and peak count
//   reader 2  raw 16-bit samples read in JS: samples at full scale, and the largest error against the source
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, ffmpegVersion} from '../../../tools/ff.mjs';

const RATE = 48000, SECONDS = 2;

const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };

// Each case is one or more ffmpeg steps. A step reads `in`, applies `af`, writes `codec`.
export const CASES = {
  minus6:        {command: 'ffmpeg -i src.wav -af volume=-6dB out.wav',                               steps: [{af: 'volume=-6dB'}]},
  plus3:         {command: 'ffmpeg -i src.wav -af volume=3dB out.wav',                                steps: [{af: 'volume=3dB'}]},
  plus6:         {command: 'ffmpeg -i src.wav -af volume=6dB out.wav',                                steps: [{af: 'volume=6dB'}]},
  plus12:        {command: 'ffmpeg -i src.wav -af volume=12dB out.wav',                               steps: [{af: 'volume=12dB'}]},
  one_command:   {command: 'ffmpeg -i src.wav -af volume=12dB,volume=-12dB out.wav',                  steps: [{af: 'volume=12dB,volume=-12dB'}]},
  two_commands:  {command: 'ffmpeg -i src.wav -af volume=12dB mid.wav  then  -af volume=-12dB out.wav', steps: [{af: 'volume=12dB'}, {af: 'volume=-12dB'}]},
  float_between: {command: 'ffmpeg -i src.wav -af volume=12dB -c:a pcm_f32le mid.wav  then  -af volume=-12dB out.wav', steps: [{af: 'volume=12dB', codec: 'pcm_f32le'}, {af: 'volume=-12dB'}]},
  limiter_auto:  {command: 'ffmpeg -i src.wav -af volume=12dB,alimiter=limit=0.89 out.wav',             steps: [{af: 'volume=12dB,alimiter=limit=0.89'}]},
  limiter:       {command: 'ffmpeg -i src.wav -af volume=12dB,alimiter=limit=0.89:level=disabled out.wav', steps: [{af: 'volume=12dB,alimiter=limit=0.89:level=disabled'}]},
};

// reader 1: astats, overall channel block
export function astats(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'astats', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  const err = r.stderr.split(/\r?\n/);
  const at = err.findIndex((l) => /Overall/.test(l));
  const get = (name) => { const l = err.slice(at).find((x) => x.includes(name + ':')); return l ? Number(l.split(':').pop().trim()) : null; };
  return {peakDb: round2(get('Peak level dB')), flat: round2(get('Flat factor')), peakCount: get('Peak count'), samples: get('Number of samples')};
}

const round2 = (x) => (x === null ? null : Math.round(x * 100) / 100);

// reader 2: raw 16-bit samples
export function pcm(file) {
  const b = fs.readFileSync(file);
  const off = b.indexOf('data') + 8;
  const v = new Int16Array(Math.floor((b.length - off) / 2));
  for (let i = 0; i < v.length; i++) v[i] = b.readInt16LE(off + i * 2);
  return v;
}

export function samplesRead(file, srcPcm) {
  const v = pcm(file);
  let atFull = 0, peak = 0, maxErr = 0;
  for (let i = 0; i < v.length; i++) {
    const a = Math.abs(v[i]);
    if (a >= 32767) atFull++;
    if (a > peak) peak = a;
    if (srcPcm && i < srcPcm.length) maxErr = Math.max(maxErr, Math.abs(v[i] - srcPcm[i]));
  }
  return {samples: v.length, atFullScale: atFull, share: Math.round((atFull / v.length) * 1000) / 1000, peak, peakDb: round2(20 * Math.log10(peak / 32768)), maxErrVsSource: srcPcm ? maxErr : null};
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  ff(['-f', 'lavfi', '-i', `aevalsrc=0.7079*sin(2*PI*440*t):s=${RATE}:d=${SECONDS}`, '-c:a', 'pcm_s16le', 'src.wav'], dir);
  const srcPcm = pcm(path.join(dir, 'src.wav'));
  const out = {ffmpeg: ffmpegVersion(), source: {file: 'src.wav', tone: '440 Hz sine', level: '-3 dBFS', rate: RATE, seconds: SECONDS, ...samplesRead(path.join(dir, 'src.wav'), null), astats: astats(path.join(dir, 'src.wav'))}, runs: {}};
  for (const [name, c] of Object.entries(CASES)) {
    let input = 'src.wav';
    c.steps.forEach((s, i) => {
      const last = i === c.steps.length - 1;
      const target = last ? `${name}.wav` : `${name}_mid.wav`;
      ff(['-i', input, '-af', s.af, '-c:a', s.codec ?? 'pcm_s16le', target], dir);
      input = target;
    });
    const f = path.join(dir, `${name}.wav`);
    out.runs[name] = {command: c.command, astats: astats(f), samples: samplesRead(f, srcPcm)};
  }
  return out;
}
