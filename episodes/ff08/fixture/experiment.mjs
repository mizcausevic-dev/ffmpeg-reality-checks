// Episode 08 fixture: "I joined two AAC files with -c copy. Why is the result longer?"
// Synthetic source only: two 2 s sine tones encoded to AAC in M4A. Every number comes from ffprobe or from decoding to raw samples.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, lines, ffmpegVersion} from '../../../tools/ff.mjs';

export const SRC = {rate: 44100, seconds: 2, bitrate: '128k'};

const packets = (file) => JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'packet=pts,duration', '-of', 'json', file])).packets.map((p) => ({pts: Number(p.pts), duration: Number(p.duration)}));
// Skip-samples side data sits on the first packet of a file that carries encoder priming.
function firstPacketSkip(file) {
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-read_intervals', '%+#1', '-show_entries', 'packet=pts:packet_side_data', '-of', 'json', file]));
  const sd = (j.packets?.[0]?.side_data_list ?? []).find((s) => s.side_data_type === 'Skip Samples');
  return sd ? Number(sd.skip_samples) : 0;
}
function decodedSamples(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-'], {maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(`decode failed: ${r.stderr}`);
  return r.stdout.length / 4;
}
const containerSeconds = (file) => parseFloat(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).trim());

function describe(file) {
  const pk = packets(file), n = decodedSamples(file);
  return {packets: pk.length, lastPacketDuration: pk[pk.length - 1].duration, firstPacketSkipSamples: firstPacketSkip(file), containerSeconds: containerSeconds(file), decodedSamples: n, decodedSeconds: +(n / SRC.rate).toFixed(4)};
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const wanted = SRC.rate * SRC.seconds;
  for (const [n, hz] of [['a', 440], ['b', 660]]) run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `sine=frequency=${hz}:sample_rate=${SRC.rate}:duration=${SRC.seconds}`, '-c:a', 'aac', '-b:a', SRC.bitrate, path.join(dir, `${n}.m4a`)]);
  fs.writeFileSync(path.join(dir, 'list.txt'), "file 'a.m4a'\nfile 'b.m4a'\n");
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', 'join.m4a'], {cwd: dir, encoding: 'utf8'});
  if (r.status !== 0) throw new Error(`concat failed: ${r.stderr}`);
  const a = describe(path.join(dir, 'a.m4a')), b = describe(path.join(dir, 'b.m4a')), join = describe(path.join(dir, 'join.m4a'));
  return {
    ffmpeg: ffmpegVersion(), source: {...SRC, validSamplesEach: wanted}, a, b, join,
    accounting: {
      validSamplesTotal: 2 * wanted,
      joinMinusSeparateDecodes: join.decodedSamples - (a.decodedSamples + b.decodedSamples),
      joinMinusValid: join.decodedSamples - 2 * wanted,
      primingPerFile: a.firstPacketSkipSamples,
      paddingPerFile: a.decodedSamples - wanted,
      containerExtraSamples: Math.round((join.containerSeconds - 2 * SRC.seconds) * SRC.rate),
    },
  };
}
