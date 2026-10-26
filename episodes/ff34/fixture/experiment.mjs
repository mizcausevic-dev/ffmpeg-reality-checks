// Episode 34 fixture: "I turned 100 PNGs into a video: why is it the wrong speed? (-framerate vs -r on image sequences)"
// Synthetic input only: 100 PNGs (64x64, 8 bit gray) named img001.png to img100.png, made with lavfi. File number N has gray level 2*N + 10,
// so the picture carries its own id: id = (Y - 10) / 2. Every output is stored losslessly (FFV1) in Matroska and read back two independent ways:
//   frames  reader 1 frame md5 matched to the md5 of the source PNGs   reader 2 decoded gray byte at a fixed pixel (the code above)
//   time    reader 1 ffprobe packets: last pts + duration, packet count, r_frame_rate   reader 2 decode: framemd5 last frame pts + duration, frame count
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, ffmpegVersion} from '../../../tools/ff.mjs';

export const N = 100, SIZE = 64;
const round3 = (x) => Math.round(x * 1000) / 1000;
const SEQ = 'png/img%03d.png';

// Each case: input options (before -i), the input name, output options (after -i).
export const CASES = {
  ctrl:    {in: [],                                          input: SEQ,            out: [],              command: 'ffmpeg -i img%03d.png out.mkv'},
  fr25:    {in: ['-framerate', '25'],                        input: SEQ,            out: [],              command: 'ffmpeg -framerate 25 -i img%03d.png out.mkv'},
  fr10:    {in: ['-framerate', '10'],                        input: SEQ,            out: [],              command: 'ffmpeg -framerate 10 -i img%03d.png out.mkv'},
  rin10:   {in: ['-r', '10'],                                input: SEQ,            out: [],              command: 'ffmpeg -r 10 -i img%03d.png out.mkv'},
  rout10:  {in: [],                                          input: SEQ,            out: ['-r', '10'],    command: 'ffmpeg -i img%03d.png -r 10 out.mkv'},
  both:    {in: ['-framerate', '25', '-r', '10'],            input: SEQ,            out: [],              command: 'ffmpeg -framerate 25 -r 10 -i img%03d.png out.mkv'},
  frrout:  {in: ['-framerate', '10'],                        input: SEQ,            out: ['-r', '10'],    command: 'ffmpeg -framerate 10 -i img%03d.png -r 10 out.mkv'},
  fr10r30: {in: ['-framerate', '10'],                        input: SEQ,            out: ['-r', '30'],    command: 'ffmpeg -framerate 10 -i img%03d.png -r 30 out.mkv'},
  globfr:  {in: ['-framerate', '10', '-pattern_type', 'glob'], input: 'png/img*.png', out: [],             command: "ffmpeg -framerate 10 -pattern_type glob -i 'img*.png' out.mkv"},
  globr:   {in: ['-r', '10', '-pattern_type', 'glob'],       input: 'png/img*.png', out: [],              command: "ffmpeg -r 10 -pattern_type glob -i 'img*.png' out.mkv"},
  start51: {in: ['-framerate', '10', '-start_number', '51'], input: SEQ,            out: [],              command: 'ffmpeg -framerate 10 -start_number 51 -i img%03d.png out.mkv'},
};

const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); return r; };

// frames, reader 2: raw gray, one byte at a fixed pixel of every decoded frame
export function frameCodes(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'gray', '-an', '-'], {maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
  const size = SIZE * SIZE, n = r.stdout.length / size, out = [];
  for (let i = 0; i < n; i++) out.push((r.stdout[i * size + 100] - 10) / 2);
  return out;
}

// frames, reader 1: framemd5 of every decoded frame, in presentation order. passthrough so framemd5 itself never drops or duplicates.
function framemd5Rows(args) {
  const out = run('ffmpeg', ['-v', 'error', ...args, '-fps_mode', 'passthrough', '-pix_fmt', 'gray', '-f', 'framemd5', '-an', '-']);
  const tb = out.split(/\r?\n/).find((l) => l.startsWith('#tb 0:')).match(/(\d+)\/(\d+)/);
  const rows = out.split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').map((x) => x.trim()));
  return {rows, tb: Number(tb[1]) / Number(tb[2])};
}
const mdOf = (file) => framemd5Rows(['-i', file]).rows.map((r) => r[5]);

// time, reader 1: ffprobe packets (pts_time + duration_time of the last packet), the packet count, and the stream rates
const frac = (s) => { const m = String(s ?? '').match(/^(\d+)\/(\d+)$/); return m && Number(m[2]) ? Number(m[1]) / Number(m[2]) : null; };
export function probe(file) {
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=pts_time,duration_time:stream=r_frame_rate,avg_frame_rate', '-of', 'json', file]));
  const pk = j.packets ?? [], st = (j.streams ?? [])[0] ?? {};
  const last = pk[pk.length - 1], prev = pk[pk.length - 2];
  const dur = Number.isFinite(Number(last.duration_time)) && last.duration_time !== undefined ? Number(last.duration_time) : Number(prev.duration_time);
  const fmt = JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', file]));
  return {packets: pk.length, end: round3(Number(last.pts_time) + dur), rFrameRate: frac(st.r_frame_rate), avgFrameRate: frac(st.avg_frame_rate), container: round3(Number(fmt.format.duration))};
}
// time, reader 2: decoded frames from framemd5, last frame pts + duration in the stream time base
export function decoded(file) {
  const {rows, tb} = framemd5Rows(['-i', file]);
  const last = rows[rows.length - 1];
  return {frames: rows.length, end: round3((Number(last[1]) + Number(last[3])) * tb)};
}

export function readOutput(file, srcMd5) {
  const p = probe(file), d = decoded(file);
  const byMd5 = mdOf(file).map((m) => srcMd5.indexOf(m) + 1);   // source file number, 0 if the frame matches no source PNG
  const byCode = frameCodes(file);
  const dups = byMd5.length - new Set(byMd5).size;
  return {
    ffprobe: {packets: p.packets, end: p.end, container: p.container, rFrameRate: p.rFrameRate, avgFrameRate: p.avgFrameRate},
    decode: {frames: d.frames, end: d.end},
    byMd5, byCode, kept: new Set(byMd5).size, dups,
  };
}

export function makeSource(dir) {
  fs.mkdirSync(path.join(dir, 'png'), {recursive: true});
  ff(['-f', 'lavfi', '-i', `color=c=gray:s=${SIZE}x${SIZE}:r=25:d=4,format=gray,geq=lum='2*(N+1)+10'`, '-start_number', '1', 'png/img%03d.png'], dir);
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  makeSource(dir);
  const srcMd5 = framemd5Rows(['-framerate', '25', '-i', path.join(dir, SEQ)]).rows.map((r) => r[5]);
  const out = {ffmpeg: ffmpegVersion(), source: {pngs: fs.readdirSync(path.join(dir, 'png')).length, unique: new Set(srcMd5).size, frames: srcMd5.length}, runs: {}};
  for (const [name, c] of Object.entries(CASES)) {
    ff([...c.in, '-i', c.input, ...c.out, '-c:v', 'ffv1', `${name}.mkv`], dir);
    out.runs[name] = {command: c.command, ...readOutput(path.join(dir, `${name}.mkv`), srcMd5)};
  }
  // start_number: a sequence that begins at img051.png. Without -start_number the image2 demuxer only looks at numbers 0 to 4 for the first file.
  fs.mkdirSync(path.join(dir, 'late'), {recursive: true});
  for (let i = 51; i <= N; i++) fs.copyFileSync(path.join(dir, 'png', `img${String(i).padStart(3, '0')}.png`), path.join(dir, 'late', `img${String(i).padStart(3, '0')}.png`));
  const bad = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '10', '-i', 'late/img%03d.png', '-c:v', 'ffv1', 'late_default.mkv'], {encoding: 'utf8', cwd: dir});
  out.lateDefault = {command: 'ffmpeg -framerate 10 -i img%03d.png out.mkv  (files img051.png to img100.png only)', exitCode: bad.status, wroteFile: fs.existsSync(path.join(dir, 'late_default.mkv'))};
  ff(['-framerate', '10', '-start_number', '51', '-i', 'late/img%03d.png', '-c:v', 'ffv1', 'late_set.mkv'], dir);
  out.lateSet = {command: 'ffmpeg -framerate 10 -start_number 51 -i img%03d.png out.mkv  (files img051.png to img100.png only)', ...readOutput(path.join(dir, 'late_set.mkv'), srcMd5)};
  return out;
}
