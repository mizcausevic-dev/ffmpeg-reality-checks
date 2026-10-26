// Episode 11 fixture: "Is -crf 0 really lossless?"
// Synthetic RGB source (ffmpeg testsrc2, 320x180, 25 frames) encoded four ways. Each result is decoded back to RGB and compared with the
// source two independent ways: per-frame md5 (how many frames are bit-identical) and the psnr filter (inf means identical, a number means not).
// A third check asks a narrower question: is the decoded picture identical to the source after it was converted to the pixel format the encoder
// was actually given (that is the sense in which x264 crf 0 is lossless).
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, ffmpegVersion} from '../../../tools/ff.mjs';

const FRAMES = 25;
const SRC = `testsrc2=size=320x180:rate=25:duration=1,format=gbrp`; // planar RGB, 8 bits per channel
export const VARIANTS = {
  x264_crf0:      {command: 'ffmpeg -i in -c:v libx264 -crf 0 out.mkv',                      args: ['-c:v', 'libx264', '-crf', '0'],                      file: 'x264_crf0.mkv'},
  x264_crf0_420:  {command: 'ffmpeg -i in -c:v libx264 -crf 0 -pix_fmt yuv420p out.mkv',     args: ['-c:v', 'libx264', '-crf', '0', '-pix_fmt', 'yuv420p'], file: 'x264_crf0_420.mkv'},
  x264rgb_crf0:   {command: 'ffmpeg -i in -c:v libx264rgb -crf 0 out.mkv',                   args: ['-c:v', 'libx264rgb', '-crf', '0'],                   file: 'x264rgb_crf0.mkv'},
  ffv1:           {command: 'ffmpeg -i in -c:v ffv1 out.mkv',                                args: ['-c:v', 'ffv1'],                                      file: 'ffv1.mkv'},
};

const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${r.stderr}`); };
const md5s = (out) => out.split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());
const srcMd5 = (fmt) => md5s(run('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', `${SRC},format=${fmt}`, '-f', 'framemd5', '-']));
const decMd5 = (file, fmt) => md5s(run('ffmpeg', ['-v', 'error', '-i', file, '-vf', `format=${fmt}`, '-f', 'framemd5', '-']));
const same = (a, b) => a.reduce((n, h, i) => n + (h === b[i] ? 1 : 0), 0);
// average psnr of the decoded file against the source, both as planar RGB; the string "inf" means no difference at all
function psnr(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-f', 'lavfi', '-i', SRC, '-lavfi', '[0:v]format=gbrp[a];[1:v]format=gbrp[b];[a][b]psnr', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  const m = /average:(\S+)/.exec(r.stderr ?? '');
  return m ? m[1] : null;
}
const streamInfo = (file) => JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=pix_fmt,profile', '-of', 'json', file])).streams[0];

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const srcRgb = srcMd5('gbrp');
  const out = {ffmpeg: ffmpegVersion(), frames: FRAMES, variants: {}};
  for (const [name, v] of Object.entries(VARIANTS)) {
    ff(['-f', 'lavfi', '-i', SRC, ...v.args, v.file], dir);
    const file = path.join(dir, v.file);
    const {pix_fmt: pix, profile} = streamInfo(file);
    const rgb = decMd5(file, 'gbrp');
    // the encoder's own pixel format: compare the decoded picture with the source converted to that format
    const encFmt = pix === 'bgr0' ? 'gbrp' : pix; // bgr0 carries an unused padding byte that would defeat a byte comparison
    const inEncoded = same(decMd5(file, encFmt), srcMd5(encFmt));
    out.variants[name] = {command: v.command, pixFmt: pix, profile: profile ?? null, bytes: fs.statSync(file).size,
      identicalRgbFrames: same(rgb, srcRgb), psnrRgb: psnr(file), identicalInEncodedFormat: inEncoded};
  }
  return out;
}
