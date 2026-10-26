// Episode 35 fixture: "My HLS segments are not the length I asked for: why? (-hls_time vs keyframes)"
// Synthetic source only (lavfi testsrc2): 20 s at 25 fps (500 frames, 64x64), libx264 with a fixed 50 frame GOP (2 s): keyframes at 0, 2, 4 ... 18 s.
// Every HLS output is read three ways:
//   playlist   reader 1  the EXTINF value of each segment in the .m3u8
//   packets    reader 2  ffprobe video packets of each .ts: (last pts - first pts) + one frame
//   decode     reader 3  ffmpeg framemd5 of each .ts: decoded frame count and pts range
// Frame accounting: the sum of the packets (and of the decoded frames) over all segments is compared with the 500 source frames.
// Keyframes of the source come from ffprobe -skip_frame nokey.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, ffmpegVersion, keyframeTimes} from '../../../tools/ff.mjs';

export const FPS = 25, SECONDS = 20, FRAMES = FPS * SECONDS;
const GOP = (n) => ['-g', String(n), '-keyint_min', String(n), '-sc_threshold', '0'];
const HLS = (t, ...extra) => ['-f', 'hls', '-hls_time', String(t), '-hls_list_size', '0', ...extra, '-hls_segment_filename', 's%02d.ts', 'p.m3u8'];

// asked: the -hls_time value. gop: keyframe interval of the segmenter input in frames.
export const CASES = {
  gop50_t3: {asked: 3, command: 'ffmpeg -i src.mp4 -c:v libx264 -g 50 -f hls -hls_time 3 p.m3u8',
             args: ['-c:v', 'libx264', ...GOP(50), ...HLS(3)]},
  gop50_t5: {asked: 5, command: 'ffmpeg -i src.mp4 -c:v libx264 -g 50 -f hls -hls_time 5 p.m3u8',
             args: ['-c:v', 'libx264', ...GOP(50), ...HLS(5)]},
  gop50_t1: {asked: 1, command: 'ffmpeg -i src.mp4 -c:v libx264 -g 50 -f hls -hls_time 1 p.m3u8',
             args: ['-c:v', 'libx264', ...GOP(50), ...HLS(1)]},
  forced:   {asked: 3, command: 'ffmpeg -i src.mp4 -c:v libx264 -g 50 -force_key_frames expr:gte(t,n_forced*3) -f hls -hls_time 3 p.m3u8',
             args: ['-c:v', 'libx264', ...GOP(50), '-force_key_frames', 'expr:gte(t,n_forced*3)', ...HLS(3)]},
  copy:     {asked: 3, command: 'ffmpeg -i src.mp4 -c copy -f hls -hls_time 3 p.m3u8',
             args: ['-c', 'copy', ...HLS(3)]},
  ctrl:     {asked: 3, command: 'ffmpeg -i src.mp4 -c:v libx264 -g 75 -f hls -hls_time 3 p.m3u8',
             args: ['-c:v', 'libx264', ...GOP(75), ...HLS(3)]},
  split:    {asked: 3, command: 'ffmpeg -i src.mp4 -c:v libx264 -g 50 -f hls -hls_time 3 -hls_flags split_by_time p.m3u8',
             args: ['-c:v', 'libx264', ...GOP(50), ...HLS(3, '-hls_flags', 'split_by_time')]},
};

const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };
const round3 = (x) => Math.round(x * 1000) / 1000;
const round2 = (x) => Math.round(x * 100) / 100;

// reader 1: the playlist
export function readPlaylist(file) {
  const rows = fs.readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const extinf = rows.filter((l) => l.startsWith('#EXTINF:')).map((l) => Number(l.slice(8).split(',')[0]));
  const target = Number((rows.find((l) => l.startsWith('#EXT-X-TARGETDURATION:')) ?? '#:NaN').split(':')[1]);
  const files = rows.filter((l) => !l.startsWith('#'));
  return {extinf, target, files, ended: rows.includes('#EXT-X-ENDLIST')};
}

// reader 2: ffprobe packets of one segment. Duration = pts span + one frame (median pts step), so it does not rely on a packet duration field.
export function segmentPackets(file) {
  const out = run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=pts_time,flags', '-of', 'csv=p=0', file]);
  const rows = out.split(/\r?\n/).map((l) => l.replace(/,$/, '').trim()).filter(Boolean).map((l) => l.split(','));
  const pts = rows.map((r) => Number(r[0])).sort((a, b) => a - b);
  const steps = pts.slice(1).map((x, i) => x - pts[i]).sort((a, b) => a - b);
  const frame = steps.length ? steps[Math.floor(steps.length / 2)] : 1 / FPS;
  const firstInDecodeOrder = rows[0];
  return {packets: rows.length, start: pts[0], duration: round2(pts[pts.length - 1] - pts[0] + frame), startsWithKeyframe: (firstInDecodeOrder[1] ?? '').includes('K')};
}

// reader 3: decode the segment on its own and read the frame timestamps. Decode errors are expected for segments that do not start on a keyframe, so stderr is not an error here.
export function segmentDecoded(file) {
  const r = spawnSync('ffmpeg', ['-v', 'quiet', '-i', file, '-an', '-fps_mode', 'passthrough', '-f', 'framemd5', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  const lines = r.stdout.split(/\r?\n/);
  const tbm = (lines.find((l) => l.startsWith('#tb 0:')) ?? '').match(/(\d+)\/(\d+)/);
  const tb = tbm ? Number(tbm[1]) / Number(tbm[2]) : 1 / 90000;
  const rows = lines.filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').map((x) => x.trim()));
  const pts = rows.map((x) => Number(x[1]) * tb).sort((a, b) => a - b);
  return {frames: rows.length, start: pts[0], duration: pts.length ? round2(pts[pts.length - 1] - pts[0] + 1 / FPS) : 0};
}

const sum = (a) => a.reduce((x, y) => x + y, 0);

export function readHls(dir) {
  const pl = readPlaylist(path.join(dir, 'p.m3u8'));
  const files = pl.files.map((f) => path.join(dir, f));
  const pk = files.map(segmentPackets), dc = files.map(segmentDecoded);
  const t0 = pk[0].start;
  const cuts = pk.map((p) => round2(p.start - t0));   // start of each segment relative to the first one
  return {
    segments: files.length, files: pl.files, target: pl.target, ended: pl.ended,
    extinf: pl.extinf,
    packetDur: pk.map((p) => p.duration),
    decodedDur: dc.map((d) => d.duration),
    cuts,
    packetsPer: pk.map((p) => p.packets), decodedPer: dc.map((d) => d.frames),
    packetsTotal: sum(pk.map((p) => p.packets)), decodedTotal: sum(dc.map((d) => d.frames)),
    keyStart: pk.map((p) => p.startsWithKeyframe),
    extinfTotal: round3(sum(pl.extinf)),
  };
}

// The cutting rule, as predicted from the source keyframes alone: cut n is the first keyframe that is after cut n-1 and at or after n * asked.
export function predictCuts(keys, asked, total = SECONDS) {
  const cuts = [0];
  for (let n = 1; ; n++) {
    const k = keys.find((x) => x > cuts[cuts.length - 1] + 1e-6 && x >= n * asked - 1e-6);
    if (k === undefined || k >= total - 1e-6) break;
    cuts.push(round2(k));
  }
  return cuts;
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  ff(['-f', 'lavfi', '-i', `testsrc2=s=64x64:r=${FPS}:d=${SECONDS},format=yuv420p`, '-c:v', 'libx264', ...GOP(50), '-pix_fmt', 'yuv420p', 'src.mp4'], dir);
  const keys = keyframeTimes(path.join(dir, 'src.mp4')).map(round2);
  const srcFrames = Number(run('ffprobe', ['-v', 'error', '-count_packets', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', path.join(dir, 'src.mp4')]).trim().replace(/,$/, ''));
  const out = {ffmpeg: ffmpegVersion(), source: {fps: FPS, seconds: SECONDS, frames: srcFrames, gopFrames: 50, keyframes: keys}, runs: {}};
  for (const [name, c] of Object.entries(CASES)) {
    const d = path.join(dir, name);
    fs.mkdirSync(d, {recursive: true});
    ff(['-i', path.join(dir, 'src.mp4'), ...c.args], d);
    // keyframes of the stream that went into the segmenter: the source's own for the 2 s GOP cases, every 3 s for the 75 frame GOP control, unknown for forced and split
    const k = name === 'ctrl' ? [0, 3, 6, 9, 12, 15, 18] : (name === 'forced' || name === 'split') ? null : keys;
    out.runs[name] = {command: c.command, ...readHls(d), asked: c.asked, predicted: k ? predictCuts(k, c.asked) : null};
  }
  return out;
}
