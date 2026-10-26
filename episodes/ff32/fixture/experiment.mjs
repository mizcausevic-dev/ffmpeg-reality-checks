// Episode 32 fixture: "How do I grab the last N seconds of a video with -sseof, and what exactly do I get?"
// Synthetic sources only (lavfi): a 10 s clip at 30 fps (300 frames, 64x64 gray) where frame N is identified by its pixels:
//   frame code N = Y + 256 * ((Cb - 128) / 20)   (luma carries N mod 256, chroma carries the high part, so all 300 frames are unique)
// Stored three ways: FFV1 (every frame is a keyframe), lossless libx264 with -g 100 (keyframes at frames 0, 100, 200) and lossless libx264 with -g 10.
// A fourth file has a 10 s picture and a 12 s audio track, to see which duration -sseof counts back from.
// Every output is read back two independent ways:
//   frames  reader 1 frame md5 matched to the source   reader 2 decoded Y and Cb bytes (the code above)
//   time    reader 1 ffprobe packets: first pts, last pts + duration   reader 2 decode: framemd5 first pts, last pts + duration
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, ffmpegVersion, keyframeTimes} from '../../../tools/ff.mjs';

const SIZE = 64, RATE = 44100;
const REENC = ['-c:v', 'ffv1', '-c:a', 'pcm_s16le'];
// name -> {command shown on screen, input file, args before -i, args after -i}
export const CASES = {
  ffv1_enc:  {command: 'ffmpeg -sseof -3 -i ffv1.mkv out.mkv',                 src: 'ffv1', pre: ['-sseof', '-3'], post: REENC},
  ffv1_copy: {command: 'ffmpeg -sseof -3 -i ffv1.mkv -c copy out.mkv',        src: 'ffv1', pre: ['-sseof', '-3'], post: ['-c', 'copy']},
  g100_enc:  {command: 'ffmpeg -sseof -3 -i g100.mkv out.mkv',                 src: 'g100', pre: ['-sseof', '-3'], post: REENC},
  g100_copy: {command: 'ffmpeg -sseof -3 -i g100.mkv -c copy out.mkv',        src: 'g100', pre: ['-sseof', '-3'], post: ['-c', 'copy']},
  g100_ss:   {command: 'ffmpeg -ss 7 -i g100.mkv out.mkv',                      src: 'g100', pre: ['-ss', '7'],     post: REENC},
  g100_ss_copy: {command: 'ffmpeg -ss 7 -i g100.mkv -c copy out.mkv',          src: 'g100', pre: ['-ss', '7'],     post: ['-c', 'copy']},
  g10_enc:   {command: 'ffmpeg -sseof -3 -i g10.mkv out.mkv',                   src: 'g10',  pre: ['-sseof', '-3'], post: REENC},
  g10_copy:  {command: 'ffmpeg -sseof -3 -i g10.mkv -c copy out.mkv',          src: 'g10',  pre: ['-sseof', '-3'], post: ['-c', 'copy']},
  g10_enc29: {command: 'ffmpeg -sseof -2.9 -i g10.mkv out.mkv',                 src: 'g10',  pre: ['-sseof', '-2.9'], post: REENC},
  g10_copy29: {command: 'ffmpeg -sseof -2.9 -i g10.mkv -c copy out.mkv',       src: 'g10',  pre: ['-sseof', '-2.9'], post: ['-c', 'copy']},
  big_enc:   {command: 'ffmpeg -sseof -30 -i g100.mkv out.mkv',                 src: 'g100', pre: ['-sseof', '-30'], post: REENC},
  big_copy:  {command: 'ffmpeg -sseof -30 -i g100.mkv -c copy out.mkv',        src: 'g100', pre: ['-sseof', '-30'], post: ['-c', 'copy']},
  av:        {command: 'ffmpeg -sseof -3 -i av.mkv out.mkv',                    src: 'av',   pre: ['-sseof', '-3'], post: REENC},
};

const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };
const round3 = (x) => Math.round(x * 1000) / 1000;
const num = (x) => { const v = Number(x); return Number.isFinite(v) ? v : NaN; };

// frames, reader 2: raw yuv420p, Y byte and Cb byte at fixed positions of every frame
export function frameCodes(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-an', '-'], {maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
  const size = SIZE * SIZE * 3 / 2, n = r.stdout.length / size, out = [];
  for (let i = 0; i < n; i++) out.push(r.stdout[i * size + 100] + 256 * Math.round((r.stdout[i * size + SIZE * SIZE + 10] - 128) / 20));
  return out;
}

// frames, reader 1 and time, reader 2: framemd5 of every decoded video frame
function framemd5Rows(file) {
  const out = run('ffmpeg', ['-v', 'error', '-i', file, '-fps_mode', 'passthrough', '-f', 'framemd5', '-an', '-']);
  const tb = out.split(/\r?\n/).find((l) => l.startsWith('#tb 0:')).match(/(\d+)\/(\d+)/);
  const rows = out.split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').map((x) => x.trim()));
  return {rows, tb: Number(tb[1]) / Number(tb[2])};
}
export const frameMd5 = (file) => framemd5Rows(file).rows.map((r) => r[5]);

// time, reader 1: ffprobe packets, defensive about a missing duration
export function packetSpan(file, stream) {
  const rows = run('ffprobe', ['-v', 'error', '-select_streams', stream, '-show_entries', 'packet=pts_time,duration_time', '-of', 'csv=p=0', file])
    .split(/\r?\n/).map((l) => l.replace(/,$/, '').trim()).filter(Boolean).map((l) => l.split(',').map(num));
  if (!rows.length) return {packets: 0, start: NaN, end: NaN, seconds: 0};
  const last = rows[rows.length - 1], prev = rows.length > 1 ? rows[rows.length - 2] : last;
  const dur = Number.isFinite(last[1]) ? last[1] : prev[1];
  return {packets: rows.length, start: round3(rows[0][0]), end: round3(last[0] + dur), seconds: round3(last[0] + dur - rows[0][0])};
}
// time, reader 2: decoded frames from framemd5
export function decodedSpan(file) {
  const {rows, tb} = framemd5Rows(file);
  if (!rows.length) return {frames: 0, start: NaN, end: NaN, seconds: 0};
  const first = rows[0], last = rows[rows.length - 1];
  const end = (Number(last[1]) + Number(last[3])) * tb, start = Number(first[1]) * tb;
  return {frames: rows.length, start: round3(start), end: round3(end), seconds: round3(end - start)};
}
// decoded mono s16le sample count of the first audio stream (0 when there is none)
export function audioSeconds(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-vn', '-f', 's16le', '-ac', '1', '-ar', String(RATE), '-'], {maxBuffer: 1 << 28});
  if (r.status !== 0) return 0;
  return round3(r.stdout.length / 2 / RATE);
}
const containerDuration = (file) => round3(num(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).trim()));

export function readOutput(file, srcMd5) {
  const v1 = packetSpan(file, 'v:0'), v2 = decodedSpan(file);
  const byMd5 = frameMd5(file).map((m) => srcMd5.indexOf(m));
  const byCode = frameCodes(file);
  const contiguous = byCode.every((v, i) => i === 0 || v === byCode[i - 1] + 1);
  const hasAudio = run('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', file]).trim() !== '';
  return {
    frames: byMd5.length, first: byMd5[0], last: byMd5[byMd5.length - 1], contiguous,
    packets: v1.packets, packetSeconds: v1.seconds, decodedSeconds: v2.seconds, decodedFrames: v2.frames,
    audioSeconds: hasAudio ? audioSeconds(file) : 0,
    container: containerDuration(file),
    byMd5, byCode,
  };
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  ff(['-f', 'lavfi', '-i', `color=c=gray:s=${SIZE}x${SIZE}:r=30:d=10,format=yuv420p,geq=lum='mod(N,256)':cb='128+floor(N/256)*20':cr=128`, '-c:v', 'ffv1', 'ffv1.mkv'], dir);
  for (const g of [100, 10]) ff(['-i', 'ffv1.mkv', '-c:v', 'libx264', '-g', String(g), '-crf', '0', '-pix_fmt', 'yuv420p', `g${g}.mkv`], dir);
  ff(['-i', 'g100.mkv', '-f', 'lavfi', '-i', `sine=f=440:r=${RATE}:d=12`, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'pcm_s16le', 'av.mkv'], dir);
  const srcMd5 = frameMd5(path.join(dir, 'ffv1.mkv'));
  const key = (f) => keyframeTimes(path.join(dir, f)).map((t) => Math.round(t * 30));
  const out = {
    ffmpeg: ffmpegVersion(),
    source: {fps: 30, seconds: 10, frames: srcMd5.length, unique: new Set(srcMd5).size, keyframes: {ffv1: key('ffv1.mkv').length, g100: key('g100.mkv'), g10: key('g10.mkv')},
      md5Same: {g100: JSON.stringify(frameMd5(path.join(dir, 'g100.mkv'))) === JSON.stringify(srcMd5), g10: JSON.stringify(frameMd5(path.join(dir, 'g10.mkv'))) === JSON.stringify(srcMd5)},
      av: {container: containerDuration(path.join(dir, 'av.mkv')), picture: packetSpan(path.join(dir, 'av.mkv'), 'v:0').seconds, audio: audioSeconds(path.join(dir, 'av.mkv'))}},
    runs: {},
  };
  for (const [name, c] of Object.entries(CASES)) {
    ff([...c.pre, '-i', `${c.src}.mkv`, ...c.post, `out_${name}.mkv`], dir);
    out.runs[name] = {command: c.command, ...readOutput(path.join(dir, `out_${name}.mkv`), srcMd5)};
  }
  return out;
}
