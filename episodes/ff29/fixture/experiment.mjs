// Episode 29 fixture: "I sped the video up 2x. Why is the audio out of sync?"
// Synthetic sources only (lavfi): a 10 s clip at 30 fps (300 frames, 64x64 gray) where frame N is identified by its pixels,
// and a 10 s mono 440 Hz sine at 44100 Hz. Stored losslessly (FFV1 video, 16 bit PCM audio) in Matroska.
//   frame code N = Y + 256 * ((Cb - 128) / 20)   (luma carries N mod 256, chroma carries the high part, so all 300 frames are unique)
// Every output is read back two independent ways:
//   frames  reader 1 frame md5 matched to the source   reader 2 decoded Y and Cb bytes (the code above)
//   time    reader 1 ffprobe packets: last pts + duration   reader 2 decode: video last frame pts + duration (framemd5), audio decoded sample count / 44100
//   pitch   reader 1 Goertzel scan 100 to 2000 Hz in 1 Hz steps   reader 2 zero crossings per second
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, ffmpegVersion, packetPts} from '../../../tools/ff.mjs';

const SIZE = 64, RATE = 44100;
export const CASES = {
  ctrl:   {command: 'ffmpeg -i src.mkv out.mkv',                                                   args: []},
  video:  {command: 'ffmpeg -i src.mkv -vf setpts=0.5*PTS out.mkv',                                 args: ['-vf', 'setpts=0.5*PTS']},
  tempo:  {command: 'ffmpeg -i src.mkv -vf setpts=0.5*PTS -af atempo=2 out.mkv',                    args: ['-vf', 'setpts=0.5*PTS', '-af', 'atempo=2']},
  rate:   {command: 'ffmpeg -i src.mkv -vf setpts=0.5*PTS -af asetrate=88200,aresample=44100 out.mkv', args: ['-vf', 'setpts=0.5*PTS', '-af', 'asetrate=88200,aresample=44100']},
  keepall: {command: 'ffmpeg -i src.mkv -vf setpts=0.5*PTS -fps_mode passthrough out.mkv',          args: ['-vf', 'setpts=0.5*PTS', '-fps_mode', 'passthrough']},
  fpsf:   {command: 'ffmpeg -i src.mkv -vf setpts=0.5*PTS,fps=30 out.mkv',                          args: ['-vf', 'setpts=0.5*PTS,fps=30']},
};

const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };
const round3 = (x) => Math.round(x * 1000) / 1000;

// frames, reader 2: raw yuv420p, Y byte and Cb byte at fixed positions of every frame
export function frameCodes(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-an', '-'], {maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
  const size = SIZE * SIZE * 3 / 2, n = r.stdout.length / size, out = [];
  for (let i = 0; i < n; i++) out.push(r.stdout[i * size + 100] + 256 * Math.round((r.stdout[i * size + SIZE * SIZE + 10] - 128) / 20));
  return out;
}

// frames, reader 1: framemd5 of every decoded frame. -fps_mode passthrough matters here: this episode makes timestamps that are not on a fixed grid,
// and framemd5 would otherwise drop or duplicate frames itself.
function framemd5Rows(file) {
  const out = run('ffmpeg', ['-v', 'error', '-i', file, '-fps_mode', 'passthrough', '-f', 'framemd5', '-an', '-']);
  const tb = out.split(/\r?\n/).find((l) => l.startsWith('#tb 0:')).match(/(\d+)\/(\d+)/);
  const rows = out.split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').map((x) => x.trim()));
  return {rows, tb: Number(tb[1]) / Number(tb[2])};
}
export const frameMd5 = (file) => framemd5Rows(file).rows.map((r) => r[5]);
const framePts = (file) => { const {rows, tb} = framemd5Rows(file); return rows.map((r) => Number(r[1]) * tb); };

// which source second does the picture show at output time t? (the last frame whose timestamp is <= t, as a source second = code / 30)
export const sourceSecondAt = (pts, codes, t) => { let k = -1; for (let i = 0; i < pts.length; i++) if (pts[i] <= t + 1e-9) k = i; return round3(codes[k] / 30); };


// time, reader 1: ffprobe packets, end of the last packet = pts + duration
export function packetEnd(file, stream) {
  const rows = run('ffprobe', ['-v', 'error', '-select_streams', stream, '-show_entries', 'packet=pts_time,duration_time', '-of', 'csv=p=0', file])
    .split(/\r?\n/).map((l) => l.replace(/,$/, '').trim()).filter(Boolean).map((l) => l.split(',').map(Number));
  const last = rows[rows.length - 1];
  return {packets: rows.length, end: round3(last[0] + (Number.isFinite(last[1]) ? last[1] : rows[rows.length - 2][1]))};
}
// time, reader 2 (video): decoded frames from framemd5, last frame pts + duration in the stream time base
export function decodedVideoEnd(file) {
  const {rows, tb} = framemd5Rows(file);
  const last = rows[rows.length - 1];
  return {frames: rows.length, end: round3((Number(last[1]) + Number(last[3])) * tb)};
}
// decoded mono s16le samples of the first audio stream
export function audioSamples(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-vn', '-f', 's16le', '-ac', '1', '-ar', String(RATE), '-'], {maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
  const n = r.stdout.length / 2, x = new Float64Array(n);
  for (let i = 0; i < n; i++) x[i] = r.stdout.readInt16LE(i * 2) / 32768;
  return x;
}
export function goertzelPower(x, f, rate = RATE) {
  const w = 2 * Math.PI * f / rate, c = 2 * Math.cos(w);
  let s1 = 0, s2 = 0;
  for (let i = 0; i < x.length; i++) { const s = x[i] + c * s1 - s2; s2 = s1; s1 = s; }
  return s1 * s1 + s2 * s2 - c * s1 * s2;
}
// pitch, reader 1: strongest frequency in 100..2000 Hz over the first second (1 Hz grid)
export function goertzelPeak(x) {
  const seg = x.subarray(0, RATE);
  let best = 0, bp = -1;
  for (let f = 100; f <= 2000; f++) { const p = goertzelPower(seg, f); if (p > bp) { bp = p; best = f; } }
  return best;
}
// pitch, reader 2: rising zero crossings, interpolated, (count - 1) / time between the first and the last crossing, over the first second
export function zeroCrossHz(x) {
  const seg = x.subarray(0, RATE), at = [];
  for (let i = 1; i < seg.length; i++) if (seg[i - 1] < 0 && seg[i] >= 0) at.push(i - 1 + (-seg[i - 1]) / (seg[i] - seg[i - 1]));
  return Math.round((at.length - 1) / ((at[at.length - 1] - at[0]) / RATE));
}

export function readOutput(file, srcMd5) {
  const v1 = packetEnd(file, 'v:0'), a1 = packetEnd(file, 'a:0');
  const v2 = decodedVideoEnd(file), a2 = audioSamples(file);
  const byMd5 = frameMd5(file).map((m) => srcMd5.indexOf(m));
  const byCode = frameCodes(file);
  const container = round3(Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).trim()));
  return {
    video: {packets: v1.packets, endPackets: v1.end, endDecoded: v2.end, framesDecoded: v2.frames},
    audio: {packets: a1.packets, endPackets: a1.end, endDecoded: round3(a2.length / RATE), samples: a2.length},
    container,
    pitch: {goertzel: goertzelPeak(a2), zeroCross: zeroCrossHz(a2)},
    byMd5, byCode,
    pictureAt2_5: {md5: sourceSecondAt(framePts(file), byMd5, 2.5), code: sourceSecondAt(packetPts(file), byCode, 2.5)},
  };
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  ff(['-f', 'lavfi', '-i', `color=c=gray:s=${SIZE}x${SIZE}:r=30:d=10,format=yuv420p,geq=lum='mod(N,256)':cb='128+floor(N/256)*20':cr=128`,
      '-f', 'lavfi', '-i', `sine=f=440:r=${RATE}:d=10`, '-c:v', 'ffv1', '-c:a', 'pcm_s16le', 'src.mkv'], dir);
  const srcMd5 = frameMd5(path.join(dir, 'src.mkv'));
  const out = {ffmpeg: ffmpegVersion(), source: {fps: 30, seconds: 10, frames: srcMd5.length, unique: new Set(srcMd5).size, sineHz: 440}, runs: {}};
  out.source.read = readOutput(path.join(dir, 'src.mkv'), srcMd5);
  for (const [name, c] of Object.entries(CASES)) {
    ff(['-i', 'src.mkv', ...c.args, '-c:v', 'ffv1', '-c:a', 'pcm_s16le', `${name}.mkv`], dir);
    out.runs[name] = {command: c.command, ...readOutput(path.join(dir, `${name}.mkv`), srcMd5)};
  }
  return out;
}
