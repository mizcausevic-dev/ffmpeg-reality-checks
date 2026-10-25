// Thin, dependency-free wrappers around ffmpeg and ffprobe. Everything here is read-only except writing the files you name.
import {spawnSync} from 'node:child_process';

export const have = (cmd) => spawnSync(cmd, ['-version'], {encoding: 'utf8'}).status === 0;
export const ffmpegVersion = () => (spawnSync('ffmpeg', ['-version'], {encoding: 'utf8'}).stdout ?? '').split(/\r?\n/)[0];

export function run(cmd, args) {
  const r = spawnSync(cmd, args, {encoding: 'utf8', maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed (exit ${r.status}): ${r.stderr}`);
  return r.stdout;
}

// ffmpeg/ffprobe print CRLF on Windows, so every parser splits on /\r?\n/ and tolerates a trailing comma.
export const lines = (out) => out.split(/\r?\n/).map((l) => l.replace(/,$/, '').trim()).filter(Boolean);

// One md5 per decoded video frame, in presentation order. With lossless sources this is a frame fingerprint.
export const frameMd5 = (file) =>
  run('ffmpeg', ['-v', 'error', '-i', file, '-f', 'framemd5', '-an', '-'])
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());

// pts_time of every video packet, in file order (packets, not decoded frames).
export const packetPts = (file) =>
  run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=pts_time', '-of', 'csv=p=0', file])
    .split(/\r?\n/).map((l) => l.replace(/,$/, '').trim()).filter(Boolean).map(Number);

// Times of keyframes (I-frames) in seconds.
export const keyframeTimes = (file) =>
  run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-skip_frame', 'nokey', '-show_entries', 'frame=pts_time', '-of', 'csv=p=0', file])
    .split(/\r?\n/).map((s) => s.replace(/,$/, '').trim()).filter(Boolean).map(Number);
