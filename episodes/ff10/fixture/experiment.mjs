// Episode 10 fixture: "Where did my second audio track go?"
// Synthetic source only: one video stream and two audio streams (a 440 Hz "main" tone and an 880 Hz "commentary" tone), 1 second.
// Four commands on that source, each read back two independent ways: the streams ffprobe lists, and the pitch of each audio stream
// measured by decoding it to samples and counting zero crossings.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, lines, ffmpegVersion} from '../../../tools/ff.mjs';

export const TONES = {main: 440, commentary: 880};
const RATE = 48000, SECONDS = 1;

const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };
const streams = (file) => JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries', 'stream=index,codec_type,codec_name,channels:stream_disposition=default', '-of', 'json', file])).streams
  .map((s) => ({type: s.codec_type, codec: s.codec_name, channels: s.channels ?? null, isDefault: s.disposition?.default === 1}));
// pitch in Hz of audio stream number n (0-based among audio streams): decode to mono s16 and count positive-going zero crossings per second
function pitch(file, n) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-map', `0:a:${n}`, '-ac', '1', '-ar', String(RATE), '-f', 's16le', '-'], {maxBuffer: 1 << 26});
  const b = r.stdout; let crossings = 0, prev = 0;
  for (let i = 0; i + 1 < b.length; i += 2) { const v = b.readInt16LE(i); if (prev <= 0 && v > 0) crossings++; prev = v; }
  return Math.round(crossings / (b.length / 2 / RATE));
}

export const COMMANDS = {
  no_map:    {command: 'ffmpeg -i in.mp4 -c:v libx264 -c:a aac out.mp4', args: ['-c:v', 'libx264', '-c:a', 'aac']},
  no_map_copy: {command: 'ffmpeg -i in.mp4 -c copy out.mp4', args: ['-c', 'copy']},
  map_all:   {command: 'ffmpeg -i in.mp4 -map 0 -c:v libx264 -c:a aac out.mp4', args: ['-map', '0', '-c:v', 'libx264', '-c:a', 'aac']},
  map_second:{command: 'ffmpeg -i in.mp4 -map 0:v -map 0:a:1 -c:v libx264 -c:a aac out.mp4', args: ['-map', '0:v', '-map', '0:a:1', '-c:v', 'libx264', '-c:a', 'aac']},
};

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  ff(['-f', 'lavfi', '-i', `testsrc2=size=320x180:rate=25:duration=${SECONDS}`, '-f', 'lavfi', '-i', `sine=frequency=${TONES.main}:sample_rate=${RATE}:duration=${SECONDS}`, '-f', 'lavfi', '-i', `sine=frequency=${TONES.commentary}:sample_rate=${RATE}:duration=${SECONDS}`,
    '-map', '0:v', '-map', '1:a', '-map', '2:a', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', 'in.mp4'], dir);
  const out = {ffmpeg: ffmpegVersion(), tones: TONES, source: {streams: streams(path.join(dir, 'in.mp4')), pitches: [pitch(path.join(dir, 'in.mp4'), 0), pitch(path.join(dir, 'in.mp4'), 1)]}, runs: {}};
  // second source: the commentary track has more channels (stereo) than the main track (mono)
  ff(['-f', 'lavfi', '-i', `testsrc2=size=320x180:rate=25:duration=${SECONDS}`, '-f', 'lavfi', '-i', `sine=frequency=${TONES.main}:sample_rate=${RATE}:duration=${SECONDS}`, '-f', 'lavfi', '-i', `sine=frequency=${TONES.commentary}:sample_rate=${RATE}:duration=${SECONDS}`,
    '-filter_complex', '[2:a]aformat=channel_layouts=stereo[s]', '-map', '0:v', '-map', '1:a', '-map', '[s]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', 'in2.mp4'], dir);
  out.source2 = {streams: streams(path.join(dir, 'in2.mp4')), pitches: [pitch(path.join(dir, 'in2.mp4'), 0), pitch(path.join(dir, 'in2.mp4'), 1)]};
  ff(['-i', 'in2.mp4', '-c:v', 'libx264', '-c:a', 'aac', 'more_channels.mp4'], dir);
  // third source: same two tracks, but the default flag is moved to the stereo track
  ff(['-i', 'in2.mp4', '-map', '0', '-c', 'copy', '-disposition:a:0', '0', '-disposition:a:1', 'default', 'in3.mp4'], dir);
  out.source3 = {streams: streams(path.join(dir, 'in3.mp4')), pitches: [pitch(path.join(dir, 'in3.mp4'), 0), pitch(path.join(dir, 'in3.mp4'), 1)]};
  ff(['-i', 'in3.mp4', '-c:v', 'libx264', '-c:a', 'aac', 'flag_moved.mp4'], dir);
  { const f = path.join(dir, 'flag_moved.mp4'); const a = streams(f).filter((x) => x.type === 'audio'); out.runs.no_map_flag_moved = {command: 'ffmpeg -i in3.mp4 -c:v libx264 -c:a aac out.mp4', streams: streams(f), audioCount: a.length, channels: a.map((x) => x.channels), pitches: a.map((_, i) => pitch(f, i))}; }
  { const f = path.join(dir, 'more_channels.mp4'); const a = streams(f).filter((x) => x.type === 'audio'); out.runs.no_map_more_channels = {command: 'ffmpeg -i in2.mp4 -c:v libx264 -c:a aac out.mp4', streams: streams(f), audioCount: a.length, channels: a.map((x) => x.channels), pitches: a.map((_, i) => pitch(f, i))}; }
  for (const [name, c] of Object.entries(COMMANDS)) {
    const file = path.join(dir, `${name}.mp4`);
    ff(['-i', 'in.mp4', ...c.args, `${name}.mp4`], dir);
    const s = streams(file);
    const audio = s.filter((x) => x.type === 'audio');
    out.runs[name] = {command: c.command, streams: s, audioCount: audio.length, channels: audio.map((a) => a.channels), pitches: audio.map((_, i) => pitch(file, i))};
  }
  return out;
}
