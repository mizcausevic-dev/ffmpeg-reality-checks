// Episode 24 fixture: "Does -map_metadata -1 remove chapters?"
// Synthetic source only: a 4 s MP4 (testsrc2 video, 440 Hz tone) with a made-up global title and two made-up chapters, written from an ffmetadata file.
// Each output is read back three independent ways:
//   reader 1  ffprobe: chapter count, start times and titles
//   reader 2  ffmpeg's own ffmetadata export (-f ffmetadata): the [CHAPTER] blocks it would write
//   reader 3  a raw byte scan of the file for the made-up title strings
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, ffmpegVersion} from '../../../tools/ff.mjs';

export const TITLES = {global: 'Secret Global Title', chapters: ['Private Chapter One', 'Private Chapter Two']};
const META = `;FFMETADATA1\ntitle=${TITLES.global}\n[CHAPTER]\nTIMEBASE=1/1000\nSTART=0\nEND=2000\ntitle=${TITLES.chapters[0]}\n[CHAPTER]\nTIMEBASE=1/1000\nSTART=2000\nEND=4000\ntitle=${TITLES.chapters[1]}\n`;

export const CASES = {
  plain:           {command: 'ffmpeg -i in.mp4 -c copy out.mp4',                                        args: ['-c', 'copy'], ext: 'mp4'},
  meta_off:        {command: 'ffmpeg -i in.mp4 -map_metadata -1 -c copy out.mp4',                       args: ['-map_metadata', '-1', '-c', 'copy'], ext: 'mp4'},
  chapters_off:    {command: 'ffmpeg -i in.mp4 -map_chapters -1 -c copy out.mp4',                       args: ['-map_chapters', '-1', '-c', 'copy'], ext: 'mp4'},
  both_off:        {command: 'ffmpeg -i in.mp4 -map_metadata -1 -map_chapters -1 -c copy out.mp4',      args: ['-map_metadata', '-1', '-map_chapters', '-1', '-c', 'copy'], ext: 'mp4'},
  meta_off_encode: {command: 'ffmpeg -i in.mp4 -map_metadata -1 -c:v libx264 -pix_fmt yuv420p -c:a aac out.mp4', args: ['-map_metadata', '-1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac'], ext: 'mp4'},
  meta_off_mkv:    {command: 'ffmpeg -i in.mp4 -map_metadata -1 -c copy out.mkv',                       args: ['-map_metadata', '-1', '-c', 'copy'], ext: 'mkv'},
};

const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };

// reader 1
export function probeChapters(file) {
  const j = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-show_chapters', '-of', 'json', file], {encoding: 'utf8', maxBuffer: 1 << 26}).stdout || '{"chapters":[]}');
  return j.chapters.map((c) => ({start: Math.round(Number(c.start_time) * 1000) / 1000, title: c.tags?.title ?? null}));
}

// reader 2: ffmpeg writes the file's metadata back out as ffmetadata text; count its [CHAPTER] blocks and read their titles
export function exportChapters(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'ffmetadata', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  const text = r.stdout;
  const blocks = text.split('[CHAPTER]').slice(1);
  return {count: blocks.length, titles: blocks.map((b) => (b.match(/^title=(.*)$/m) ?? [])[1] ?? null), globalTitle: (text.split('[CHAPTER]')[0].match(/^title=(.*)$/m) ?? [])[1] ?? null};
}

// reader 3: raw bytes
export function scan(file) {
  const b = fs.readFileSync(file);
  const has = (s) => b.indexOf(Buffer.from(s)) !== -1;
  return {global: has(TITLES.global), chapter1: has(TITLES.chapters[0]), chapter2: has(TITLES.chapters[1])};
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(path.join(dir, 'meta.txt'), META);
  ff(['-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=25:duration=4', '-f', 'lavfi', '-i', 'sine=f=440:d=4', '-i', 'meta.txt', '-map', '0:v', '-map', '1:a', '-map_metadata', '2', '-map_chapters', '2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', 'src.mp4'], dir);
  const out = {ffmpeg: ffmpegVersion(), source: {file: 'src.mp4', probe: probeChapters(path.join(dir, 'src.mp4')), scan: scan(path.join(dir, 'src.mp4'))}, runs: {}};
  for (const [name, c] of Object.entries(CASES)) {
    const f = `${name}.${c.ext}`;
    ff(['-i', 'src.mp4', ...c.args, f], dir);
    const p = path.join(dir, f);
    out.runs[name] = {command: c.command, probe: probeChapters(p), exported: exportChapters(p), scan: scan(p)};
  }
  return out;
}
