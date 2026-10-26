// Episode 20 fixture: "What bitrate does FFmpeg's AAC encoder use when you do not set one?"
// Synthetic sources only: 10 s of pink noise (lavfi anoisesrc, independent seed per channel), and 10 s of digital silence as a control.
// Each output is read back two independent ways:
//   reader 1  ffprobe: the bit_rate the stream declares
//   reader 2  the sum of every packet's payload size, times 8, over the duration
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, ffmpegVersion} from '../../../tools/ff.mjs';

const SECONDS = 10;
export const RATES = [22050, 32000, 44100, 48000];

const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };

const noise = (ch, rate) => {
  const ins = [];
  for (let i = 1; i <= ch; i++) ins.push('-f', 'lavfi', '-i', `anoisesrc=d=${SECONDS}:r=${rate}:a=0.3:c=pink:seed=${i}`);
  const fc = ch === 1 ? '[0:a]anull[o]' : Array.from({length: ch}, (_, i) => `[${i}:a]`).join('') + `amerge=inputs=${ch}[o]`;
  return [...ins, '-filter_complex', fc, '-map', '[o]'];
};
const silence = (ch, rate) => ['-f', 'lavfi', '-i', `anullsrc=r=${rate}:cl=${ch === 1 ? 'mono' : 'stereo'}:d=${SECONDS}`];

export function declared(file) {
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=bit_rate,sample_rate,channels', '-of', 'json', file]));
  const s = j.streams[0];
  return {bitRate: s.bit_rate ? Number(s.bit_rate) : null, rate: Number(s.sample_rate), channels: s.channels};
}

export function measured(file) {
  const sizes = run('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'packet=size', '-of', 'csv=p=0', file]).split(/\r?\n/).map((l) => l.replace(/,$/, '').trim()).filter(Boolean).map(Number);
  const bytes = sizes.reduce((a, b) => a + b, 0);
  return {packets: sizes.length, bitRate: Math.round((bytes * 8) / SECONDS)};
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const out = {ffmpeg: ffmpegVersion(), seconds: SECONDS, runs: {}};
  const enc = (name, input, codecArgs, ext, label) => {
    const f = `${name}.${ext}`;
    ff([...input, ...codecArgs, f], dir);
    const p = path.join(dir, f);
    out.runs[name] = {command: label, declared: declared(p), measured: measured(p)};
  };
  for (const ch of [1, 2]) for (const rate of RATES)
    enc(`aac_${ch === 1 ? 'mono' : 'stereo'}_${rate}`, noise(ch, rate), ['-c:a', 'aac'], 'm4a', `ffmpeg -i noise_${ch}ch_${rate}Hz -c:a aac out.m4a`);
  enc('aac_stereo_silence', silence(2, 44100), ['-c:a', 'aac'], 'm4a', 'ffmpeg -i silence_2ch_44100Hz -c:a aac out.m4a');
  enc('aac_stereo_96k', noise(2, 44100), ['-c:a', 'aac', '-b:a', '96k'], 'm4a', 'ffmpeg -i noise_2ch_44100Hz -c:a aac -b:a 96k out.m4a');
  enc('aac_mono_96k', noise(1, 44100), ['-c:a', 'aac', '-b:a', '96k'], 'm4a', 'ffmpeg -i noise_1ch_44100Hz -c:a aac -b:a 96k out.m4a');
  enc('mp3_stereo', noise(2, 44100), ['-c:a', 'libmp3lame'], 'mp3', 'ffmpeg -i noise_2ch_44100Hz -c:a libmp3lame out.mp3');
  enc('mp3_mono', noise(1, 44100), ['-c:a', 'libmp3lame'], 'mp3', 'ffmpeg -i noise_1ch_44100Hz -c:a libmp3lame out.mp3');
  return out;
}
