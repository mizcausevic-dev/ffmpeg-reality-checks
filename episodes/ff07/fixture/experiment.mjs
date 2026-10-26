// Episode 07 fixture: "Does loudnorm hit the target without changing how the sound moves?"
// Synthetic source only: a 440 Hz tone that steps up in level halfway through. Loudness is measured two ways:
// loudnorm's own JSON report and, separately, the ebur128 filter on the written file.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, lines, ffmpegVersion} from '../../../tools/ff.mjs';

export const TARGET = {I: -14, TP: -1.5, LRA: 11};
export const LEVELS = {quietDb: -10, loudDb: -2, secondsEach: 8, rate: 48000};

const info = (args) => { const r = spawnSync('ffmpeg', ['-nostats', '-v', 'info', ...args], {encoding: 'utf8', maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); return r.stderr; };
// The JSON block loudnorm prints at the end of a run.
export function loudnormJson(stderr) {
  const m = /\{[^{}]*"input_i"[^{}]*\}/s.exec(stderr);
  if (!m) throw new Error('no loudnorm JSON found');
  return JSON.parse(m[0]);
}
// ebur128 summary: integrated loudness, loudness range, sample peak.
export function ebur(file) {
  const err = info(['-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const tail = err.slice(err.lastIndexOf('Summary:'));
  const num = (re) => { const m = re.exec(tail); return m ? parseFloat(m[1]) : null; };
  return {I: num(/\bI:\s+(-?[\d.]+)\s+LUFS/), LRA: num(/\bLRA:\s+(-?[\d.]+)\s+LU\b/), peak: num(/Peak:\s+(-?[\d.]+)\s+dBFS/)};
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const src = path.join(dir, 'source.wav');
  const L = LEVELS;
  run('ffmpeg', ['-v', 'error', '-y',
    '-f', 'lavfi', '-i', `sine=frequency=440:sample_rate=${L.rate}:duration=${L.secondsEach}`,
    '-f', 'lavfi', '-i', `sine=frequency=440:sample_rate=${L.rate}:duration=${L.secondsEach}`,
    '-filter_complex', `[0]volume=${L.quietDb}dB[a];[1]volume=${L.loudDb}dB[b];[a][b]concat=n=2:v=0:a=1`, '-c:a', 'pcm_s16le', src]);
  const ln = `loudnorm=I=${TARGET.I}:TP=${TARGET.TP}:LRA=${TARGET.LRA}`;

  // Pass 1 is also the one-pass result: the same run measures the input and writes the normalised audio.
  const onePath = path.join(dir, 'one_pass.wav');
  const p1 = loudnormJson(info(['-y', '-i', src, '-af', `${ln}:print_format=json`, '-ar', String(L.rate), '-c:a', 'pcm_s16le', onePath]));
  const two = path.join(dir, 'two_pass.wav');
  const p2 = loudnormJson(info(['-y', '-i', src, '-af', `${ln}:measured_I=${p1.input_i}:measured_TP=${p1.input_tp}:measured_LRA=${p1.input_lra}:measured_thresh=${p1.input_thresh}:offset=${p1.target_offset}:linear=true:print_format=json`, '-ar', String(L.rate), '-c:a', 'pcm_s16le', two]));

  return {
    ffmpeg: ffmpegVersion(), target: TARGET, levels: L,
    source: ebur(src),
    onePass: {command: `ffmpeg -i in.wav -af loudnorm=I=${TARGET.I}:TP=${TARGET.TP}:LRA=${TARGET.LRA} out.wav`, measured: ebur(onePath), loudnormReportsOutputI: parseFloat(p1.output_i), loudnormReportsOutputLRA: parseFloat(p1.output_lra), type: p1.normalization_type},
    twoPass: {command: 'ffmpeg -i in.wav -af loudnorm=...:measured_I=...:measured_TP=...:measured_LRA=...:measured_thresh=...:offset=...:linear=true out.wav', measured: ebur(two), type: p2.normalization_type},
    pass1: p1,
  };
}
