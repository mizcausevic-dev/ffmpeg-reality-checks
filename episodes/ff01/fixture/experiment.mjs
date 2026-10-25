// Episode 01 fixture: "You asked for 7.5 seconds. What did -c copy give you?"
// Synthetic source only (ffmpeg's testsrc2 pattern). No network, no user media, no real product.
import fs from 'node:fs';
import path from 'node:path';
import {run, frameMd5, packetPts, keyframeTimes, ffmpegVersion} from '../../../tools/ff.mjs';

export const SRC = {size: '320x180', fps: 25, seconds: 20, gop: 125, seek: 7.5, clip: 3};

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const src = path.join(dir, 'source.mp4');
  // Lossless H.264 (CRF 0) with a keyframe exactly every 5 s, so every decoded frame has a unique, stable md5.
  run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `testsrc2=size=${SRC.size}:rate=${SRC.fps}:duration=${SRC.seconds}`,
    '-c:v', 'libx264', '-crf', '0', '-preset', 'veryfast', '-g', String(SRC.gop), '-keyint_min', String(SRC.gop), '-sc_threshold', '0', '-pix_fmt', 'yuv420p', '-an', src]);
  const srcMd5 = frameMd5(src);

  const t = String(SRC.seek), len = String(SRC.clip);
  const variants = {
    input_seek_copy: ['-ss', t, '-i', src, '-t', len, '-c', 'copy', '-an'],
    output_seek_copy: ['-i', src, '-ss', t, '-t', len, '-c', 'copy', '-an'],
    input_seek_reencode: ['-ss', t, '-i', src, '-t', len, '-c:v', 'libx264', '-crf', '0', '-pix_fmt', 'yuv420p', '-an'],
  };
  const out = {};
  for (const [name, args] of Object.entries(variants)) {
    const file = path.join(dir, `${name}.mp4`);
    run('ffmpeg', ['-v', 'error', '-y', ...args, file]);
    const md5 = frameMd5(file), pkts = packetPts(file);
    const first = srcMd5.indexOf(md5[0]);
    out[name] = {
      command: `ffmpeg ${args.map((a) => (a === src ? 'source.mp4' : a)).join(' ')} ${name}.mp4`,
      decodedFrames: md5.length,
      firstSourceFrame: first,
      firstSourceTime: first < 0 ? null : +(first / SRC.fps).toFixed(2),
      decodedSeconds: +(md5.length / SRC.fps).toFixed(2),
      packets: pkts.length,
      firstPacketPts: pkts[0],
    };
  }
  return {
    ffmpeg: ffmpegVersion(),
    request: {seekSeconds: SRC.seek, clipSeconds: SRC.clip, expectedFirstFrame: Math.ceil(SRC.seek * SRC.fps), expectedFrames: SRC.clip * SRC.fps},
    source: {frames: srcMd5.length, uniqueFrames: new Set(srcMd5).size, keyframes: keyframeTimes(src)},
    variants: out,
    frameLookup: (md5) => srcMd5.indexOf(md5),
    srcMd5,
  };
}
