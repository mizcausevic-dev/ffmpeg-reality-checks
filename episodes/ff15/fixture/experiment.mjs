// Episode 15 fixture: "What does -shortest really cut?"
// Synthetic sources only: a 5.0 s test-pattern video (125 frames at 25 fps), a 3.0 s sine tone and an 8.0 s sine tone, all made by lavfi.
// Each output is read back two independent ways:
//   reader 1  ffprobe: the duration the file declares (container and each stream)
//   reader 2  a full decode: the number of video frames really decoded, and the seconds of audio really decoded (raw samples counted)
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, ffmpegVersion} from '../../../tools/ff.mjs';

export const CASES = {
  short_audio_none:   {command: 'ffmpeg -i video5s.mp4 -i tone3s.m4a -c copy out.mp4',               args: ['-i', 'video5s.mp4', '-i', 'tone3s.m4a', '-c', 'copy']},
  short_audio_copy:   {command: 'ffmpeg -i video5s.mp4 -i tone3s.m4a -c copy -shortest out.mp4',      args: ['-i', 'video5s.mp4', '-i', 'tone3s.m4a', '-c', 'copy', '-shortest']},
  short_audio_encode: {command: 'ffmpeg -i video5s.mp4 -i tone3s.m4a -c:v libx264 -c:a aac -shortest out.mp4', args: ['-i', 'video5s.mp4', '-i', 'tone3s.m4a', '-c:v', 'libx264', '-c:a', 'aac', '-shortest']},
  long_audio_none:    {command: 'ffmpeg -i video5s.mp4 -i tone8s.m4a -c copy out.mp4',               args: ['-i', 'video5s.mp4', '-i', 'tone8s.m4a', '-c', 'copy']},
  long_audio_short:   {command: 'ffmpeg -i video5s.mp4 -i tone8s.m4a -c copy -shortest out.mp4',      args: ['-i', 'video5s.mp4', '-i', 'tone8s.m4a', '-c', 'copy', '-shortest']},
};

const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };
const num = (x) => (x === undefined || x === 'N/A' ? null : Number(x));
const round3 = (x) => (x === null ? null : Math.round(x * 1000) / 1000);

export function declared(file) {
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,duration,sample_rate,channels', '-of', 'json', file]));
  const v = j.streams.find((s) => s.codec_type === 'video'), a = j.streams.find((s) => s.codec_type === 'audio');
  return {container: round3(num(j.format.duration)), video: round3(num(v?.duration)), audio: round3(num(a?.duration)), rate: num(a?.sample_rate), channels: num(a?.channels)};
}

// reader 2: decode everything. Video frames are counted by the decoder; audio is decoded to raw 16-bit samples and the byte count turned into seconds.
export function decoded(file, d, cwd) {
  const frames = Number(run('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', file]).trim());
  const raw = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:a', '-f', 's16le', '-'], {cwd, maxBuffer: 1 << 28});
  if (raw.status !== 0) throw new Error(`ffmpeg failed: ${raw.stderr}`);
  const seconds = raw.stdout.length / 2 / d.channels / d.rate;
  return {videoFrames: frames, videoSeconds: round3(frames / 25), audioSeconds: round3(seconds)};
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  ff(['-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=25:duration=5', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', 'video5s.mp4'], dir);
  ff(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', '-c:a', 'aac', 'tone3s.m4a'], dir);
  ff(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=8', '-c:a', 'aac', 'tone8s.m4a'], dir);
  const out = {ffmpeg: ffmpegVersion(), sources: {video: 5, shortTone: 3, longTone: 8, videoFrames: 125}, runs: {}};
  for (const [name, c] of Object.entries(CASES)) {
    ff([...c.args, `${name}.mp4`], dir);
    const f = path.join(dir, `${name}.mp4`);
    const d = declared(f);
    out.runs[name] = {command: c.command, declared: d, decoded: decoded(f, d, dir)};
  }
  return out;
}
