// Episode 05 fixture: "My phone video has a variable frame rate. What does constant frame rate do to it?"
// Synthetic source only: ffmpeg testsrc2 with frames removed at uneven intervals, so the timestamps have uneven gaps.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, lines, ffmpegVersion} from '../../../tools/ff.mjs';

export const SRC = {size: '320x180', fps: 30, seconds: 5};
// keep a frame unless it is every 4th (n%4==2) or inside a longer gap (frames 60 to 85)
const SELECT = "select='not(eq(mod(n,4),2))*not(between(n,60,85))'";

const rate = (s) => { const [a, b] = String(s).split('/').map(Number); return b ? a / b : a; };
const probe = (file) => {
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames,r_frame_rate,avg_frame_rate:format=duration', '-of', 'json', file]));
  const s = j.streams[0];
  return {frames: Number(s.nb_read_frames), rFrameRate: s.r_frame_rate, avgFrameRate: s.avg_frame_rate, avgFps: +rate(s.avg_frame_rate).toFixed(3), duration: parseFloat(j.format.duration)};
};
// Gaps between consecutive presentation timestamps, rounded to milliseconds. One distinct gap means constant frame rate.
function gaps(file) {
  const pts = lines(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=pts_time', '-of', 'csv=p=0', file])).map(Number).sort((a, b) => a - b);
  const set = new Set();
  for (let i = 1; i < pts.length; i++) set.add(Math.round((pts[i] - pts[i - 1]) * 1000));
  return [...set].sort((a, b) => a - b);
}
// One md5 per decoded frame. The conversions below are lossless (qp 0), so identical pictures give identical md5s.
const uniqueFrames = (file) => new Set(lines(run('ffmpeg', ['-v', 'error', '-i', file, '-f', 'framemd5', '-an', '-'])).filter((l) => !l.startsWith('#')).map((l) => l.split(',').pop().trim())).size;

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const vfr = path.join(dir, 'vfr_source.mp4');
  run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `testsrc2=size=${SRC.size}:rate=${SRC.fps}:duration=${SRC.seconds}`, '-vf', SELECT, '-fps_mode', 'passthrough', '-c:v', 'libx264', '-crf', '18', vfr]);
  const sp = probe(vfr);
  const out = {ffmpeg: ffmpegVersion(), request: SRC, select: SELECT, source: {...sp, distinctGapsMs: gaps(vfr), uniqueFrames: uniqueFrames(vfr)}, variants: {}};
  const variants = {
    default: [],
    passthrough: ['-fps_mode', 'passthrough'],
    cfr_30: ['-fps_mode', 'cfr', '-r', '30'],
    cfr_25: ['-fps_mode', 'cfr', '-r', '25'],
    cfr_60: ['-fps_mode', 'cfr', '-r', '60'],
  };
  for (const [name, extra] of Object.entries(variants)) {
    const f = path.join(dir, `${name}.mp4`);
    const r = spawnSync('ffmpeg', ['-v', 'info', '-stats', '-y', '-i', vfr, ...extra, '-c:v', 'libx264', '-qp', '0', f], {encoding: 'utf8', maxBuffer: 1 << 28});
    if (r.status !== 0) throw new Error(`ffmpeg ${name} failed: ${r.stderr}`);
    const dups = [...r.stderr.matchAll(/dup=(\d+)/g)].pop(), drops = [...r.stderr.matchAll(/drop=(\d+)/g)].pop();
    const p = probe(f), u = uniqueFrames(f);
    out.variants[name] = {command: `ffmpeg -i vfr_source.mp4 ${extra.join(' ')} -c:v libx264 -qp 0 ${name}.mp4`.replace('  ', ' '), ...p, distinctGapsMs: gaps(f), uniqueFrames: u, duplicatesByCounter: dups ? Number(dups[1]) : 0, dropsByCounter: drops ? Number(drops[1]) : 0, duplicatesByMd5: p.frames - u};
  }
  return out;
}
