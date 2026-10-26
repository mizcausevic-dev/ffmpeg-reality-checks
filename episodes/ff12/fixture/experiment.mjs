// Episode 12 fixture: "Does FFmpeg keep my video's metadata?"
// Synthetic source only: a 1 second MP4 whose tags are made-up strings (a title, an artist, a comment, a location in the open Atlantic, and a custom
// handler name on the video stream). Four commands, each read back two independent ways: the tags ffprobe reports, and a raw search of the file's
// bytes for each made-up string (a tag the container hides from ffprobe would still be found there).
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, ffmpegVersion} from '../../../tools/ff.mjs';

export const TAGS = {title: 'Synthetic Title QX7', artist: 'Synthetic Artist QX7', comment: 'synthetic note qx7', location: '+10.0000-040.0000/'};
export const HANDLER = 'SyntheticHandlerQX7';
export const COMMANDS = {
  plain:  {command: 'ffmpeg -i in.mp4 -c:v libx264 -c:a aac out.mp4',                      args: ['-c:v', 'libx264', '-c:a', 'aac']},
  copy:   {command: 'ffmpeg -i in.mp4 -c copy out.mp4',                                     args: ['-c', 'copy']},
  strip:  {command: 'ffmpeg -i in.mp4 -map_metadata -1 -c:v libx264 -c:a aac out.mp4',      args: ['-map_metadata', '-1', '-c:v', 'libx264', '-c:a', 'aac']},
  strip_bitexact: {command: 'ffmpeg -i in.mp4 -map_metadata -1 -fflags +bitexact -c:v libx264 -c:a aac out.mp4', args: ['-map_metadata', '-1', '-fflags', '+bitexact', '-c:v', 'libx264', '-c:a', 'aac']},
  strip_copy: {command: 'ffmpeg -i in.mp4 -map_metadata -1 -c copy out.mp4',                args: ['-map_metadata', '-1', '-c', 'copy']},
};

const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };
function probeTags(file) {
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries', 'format_tags:stream_tags', '-of', 'json', file]));
  return {format: j.format?.tags ?? {}, streams: (j.streams ?? []).map((s) => s.tags ?? {})};
}
function bytesHave(file, text) { return fs.readFileSync(file).includes(Buffer.from(text, 'latin1')); }

export function report(file) {
  const p = probeTags(file);
  const seen = {};
  // the MP4 muxer stores a location as a binary 'loci' atom (coordinates as numbers, not text), so for it the byte search looks for the atom's name
  for (const [k, v] of Object.entries(TAGS)) seen[k] = {ffprobe: p.format[k] === v, bytes: bytesHave(file, k === 'location' ? 'loci' : v)};
  seen.handler = {ffprobe: p.streams.some((s) => s.handler_name === HANDLER), bytes: bytesHave(file, HANDLER)};
  return {seen, formatTagNames: Object.keys(p.format).sort(), encoderTag: p.format.encoder ?? null};
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const meta = Object.entries(TAGS).flatMap(([k, v]) => ['-metadata', `${k}=${v}`]);
  ff(['-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=25:duration=1', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', ...meta, '-metadata:s:v:0', `handler_name=${HANDLER}`, 'in.mp4'], dir);
  const out = {ffmpeg: ffmpegVersion(), tags: TAGS, source: report(path.join(dir, 'in.mp4')), runs: {}};
  for (const [name, c] of Object.entries(COMMANDS)) {
    ff(['-i', 'in.mp4', ...c.args, `${name}.mp4`], dir);
    out.runs[name] = {command: c.command, ...report(path.join(dir, `${name}.mp4`))};
  }
  return out;
}
